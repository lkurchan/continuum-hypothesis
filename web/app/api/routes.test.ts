import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/runtime", () => ({ getBackend: () => backend }));
import { createDemoBackend } from "@/lib/db/demo";
import { GET as users } from "./users/route";
import { GET as streams, POST as create } from "./streams/route";
import { GET as activity } from "./activity/route";
import { POST as topup } from "./streams/[id]/topup/route";
import { POST as withdraw } from "./streams/[id]/withdraw/route";
import { POST as cancel } from "./streams/[id]/cancel/route";

let backend: ReturnType<typeof createDemoBackend>;
const context = (id = "0") => ({ params: Promise.resolve({ id }) });
const get = (path: string) => new Request(`http://localhost/api/${path}`);
const post = (path: string, value?: unknown) => new Request(`http://localhost/api/${path}`, {
  method: "POST", headers: { "Content-Type": "application/json" }, ...(value === undefined ? {} : { body: JSON.stringify(value) }),
});
const input = { payerId: "platform", items: [{ workerId: "worker1", totalAmount: "100", initialDeposit: "20" }], start: 950, end: 1050 };
beforeEach(() => { backend = createDemoBackend(() => 1000); });

describe("HTTP contract", () => {
  it("serves public demo users and isolates streams and activity", async () => {
    const result = await users(get("users"));
    expect(result.status).toBe(200);
    expect(result.headers.get("X-Chain-Mode")).toBe("mock");
    expect(result.headers.get("Cache-Control")).toBe("no-store");
    expect((await result.json()).map((u: { id: string }) => u.id)).toEqual(["platform", "worker1", "worker2"]);
    expect((await (await streams(get("streams?userId=worker1"))).json()).map((s: { id: string }) => s.id)).toEqual(["0"]);
    expect((await (await activity(get("activity?userId=worker2"))).json()).map((s: { streamId: string }) => s.streamId)).toEqual(["1"]);
  });
  it("creates, funds, withdraws to Belo, cancels and withdraws the remainder", async () => {
    const creation = await create(post("streams", input));
    expect(creation.status).toBe(201);
    const result = await creation.json();
    expect(result.streamIds).toEqual(["2"]);
    expect(result.txHash).toMatch(/^mock:/);
    expect((await topup(post("streams/2/topup", { userId: "platform", amount: "60" }), context("2"))).status).toBe(200);
    expect((await withdraw(post("streams/2/withdraw", { userId: "worker1", amount: "20", destination: "belo" }), context("2"))).status).toBe(200);
    expect(await backend.gateway.balanceOf(`0x${"4".repeat(40)}`)).toBe("20");
    expect(await (await cancel(post("streams/2/cancel?userId=platform"), context("2"))).json()).toMatchObject({ refunded: "30", kept: "50" });
    expect((await withdraw(post("streams/2/withdraw?userId=worker1", { amount: "30", destination: "wallet" }), context("2"))).status).toBe(200);
    const list = await (await streams(get("streams?userId=worker1"))).json();
    expect(list.find((s: { id: string }) => s.id === "2")).toMatchObject({ withdrawn: "50", deposited: "50", canceledAt: 1000, status: "canceled" });
    const payerActivity = await (await activity(get("activity?userId=platform"))).json();
    expect(payerActivity.filter((a: { streamId: string }) => a.streamId === "2").map((a: { kind: string }) => a.kind)).toEqual(["create", "topup", "withdraw", "cancel", "withdraw"]);
    expect(payerActivity.every((a: { explorerUrl: string; note: string }) => a.explorerUrl === "" && a.note.includes("Simulación"))).toBe(true);
  });
  it("rejects missing, conflicting or unauthorized identities", async () => {
    expect((await streams(get("streams"))).status).toBe(400);
    expect((await activity(get("activity?userId=missing"))).status).toBe(404);
    expect((await create(post("streams", { ...input, userId: "worker1" }))).status).toBe(403);
    expect((await topup(post("streams/0/topup?userId=worker1", { userId: "platform", amount: "1" }), context())).status).toBe(400);
    expect((await withdraw(post("streams/0/withdraw", { userId: "worker2", amount: "1", destination: "wallet" }), context())).status).toBe(403);
    expect((await cancel(post("streams/0/cancel?userId=worker1"), context())).status).toBe(403);
  });
  it.each([null, [], { ...input, start: 1000, end: 1000 }, { ...input, items: [] },
    { ...input, items: [{ workerId: "worker1", totalAmount: 100, initialDeposit: "0" }] },
    { ...input, items: [{ workerId: "worker1", totalAmount: "10", initialDeposit: "11" }] }])("rejects invalid creation input", async value => {
    expect((await create(post("streams", value))).status).toBe(400);
    expect(await backend.service.streams("platform")).toHaveLength(2);
  });
  it("rejects malformed JSON, excessive withdrawals, unknown IDs and destinations", async () => {
    expect((await create(new Request("http://localhost/api/streams", { method: "POST", body: "{" }))).status).toBe(400);
    expect((await withdraw(post("streams/0/withdraw", { userId: "worker1", amount: "6000.000000000000000001", destination: "wallet" }), context())).status).toBe(409);
    expect((await withdraw(post("streams/0/withdraw", { userId: "worker1", amount: "1", destination: "external" }), context())).status).toBe(400);
    expect((await cancel(post("streams/999/cancel?userId=platform"), context("999"))).status).toBe(404);
  });
  it("reports confirmed transactions on persistence failure without submitting twice", async () => {
    vi.spyOn(backend.repository, "recordCreation").mockRejectedValue(new Error("private database details"));
    const send = vi.spyOn(backend.gateway, "createStreams");
    const response = await create(post("streams", input));
    expect(response.status).toBe(503);
    const message = (await response.json()).error;
    expect(message).toMatch(/mock:.*confirmada/);
    expect(message).toContain("No repitas");
    expect(message).not.toContain("private database");
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("never leaks unexpected provider errors", async () => {
    vi.spyOn(backend.service, "users").mockRejectedValue(new Error("secret rpc key"));
    const response = await users(get("users"));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("secret");
  });
});
