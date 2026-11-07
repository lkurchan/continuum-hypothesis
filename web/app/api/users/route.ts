import { respond } from "@/lib/domain/http";

export async function GET() {
  return respond(({ service }) => service.users());
}
