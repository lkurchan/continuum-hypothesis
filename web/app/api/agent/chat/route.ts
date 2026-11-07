import Anthropic from "@anthropic-ai/sdk";
import { workerSnapshot } from "@/lib/agent/context";
import { COPILOT_MODEL, COPILOT_SYSTEM } from "@/lib/agent/prompt";
import { getBackend } from "@/lib/db/runtime";
import { DomainError, requireCondition } from "@/lib/domain/errors";
import { body, userId } from "@/lib/domain/http";

type ChatMessage = { role: "user" | "assistant"; content: string };

function parseMessages(value: unknown): ChatMessage[] {
  requireCondition(Array.isArray(value) && value.length > 0 && value.length <= 40, "Se requieren entre 1 y 40 mensajes.");
  const messages = value.map((m) => {
    const item = m as Partial<ChatMessage>;
    requireCondition((item.role === "user" || item.role === "assistant") && typeof item.content === "string"
      && item.content.trim().length > 0 && item.content.length <= 4000, "Mensaje inválido.");
    return { role: item.role, content: item.content };
  });
  requireCondition(messages[0].role === "user" && messages.at(-1)!.role === "user", "La conversación debe empezar y terminar con el usuario.");
  return messages;
}

const errorResponse = (message: string, status: number) =>
  Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  let snapshot: string;
  let messages: ChatMessage[];
  try {
    const payload = await body(request);
    messages = parseMessages(payload.messages);
    snapshot = await workerSnapshot(getBackend().service, userId(request, payload));
  } catch (error) {
    if (error instanceof DomainError) return errorResponse(error.message, error.status);
    return errorResponse("No se pudo preparar el copiloto.", 500);
  }
  if (!process.env.ANTHROPIC_API_KEY) return errorResponse("El copiloto no está configurado: falta ANTHROPIC_API_KEY.", 503);

  const client = new Anthropic();
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const response = client.beta.messages.stream({
          model: COPILOT_MODEL,
          max_tokens: 4000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "low" },
          system: [
            { type: "text", text: COPILOT_SYSTEM, cache_control: { type: "ephemeral" } },
            { type: "text", text: `Datos de la cuenta (calculados por Continuum, confiables):\n\n${snapshot}` },
          ],
          messages,
        });
        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await response.finalMessage();
        if (final.stop_reason === "refusal") controller.enqueue(encoder.encode("\n\nNo puedo ayudarte con eso. Preguntame sobre tu plata en Continuum."));
      } catch (error) {
        const busy = error instanceof Anthropic.RateLimitError || (error instanceof Anthropic.APIError && (error.status ?? 0) >= 500);
        controller.enqueue(encoder.encode(busy ? "\n\nEl copiloto está con mucha demanda. Probá de nuevo en un momento." : "\n\nNo pude responder ahora. Probá de nuevo."));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
