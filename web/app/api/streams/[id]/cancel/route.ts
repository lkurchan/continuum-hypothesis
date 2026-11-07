import { withDemoAuth } from "@/lib/auth/guard";
import { body, respond, streamId, userId } from "@/lib/domain/http";

async function handlePOST(request: Request, context: { params: Promise<{ id: string }> }) {
  return respond(async ({ service }) => {
    const id = streamId((await context.params).id);
    const payload = await body(request, true);
    return service.cancel(id, userId(request, payload));
  });
}

export const POST = withDemoAuth(handlePOST);
