import nextEnv from "@next/env";
import { fileURLToPath } from "node:url";

export const webRoot = fileURLToPath(new URL("../../", import.meta.url));

export function loadEnvironment() {
  nextEnv.loadEnvConfig(webRoot, false, { info() {}, error() {} });
  return process.env;
}

export class OperationError extends Error {}

export function ensure(condition, message) {
  if (!condition) throw new OperationError(message);
}

export function printFailure(error) {
  console.error(error instanceof OperationError ? error.message : "No se pudo completar la operación. Revisá la configuración; no se muestran detalles privados del proveedor.");
  process.exitCode = 1;
}
