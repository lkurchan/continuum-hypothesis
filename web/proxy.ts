import { NextRequest, NextResponse } from "next/server";
import { accessFailure } from "@/lib/auth/guard";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/login" || path.startsWith("/api/auth/")) return NextResponse.next();
  const denied = await accessFailure(request);
  if (!denied) return NextResponse.next();
  if (path.startsWith("/api/") || denied.status !== 401) return denied;
  const login = new URL("/login", request.url);
  login.searchParams.set("next", path);
  const response = NextResponse.redirect(login);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|icon.svg|favicon.ico|manifest.webmanifest).*)"] };
