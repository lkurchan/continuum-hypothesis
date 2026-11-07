import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { StreamGateway } from "@/lib/chain/StreamGateway";
import { MemoryRepository } from "@/lib/db/MemoryRepository";
import { MockStreamGateway } from "@/lib/chain/MockStreamGateway";
import { StreamService } from "./StreamService";
import type { DemoUser } from "./types";

const payer: DemoUser = { id: "payer", name: "Payer", role: "payer", address: `0x${"1".repeat(40)}` };
const worker: DemoUser = { id: "worker", name: "Worker", role: "worker", address: `0x${"2".repeat(40)}` };
const txHash = `0x${"a".repeat(64)}`;
const feeHash = `0x${"f".repeat(64)}`;

function fixture() {
  const repo = new MemoryRepository([payer, worker], [{ id: "1", payerId: payer.id, workerId: worker.id,
    createdTx: txHash, createdAt: new Date(0).toISOString() }]);
  const gateway = {
    createStreams: vi.fn<StreamGateway["createStreams"]>(),
    topUp: vi.fn<StreamGateway["topUp"]>(),
    withdrawTo: vi.fn<StreamGateway["withdrawTo"]>().mockResolvedValue({ txHash }),
    cancel: vi.fn<StreamGateway["cancel"]>().mockResolvedValue({ txHash, refunded: "60", kept: "40" }),
    getStream: vi.fn<StreamGateway["getStream"]>().mockResolvedValue({ id: "1", totalAmount: "100",
      deposited: "50", withdrawn: "20", start: 1000, end: 1100, canceledAt: null, status: "streaming" }),
    balanceOf: vi.fn<StreamGateway["balanceOf"]>().mockResolvedValue("10000000"),
    transferFee: vi.fn<StreamGateway["transferFee"]>().mockResolvedValue({ txHash: feeHash }),
  } satisfies StreamGateway;
  return { repo, gateway, service: new StreamService(gateway, repo, "real", () => 1010) };
}

describe("agreement labels", () => {
  it("stores the contracted service name with each created stream", async () => {
    const { service, gateway, repo } = fixture();
    gateway.createStreams.mockResolvedValue({ txHash, streamIds: ["7"] });
    await service.create({ payerId: payer.id, start: 1000, end: 4600,
      items: [{ workerId: worker.id, totalAmount: "100", initialDeposit: "25", label: "Logística de última milla" }] });
    expect(await repo.stream("7")).toMatchObject({ label: "Logística de última milla" });
  });
});

describe("confirmed chain state", () => {
  it("lets the gateway validate withdrawals when the server clock trails the chain", async () => {
    const { service, gateway, repo } = fixture();
    // The local clock implies 10 vested, but the chain has already allowed 20.
    await expect(service.withdraw("1", worker.id, "5", "wallet")).resolves.toEqual({ txHash });
    expect(gateway.withdrawTo).toHaveBeenCalledWith(worker, "1", worker.address, "5");
    expect(await repo.activity(worker.id)).toMatchObject([{ kind: "withdraw", amount: "5", txHash }]);
  });

  it("records the confirmed refund after another wallet tops up before cancellation", async () => {
    const { service, repo } = fixture();
    // Snapshot: 50 deposited. Receipt after concurrent top-up: 100 deposited, 40 kept, 60 refunded.
    await expect(service.cancel("1", payer.id)).resolves.toEqual({ txHash, refunded: "60", kept: "40" });
    expect(await repo.activity(payer.id)).toMatchObject([{ kind: "cancel", amount: "60", txHash }]);
  });
});

