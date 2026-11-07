import { body, respond, streamId, userId } from "@/lib/domain/http";
import { positiveAmount } from "@/lib/domain/amounts";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return respond(async ({ service }) => {
    const id = streamId((await context.params).id);
    const payload = await body(request);
    return service.topUp(id, userId(request, payload), positiveAmount(payload.amount));
  });
}
