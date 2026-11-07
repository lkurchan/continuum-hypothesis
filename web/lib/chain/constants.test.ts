import { expect, it } from "vitest";
import { explorerTxUrl } from "./constants";

it("links a transaction to the Arbitrum One explorer", () => {
  const hash = `0x${"a".repeat(64)}`;
  expect(explorerTxUrl(hash)).toBe(`https://arbiscan.io/tx/${hash}`);
});
