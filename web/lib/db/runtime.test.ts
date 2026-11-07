import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getBackend, resetMockBackend } from "./runtime";
import { getGateway } from "@/lib/chain/StreamGateway";

afterEach(() => { vi.unstubAllEnvs(); });
it("shares the mock service and gateway across requests without credentials", async () => {
  vi.stubEnv("CHAIN_MODE", "mock");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  expect(getBackend()).toBe(getBackend());
  expect(getGateway()).toBe(getBackend().gateway);
  expect(await getBackend().service.users()).toHaveLength(3);
});
it("fails closed for unknown modes and incomplete real configuration", () => {
  vi.stubEnv("CHAIN_MODE", "invalid");
  expect(() => getBackend()).toThrow("CHAIN_MODE");
  vi.stubEnv("CHAIN_MODE", "real");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  expect(() => getBackend()).toThrow("Supabase");
});
it("resets the in-memory demo only in mock mode", async () => {
  vi.stubEnv("CHAIN_MODE", "mock");
  const before = getBackend();
  await before.service.withdraw("0", "worker1", "1", "wallet");
  expect(resetMockBackend()).toBe(true);
  const after = getBackend();
  expect(after).not.toBe(before);
  expect((await after.service.streams("worker1"))[0].withdrawn).toBe("0");
  vi.stubEnv("CHAIN_MODE", "real");
  expect(resetMockBackend()).toBe(false);
});
