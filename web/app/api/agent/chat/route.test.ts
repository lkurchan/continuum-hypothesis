import { afterEach, beforeEach, expect, it, vi } from "vitest";
import OpenAI from "openai";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
const { complete, clientOptions } = vi.hoisted(() => ({ complete: vi.fn(), clientOptions: vi.fn() }));
vi.mock("openai", async (original) => {
  const sdk = await original<typeof import("openai")>();
  return { ...sdk, default: class extends sdk.default {
    constructor(options?: { apiKey?: string }) {
      super({ apiKey: "test-only" });
      clientOptions(options);
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
  clientOptions.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("CHAIN_MODE", "mock");
  vi.stubEnv("DEMO_AUTH_PASSWORD_HASH", "");
  vi.stubEnv("DEMO_AUTH_SECRET", "");
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("OPENAI_MODEL", "test-model");
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

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

it("normalizes pasted provider variables before using them", async () => {
  provider({ content: "Listo." });
  vi.stubEnv("OPENAI_MODEL", " test-model\n");
  vi.stubEnv("OPENAI_API_KEY", " test-only\n");
  expect(await (await POST(request([{ role: "user", content: "Hola" }]))).text()).toBe("Listo.");
  expect(clientOptions).toHaveBeenCalledWith({ apiKey: "test-only" });
  expect(complete.mock.calls[0][0].model).toBe("test-model");
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
  "La propuesta anterior fue descartada; no propongas acuerdos nuevos. Resumí los existentes.",
  "NO CREÉS nuevos acuerdos. Solo quiero el resumen.",
  "No quiero que me propongas acuerdos. ¿Cuánto falta fondear?",
  "Mostrá el resumen, sin propuestas nuevas.",
])("does not repeat an earlier proposal when the latest message opts out: %s", async (content) => {
  provider({ content: "Este es el resumen." }, { tool_calls: [{ index: 0, function: {
    name: "proponer_acuerdo", arguments: JSON.stringify({ items: [{ workerId: "worker1", totalAmount: 100 }], period: 900, fundPercent: 50 }),
  } }] });
  const response = await POST(request([
    { role: "user", content: "Proponé un acuerdo con Ana por 100 pesos." },
    { role: "assistant", content: "Te armé la propuesta." },
    { role: "user", content },
  ], "platform"));
  expect(await response.text()).toBe("Este es el resumen.");
  expect(complete.mock.calls[0][0].tool_choice).toBe("none");
});

it("allows a later explicit proposal request without executing payments", async () => {
  provider({ tool_calls: [{ index: 0, function: { name: "proponer_acuerdo",
    arguments: JSON.stringify({ items: [{ workerId: "worker1", totalAmount: 100 }], period: 900, fundPercent: 50 }),
  } }] });
  const response = await POST(request([
    { role: "user", content: "No propongas acuerdos. Resumí mi cuenta." },
    { role: "assistant", content: "Este es el resumen." },
    { role: "user", content: "Ahora proponé un acuerdo con Ana por 100 pesos; no ejecutes pagos." },
  ], "platform"));
  expect(await response.text()).toContain(PROPOSAL_SEPARATOR);
  expect(complete.mock.calls[0][0].tool_choice).toBe("auto");
});

it("does not leave an empty stream if the provider sends only a forbidden proposal", async () => {
  provider({ tool_calls: [{ index: 0, function: { name: "proponer_acuerdo", arguments: "{}" } }] });
  const response = await POST(request([{ role: "user", content: "No propongas acuerdos. Resumí mi cuenta." }], "platform"));
  const text = await response.text();
  expect(text).toContain("No generé ninguna propuesta");
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
  expect(console.error).toHaveBeenCalledWith("chat_provider_error", expect.objectContaining({ name: expect.any(String) }));
  expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/private-provider-detail|test-only/);
});
