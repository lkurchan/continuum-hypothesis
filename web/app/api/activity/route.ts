import { withDemoAuth } from "@/lib/auth/guard";
import { respond, userId } from "@/lib/domain/http";

async function handleGET(request: Request) {
  return respond(({ service }) => service.activity(userId(request)));
}

export const GET = withDemoAuth(handleGET);
