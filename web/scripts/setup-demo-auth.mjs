import { randomBytes, scryptSync } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { webRoot } from "./lib/environment.mjs";

// No secrets in stdout or the shell command. Exclusive creation prevents
// accidentally replacing the live access key on a second invocation.
const password = randomBytes(24).toString("base64url");
const salt = randomBytes(32);
const configuration = {
  DEMO_AUTH_PASSWORD_HASH: `${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`,
  DEMO_AUTH_SECRET: randomBytes(32).toString("hex"),
};
const directory = resolve(webRoot, ".operations");
await mkdir(directory, { recursive: true, mode: 0o700 });
const file = resolve(directory, "demo-auth.json");
await writeFile(file, JSON.stringify({ password, configuration }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
console.log("Credenciales generadas en web/.operations/demo-auth.json (privado, ignorado por Git). No compartir ni publicar el archivo completo: configuration contiene el secreto de sesión.");
