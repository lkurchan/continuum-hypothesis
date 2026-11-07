import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const clients = vi.hoisted(() => ({
  public: { simulateContract: vi.fn(), waitForTransactionReceipt: vi.fn(), getChainId: vi.fn(), readContract: vi.fn() },
  wallet: { writeContract: vi.fn() },
}));
vi.mock("viem", async importOriginal => ({ ...await importOriginal<typeof import("viem")>(),
  createPublicClient: () => clients.public, createWalletClient: () => clients.wallet,
}));
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createViemIO } from "./ViemStreamGateway";
import { erc20Abi } from "viem";
import { ARGT_ADDRESS } from "./constants";
import type { DemoUser } from "@/lib/domain/types";

const key = generatePrivateKey(); // Ephemeral test-only identity; never funded or persisted.
const user: DemoUser = { id: "worker1", name: "Worker", role: "worker", address: privateKeyToAccount(key).address };
const hash = `0x${"f".repeat(64)}`;
beforeEach(() => {
  vi.clearAllMocks();
  clients.public.simulateContract.mockResolvedValue({ request: { simulated: true } });
  clients.wallet.writeContract.mockResolvedValue(hash);
  clients.public.waitForTransactionReceipt.mockResolvedValue({ status: "success", transactionHash: hash, logs: [] });
});

it("simulates with the matching account, signs the returned request and waits for confirmation", async () => {
  const io = createViemIO("https://rpc.example.invalid", () => key);
  await io.send(user, ARGT_ADDRESS, erc20Abi, "approve", [user.address, 1n]);
  expect(clients.public.simulateContract.mock.calls[0][0].account.address).toBe(user.address);
  expect(clients.wallet.writeContract).toHaveBeenCalledWith({ simulated: true });
  expect(clients.public.waitForTransactionReceipt).toHaveBeenCalledWith({ hash, confirmations: 1, timeout: 60000 });
});
it("rejects missing keys and keys that do not match the demo wallet before signing", async () => {
  const missing = createViemIO("https://rpc.example.invalid", () => undefined);
  await expect(missing.send(user, ARGT_ADDRESS, erc20Abi, "approve", [])).rejects.toThrow("clave demo");
  const mismatch = createViemIO("https://rpc.example.invalid", () => generatePrivateKey());
  await expect(mismatch.send(user, ARGT_ADDRESS, erc20Abi, "approve", [])).rejects.toThrow("no corresponde");
  expect(clients.wallet.writeContract).not.toHaveBeenCalled();
});
it("reports the submitted hash on receipt timeout and does not resubmit", async () => {
  clients.public.waitForTransactionReceipt.mockRejectedValue(new Error("private RPC details"));
  const io = createViemIO("https://rpc.example.invalid", () => key);
  await expect(io.send(user, ARGT_ADDRESS, erc20Abi, "approve", [])).rejects.toThrow(`La transacción ${hash} fue enviada`);
  expect(clients.wallet.writeContract).toHaveBeenCalledTimes(1);
});
it("marks an ambiguous submission explicitly and redacts RPC errors", async () => {
  clients.wallet.writeContract.mockRejectedValue(new Error("secret RPC token"));
  const io = createViemIO("https://rpc.example.invalid", () => key);
  await expect(io.send(user, ARGT_ADDRESS, erc20Abi, "approve", [])).rejects.toThrow("Revisá la wallet");
  expect(clients.public.waitForTransactionReceipt).not.toHaveBeenCalled();
});
