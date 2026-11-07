import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { formatUnits, parseUnits } from "viem";
import { apiClient, seedDemo } from "./lib/demo-api.mjs";
import { ensure, printFailure, webRoot } from "./lib/environment.mjs";

let server;
let closed;
let finished = false;
async function stop() {
  if (!server || finished) return;
  server.kill("SIGTERM");
  await Promise.race([closed, delay(3000, undefined, { ref: false })]);
  if (!finished) server.kill("SIGKILL");
  await closed;
}
for (const [signal, code] of [["SIGINT", 130], ["SIGTERM", 143]]) {
  process.once(signal, () => { void stop().finally(() => process.exit(code)); });
}

try {
  await access(resolve(webRoot, ".next/BUILD_ID")).catch(() => ensure(false, "Primero ejecutá npm run build --prefix web."));
  const port = await new Promise((accept, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(error => error ? reject(error) : accept(port));
    });
  });
  server = spawn(process.execPath, [resolve(webRoot, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)],
    { cwd: webRoot, stdio: "ignore", env: { ...process.env, CHAIN_MODE: "mock", NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" } });
  let startError;
  server.once("error", error => { startError = error; });
  closed = new Promise(accept => server.once("close", () => { finished = true; accept(); }));
  const api = apiClient(`http://127.0.0.1:${port}`, "mock");
  const deadline = Date.now() + 20_000;
  while (true) {
    ensure(!startError && !finished, "El servidor mock no pudo iniciar.");
    try { await api.request("/api/users"); break; } catch { /* Retry only the startup read. */ }
    ensure(Date.now() < deadline, "El servidor mock no quedó disponible.");
    await delay(100);
  }
  // This process and its in-memory fixtures belong exclusively to the smoke test.
  for (const id of ["0", "1"]) await api.request(`/api/streams/${id}/cancel`, { userId: "platform" });
  let record = null;
  const journal = { read: async () => record, create: async value => { ensure(!record, "Journal duplicado."); record = value; }, save: async value => { record = value; } };
  const options = { execute: true, totalAmount: "10", initialDeposit: "6", duration: 600 };
  const created = await seedDemo(api, options, journal, () => Math.floor(Date.now() / 1000) - 300);
  ensure((await seedDemo(api, options, journal)).reused, "El seed no reutilizó el receipt confirmado.");
  const id = created.streamIds[0];
  await api.request(`/api/streams/${id}/topup`, { userId: "platform", amount: "1" });
  await api.request(`/api/streams/${id}/withdraw`, { userId: "worker1", amount: "1", destination: "wallet" });
  const canceled = await api.request(`/api/streams/${id}/cancel`, { userId: "platform" });
  const remainder = formatUnits(parseUnits(canceled.kept, 18) - parseUnits("1", 18), 18);
  await api.request(`/api/streams/${id}/withdraw`, { userId: "worker1", amount: remainder, destination: "belo" });
  const streams = await api.request("/api/streams?userId=worker1");
  const stream = streams.find(stream => stream.id === id);
  ensure(stream?.status === "canceled" && stream.withdrawn === canceled.kept && stream.deposited === canceled.kept, "La contabilidad final no coincide.");
  const activity = (await api.request("/api/activity?userId=worker1")).filter(row => row.streamId === id);
  ensure(activity.length === 5 && activity.filter(row => row.kind === "withdraw").length === 2 &&
    activity.every(row => row.txHash.startsWith("mock:") && row.explorerUrl === ""), "Historial incorrecto o modo real inesperado.");
  const other = await api.request("/api/activity?userId=worker2");
  ensure(!other.some(row => row.streamId === id), "El historial se filtró a otro trabajador.");
  console.log("HTTP mock OK: seed por API, journal reutilizable, top-up, retiro, cancelación, retiro remanente e historial aislado.");
} catch (error) { printFailure(error); }
finally { await stop(); }
