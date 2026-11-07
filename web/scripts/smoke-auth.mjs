import { spawn } from "node:child_process";
import { randomBytes, scryptSync } from "node:crypto";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { ensure, printFailure, webRoot } from "./lib/environment.mjs";

let server;
let closed;
let stopped = false;
async function stop() {
  if (!server || stopped) return;
  server.kill("SIGTERM");
  await Promise.race([closed, delay(3000, undefined, { ref: false })]);
  if (!stopped) server.kill("SIGKILL");
  await closed;
}
for (const [signal, code] of [["SIGINT", 130], ["SIGTERM", 143]]) process.once(signal, () => { void stop().finally(() => process.exit(code)); });

try {
  const password = randomBytes(24).toString("base64url");
  const salt = randomBytes(32);
  const port = await new Promise((accept, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => { const { port } = probe.address(); probe.close(error => error ? reject(error) : accept(port)); });
  });
  const origin = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [resolve(webRoot, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: webRoot, stdio: "ignore", env: { ...process.env, CHAIN_MODE: "mock", NODE_ENV: "production", VERCEL: "", NEXT_TELEMETRY_DISABLED: "1",
      DEMO_AUTH_PASSWORD_HASH: `${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`, DEMO_AUTH_SECRET: randomBytes(32).toString("hex") },
  });
  server.once("error", () => { stopped = true; });
  closed = new Promise(accept => server.once("close", () => { stopped = true; accept(); }));
  const deadline = Date.now() + 20_000;
  while (true) {
    ensure(!stopped, "El servidor de prueba no pudo iniciar.");
    try { const r = await fetch(`${origin}/api/auth/session`); if (r.ok) break; } catch { /* Read-only startup probe. */ }
    ensure(Date.now() < deadline, "El servidor no quedó disponible.");
    await delay(100);
  }
  for (const path of ["/api/users", "/api/streams?userId=platform", "/api/activity?userId=worker1", "/api/clients/platform/reputation"]) {
    ensure((await fetch(origin + path)).status === 401, `API anónima abierta: ${path}`);
  }
  for (const path of ["/api/streams", "/api/streams/0/topup", "/api/streams/0/withdraw", "/api/streams/0/cancel", "/api/agent/chat", "/api/lab/reset"]) {
    ensure((await fetch(origin + path, { method: "POST", headers: { origin, "x-middleware-subrequest": "middleware:middleware:middleware:middleware:middleware" } })).status === 401,
      `Mutación anónima abierta: ${path}`);
  }
  const page = await fetch(origin + "/worker", { redirect: "manual" });
  ensure(page.status === 307 && new URL(page.headers.get("location"), origin).pathname === "/login", "La página no redirige al login.");
  const loginPage = await fetch(origin + "/login?next=/payer/asistente");
  ensure(loginPage.status === 200 && (await loginPage.text()).includes("Ingresá a la demo"), "La pantalla de login no está disponible.");
  const login = (value, requestOrigin = origin) => fetch(origin + "/api/auth/login", { method: "POST", headers: { "content-type": "application/json", origin: requestOrigin }, body: JSON.stringify({ password: value, next: "//evil.example" }) });
  ensure((await login(password, "https://evil.example")).status === 403, "Login permitió otro origen.");
  const wrong = await login("incorrect-password");
  ensure(wrong.status === 401, `La clave incorrecta devolvió HTTP ${wrong.status}, se esperaba 401.`);
  ensure(!wrong.headers.has("set-cookie"), "Una clave incorrecta generó cookie.");
  const authenticated = await login(password);
  ensure(authenticated.status === 200 && (await authenticated.json()).next === "/", "Login o redirect inválido.");
  const cookie = authenticated.headers.get("set-cookie")?.split(";")[0];
  ensure(cookie?.startsWith("continuum_demo_session="), "Falta cookie de sesión.");
  const users = await fetch(origin + "/api/users", { headers: { cookie } });
  ensure(users.status === 200 && (await users.json()).length === 3, "Lectura autorizada falló.");
  ensure((await fetch(origin + "/api/streams/0/topup", { method: "POST", headers: { cookie, origin: "https://evil.example" } })).status === 403, "Mutación cross-site aceptada.");
  const topup = await fetch(origin + "/api/streams/0/topup", { method: "POST", headers: { cookie, origin, "content-type": "application/json" }, body: JSON.stringify({ userId: "platform", amount: "1" }) });
  ensure(topup.status === 200 && (await topup.json()).txHash.startsWith("mock:"), "Mutación mock autorizada falló.");
  const logout = await fetch(origin + "/api/auth/logout", { method: "POST", headers: { origin, cookie } });
  ensure(logout.status === 200 && logout.headers.get("set-cookie")?.includes("Max-Age=0"), "Logout no borró la cookie.");
  ensure((await fetch(origin + "/api/users")).status === 401, "Acceso sin cookie tras logout.");
  console.log("Auth HTTP OK: páginas privadas, todas las APIs bloqueadas sin sesión, login, CSRF, lectura y top-up mock autorizados, logout. Sin pagos reales.");
} catch (error) { printFailure(error); }
finally { await stop(); }
