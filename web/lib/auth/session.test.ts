import { scryptSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
vi.mock("server-only", () => ({}));
import { authConfig, checkPassword, cookieOptions, createSession, safeNext, sameOrigin, SESSION_SECONDS, validSession } from "./session";
import { accessFailure, withDemoAuth } from "./guard";
import { allowAttempt } from "./attempts";

const password = "a-local-test-password-with-entropy";
const salt = Buffer.alloc(32, 1);
const hash = `${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`;
const config = authConfig({ CHAIN_MODE: "real", DEMO_AUTH_PASSWORD_HASH: hash, DEMO_AUTH_SECRET: "ab".repeat(32) })!;
const request = (token?: string, method = "GET", origin?: string) => new Request("https://demo.example/api/streams", {
  method, headers: { ...(token ? { cookie: `continuum_demo_session=${token}` } : {}), ...(origin ? { origin } : {}) },
});
beforeEach(() => {
  vi.stubEnv("CHAIN_MODE", "real");
  vi.stubEnv("DEMO_AUTH_PASSWORD_HASH", hash);
  vi.stubEnv("DEMO_AUTH_SECRET", "ab".repeat(32));
});
afterEach(() => vi.unstubAllEnvs());

describe("demo sessions", () => {
  it("fails closed for real/unknown modes and incomplete configuration; mock stays optional", () => {
    expect(() => authConfig({ CHAIN_MODE: "real" })).toThrow();
    expect(() => authConfig({ CHAIN_MODE: "typo" })).toThrow();
    expect(() => authConfig({ CHAIN_MODE: "mock", DEMO_AUTH_SECRET: "ab".repeat(32) })).toThrow();
    expect(authConfig({ CHAIN_MODE: "mock" })).toBeNull();
  });
  it("checks the salted password hash", async () => {
    expect(await checkPassword(password, config)).toBe(true);
    expect(await checkPassword(password + "wrong", config)).toBe(false);
    expect(await checkPassword(null, config)).toBe(false);
    expect(await checkPassword("x".repeat(257), config)).toBe(false);
  });
  it("rejects expired, future, tampered and revoked sessions", async () => {
    const now = 1_800_000_000;
    const token = await createSession(config, now);
    expect(await validSession(token, config, new Date(now * 1000))).toBe(true);
    expect(await validSession(token, config, new Date((now + SESSION_SECONDS) * 1000))).toBe(false);
    expect(await validSession(token, config, new Date((now - 1) * 1000))).toBe(false);
    expect(await validSession(token.slice(0, -10) + "tampered", config, new Date(now * 1000))).toBe(false);
    expect(await validSession(token, { ...config, version: "changed-password" }, new Date(now * 1000))).toBe(false);
    expect(await validSession(token, { ...config, secret: Buffer.alloc(32) }, new Date(now * 1000))).toBe(false);
  });
  it("rejects signed tokens without the allowed role or expiry", async () => {
    for (const payload of [{ role: "worker", version: config.version, exp: Math.floor(Date.now()/1000)+60 }, { role: "demo-operator", version: config.version }]) {
      const token = await new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuer("continuum").setAudience("continuum-demo").setIssuedAt().sign(config.secret);
      expect(await validSession(token, config)).toBe(false);
    }
  });
  it("blocks unauthenticated handlers before business logic and checks mutation origin", async () => {
    const handler = vi.fn(async () => Response.json({ ok: true }));
    expect((await withDemoAuth(handler)(request())).status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
    const token = await createSession(config);
    expect((await withDemoAuth(handler)(request(token))).status).toBe(200);
    expect((await accessFailure(request(token, "POST")))?.status).toBe(403);
    expect((await accessFailure(request(token, "POST", "https://evil.example")))?.status).toBe(403);
    expect(await accessFailure(request(token, "POST", "https://demo.example"))).toBeNull();
    vi.stubEnv("DEMO_AUTH_SECRET", "");
    expect((await accessFailure(request(token)))?.status).toBe(503);
  });
  it("sets restricted cookie scope and prevents external redirects", () => {
    expect(cookieOptions(request())).toMatchObject({ httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: SESSION_SECONDS });
    expect(cookieOptions(request())).not.toHaveProperty("domain");
    for (const next of ["https://evil.example", "//evil.example", "/\\evil.example", "/api/streams", "/login", null]) expect(safeNext(next)).toBe("/");
    expect(safeNext("/worker/retirar")).toBe("/worker/retirar");
  });
  it("uses the HTTP host behind Next normalization, without trusting forwarded host", () => {
    expect(sameOrigin(new Request("http://localhost:3000/api/auth/login", { headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" } }))).toBe(true);
    expect(sameOrigin(new Request("https://demo.example/api/auth/login", { headers: { host: "demo.example", "x-forwarded-host": "evil.example", origin: "https://evil.example" } }))).toBe(false);
  });
  it("limits repeated attempts until the window expires", () => {
    const id = "test-limit";
    for (let i = 0; i < 10; i++) expect(allowAttempt(id, 1000)).toBe(true);
    expect(allowAttempt(id, 1001)).toBe(false);
    expect(allowAttempt(id, 301000)).toBe(true);
  });
});
