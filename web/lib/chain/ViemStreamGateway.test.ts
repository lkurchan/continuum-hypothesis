import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { encodeAbiParameters, encodeEventTopics, parseAbi, parseAbiParameters, type Address, type Hex, type Log } from "viem";
import { ViemStreamGateway, type ChainIO } from "./ViemStreamGateway";
import { ARGT_ADDRESS } from "./constants";
import type { DemoUser } from "@/lib/domain/types";

// Protocol fixtures from PRD 7; the production ABI remains owned by module A.
const abi = parseAbi([
  "event StreamCreated(uint256 indexed id, address indexed payer, address indexed recipient, address token, uint256 totalAmount, uint64 start, uint64 end)",
  "event ToppedUp(uint256 indexed id, uint256 amount)",
  "event Withdrawn(uint256 indexed id, address indexed to, uint256 amount)",
  "event Canceled(uint256 indexed id, uint256 refundedToPayer, uint256 keptByRecipient)",
]);
const contract: Address = `0x${"a".repeat(40)}`;
const hash: Hex = `0x${"f".repeat(64)}`;
const payer: DemoUser = { id: "platform", name: "Payer", role: "payer", address: `0x${"1".repeat(40)}` };
const worker: DemoUser = { id: "worker1", name: "Worker", role: "worker", address: `0x${"2".repeat(40)}` };
const unit = 10n ** 18n;
const raw = { payer: payer.address, recipient: worker.address, token: ARGT_ADDRESS, totalAmount: 100n * unit, deposited: 80n * unit,
  withdrawn: 0n, start: 100n, end: 200n, canceledAt: 0n };
const log = (eventName: "StreamCreated" | "ToppedUp" | "Withdrawn" | "Canceled", args: Record<string, unknown>, types: string, values: readonly unknown[], emitter = contract): Log<bigint, number, false> => ({
  address: emitter, topics: encodeEventTopics({ abi, eventName, args }) as [Hex, ...Hex[]], data: encodeAbiParameters(parseAbiParameters(types), values),
  blockHash: hash, blockNumber: 1n, transactionHash: hash, transactionIndex: 0, logIndex: 0, removed: false,
});
const created = () => log("StreamCreated", { id: 7n, payer: payer.address, recipient: worker.address }, "address,uint256,uint64,uint64", [ARGT_ADDRESS, 100n * unit, 100n, 200n]);
let io: ChainIO;
let gateway: ViemStreamGateway;

beforeEach(() => {
  io = {
    chainId: vi.fn().mockResolvedValue(42161),
    read: vi.fn<ChainIO["read"]>(async (_address, _abi, name) => {
      if (name === "decimals") return 18;
      if (name === "balanceOf") return 1000n * unit;
      if (name === "allowance") return 0n;
      if (name === "getStream") return { ...raw };
      if (name === "withdrawableAmount") return 50n * unit;
      throw new Error("Unexpected read");
    }),
    send: vi.fn<ChainIO["send"]>(async (_user, _address, _abi, name) => ({ transactionHash: hash, status: "success", logs:
      name === "createStreamsBatch" ? [created()] : name === "topUp" ? [log("ToppedUp", { id: 7n }, "uint256", [10n * unit])] :
      name === "withdrawTo" ? [log("Withdrawn", { id: 7n, to: worker.address }, "uint256", [20n * unit])] :
      name === "cancel" ? [log("Canceled", { id: 7n }, "uint256,uint256", [30n * unit, 50n * unit])] : [] })),
  };
  gateway = new ViemStreamGateway({ contract, token: ARGT_ADDRESS, abi, io, now: () => 150 });
});
const create = () => gateway.createStreams(payer, [{ worker, totalAmount: "100", initialDeposit: "80" }], 100, 200);

