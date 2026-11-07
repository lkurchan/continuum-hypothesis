import { parseArgs } from "node:util";
import { loadEnvironment, printFailure } from "./lib/environment.mjs";
import { database, syncWallets, walletPlan } from "./lib/readiness.mjs";

try {
  const { values } = parseArgs({ options: { apply: { type: "boolean", default: false } } });
  const env = loadEnvironment();
  const plan = await syncWallets(database(env), walletPlan(env), values.apply);
  console.log(JSON.stringify({ applied: values.apply, wallets: plan }, null, 2));
  if (!values.apply) console.log("Solo lectura. Para aplicar este plan: npm run backend:wallets -- --apply");
} catch (error) { printFailure(error); }
