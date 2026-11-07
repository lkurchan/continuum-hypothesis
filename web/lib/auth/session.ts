import "server-only";
import { createHash, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "continuum_demo_session";
export const SESSION_SECONDS = 8 * 60 * 60;
const derive = promisify(scrypt);
export type AuthConfig = { passwordHash: string; secret: Uint8Array; version: string };

export function authConfig(env: Record<string, string | undefined> = process.env): AuthConfig | null {
  const passwordHash = env.DEMO_AUTH_PASSWORD_HASH ?? "";
  const secret = env.DEMO_AUTH_SECRET ?? "";
  if ((env.CHAIN_MODE ?? "mock") === "mock" && !passwordHash && !secret) return null;
  if (!/^[a-f0-9]{64}:[a-f0-9]{128}$/.test(passwordHash) || !/^[a-f0-9]{64}$/.test(secret)) {
    throw new Error("El acceso a la demo todavía no está configurado.");
  }
  return { passwordHash, secret: Buffer.from(secret, "hex"), version: createHash("sha256").update(passwordHash).digest("hex") };
}

export async function checkPassword(password: unknown, config: AuthConfig): Promise<boolean> {
  if (typeof password !== "string" || password.length < 16 || password.length > 256) return false;
  const [salt, hash] = config.passwordHash.split(":");
  const actual = await derive(password, Buffer.from(salt, "hex"), 64) as Buffer;
  return timingSafeEqual(actual, Buffer.from(hash, "hex"));
}

export function createSession(config: AuthConfig, now = Math.floor(Date.now() / 1000)) {
  return new SignJWT({ role: "demo-operator", version: config.version })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer("continuum").setAudience("continuum-demo")
    .setIssuedAt(now).setExpirationTime(now + SESSION_SECONDS).sign(config.secret);
}

export async function validSession(token: string | undefined, config: AuthConfig, now = new Date()) {
  if (!token || token.length > 2048) return false;
  try {
    const { payload } = await jwtVerify(token, config.secret, {
      algorithms: ["HS256"], issuer: "continuum", audience: "continuum-demo",
      maxTokenAge: SESSION_SECONDS, currentDate: now,
    });
    return payload.role === "demo-operator" && payload.version === config.version &&
      typeof payload.exp === "number" && typeof payload.iat === "number" &&
      payload.exp - payload.iat <= SESSION_SECONDS && payload.iat <= Math.floor(now.getTime() / 1000);
  } catch { return false; }
}

export function requestToken(request: Request): string | undefined {
  return request.headers.get("cookie")?.split(";").map(v => v.trim())
    .find(v => v.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
}

export function sameOrigin(request: Request): boolean {
  // Next can normalize request.url to an internal hostname. Host is the actual
  // HTTP authority; never trust a caller-supplied X-Forwarded-Host instead.
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  const protocol = process.env.VERCEL === "1" ? "https:" : url.protocol;
  return request.headers.get("origin") === `${protocol}//${host}` &&
    request.headers.get("sec-fetch-site") !== "cross-site";
}

export function cookieOptions(request: Request) {
  return { httpOnly: true, secure: process.env.VERCEL === "1" || new URL(request.url).protocol === "https:",
    sameSite: "strict" as const, path: "/", maxAge: SESSION_SECONDS };
}

const destinations = new Set(["/", "/demo", "/entrar", "/payer", "/payer/nuevo", "/payer/asistente", "/worker", "/worker/retirar", "/worker/actividad", "/worker/copiloto", "/lab"]);
export const safeNext = (value: unknown) => typeof value === "string" && destinations.has(value) ? value : "/";
