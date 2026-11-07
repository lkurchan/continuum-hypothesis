import { NextResponse } from "next/server";
import { allowAttempt } from "@/lib/auth/attempts";
import { authError } from "@/lib/auth/guard";
import { authConfig, checkPassword, cookieOptions, createSession, safeNext, sameOrigin, SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return authError("Origen de solicitud inválido.", 403);
  let config;
  try { config = authConfig(); } catch { return authError("El acceso a la demo todavía no está configurado.", 503); }
  if (!config) return NextResponse.json({ next: "/" }, { headers: { "Cache-Control": "no-store" } });
  if (!allowAttempt(request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0,128) || "unknown")) {
    const response = authError("Demasiados intentos. Probá de nuevo en unos minutos.", 429);
    response.headers.set("Retry-After", "300");
    return response;
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) return authError("Solicitud inválida.", 400);
  if (Number(request.headers.get("content-length")) > 1024) return authError("Solicitud demasiado grande.", 413);
  let payload;
  try {
    // Read a bounded stream; chunked requests cannot bypass the size limit.
    const reader = request.body?.getReader();
    if (!reader) return authError("Solicitud inválida.", 400);
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 1024) { await reader.cancel(); return authError("Solicitud demasiado grande.", 413); }
      chunks.push(value);
    }
    payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return authError("Solicitud inválida.", 400);
  } catch { return authError("Solicitud inválida.", 400); }
  if (!await checkPassword(payload.password, config)) return authError("La clave no es correcta.", 401);
  const response = NextResponse.json({ next: safeNext(payload.next) }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(SESSION_COOKIE, await createSession(config), cookieOptions(request));
  return response;
}
