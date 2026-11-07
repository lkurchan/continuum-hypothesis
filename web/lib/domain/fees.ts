import { ExactDecimal, amountFromUnits, normalizeAmount, unitsText } from "./amounts";
import type { Amount } from "./types";

// Continuum commission paid by the client on top of each deposit: 0.05%.
export const FEE_BPS = 5;

export function feeFor(amount: Amount): Amount {
  const units = new ExactDecimal(unitsText(normalizeAmount(amount))).mul(FEE_BPS).div(10_000).floor();
  return amountFromUnits(units.toFixed(0));
}
