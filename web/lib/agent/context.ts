import "server-only";
import type { StreamService } from "@/lib/domain/StreamService";
import { requireCondition } from "@/lib/domain/errors";
import type { ActivityKind } from "@/lib/domain/types";
import { statusAt, vestedAt, withdrawableAt } from "@/lib/domain/vesting";

const pesos = (value: string | number) => {
  const n = Number(value);
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const kinds: Record<ActivityKind, string> = {
  create: "fondeo inicial del pagador",
  topup: "recarga del pagador",
  withdraw: "retiro",
  cancel: "cancelación (reintegro al pagador)",
  agent_payment: "pago",
  fee: "comisión Continuum del 0,05% (la paga el cliente)",
};
const date = (sec: number) => new Date(sec * 1000).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "medium", timeStyle: "short" });

/**
 * Plain-text snapshot of the worker's money, computed with the same pure
 * functions as the contract mirror. The model reads these numbers; it never
 * computes balances on its own.
 */
export async function workerSnapshot(service: StreamService, userId: string, nowSec = Math.floor(Date.now() / 1000)) {
  const user = (await service.users()).find((u) => u.id === userId);
  requireCondition(user, "Usuario inexistente.", 404);
  requireCondition(user.role === "worker", "El copiloto es solo para trabajadores.", 403);
  const [streams, activity] = await Promise.all([service.streams(userId), service.activity(userId)]);

  const lines = streams.map((s) => {
    const span = s.end - s.start;
    const perSecond = Number(s.totalAmount) / span;
    const status = statusAt(s, nowSec);
    return [
      `- Pago #${s.id}${s.label ? ` (${s.label})` : ""}: estado ${status}.`,
      `  Período: ${date(s.start)} a ${date(s.end)}. Total del período ${pesos(s.totalAmount)}.`,
      `  Ritmo: ${pesos(perSecond * 3600)} por hora (${pesos(perSecond * 86_400)} por día).`,
      `  Ganado hasta ahora ${pesos(vestedAt(s, nowSec))}. Fondeado por el pagador ${pesos(s.deposited)}. Ya retirado ${pesos(s.withdrawn)}.`,
      `  Disponible para retirar ahora: ${pesos(withdrawableAt(s, nowSec))}.`,
      status === "streaming" ? `  Si sigue así, al final del período habrá ganado ${pesos(s.totalAmount)}; solo puede retirar lo que el pagador haya fondeado.` : "",
    ].filter(Boolean).join("\n");
  });

  const recent = [...activity].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8)
    .map((a) => `- ${new Date(a.createdAt).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}: ${kinds[a.kind]} ${pesos(a.amount)}`);

  return [
    `Trabajador: ${user.name}. Fecha y hora actual: ${date(nowSec)} (Buenos Aires).`,
    `Pagos:\n${lines.join("\n") || "- No tiene pagos todavía."}`,
    `Últimos movimientos:\n${recent.join("\n") || "- Ninguno."}`,
  ].join("\n\n");
}
