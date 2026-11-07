import { describe, expect, it, vi } from "vitest";
import { zeroAddress } from "viem";
import { checkReadiness, database, syncWallets, tokenAddress, walletPlan, walletUpdates } from "./lib/readiness.mjs";

const env = { CHAIN_MODE: "mock", ARBITRUM_RPC_URL: "https://rpc.example/private-token",
  STREAMS_CONTRACT_ADDRESS: `0x${"a".repeat(40)}`, DEMO_PK_PLATFORM: `0x${"1".repeat(64)}`,
  DEMO_PK_WORKER1: `0x${"2".repeat(64)}`, DEMO_PK_WORKER2: `0x${"3".repeat(64)}` };

describe("operator readiness and wallets", () => {
  it("derives public addresses without exposing keys and rejects repeated/invalid keys", () => {
    const wallets = walletPlan(env);
    expect(wallets.map(wallet => wallet.id)).toEqual(["platform", "worker1", "worker2"]);
    expect(JSON.stringify(wallets)).not.toContain(env.DEMO_PK_PLATFORM);
    expect(() => walletPlan({ ...env, DEMO_PK_WORKER1: env.DEMO_PK_PLATFORM })).toThrow("distinta");
    expect(() => walletPlan({ ...env, DEMO_PK_PLATFORM: `0x${"0".repeat(64)}` })).toThrow("rango");
    expect(() => walletPlan({ ...env, DEMO_PK_WORKER2: undefined })).toThrow("worker2");
  });

  it("refuses a public key in place of a privileged Supabase key", () => {
    expect(() => database({ NEXT_PUBLIC_SUPABASE_URL: "https://db.example", SUPABASE_SERVICE_ROLE_KEY: "sb_publishable_public" })).toThrow("servidor");
    expect(() => database({ NEXT_PUBLIC_SUPABASE_URL: "https://user:password@db.example", SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test" })).toThrow("credenciales");
  });

  it("allows only matching wallets or zero placeholders with the expected roles", () => {
    const wallets = walletPlan(env);
    expect(walletUpdates(wallets, wallets).every((item: { change: boolean }) => !item.change)).toBe(true);
    const placeholders = wallets.map(wallet => ({ ...wallet, address: zeroAddress }));
    expect(walletUpdates(wallets, placeholders).every((item: { change: boolean }) => item.change)).toBe(true);
    expect(() => walletUpdates(wallets, [{ ...wallets[0], address: wallets[1].address }, ...wallets.slice(1)])).toThrow("No se sobrescribe");
    expect(() => walletUpdates(wallets, [{ ...wallets[0], role: "worker" }, ...wallets.slice(1)])).toThrow("rol");
    expect(() => walletUpdates(wallets, [])).toThrow("seed.sql");
  });

  it("keeps wallet dry-runs read-only and detects changes during apply", async () => {
    const wallets = walletPlan(env);
    const rows = wallets.map(wallet => ({ ...wallet, address: zeroAddress }));
    const update = vi.fn(() => query);
    const query = { select: vi.fn(() => query), in: vi.fn(async () => ({ data: rows, error: null })),
      update, eq: vi.fn(() => query), then: (accept: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(accept) };
    const db = { from: vi.fn(() => query) };
    await syncWallets(db, wallets);
    expect(update).not.toHaveBeenCalled();
    await expect(syncWallets(db, wallets, true)).rejects.toThrow("base pudo cambiar");
    expect(query.eq).toHaveBeenCalledWith("address", zeroAddress);
    expect(update).toHaveBeenCalledWith({ address: wallets[0].address });
  });

  it("reports wrong-chain and missing-database failures without leaking provider details", async () => {
    const chain = { getChainId: vi.fn(async () => 1), readContract: vi.fn() };
    const report = await checkReadiness(env, { chain });
    expect(report.ready).toBe(false);
    expect(report.checks).toContainEqual(expect.objectContaining({ name: "red", status: "error" }));
    expect(report.checks).toContainEqual(expect.objectContaining({ name: "supabase", status: "error" }));
    expect(chain.readContract).not.toHaveBeenCalled();
    expect(JSON.stringify(report)).not.toContain("private-token");
  });

  it("checks token, gas, schema and database wallet correspondence independently", async () => {
    const wallets = walletPlan(env);
    const query = { select: () => query, limit: async () => ({ error: null, data: [] }), in: async () => ({ error: null, data: wallets }) };
    const chain = { getChainId: async () => 42161, getCode: async () => "0x1234", getBalance: async () => 1n,
      readContract: async ({ functionName }: { functionName: string }) => functionName === "decimals" ? 18 : 1n };
    const dependencies = { chain, db: { from: () => query }, schema: async () => ({ paths: { "/rpc/record_stream_creation": { post: {} } } }) };
    expect((await checkReadiness({ ...env, ARGT_ADDRESS: tokenAddress }, dependencies)).ready).toBe(true);
    const noFunds = await checkReadiness(env, { ...dependencies, chain: { ...chain, getBalance: async () => 0n } });
    expect(noFunds.checks.filter(check => check.name.startsWith("saldo:")).every(check => check.status === "error")).toBe(true);
    const wrongToken = await checkReadiness({ ...env, ARGT_ADDRESS: zeroAddress }, dependencies);
    expect(wrongToken.checks).toContainEqual(expect.objectContaining({ name: "token", status: "error" }));
    const missingRpc = await checkReadiness(env, { ...dependencies, schema: async () => ({ paths: {} }) });
    expect(missingRpc.ready).toBe(false);
  });
});
