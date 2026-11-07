import { ExactDecimal, compareAmounts, normalizeAmount } from "./amounts";
import type { Activity, StreamView } from "./types";

const DAY = 86_400;

export type ReputationScore = "excelente" | "buena" | "regular" | "sin_historial";

export interface PaymentReputation {
  clientId: string;
  agreements: number;           // acuerdos donde la empresa es cliente
  fullyFunded: number;          // acuerdos con deposited == totalAmount
  avgFundingLeadDays: number;   // anticipación promedio de cada tramo respecto de la cobertura vigente (negativo = tarde)
  lateEpisodes: number;         // veces que un acuerdo quedó atrasado
  daysLate: number;             // días acumulados en atraso
  score: ReputationScore;
  lastTx: { hash: string; explorerUrl: string } | null; // prueba verificable onchain
}

/** Segundo hasta el que `deposited` cubre lo devengado (fórmula espejo del contrato). */
function coveredUntil(stream: StreamView, deposited: string): number {
  const total = normalizeAmount(stream.totalAmount);
  if (compareAmounts(deposited, total) >= 0) return stream.end;
  const fraction = new ExactDecimal(normalizeAmount(deposited)).div(total);
  return stream.start + fraction.mul(stream.end - stream.start).toNumber();
}

/**
 * Historial de pago de una empresa cliente, reconstruido desde los depósitos registrados
 * (create y topup). Función pura: no lee la chain; los txHash de la actividad son la prueba.
 */
export function paymentReputation(clientId: string, streams: StreamView[], activity: Activity[], nowSec: number): PaymentReputation {
  const own = streams.filter(s => s.payerId === clientId);
  const deposits = activity
    .filter(a => (a.kind === "create" || a.kind === "topup") && own.some(s => s.id === a.streamId))
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

  const leads: number[] = [];
  let lateEpisodes = 0;
  let secondsLate = 0;

  for (const stream of own) {
    const horizon = Math.min(stream.canceledAt ?? Infinity, stream.end);
    let deposited = "0";
    let covered: number | null = null;
    for (const dep of deposits.filter(d => d.streamId === stream.id)) {
      const at = Date.parse(dep.createdAt) / 1000;
      if (covered !== null && at <= horizon) {
        const lead = covered - at;
        leads.push(lead);
        if (lead < 0) { lateEpisodes++; secondsLate += -lead; }
      }
      deposited = new ExactDecimal(deposited).plus(normalizeAmount(dep.amount)).toFixed();
      covered = coveredUntil(stream, deposited);
    }
    // Atraso abierto: la cobertura actual ya venció y el acuerdo sigue (o siguió hasta su fin) sin fondos.
    const currentCover = covered ?? stream.start;
    const until = Math.min(nowSec, horizon);
    if (currentCover < until) { lateEpisodes++; secondsLate += until - currentCover; }
  }

  const avgLead = leads.length ? leads.reduce((a, b) => a + b, 0) / leads.length / DAY : 0;
  const fullyFunded = own.filter(s => compareAmounts(s.deposited, s.totalAmount) >= 0).length;
  const score: ReputationScore = own.length === 0 ? "sin_historial"
    : lateEpisodes === 0 && (leads.length === 0 || avgLead >= 1) ? "excelente"
    : lateEpisodes <= 1 ? "buena" : "regular";
  const last = deposits.at(-1);

  return {
    clientId, agreements: own.length, fullyFunded, avgFundingLeadDays: avgLead, lateEpisodes,
    daysLate: secondsLate / DAY, score,
    lastTx: last ? { hash: last.txHash, explorerUrl: last.explorerUrl } : null,
  };
}
