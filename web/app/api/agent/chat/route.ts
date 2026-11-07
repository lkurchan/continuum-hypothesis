import OpenAI from "openai";
import { payerSnapshot, workerSnapshot } from "@/lib/agent/context";
import { COPILOT_SYSTEM, PAYER_SYSTEM, PROPOSAL_TOOL } from "@/lib/agent/prompt";
import { PROPOSAL_SEPARATOR, toProposal } from "@/lib/agent/proposal";
import { withDemoAuth } from "@/lib/auth/guard";
import { getBackend } from "@/lib/db/runtime";
import { DomainError, requireCondition } from "@/lib/domain/errors";
import { body, userId } from "@/lib/domain/http";
import type { DemoUser } from "@/lib/domain/types";

type ChatMessage = { role: "user" | "assistant"; content: string };

function parseMessages(value: unknown): ChatMessage[] {
  requireCondition(Array.isArray(value) && value.length > 0 && value.length <= 40, "Se requieren entre 1 y 40 mensajes.");
  const messages = value.map((m) => {
    requireCondition(m !== null && typeof m === "object" && !Array.isArray(m), "Mensaje inválido.");
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

async function handlePOST(request: Request) {
  let snapshot: string;
  let messages: ChatMessage[];
  let users: DemoUser[];
  let isPayer: boolean;
  try {
    const payload = await body(request);
    messages = parseMessages(payload.messages);
    const id = userId(request, payload);
    const { service } = getBackend();
    users = await service.users();
    isPayer = users.find((u) => u.id === id)?.role === "payer";
    snapshot = await (isPayer ? payerSnapshot : workerSnapshot)(service, id);
  } catch (error) {
    if (error instanceof DomainError) return errorResponse(error.message, error.status);
    return errorResponse("No se pudo preparar el asistente.", 500);
  }
  const model = process.env.OPENAI_MODEL;
  if (!process.env.OPENAI_API_KEY || !model) return errorResponse("El asistente no está configurado: faltan OPENAI_API_KEY u OPENAI_MODEL.", 503);

  const client = new OpenAI();
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (text: string) => controller.enqueue(encoder.encode(text));
      try {
        const response = await client.chat.completions.create({
          model,
          stream: true,
          messages: [
            { role: "system", content: isPayer ? PAYER_SYSTEM : COPILOT_SYSTEM },
            { role: "system", content: `Datos de la cuenta (calculados por Continuum, confiables):\n\n${snapshot}` },
            ...messages,
          ],
          // Reasoning models reject function tools on Chat Completions unless reasoning is off.
          ...(isPayer ? { tools: [PROPOSAL_TOOL], parallel_tool_calls: false, reasoning_effort: "none" as const } : {}),
        });
        let toolArgs = "";
        let wrote = false;
        for await (const chunk of response) {
          const delta = chunk.choices[0]?.delta;
          if (delta?.content) { write(delta.content); wrote = true; }
          for (const call of delta?.tool_calls ?? []) toolArgs += call.function?.arguments ?? "";
        }
        if (!toolArgs) return;
        try {
          const proposal = toProposal(users, JSON.parse(toolArgs), messages.filter((m) => m.role === "user").map((m) => m.content).join("\n"));
          if (!wrote) write("Te armé la propuesta. Revisala y confirmala abajo.");
          // ponytail: in-band separator instead of an event protocol; the model never emits U+001E.
          write(PROPOSAL_SEPARATOR + JSON.stringify(proposal));
        } catch (error) {
          const reason = error instanceof SyntaxError ? "la respuesta vino incompleta." : (error as Error).message;
          write(`${wrote ? "\n\n" : ""}${reason.endsWith("?") ? reason : `No pude armar la propuesta: ${reason} Probá reformular el pedido.`}`);
        }
      } catch (error) {
        const busy = error instanceof OpenAI.RateLimitError || (error instanceof OpenAI.APIError && (error.status ?? 0) >= 500);
        write(busy ? "\n\nEl asistente está con mucha demanda. Probá de nuevo en un momento." : "\n\nNo pude responder ahora. Probá de nuevo.");
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

export const POST = withDemoAuth(handlePOST);
