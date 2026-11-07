import { respond, userId } from "@/lib/domain/http";

export async function GET(request: Request) {
  return respond(({ service }) => service.activity(userId(request)));
}
