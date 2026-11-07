import { describe, expect, it, vi } from "vitest";
import { amount, apiClient, seedDemo, seedIntent } from "./lib/demo-api.mjs";

function fixture() {
  const users = ["platform", "worker1", "worker2"].map((id, index) => ({ id, role: index ? "worker" : "payer", address: `0x${String(index + 1).repeat(40)}` }));
  let saved: Record<string, unknown> | null = null;
  let request: { payerId: string; items: { workerId: string; totalAmount: string; initialDeposit: string }[]; start: number; end: number };
  const result = { txHash: "mock:receipt", streamIds: ["2", "3"] };
  const api = { mode: "mock", origin: "http://127.0.0.1:3000", request: vi.fn(async (path: string, payload?: typeof request) => {
    if (path === "/api/users") return users;
    if (path === "/api/streams") { request = payload!; return result; }
    if (path.startsWith("/api/streams?")) return request ? request.items.map((item, index) => ({ id: result.streamIds[index], payerId: request.payerId, workerId: item.workerId,
      totalAmount: item.totalAmount, start: request.start, end: request.end, canceledAt: null })) : [];
    return request.items.map((item, index) => ({ streamId: result.streamIds[index], kind: "create", amount: item.initialDeposit, txHash: result.txHash }));
  }) };
  const journal = { read: vi.fn(async () => saved), create: vi.fn(async (record: Record<string, unknown>) => { saved = record; }),
    save: vi.fn(async (record: Record<string, unknown>) => { saved = record; }) };
  return { api, journal, saved: () => saved };
}

describe("API seed operations", () => {
  it("validates exact decimal amounts, aggregate overflow and duration", () => {
    expect(amount("12345678901234567890.123456789012345678")).toBe("12345678901234567890.123456789012345678");
    expect(() => amount("1.0000000000000000001")).toThrow("18");
    expect(() => seedIntent({ totalAmount: "1", initialDeposit: "2" })).toThrow("depósito");
    expect(() => seedIntent({ duration: 0 })).toThrow("Duración");
    expect(() => seedIntent({ workerIds: ["worker1", "worker1"] })).toThrow("repetidos");
    expect(() => seedIntent({ totalAmount: "1" + "0".repeat(59), initialDeposit: "1" + "0".repeat(59) })).toThrow("lote");
  });

  it("does not send POST or create a journal during a dry-run", async () => {
    const { api, journal } = fixture();
    const plan = await seedDemo(api, {}, journal, () => 1000);
    expect(plan).toMatchObject({ dryRun: true, request: { start: 1000, end: 1900 } });
    expect(api.request).not.toHaveBeenCalledWith("/api/streams", expect.anything());
    expect(journal.create).not.toHaveBeenCalled();
  });

  it("records intent before sending, verifies metadata/activity and reuses the receipt", async () => {
    const { api, journal, saved } = fixture();
    await seedDemo(api, { execute: true }, journal, () => 1000);
    expect(saved()).toMatchObject({ state: "verified", result: { streamIds: ["2", "3"] } });
    expect(journal.create.mock.invocationCallOrder[0]).toBeLessThan(api.request.mock.invocationCallOrder[2]);
    expect(await seedDemo(api, { execute: true }, journal)).toMatchObject({ reused: true });
    expect(api.request.mock.calls.filter(([path]) => path === "/api/streams")).toHaveLength(1);
    await expect(seedDemo(api, { execute: true, totalAmount: "20" }, journal)).rejects.toThrow("otra operación");
  });

  it("does not resend after an ambiguous response or journal failure", async () => {
    const { api, journal } = fixture();
    const original = api.request.getMockImplementation()!;
    api.request.mockImplementation(async (path, payload) => {
      if (payload) throw new Error("connection lost");
      return original(path, payload);
    });
    await expect(seedDemo(api, { execute: true }, journal, () => 1000)).rejects.toThrow("connection lost");
    await expect(seedDemo(api, { execute: true }, journal)).rejects.toThrow("pendiente");
    expect(api.request.mock.calls.filter(([path]) => path === "/api/streams")).toHaveLength(1);
    const second = fixture();
    second.journal.create.mockRejectedValue(new Error("disk full"));
    await expect(seedDemo(second.api, { execute: true }, second.journal)).rejects.toThrow("disk full");
    expect(second.api.request.mock.calls.some(([path]) => path === "/api/streams")).toBe(false);
  });

  it("retains the confirmed receipt if its SQL history is missing", async () => {
    const { api, journal, saved } = fixture();
    const original = api.request.getMockImplementation()!;
    api.request.mockImplementation((path, payload) => path.startsWith("/api/activity") ? Promise.resolve([]) : original(path, payload));
    await expect(seedDemo(api, { execute: true }, journal, () => 1000)).rejects.toThrow("Falta actividad");
    expect(saved()).toMatchObject({ state: "confirmed", result: { txHash: "mock:receipt" } });
    await expect(seedDemo(api, { execute: true }, journal)).rejects.toThrow("Falta actividad");
    expect(api.request.mock.calls.filter(([path]) => path === "/api/streams")).toHaveLength(1);
  });

  it("refuses seeds when a target worker already has an active stream", async () => {
    const { api, journal } = fixture();
    const original = api.request.getMockImplementation()!;
    api.request.mockImplementation((path, payload) => path.startsWith("/api/streams?") ? Promise.resolve([{ id: "5", payerId: "platform", workerId: "worker1", totalAmount: "10", start: 1000, end: 2000, canceledAt: null }]) : original(path, payload));
    await expect(seedDemo(api, { execute: true }, journal, () => 1000)).rejects.toThrow("No se duplicará");
    expect(journal.create).not.toHaveBeenCalled();
  });

  it("rejects mode mismatches and hides upstream errors while preserving transaction hashes", async () => {
    const fetcher = vi.fn(async () => Response.json([], { headers: { "X-Chain-Mode": "real" } }));
    const api = apiClient("http://127.0.0.1:3000", "mock", fetcher);
    await expect(api.request("/api/users")).rejects.toThrow("modo");
    fetcher.mockResolvedValue(Response.json({ error: `secret-rpc-token transaction 0x${"a".repeat(64)}` }, { status: 503, headers: { "X-Chain-Mode": "mock" } }));
    await expect(api.request("/api/users")).rejects.toThrow(`0x${"a".repeat(64)}`);
    await expect(api.request("/api/users")).rejects.not.toThrow("secret-rpc-token");
    expect(() => apiClient("http://external.example", "real")).toThrow("HTTPS");
    expect(() => apiClient("https://user:secret@example.com", "real")).toThrow("credenciales");
  });
});
