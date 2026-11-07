import { liveAvailable, liveStatus, liveVested, ratePerSecond } from "@/components/ui/format";
import type { StreamView } from "@/lib/domain/types";
import { withdrawableAt } from "@/lib/domain/vesting";

/**
 * Whole pesos withdrawable from one stream, by the same rule the server and the
 * contract apply (whole seconds). One second back so the transaction never asks
 * for money that only exists in the browser's fractional clock.
 */
const withdrawable = (s: StreamView, now: number) => Math.floor(Number(withdrawableAt(s, Math.max(0, Math.floor(now) - 1))));

/** What the worker can withdraw across every stream, in whole pesos. */
export function totalWithdrawable(streams: StreamView[], now: number): number {
  return streams.reduce((sum, s) => sum + withdrawable(s, now), 0);
}

/** Live (fractional) available across every stream, for the counter. */
export function totalAvailable(streams: StreamView[], now: number): number {
  return streams.reduce((sum, s) => sum + liveAvailable(s, now), 0);
}

/** Pesos per second still accruing: streaming and not yet capped by what the payer funded. */
export function totalRate(streams: StreamView[], now: number): number {
  return streams
    .filter((s) => liveStatus(s, now) === "streaming" && liveVested(s, now) < Number(s.deposited))
    .reduce((sum, s) => sum + ratePerSecond(s), 0);
}

/**
 * Splits a withdrawal across streams, one transaction each. Streams that stopped
 * accruing go first (finished, canceled, capped), then the one ending soonest,
 * so the money that keeps growing stays where it is.
 */
export function splitWithdrawal(streams: StreamView[], now: number, amount: number): { streamId: string; amount: number }[] {
  const still = (s: StreamView) => liveStatus(s, now) !== "streaming" || liveVested(s, now) >= Number(s.deposited);
  const ordered = streams
    .filter((s) => withdrawable(s, now) > 0)
    .sort((a, b) => Number(still(b)) - Number(still(a)) || a.end - b.end);
  const plan: { streamId: string; amount: number }[] = [];
  let left = Math.floor(amount);
  for (const s of ordered) {
    if (left <= 0) break;
    const take = Math.min(left, withdrawable(s, now));
    plan.push({ streamId: s.id, amount: take });
    left -= take;
  }
  if (left > 0) throw new Error("El monto supera lo que podés retirar.");
  return plan;
}
