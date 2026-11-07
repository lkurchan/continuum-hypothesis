import { afterEach, beforeEach, expect, it, vi } from "vitest";
import OpenAI from "openai";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
const { complete } = vi.hoisted(() => ({ complete: vi.fn() }));
vi.mock("openai", async (original) => {
  const sdk = await original<typeof import("openai")>();
  return { ...sdk, default: class extends sdk.default {
    constructor() {
      super({ apiKey: "test-only" });
      this.chat.completions.create = complete;
    }
  } };
});
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/runtime", () => ({ getBackend: () => backend }));
import { createDemoBackend } from "@/lib/db/demo";
import { POST } from "./route";
import { PROPOSAL_SEPARATOR } from "@/lib/agent/proposal";

let backend: ReturnType<typeof createDemoBackend>;
const request = (messages: unknown, userId = "worker1") => new Request("http://localhost/api/agent/chat", {
  method: "POST", body: JSON.stringify({ userId, messages }),
});
beforeEach(() => {
  backend = createDemoBackend(() => 1000);
  complete.mockReset();
  vi.stubEnv("CHAIN_MODE", "mock");
  vi.stubEnv("DEMO_AUTH_PASSWORD_HASH", "");
  vi.stubEnv("DEMO_AUTH_SECRET", "");
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("OPENAI_MODEL", "test-model");
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

it("accepts a client conversation and reports missing provider configuration", async () => {
  const result = await POST(request([{ role: "user", content: "¿Hasta cuándo estoy cubierto?" }], "platform"));
  expect(result.status).toBe(503);
});

it("rejects unknown users before checking provider configuration", async () => {
  const result = await POST(request([{ role: "user", content: "Hola" }], "nobody"));
  expect(result.status).toBe(404);
});

function provider(...deltas: ChatCompletionChunk.Choice.Delta[]) {
  vi.stubEnv("OPENAI_API_KEY", "test-only");
  complete.mockResolvedValue((async function* () {
    for (const delta of deltas) yield { choices: [{ delta }] };
  })());
}

it.each(["worker1", "platform"])("streams account context for %s without moving funds", async (id) => {
  const before = await backend.service.activity("platform");
  provider({ content: "Tu acuerdo " }, { content: "está fondeado por tramos." });
  const response = await POST(request([{ role: "user", content: "Resumí mi cuenta" }], id));
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.text()).toBe("Tu acuerdo está fondeado por tramos.");
  expect(complete).toHaveBeenCalledOnce();
  const input = complete.mock.calls[0][0];
  expect(input).toMatchObject({ model: "test-model", stream: true });
  expect(input.messages[1].content).toContain(id === "platform" ? "Proveedores disponibles" : "Disponible para cobrar ahora");
  if (id === "platform") expect(input).toMatchObject({ reasoning_effort: "none", parallel_tool_calls: false, tools: [{ function: { name: "proponer_acuerdo" } }] });
  else expect(input).not.toHaveProperty("tools");
  expect(await backend.service.activity("platform")).toEqual(before);
});

it("assembles tool fragments into a validated proposal without executing it", async () => {
  const before = await backend.service.streams("platform");
  const args = JSON.stringify({ items: [{ workerId: "worker1", totalAmount: 100 }], period: 900, fundPercent: 50 });
  provider(
    { tool_calls: [{ index: 0, function: { name: "proponer_acuerdo", arguments: args.slice(0, 30) } }] },
    { tool_calls: [{ index: 0, function: { arguments: args.slice(30) } }] },
  );
  const response = await POST(request([{ role: "user", content: "Ana por 100 pesos, 15 minutos, primer tramo 50 %" }], "platform"));
  const [text, json] = (await response.text()).split(PROPOSAL_SEPARATOR);
  expect(text).toContain("Revisala y confirmala");
  expect(JSON.parse(json)).toEqual({ items: [{ workerId: "worker1", name: "Ana García", totalAmount: "100", initialDeposit: "50" }], period: 900 });
  expect(await backend.service.streams("platform")).toEqual(before);
});

it("asks for a missing price even after the model has written text", async () => {
  provider({ content: "Te preparo un acuerdo." }, { tool_calls: [{ index: 0, function: {
    name: "proponer_acuerdo", arguments: JSON.stringify({ items: [{ workerId: "worker1", totalAmount: 100 }], period: 900, fundPercent: 50 }),
  } }] });
  const text = await (await POST(request([{ role: "user", content: "Quiero contratar a Ana" }], "platform"))).text();
  expect(text).toContain("¿Cuál es el precio total en pesos del acuerdo con Ana García?");
  expect(text).not.toContain(PROPOSAL_SEPARATOR);
});

it.each([
  [new Error("private-provider-detail"), "No pude responder ahora"],
  [new OpenAI.RateLimitError(429, undefined, "private-provider-detail", new Headers()), "mucha demanda"],
])("returns a safe provider error", async (error, expected) => {
  vi.stubEnv("OPENAI_API_KEY", "test-only");
  complete.mockRejectedValue(error);
  const text = await (await POST(request([{ role: "user", content: "Hola" }]))).text();
  expect(text).toContain(expected);
  expect(text).not.toContain("private-provider-detail");
});
