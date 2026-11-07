import { scryptSync } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { backend } = vi.hoisted(() => ({ backend: vi.fn(() => { throw new Error("Business logic must not run"); }) }));
vi.mock("@/lib/db/runtime", () => ({ getBackend: backend, resetMockBackend: backend }));
import { POST as login } from "./login/route";
import { POST as logout } from "./logout/route";
import { GET as session } from "./session/route";
import { GET as users } from "../users/route";
import { GET as streams, POST as create } from "../streams/route";
import { GET as activity } from "../activity/route";
import { POST as topup } from "../streams/[id]/topup/route";
import { POST as withdraw } from "../streams/[id]/withdraw/route";
import { POST as cancel } from "../streams/[id]/cancel/route";
import { POST as chat } from "../agent/chat/route";
import { POST as reset } from "../lab/reset/route";
import { GET as reputation } from "../clients/[id]/reputation/route";

const password = "a-local-auth-test-password-12345";
const salt = Buffer.alloc(32, 2);
let ip = 0;
const post = (value: unknown, origin = "https://demo.example") => new Request("https://demo.example/api/auth/login", {
  method: "POST", headers: { origin, "content-type": "application/json", "x-forwarded-for": String(++ip) }, body: JSON.stringify(value),
});
beforeEach(() => {
  backend.mockClear();
  vi.stubEnv("CHAIN_MODE", "real");
  vi.stubEnv("DEMO_ACCESS", "private");
  vi.stubEnv("DEMO_AUTH_PASSWORD_HASH", `${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`);
  vi.stubEnv("DEMO_AUTH_SECRET", "cd".repeat(32));
});
afterEach(() => vi.unstubAllEnvs());

it("guards every data/payment handler even if Proxy is bypassed", async () => {
  const request = new Request("https://demo.example/api/streams");
  const context = { params: Promise.resolve({ id: "1" }) };
  for (const handler of [users, streams, create, activity, chat, reset]) expect((await handler(request)).status).toBe(401);
  for (const handler of [topup, withdraw, cancel, reputation]) expect((await handler(request, context)).status).toBe(401);
  expect(backend).not.toHaveBeenCalled();
});
it("logs in, recognizes the cookie and clears it at logout", async () => {
  const response = await login(post({ password, next: "/worker" }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ next: "/worker" });
  const cookie = response.headers.get("set-cookie")!;
  expect(cookie).toMatch(/HttpOnly/i);
  expect(cookie).toMatch(/Secure/i);
  expect(cookie).toMatch(/SameSite=strict/i);
  const authRequest = new Request("https://demo.example/api/auth/session", { headers: { cookie: cookie.split(";")[0] } });
  expect(await (await session(authRequest)).json()).toEqual({ required: true, authenticated: true });
  const result = await logout(new Request("https://demo.example/api/auth/logout", { method: "POST", headers: { origin: "https://demo.example" } }));
  expect(result.headers.get("set-cookie")).toContain("Max-Age=0");
  expect(await (await session(new Request(authRequest.url))).json()).toEqual({ required: true, authenticated: false });
  expect(backend).not.toHaveBeenCalled();
});
it("rejects invalid login input and cross-site attempts without issuing a cookie", async () => {
  for (const [value, status] of [[{ password: "wrong" }, 401], [null, 400], [{ password: "x".repeat(2000) }, 413]] as const) {
    const result = await login(post(value));
    expect(result.status).toBe(status);
    expect(result.headers.has("set-cookie")).toBe(false);
  }
  expect((await login(post({ password }, "https://evil.example"))).status).toBe(403);
  expect((await logout(post({}, "https://evil.example"))).status).toBe(403);
  vi.stubEnv("DEMO_AUTH_SECRET", "");
  expect((await login(post({ password }))).status).toBe(503);
});

it("reports public demo access without requiring or issuing a session", async () => {
  vi.stubEnv("DEMO_ACCESS", "public");
  const result = await session(new Request("https://demo.example/api/auth/session"));
  expect(await result.json()).toEqual({ required: false, authenticated: true });
  expect(result.headers.has("set-cookie")).toBe(false);
  expect(backend).not.toHaveBeenCalled();
});
