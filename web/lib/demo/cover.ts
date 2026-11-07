/** Seconds elapsed in the local calendar month of `date`, and the month's length. */
export function monthProgress(date: Date): { elapsed: number; length: number } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime();
  return { elapsed: (date.getTime() - start) / 1000, length: (end - start) / 1000 };
}

/** Accrual rate of a monthly contract during the month of `date`, per second. */
export function monthlyRate(monthly: number, date: Date): number {
  return monthly / monthProgress(date).length;
}

/**
 * Cover counter: month-to-date accrual of a monthly contract. It ramps from 0
 * to that value during `rampMs` after `openedAt` (ease-out quart), then keeps
 * growing at the contract's constant rate.
 */
export function coverAmount(monthly: number, now: Date, openedAt: number, rampMs = 1800): number {
  const { elapsed, length } = monthProgress(now);
  const target = (monthly * elapsed) / length;
  if (rampMs <= 0) return target;
  const p = Math.min(1, Math.max(0, (now.getTime() - openedAt) / rampMs));
  return target * (1 - (1 - p) ** 4);
}
