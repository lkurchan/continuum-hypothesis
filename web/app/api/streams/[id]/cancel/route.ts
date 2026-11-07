import { body, respond, streamId, userId } from "@/lib/domain/http";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return respond(async ({ service }) => {
    const id = streamId((await context.params).id);
    const payload = await body(request, true);
    return service.cancel(id, userId(request, payload));
  });
}
