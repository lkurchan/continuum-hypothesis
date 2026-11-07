import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createClient } from "@supabase/supabase-js";
import { SupabaseRepository } from "./SupabaseRepository";

const stream = { id: "7", payer_id: "platform", worker_id: "worker1", label: null, created_tx: "0xabc", created_at: "2026-11-07T10:00:00Z" };
const amount = "9007199254740993.000000000000000001";
const event = { id: "00000000-0000-4000-8000-000000000001", stream_id: "7", kind: "withdraw", amount,
  tx_hash: "0xabc", user_id: "worker1", note: null, created_at: stream.created_at };

function fixture() {
  const fetcher = vi.fn<typeof fetch>(async input => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input : input.url);
    if (url.pathname.endsWith("/streams")) return Response.json([stream]);
    if (url.pathname.endsWith("/activity")) return Response.json([event]);
    if (url.pathname.endsWith("/users")) return Response.json([{ id: "worker1", name: "Ana", role: "worker", address: `0x${"2".repeat(40)}`, belo_address: null, avatar_url: null, private_key: "must-not-leak" }]);
    return new Response(null, { status: 204 });
  });
  const client = createClient("https://database.example.invalid", "test-service-key", { global: { fetch: fetcher }, auth: { persistSession: false, autoRefreshToken: false } });
  return { fetcher, repo: new SupabaseRepository(client) };
}

it("reads numeric amounts as text and filters activity by participating streams", async () => {
  const { fetcher, repo } = fixture();
  const activity = await repo.activity("platform");
  expect(activity[0].amount).toBe(amount);
  expect(activity[0].userId).toBe("worker1");
  const url = new URL(String(fetcher.mock.calls[1][0]));
  expect(url.searchParams.get("select")).toContain("amount::text");
  expect(url.searchParams.get("stream_id")).toBe("in.(7)");
});
it("whitelists public user fields", async () => {
  const { repo } = fixture();
  const users = await repo.users();
  expect(users).toHaveLength(1);
  expect(JSON.stringify(users)).not.toContain("private_key");
});
it("records the creation batch and activities in one RPC without rounding amounts", async () => {
  const { fetcher, repo } = fixture();
  await repo.recordCreation([{ id: "7", payerId: "platform", workerId: "worker1", createdTx: "0xabc", createdAt: stream.created_at }],
    [{ id: event.id, streamId: "7", kind: "create", amount, txHash: "0xabc", explorerUrl: "", userId: "platform", createdAt: stream.created_at }]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(String(fetcher.mock.calls[0][0])).toContain("/rpc/record_stream_creation");
  const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
  expect(body.p_activity[0].amount).toBe(amount);
  expect(body.p_streams[0].worker_id).toBe("worker1");
});
it("redacts database error details", async () => {
  const { fetcher, repo } = fixture();
  fetcher.mockResolvedValue(Response.json({ message: "database password and internals" }, { status: 500 }));
  await expect(repo.users()).rejects.toThrow("No se pudo acceder a la base de datos.");
});
