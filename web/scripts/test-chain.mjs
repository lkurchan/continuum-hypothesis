import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const web = fileURLToPath(new URL("../", import.meta.url));
const artifacts = resolve(web, "../contracts/out");
const vitest = resolve(web, "node_modules/vitest/vitest.mjs");
for (const file of [vitest, ...["ContinuumStreams", "MockERC20"].map(name => resolve(artifacts, `${name}.sol/${name}.json`))]) {
  await access(file).catch(() => { throw new Error(`Missing ${file}. Run npm ci --prefix web and forge build --root contracts first.`); });
}

const port = await new Promise((accept, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const { port } = server.address();
    server.close(error => error ? reject(error) : accept(port));
  });
});
const rpc = `http://127.0.0.1:${port}`;
const children = [];
function launch(command, args, options) {
  const child = spawn(command, args, options);
  const state = { child, finished: false, error: null };
  state.done = new Promise(accept => {
    child.once("error", error => { state.error = error; });
    child.once("close", (code, signal) => { state.finished = true; accept({ code, signal, error: state.error }); });
  });
  children.push(state);
  return state;
}
async function stopAll() {
  await Promise.all(children.map(async state => {
    if (state.finished) return;
    state.child.kill("SIGTERM");
    await Promise.race([state.done, delay(3000, undefined, { ref: false })]);
    if (!state.finished) state.child.kill("SIGKILL");
    await state.done;
  }));
}
for (const [signal, code] of [["SIGINT", 130], ["SIGTERM", 143]]) {
  process.once(signal, () => { void stopAll().finally(() => process.exit(code)); });
}

try {
  const anvil = launch("anvil", ["--host", "127.0.0.1", "--port", String(port), "--chain-id", "42161", "--accounts", "0", "--silent"], { stdio: ["ignore", "ignore", "inherit"] });
  const deadline = Date.now() + 15_000;
  while (true) {
    if (anvil.error || anvil.finished) throw new Error("Anvil failed to start. Install Foundry and include anvil in PATH.", { cause: anvil.error });
    try {
      const response = await fetch(rpc, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }), signal: AbortSignal.timeout(500) });
      if ((await response.json()).result === "0xa4b1") break;
    } catch { /* The child may still be binding its loopback socket. */ }
    if (Date.now() > deadline) throw new Error("Anvil did not become ready within 15 seconds.");
    await delay(100);
  }
  if (anvil.finished) throw new Error("Anvil exited before the integration test.");
  const test = launch(process.execPath, [vitest, "run", "lib/chain/ViemStreamGateway.integration.test.ts"], {
    cwd: web, stdio: "inherit", env: { ...process.env, LOCAL_CHAIN_RPC_URL: rpc, CONTINUUM_TEST_ARTIFACTS: artifacts },
  });
  const result = await Promise.race([test.done, delay(90_000, { error: new Error("Integration test timed out.") }, { ref: false })]);
  if (result.error) throw result.error;
  if (result.code !== 0 || anvil.finished) throw new Error(`Integration failed (exit ${result.code}, signal ${result.signal}).`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await stopAll();
}
