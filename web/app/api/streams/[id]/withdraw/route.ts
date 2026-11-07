import { body, respond, streamId, userId } from "@/lib/domain/http";
import { positiveAmount } from "@/lib/domain/amounts";
import { requireCondition } from "@/lib/domain/errors";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return respond(async ({ service }) => {
    const id = streamId((await context.params).id);
    const payload = await body(request);
    requireCondition(payload.destination === "wallet" || payload.destination === "belo", "Destino inválido.");
    return service.withdraw(id, userId(request, payload), positiveAmount(payload.amount), payload.destination);
  });
}
