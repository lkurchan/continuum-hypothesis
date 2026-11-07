import { ExactDecimal, normalizeAmount, subtractAmounts } from "@/lib/domain/amounts";
import type { StreamView } from "@/lib/domain/types";

export function fundingTerms(stream: StreamView, text: string, payerId: string) {
  try {
    const amount = normalizeAmount(text.replace(",", "."));
    const remaining = subtractAmounts(stream.totalAmount, stream.deposited);
    if (stream.payerId !== payerId || stream.canceledAt !== null || !new ExactDecimal(amount).gt(0) || new ExactDecimal(amount).gt(remaining)) return null;
    return { amount, remaining };
  } catch { return null; }
}

export function fundingAmounts(stream: StreamView, now: number) {
  const total = new ExactDecimal(stream.totalAmount);
  const deposited = new ExactDecimal(stream.deposited);
  const remaining = ExactDecimal.max(0, total.minus(deposited));
  const span = stream.end - stream.start;
  const coveredUntil = stream.start + deposited.div(total).toNumber() * span;
  const step = Math.min(7 * 86400, span * 0.1);
  const until = Math.min(stream.end, Math.max(now, coveredUntil) + step);
  const next = ExactDecimal.min(remaining, ExactDecimal.max(0, total.mul(Math.max(0, until - stream.start)).div(span).minus(deposited)).toDecimalPlaces(2, ExactDecimal.ROUND_UP));
  return { remaining: remaining.toFixed(), quarter: ExactDecimal.min(remaining, total.div(4)).toFixed(), next: ExactDecimal.min(remaining, next).toFixed(), coveredUntil };
}

/** Exact display for the amount the user confirms, including sub-cent fees. */
export function formatFundingAmount(value: string): string {
  const [whole, fraction] = normalizeAmount(value).split(".");
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}${fraction ? `,${fraction}` : ""}`;
}
