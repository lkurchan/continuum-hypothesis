import { parseArgs } from "node:util";
import { apiClient } from "./lib/demo-api.mjs";
import { loadEnvironment, printFailure } from "./lib/environment.mjs";
import { walletPlan } from "./lib/readiness.mjs";
import { verifyApi } from "./lib/verify-api.mjs";

try {
  const { values } = parseArgs({ options: { url: { type: "string", default: "http://127.0.0.1:3000" } } });
  const report = await verifyApi(apiClient(values.url, "real"), walletPlan(loadEnvironment()));
  console.log(JSON.stringify(report, null, 2));
} catch (error) { printFailure(error); }
