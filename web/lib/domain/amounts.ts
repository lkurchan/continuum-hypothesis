import Decimal from "decimal.js";
import { requireCondition } from "./errors";
import type { Amount } from "./types";

// uint256 (78 digits) multiplied by a safe Unix interval (16 digits) fits exactly.
export const ExactDecimal = Decimal.clone({ precision: 100, rounding: Decimal.ROUND_DOWN });
const scale = new ExactDecimal("1000000000000000000");
const maxUnits = new ExactDecimal("115792089237316195423570985008687907853269984665640564039457584007913129639935");

export function normalizeAmount(value: unknown): Amount {
  requireCondition(typeof value === "string" && /^(0|[1-9]\d*)(\.\d{1,18})?$/.test(value) && value.length <= 80,
    "El monto debe ser un string decimal no negativo de hasta 18 decimales.");
  const amount = new ExactDecimal(value);
  requireCondition(amount.mul(scale).lte(maxUnits), "El monto excede uint256.");
  return amount.toFixed();
}

export function positiveAmount(value: unknown): Amount {
  const amount = normalizeAmount(value);
  requireCondition(amount !== "0", "El monto debe ser mayor a cero.");
  return amount;
}

export function unitsText(amount: Amount): string {
  return new ExactDecimal(normalizeAmount(amount)).mul(scale).toFixed(0);
}

export function amountFromUnits(units: string): Amount {
  return normalizeAmount(new ExactDecimal(units).div(scale).toFixed());
}

export function addAmounts(a: Amount, b: Amount): Amount {
  return normalizeAmount(new ExactDecimal(normalizeAmount(a)).plus(normalizeAmount(b)).toFixed());
}

export function subtractAmounts(a: Amount, b: Amount): Amount {
  return normalizeAmount(new ExactDecimal(normalizeAmount(a)).minus(normalizeAmount(b)).toFixed());
}

export function compareAmounts(a: Amount, b: Amount): number {
  return new ExactDecimal(normalizeAmount(a)).cmp(normalizeAmount(b));
}
