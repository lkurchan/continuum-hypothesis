import "server-only";
import { authConfig, requestToken, sameOrigin, validSession } from "./session";

export const authError = (error: string, status: number) => Response.json({ error }, {
  status, headers: { "Cache-Control": "no-store", "Vary": "Cookie" },
});

export async function accessFailure(request: Request): Promise<Response | null> {
  let config;
  try { config = authConfig(); } catch { return authError("El acceso a la demo todavía no está configurado.", 503); }
  if (!config) return null;
  if (!await validSession(requestToken(request), config)) return authError("Ingresá a la demo para continuar.", 401);
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !sameOrigin(request)) return authError("Origen de solicitud inválido.", 403);
  return null;
}

// Applied inside every API handler as well as Proxy: no wallet operation relies on Proxy alone.
export function withDemoAuth<Args extends unknown[]>(handler: (request: Request, ...args: Args) => Promise<Response>) {
  return async (request: Request, ...args: Args) => {
    const denied = await accessFailure(request);
    return denied ?? handler(request, ...args);
  };
}
