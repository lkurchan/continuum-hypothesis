import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { MockStreamGateway } from "./MockStreamGateway";
import type { DemoUser } from "@/lib/domain/types";

const payer: DemoUser = { id: "platform", name: "Platform", role: "payer", address: `0x${"1".repeat(40)}` };
const worker: DemoUser = { id: "worker1", name: "Worker", role: "worker", address: `0x${"2".repeat(40)}` };
const other: DemoUser = { ...worker, id: "worker2", address: `0x${"3".repeat(40)}` };
let now: number;
let gateway: MockStreamGateway;
const item = { worker, totalAmount: "100", initialDeposit: "80" };

beforeEach(() => { now = 150; gateway = new MockStreamGateway({ now: () => now, balances: { [payer.address]: "200" } }); });

describe("mock contract rules", () => {
  it("creates an atomic batch and reserves exactly the funding", async () => {
    const result = await gateway.createStreams(payer, [item, { ...item, worker: other }], 100, 200);
    expect(result.streamIds).toEqual(["0", "1"]);
    expect(result.txHash).toMatch(/^mock:/);
    expect(await gateway.balanceOf(payer.address)).toBe("40");
    await expect(gateway.createStreams(payer, [item], 100, 200)).rejects.toThrow("Saldo insuficiente");
    await expect(gateway.getStream("2")).rejects.toThrow("inexistente");
  });
  it("does not partially create an invalid batch", async () => {
    await expect(gateway.createStreams(payer, [item, { ...item, initialDeposit: "101" }], 100, 200)).rejects.toThrow();
    expect(await gateway.balanceOf(payer.address)).toBe("200");
    expect((await gateway.createStreams(payer, [item], 100, 200)).streamIds).toEqual(["0"]);
  });
  it("enforces worker and payer ownership", async () => {
    await gateway.createStreams(payer, [item], 100, 200);
    await expect(gateway.withdrawTo(other, "0", other.address, "1")).rejects.toMatchObject({ status: 403 });
    await expect(gateway.topUp({ ...payer, id: "other" }, "0", "1")).rejects.toMatchObject({ status: 403 });
    await expect(gateway.cancel(worker, "0")).rejects.toMatchObject({ status: 403 });
  });
  it("limits top-up and withdrawals including concurrent requests", async () => {
    await gateway.createStreams(payer, [{ ...item, initialDeposit: "20" }], 100, 200);
    await expect(gateway.withdrawTo(worker, "0", worker.address, "21")).rejects.toThrow("disponible");
    await gateway.topUp(payer, "0", "40");
    await expect(gateway.topUp(payer, "0", "41")).rejects.toThrow("total");
    const results = await Promise.allSettled([gateway.withdrawTo(worker, "0", worker.address, "40"), gateway.withdrawTo(worker, "0", worker.address, "40")]);
    expect(results.map(r => r.status)).toEqual(["fulfilled", "rejected"]);
    expect((await gateway.getStream("0")).withdrawn).toBe("40");
  });
  it("refunds unearned funds and preserves withdrawals after cancellation", async () => {
    await gateway.createStreams(payer, [item], 100, 200);
    await gateway.withdrawTo(worker, "0", worker.address, "20");
    expect(await gateway.cancel(payer, "0")).toMatchObject({ refunded: "30", kept: "50" });
    now = 300;
    await gateway.withdrawTo(worker, "0", worker.address, "30");
    expect(await gateway.balanceOf(worker.address)).toBe("50");
    expect(await gateway.balanceOf(payer.address)).toBe("150");
    expect((await gateway.getStream("0")).status).toBe("canceled");
    await expect(gateway.withdrawTo(worker, "0", worker.address, "0.000000000000000001")).rejects.toThrow();
    await expect(gateway.cancel(payer, "0")).rejects.toThrow();
    await expect(gateway.topUp(payer, "0", "1")).rejects.toThrow();
  });
  it("handles pre-start cancellation and underfunded cancellation", async () => {
    await gateway.createStreams(payer, [item], 200, 300);
    expect(await gateway.cancel(payer, "0")).toMatchObject({ refunded: "80", kept: "0" });
    await gateway.createStreams(payer, [{ ...item, initialDeposit: "10" }], 100, 200);
    expect(await gateway.cancel(payer, "1")).toMatchObject({ refunded: "0", kept: "10" });
  });
});
