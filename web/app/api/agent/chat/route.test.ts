import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/runtime", () => ({ getBackend: () => backend }));
import { createDemoBackend } from "@/lib/db/demo";
import { POST } from "./route";

let backend: ReturnType<typeof createDemoBackend>;
const request = (messages: unknown, userId = "worker1") => new Request("http://localhost/api/agent/chat", {
  method: "POST", body: JSON.stringify({ userId, messages }),
});
beforeEach(() => {
  backend = createDemoBackend(() => 1000);
  vi.stubEnv("ANTHROPIC_API_KEY", "");
});
afterEach(() => vi.unstubAllEnvs());

it.each([null, 1, "message", [], {}, { role: "user", content: "" }])("rejects malformed message entries (%j) without a provider call", async (entry) => {
  const result = await POST(request([entry]));
  expect(result.status).toBe(400);
  expect(await result.json()).toEqual({ error: "Mensaje inválido." });
});

it("reports missing provider configuration for a valid worker conversation", async () => {
  const result = await POST(request([{ role: "user", content: "¿Cuánto puedo retirar?" }]));
  expect(result.status).toBe(503);
  expect(result.headers.get("Cache-Control")).toBe("no-store");
});

it("rejects a payer conversation before checking provider configuration", async () => {
  const result = await POST(request([{ role: "user", content: "Hola" }], "platform"));
  expect(result.status).toBe(403);
});
