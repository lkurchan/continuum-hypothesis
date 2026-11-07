import type { Activity, StreamView } from "@/lib/domain/types";
import { liveVested } from "./format";

/**
 * Display mirror of the pivot spec (section 5) until module B ships
 * lib/domain/funding.ts and lib/domain/fees.ts. Same formulas, in floats, for
 * the live UI; the server and the contract stay the source of truth.
 */
export type FundingState = "al_dia" | "por_vencer" | "atrasado" | "completo" | "cancelado";

export interface FundingView {
  state: FundingState;
  debt: number;               // max(0, vested − deposited)
  fundedUntil: number | null; // unix sec when vested reaches deposited; null when fully funded
  remainingToFund: number;    // total − deposited
}

/** "Por vencer" warns 3 days ahead, or 10 % of the period for short demo agreements. */
export const warnWindow = (s: Pick<StreamView, "start" | "end">) => Math.min(3 * 86_400, (s.end - s.start) * 0.1);

export function fundingView(s: StreamView, now: number): FundingView {
  const total = Number(s.totalAmount);
  const deposited = Number(s.deposited);
  const remainingToFund = Math.max(0, total - deposited);
  const debt = Math.max(0, liveVested(s, now) - deposited);
  const fundedUntil = deposited >= total ? null : s.start + (deposited / total) * (s.end - s.start);
  const state: FundingState = s.canceledAt ? "cancelado"
    : fundedUntil === null ? "completo"
    : now > fundedUntil ? "atrasado"
    : fundedUntil - now < warnWindow(s) ? "por_vencer"
    : "al_dia";
  return { state, debt, fundedUntil, remainingToFund };
}

/** Amount that funds the agreement up to `untilSec`, capped by what is left. */
export function trancheUntil(s: StreamView, untilSec: number): number {
  const total = Number(s.totalAmount);
  const target = Math.min(total, (total * Math.max(0, Math.min(untilSec, s.end) - s.start)) / (s.end - s.start));
  return Math.max(0, Math.ceil(target - Number(s.deposited)));
}

/** Comisión Continuum: 0,05 % of each client deposit, charged on top of it. */
export const FEE_RATE = 0.0005;
export const feeFor = (amount: number) => Math.floor(amount * FEE_RATE * 100) / 100;

export const fundingCopy: Record<FundingState, { label: string; cls: string; dot: string }> = {
  al_dia: { label: "Al día", cls: "bg-[#E8F5EE] text-[#1E7D4F]", dot: "bg-[#1E7D4F]" },
  por_vencer: { label: "Por vencer", cls: "bg-mock-soft text-mock", dot: "bg-mock" },
  atrasado: { label: "Atrasado", cls: "bg-danger-soft text-danger", dot: "bg-danger" },
  completo: { label: "Completo", cls: "bg-surface text-ink-2", dot: "bg-ink-2" },
  cancelado: { label: "Cancelado", cls: "bg-surface text-subtle", dot: "bg-subtle" },
};

/** Activity kinds shown to each side: the provider never sees the client's fee. */
export const isFee = (a: Activity) => (a.kind as string) === "fee";
