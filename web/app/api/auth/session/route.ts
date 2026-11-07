import { authError } from "@/lib/auth/guard";
import { authConfig, requestToken, validSession } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    const config = authConfig();
    return Response.json({ required: !!config, authenticated: !config || await validSession(requestToken(request), config) },
      { headers: { "Cache-Control": "no-store", "Vary": "Cookie" } });
  } catch { return authError("El acceso a la demo todavía no está configurado.", 503); }
}
