import { describe, expect, it, vi } from "vitest";
import type { StreamGateway } from "@/lib/chain/StreamGateway";
import { MemoryRepository } from "@/lib/db/MemoryRepository";
import { StreamService } from "./StreamService";
import type { DemoUser } from "./types";

const payer: DemoUser = { id: "payer", name: "Payer", role: "payer", address: `0x${"1".repeat(40)}` };
const worker: DemoUser = { id: "worker", name: "Worker", role: "worker", address: `0x${"2".repeat(40)}` };
const txHash = `0x${"a".repeat(64)}`;

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
    balanceOf: vi.fn<StreamGateway["balanceOf"]>(),
  } satisfies StreamGateway;
  return { repo, gateway, service: new StreamService(gateway, repo, "real", () => 1010) };
}

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
