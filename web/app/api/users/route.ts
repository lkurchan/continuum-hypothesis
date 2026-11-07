import { withDemoAuth } from "@/lib/auth/guard";
import { respond } from "@/lib/domain/http";

async function handleGET() {
  return respond(({ service }) => service.users());
}

export const GET = withDemoAuth(handleGET);