describe("Continuum fee (0.05%)", () => {
  const worker2: DemoUser = { id: "worker2", name: "Worker 2", role: "worker", address: `0x${"3".repeat(40)}` };

  it("charges the fee after the top-up and returns its hash", async () => {
    const { service, gateway, repo } = fixture();
    gateway.topUp.mockResolvedValue({ txHash });
    await expect(service.topUp("1", payer.id, "40")).resolves.toEqual({ txHash, feeTxHash: feeHash });
    expect(gateway.transferFee).toHaveBeenCalledWith(payer, "0.02");
    expect(gateway.topUp.mock.invocationCallOrder[0]).toBeLessThan(gateway.transferFee.mock.invocationCallOrder[0]);
    expect(await repo.activity(payer.id)).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "topup", amount: "40", txHash }),
      expect.objectContaining({ kind: "fee", amount: "0.02", txHash: feeHash, userId: payer.id, streamId: "1",
        note: "Comisión Continuum 0,05%", explorerUrl: `https://arbiscan.io/tx/${feeHash}` }),
    ]));
  });

  it("charges a single fee over the batch's initial deposits", async () => {
    const { gateway } = fixture();
    const repo = new MemoryRepository([payer, worker, worker2], []);
    const service = new StreamService(gateway, repo, "real", () => 1010);
    gateway.createStreams.mockResolvedValue({ txHash, streamIds: ["7", "8"] });
    const result = await service.create({ payerId: payer.id, start: 2000, end: 3000, items: [
      { workerId: worker.id, totalAmount: "2000000", initialDeposit: "1000000" },
      { workerId: worker2.id, totalAmount: "500000", initialDeposit: "200000" }] });
    expect(result).toEqual({ txHash, streamIds: ["7", "8"], feeTxHash: feeHash });
    expect(gateway.transferFee).toHaveBeenCalledTimes(1);
    expect(gateway.transferFee).toHaveBeenCalledWith(payer, "600");
    expect((await repo.activity(payer.id)).filter(a => a.kind === "fee")).toMatchObject([{ amount: "600", streamId: "7" }]);
  });

  it("keeps the deposit and records a pending fee when the transfer fails", async () => {
    const { service, gateway, repo } = fixture();
    gateway.topUp.mockResolvedValue({ txHash });
    gateway.transferFee.mockRejectedValue(new Error("Falta configurar TREASURY_ADDRESS"));
    await expect(service.topUp("1", payer.id, "40")).resolves.toEqual({ txHash });
    expect(await repo.activity(payer.id)).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "topup", txHash }),
      expect.objectContaining({ kind: "fee", amount: "0.02", txHash: "", explorerUrl: "", note: "fee pendiente" }),
    ]));
  });

  it("rejects a deposit when the balance cannot cover deposit plus fee", async () => {
    const { service, gateway } = fixture();
    gateway.balanceOf.mockResolvedValue("40");
    await expect(service.topUp("1", payer.id, "40")).rejects.toThrow(/comisión/);
    expect(gateway.topUp).not.toHaveBeenCalled();
  });

  it("hides fee rows from the provider", async () => {
    const { service, gateway } = fixture();
    gateway.topUp.mockResolvedValue({ txHash });
    await service.topUp("1", payer.id, "40");
    expect((await service.activity(worker.id)).some(a => a.kind === "fee")).toBe(false);
  });

  it("records the fee in mock mode and debits the payer", async () => {
    const gateway = new MockStreamGateway({ now: () => 1010, balances: { [payer.address]: "1000000" } });
    const repo = new MemoryRepository([payer, worker], []);
    const service = new StreamService(gateway, repo, "mock", () => 1010);
    const result = await service.create({ payerId: payer.id, start: 2000, end: 3000,
      items: [{ workerId: worker.id, totalAmount: "1000000", initialDeposit: "100000" }] });
    expect(result.feeTxHash).toMatch(/^mock:/);
    expect(await gateway.balanceOf(payer.address)).toBe("899950");
    expect(await repo.activity(payer.id)).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "fee", amount: "50", txHash: result.feeTxHash, note: expect.stringContaining("Comisión Continuum 0,05%") })]));
  });
});

describe("fixed Belo destination for demo receivers", () => {
  const belo = "0x5d474d0744284a72afbc4032fd001de50ea72b7c";
  it.each(["mock", "real"] as const)("uses the displayed destination in %s, preserving wallet withdrawals", async mode => {
    const { gateway } = fixture();
    const ana: DemoUser = { ...worker, id: "worker1" };
    const martin: DemoUser = { ...worker, id: "worker2", address: `0x${"3".repeat(40)}`, beloAddress: `0x${"5".repeat(40)}` };
    const repo = new MemoryRepository([payer, ana, martin], [ana, martin].map((u, i) => ({
      id: String(i + 1), payerId: payer.id, workerId: u.id, createdTx: txHash, createdAt: new Date(0).toISOString(),
    })));
    const service = new StreamService(gateway, repo, mode);
    const users = await service.users();
    for (const [i, u] of [ana, martin].entries()) {
      const displayed = users.find(row => row.id === u.id)!;
      expect(displayed.beloAddress).toBe(belo);
      expect(displayed.address).toBe(u.address);
      await service.withdraw(String(i + 1), u.id, "0.1", "belo");
      expect(gateway.withdrawTo).toHaveBeenLastCalledWith(displayed, String(i + 1), belo, "0.1");
      await service.withdraw(String(i + 1), u.id, "0.1", "wallet");
      expect(gateway.withdrawTo).toHaveBeenLastCalledWith(displayed, String(i + 1), u.address, "0.1");
    }
    expect(await repo.user(ana.id)).toEqual(ana);
    expect(await repo.user(martin.id)).toEqual(martin);
    expect(users.find(u => u.id === payer.id)).toEqual(payer);
  });

  it("does not replace destinations for other users or bypass ownership", async () => {
    const { service, gateway } = fixture();
    await expect(service.withdraw("1", worker.id, "0.1", "belo")).rejects.toThrow("dirección válida");
    await expect(service.withdraw("1", payer.id, "0.1", "belo")).rejects.toThrow("permiso");
    expect(gateway.withdrawTo).not.toHaveBeenCalled();
  });
});
