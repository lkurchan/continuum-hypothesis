import { NextResponse } from "next/server";
import { authError } from "@/lib/auth/guard";
import { cookieOptions, sameOrigin, SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return authError("Origen de solicitud inválido.", 403);
  const response = NextResponse.json({ loggedOut: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(SESSION_COOKIE, "", { ...cookieOptions(request), maxAge: 0 });
  return response;
}
