import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { apiClient, seedDemo } from "./lib/demo-api.mjs";
import { ensure, printFailure, webRoot } from "./lib/environment.mjs";

try {
  const { values } = parseArgs({ options: { url: { type: "string", default: "http://127.0.0.1:3000" }, mode: { type: "string", default: "mock" },
    total: { type: "string", default: "10" }, deposit: { type: "string", default: "1" }, duration: { type: "string", default: "900" },
    payer: { type: "string", default: "platform" }, workers: { type: "string", default: "worker1,worker2" },
    execute: { type: "boolean", default: false }, journal: { type: "string" } } });
  const api = apiClient(values.url, values.mode);
  const file = values.journal ? resolve(values.journal) : resolve(webRoot, `.operations/seed-${api.mode}.json`);
  const journal = {
    async read() {
      try { return JSON.parse(await readFile(file, "utf8")); }
      catch (error) { if (error.code === "ENOENT") return null; ensure(false, "Journal ilegible. No se realizará otro envío."); }
    },
    async create(record) {
      await mkdir(dirname(file), { recursive: true, mode: 0o700 });
      try { await writeFile(file, JSON.stringify(record, null, 2), { flag: "wx", mode: 0o600 }); }
      catch { ensure(false, "No se pudo crear el journal exclusivo. Revisá si ya existe antes de repetir."); }
    },
    async save(record) {
      const temporary = `${file}.${process.pid}.tmp`;
      await writeFile(temporary, JSON.stringify(record, null, 2), { mode: 0o600 });
      await rename(temporary, file);
    },
  };
  const result = await seedDemo(api, { payerId: values.payer, workerIds: values.workers.split(","), totalAmount: values.total,
    initialDeposit: values.deposit, duration: Number(values.duration), execute: values.execute }, journal);
  console.log(JSON.stringify(result, null, 2));
  if (values.execute) console.log(`Journal: ${file}`);
  else console.log("Plan solamente. Revisá montos/destinos/modo antes de repetir el comando con --execute.");
} catch (error) { printFailure(error); }
