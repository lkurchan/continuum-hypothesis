import { withDemoAuth } from "@/lib/auth/guard";
import { body, respond, streamId, userId } from "@/lib/domain/http";
import { positiveAmount } from "@/lib/domain/amounts";

async function handlePOST(request: Request, context: { params: Promise<{ id: string }> }) {
  return respond(async ({ service }) => {
    const id = streamId((await context.params).id);
    const payload = await body(request);
    return service.topUp(id, userId(request, payload), positiveAmount(payload.amount));
  });
}

export const POST = withDemoAuth(handlePOST);