describe("real gateway with simulated chain I/O", () => {
  it("approves exact funding and obtains IDs from confirmed contract events", async () => {
    expect(await create()).toEqual({ txHash: hash, streamIds: ["7"] });
    expect(vi.mocked(io.send).mock.calls.map(c => c[3])).toEqual(["approve", "createStreamsBatch"]);
    expect(vi.mocked(io.send).mock.calls[0][4]).toEqual([contract, 80n * unit]);
  });
  it("reuses sufficient allowance and resets an insufficient nonzero allowance", async () => {
    const read = io.read;
    io.read = vi.fn((a, b, name, args) => name === "allowance" ? Promise.resolve(100n * unit) : read(a, b, name, args));
    await create();
    expect(vi.mocked(io.send).mock.calls.map(c => c[3])).toEqual(["createStreamsBatch"]);
    vi.mocked(io.send).mockClear();
    io.read = vi.fn((a, b, name, args) => name === "allowance" ? Promise.resolve(1n) : read(a, b, name, args));
    await create();
    expect(vi.mocked(io.send).mock.calls.map(c => c[3])).toEqual(["approve", "approve", "createStreamsBatch"]);
    expect(vi.mocked(io.send).mock.calls[0][4]).toEqual([contract, 0n]);
  });
  it("supports reads, top-up, withdrawal and cancellation receipts", async () => {
    expect(await gateway.getStream("7")).toMatchObject({ totalAmount: "100", deposited: "80", withdrawn: "0", start: 100, end: 200, status: "streaming" });
    expect(await gateway.balanceOf(worker.address)).toBe("1000");
    expect(await gateway.topUp(payer, "7", "10")).toEqual({ txHash: hash });
    expect(await gateway.withdrawTo(worker, "7", worker.address, "20")).toEqual({ txHash: hash });
    expect(await gateway.cancel(payer, "7")).toEqual({ txHash: hash, refunded: "30", kept: "50" });
  });
  it("rejects the wrong chain before sending", async () => {
    vi.mocked(io.chainId).mockResolvedValue(1);
    await expect(create()).rejects.toThrow("Arbitrum One");
    expect(io.send).not.toHaveBeenCalled();
  });
  it("rejects insufficient funding, excess withdrawal and wrong ownership", async () => {
    await expect(gateway.withdrawTo(worker, "7", worker.address, "51")).rejects.toThrow("disponible");
    await expect(gateway.topUp(payer, "7", "21")).rejects.toThrow("total");
    await expect(gateway.cancel({ ...payer, address: worker.address }, "7")).rejects.toMatchObject({ status: 403 });
    const read = io.read;
    io.read = vi.fn((a, b, name, args) => name === "balanceOf" ? Promise.resolve(1n) : read(a, b, name, args));
    await expect(create()).rejects.toThrow("Saldo insuficiente");
    expect(io.send).not.toHaveBeenCalled();
  });
  it("does not accept reverted receipts or events from another contract", async () => {
    vi.mocked(io.send).mockResolvedValue({ transactionHash: hash, status: "reverted", logs: [] });
    await expect(create()).rejects.toThrow("revirtió");
    vi.mocked(io.send).mockResolvedValue({ transactionHash: hash, status: "success", logs: [{ ...created(), address: worker.address }] });
    await expect(create()).rejects.toThrow(`La transacción ${hash} fue confirmada`);
  });
  it("serializes wallet transactions and recovers the queue after failure", async () => {
    let active = 0;
    let maximum = 0;
    const send = io.send;
    io.send = vi.fn<ChainIO["send"]>(async (...args) => {
      active++;
      maximum = Math.max(maximum, active);
      await Promise.resolve();
      const result = await send(...args);
      active--;
      return result;
    });
    await expect(gateway.topUp(payer, "7", "100")).rejects.toThrow();
    await Promise.all([create(), create()]);
    expect(maximum).toBe(1);
  });
  it("fails closed without the production ABI and redacts provider errors", async () => {
    expect(() => new ViemStreamGateway({ contract, token: ARGT_ADDRESS, abi: [], io })).toThrow("ABI");
    vi.mocked(io.read).mockRejectedValue(new Error("https://rpc.example/secret-key"));
    await expect(create()).rejects.toThrow("No se pudo completar");
  });
});
