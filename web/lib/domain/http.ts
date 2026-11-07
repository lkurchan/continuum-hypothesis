import "server-only";
import { getBackend, type Backend } from "@/lib/db/runtime";
import { DomainError, requireCondition } from "./errors";

export async function respond(operation: (backend: Backend) => Promise<unknown>, status = 200) {
  let mode: Backend["mode"] | undefined;
  try {
    const backend = getBackend();
    mode = backend.mode;
    const value = await operation(backend);
    return Response.json(value, { status, headers: { "Cache-Control": "no-store", "X-Chain-Mode": backend.mode } });
  } catch (error) {
    const known = error instanceof DomainError;
    return Response.json({ error: known ? error.message : "No se pudo completar la operación." }, {
      status: known ? error.status : 500,
      headers: { "Cache-Control": "no-store", ...(mode ? { "X-Chain-Mode": mode } : {}) },
    });
  }
}

export function object(value: unknown): Record<string, unknown> {
  requireCondition(value && typeof value === "object" && !Array.isArray(value), "Se esperaba un objeto JSON.");
  return value as Record<string, unknown>;
}

export async function body(request: Request, optional = false): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (optional && !text.trim()) return {};
  requireCondition(text.length <= 64000, "El cuerpo de la solicitud es demasiado grande.", 413);
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new DomainError("JSON inválido."); }
  return object(value);
}

export function userId(request: Request, payload: Record<string, unknown> = {}, fallback?: string): string {
  const query = new URL(request.url).searchParams.get("userId");
  const fromBody = payload.userId;
  requireCondition(fromBody === undefined || typeof fromBody === "string", "userId inválido.");
  requireCondition(!(query !== null && fromBody !== undefined && query !== fromBody), "Las identidades de body y query no coinciden.");
  const id = fromBody ?? query ?? fallback;
  requireCondition(typeof id === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(id), "Se requiere un userId válido.");
  return id;
}

export function textField(value: unknown, field: string): string {
  requireCondition(typeof value === "string" && value.length > 0 && value.length <= 128, `${field} debe ser un string.`);
  return value;
}

export function streamId(value: string): string {
  requireCondition(/^(0|[1-9]\d{0,77})$/.test(value), "Identificador de stream inválido.");
  return value;
}
