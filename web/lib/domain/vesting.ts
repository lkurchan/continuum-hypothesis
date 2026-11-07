import { amountFromUnits, compareAmounts, ExactDecimal, normalizeAmount, subtractAmounts, unitsText } from "./amounts";
import { requireCondition } from "./errors";
import type { Amount, StreamView } from "./types";

type Schedule = Pick<StreamView, "start" | "end" | "canceledAt">;
type VestingStream = Schedule & Pick<StreamView, "totalAmount">;

export function validatePeriod(start: number, end: number): void {
  requireCondition(Number.isSafeInteger(start) && start >= 0 && Number.isSafeInteger(end) && end > start,
    "El período debe usar segundos Unix enteros con inicio anterior al fin.");
}

export function vestedAt(stream: VestingStream, nowSec: number): Amount {
  validatePeriod(stream.start, stream.end);
  requireCondition(Number.isFinite(nowSec) && Number.isSafeInteger(Math.floor(nowSec)) && nowSec >= 0, "Reloj inválido.");
  if (stream.canceledAt !== null) {
    requireCondition(Number.isSafeInteger(stream.canceledAt) && stream.canceledAt >= 0, "Cancelación inválida.");
  }
  const total = normalizeAmount(stream.totalAmount);
  const t = stream.canceledAt || Math.floor(nowSec);
  if (t <= stream.start) return "0";
  if (t >= stream.end) return total;
  const units = new ExactDecimal(unitsText(total)).mul(t - stream.start).div(stream.end - stream.start).floor();
  return amountFromUnits(units.toFixed(0));
}

export function withdrawableAt(stream: VestingStream & Pick<StreamView, "deposited" | "withdrawn">, nowSec: number): Amount {
  const vested = vestedAt(stream, nowSec);
  const funded = compareAmounts(vested, stream.deposited) < 0 ? vested : stream.deposited;
  return subtractAmounts(funded, stream.withdrawn);
}

export function statusAt(stream: Schedule, nowSec: number): StreamView["status"] {
  if (stream.canceledAt) return "canceled";
  if (nowSec < stream.start) return "scheduled";
  return nowSec >= stream.end ? "completed" : "streaming";
}
