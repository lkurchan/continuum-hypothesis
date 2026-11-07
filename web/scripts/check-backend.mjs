import { loadEnvironment, printFailure } from "./lib/environment.mjs";
import { checkReadiness } from "./lib/readiness.mjs";

try {
  const report = await checkReadiness(loadEnvironment());
  console.log(JSON.stringify(report, null, 2));
  if (!report.ready) process.exitCode = 1;
} catch (error) { printFailure(error); }
