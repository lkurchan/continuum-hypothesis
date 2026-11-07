import { respond } from "@/lib/domain/http";
import { requireCondition } from "@/lib/domain/errors";
import { paymentReputation } from "@/lib/domain/reputation";
import { withDemoAuth } from "@/lib/auth/guard";

async function handleGET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return respond(async ({ service }) => {
    const id = (await context.params).id;
    requireCondition(/^[a-zA-Z0-9_-]{1,64}$/.test(id), "Identificador de cliente inválido.");
    const [streams, activity] = await Promise.all([service.streams(id), service.activity(id)]);
    return paymentReputation(id, streams, activity, Math.floor(Date.now() / 1000));
  });
}

export const GET = withDemoAuth(handleGET);
