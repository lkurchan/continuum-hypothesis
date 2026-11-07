import "server-only";
import type { StreamService } from "@/lib/domain/StreamService";
import { requireCondition } from "@/lib/domain/errors";
import { statusAt, vestedAt, withdrawableAt } from "@/lib/domain/vesting";

const pesos = (value: string | number) => {
  const n = Number(value);
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
// Keyed by string so kinds added later (the client's fee) never break the copilot.
const kinds: Record<string, string> = {
  create: "primer tramo fondeado por el cliente",
  topup: "tramo fondeado por el cliente",
  withdraw: "cobro",
  cancel: "acuerdo cancelado (reintegro al cliente)",
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
  requireCondition(user.role === "worker", "El copiloto es solo para proveedores.", 403);
  const [streams, activity, users] = await Promise.all([service.streams(userId), service.activity(userId), service.users()]);
  const clientName = (id: string) => users.find((u) => u.id === id)?.name ?? id;

  const lines = streams.map((s) => {
    const span = s.end - s.start;
    const total = Number(s.totalAmount);
    const perSecond = total / span;
    const status = statusAt(s, nowSec);
    const vested = Number(vestedAt(s, nowSec));
    const deposited = Number(s.deposited);
    const debt = Math.max(0, vested - deposited);
    const fundedUntil = deposited >= total ? null : s.start + (deposited / total) * span;
    const funding = s.canceledAt ? "cancelado" : fundedUntil === null ? "fondeado completo"
      : nowSec > fundedUntil ? `ATRASADO: el cliente le debe ${pesos(debt)}` : `al día, cubierto hasta ${date(Math.floor(fundedUntil))}`;
    return [
      `- Acuerdo #${s.id}: servicio "${s.label ?? "sin nombre"}" para el cliente ${clientName(s.payerId)}. Estado: ${status}. Fondeo: ${funding}.`,
      `  Período: ${date(s.start)} a ${date(s.end)}. Precio fijo del período ${pesos(s.totalAmount)} (${pesos(perSecond * 3600)} por hora).`,
      `  Devengado hasta ahora ${pesos(vested)}. Fondeado por el cliente ${pesos(deposited)}. Ya cobrado ${pesos(s.withdrawn)}.`,
      `  Disponible para cobrar ahora: ${pesos(withdrawableAt(s, nowSec))}.`,
    ].join("\n");
  });

  const recent = [...activity].filter((a) => a.kind in kinds).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8)
    .map((a) => `- ${new Date(a.createdAt).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}: ${kinds[a.kind]} ${pesos(a.amount)}`);

  return [
    `Proveedor: ${user.name}. Fecha y hora actual: ${date(nowSec)} (Buenos Aires).`,
    `Acuerdos de servicio:\n${lines.join("\n") || "- No tiene acuerdos todavía."}`,
    `Últimos movimientos:\n${recent.join("\n") || "- Ninguno."}`,
  ].join("\n\n");
}

/**
 * Snapshot for the client company (role `payer`): coverage of each service
 * agreement, period totals and the providers it can propose new agreements to.
 */
export async function payerSnapshot(service: StreamService, userId: string, nowSec = Math.floor(Date.now() / 1000)) {
  const users = await service.users();
  const user = users.find((u) => u.id === userId);
  requireCondition(user, "Usuario inexistente.", 404);
  requireCondition(user.role === "payer", "El asistente de clientes es solo para clientes.", 403);
  const [streams, activity] = await Promise.all([service.streams(userId), service.activity(userId)]);
  const providers = users.filter((u) => u.role === "worker");
  const nameOf = (id: string) => providers.find((u) => u.id === id)?.name ?? id;
  const sum = { vested: 0, withdrawn: 0, pending: 0, toFund: 0 };

  const lines = streams.map((s) => {
    const status = statusAt(s, nowSec);
    const total = Number(s.totalAmount), deposited = Number(s.deposited), vested = Number(vestedAt(s, nowSec));
    const live = status === "streaming" || status === "scheduled";
    // ponytail: mirrors fundingStatus() from the B2B pivot; swap to lib/domain/funding.ts once B merges it.
    const fundedUntil = s.start + Math.floor((deposited / total) * (s.end - s.start));
    const debt = Math.max(0, vested - deposited);
    sum.vested += vested; sum.withdrawn += Number(s.withdrawn);
    if (live) { sum.pending += total - vested; sum.toFund += total - deposited; }
    const coverage = status === "canceled" ? "cancelado"
      : deposited >= total ? "completo, fondeado al 100 %"
      : debt > 0 ? `ATRASADO: le debe ${pesos(debt)} al proveedor (cubierto solo hasta ${date(fundedUntil)})`
      : `al día, cubierto hasta ${date(fundedUntil)}`;
    return [
      `- Acuerdo #${s.id} con ${nameOf(s.workerId)}${s.label ? ` (servicio: ${s.label})` : ""}: estado ${status}, ${coverage}.`,
      `  Período: ${date(s.start)} a ${date(s.end)}. Precio total ${pesos(total)}. Ritmo ${pesos((total / (s.end - s.start)) * 86_400)} por día.`,
      `  Devengado ahora ${pesos(vested)}. Fondeado ${pesos(deposited)}. Retirado por el proveedor ${pesos(s.withdrawn)}. Falta fondear ${pesos(total - deposited)}.`,
    ].join("\n");
  });

  const recent = [...activity].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10)
    .map((a) => `- ${new Date(a.createdAt).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}: ${payerKinds[a.kind] ?? a.kind} ${pesos(a.amount)}, acuerdo #${a.streamId}, hash ${a.txHash}`);

  return [
    `Cliente: ${user.name}. Fecha y hora actual: ${date(nowSec)} (Buenos Aires).`,
    `Proveedores disponibles (usá el id en proponer_acuerdo):\n${providers.map((p) => `- id ${p.id}: ${p.name}`).join("\n") || "- Ninguno."}`,
    `Acuerdos de servicio:\n${lines.join("\n") || "- No tiene acuerdos todavía."}`,
    `Totales: devengado ${pesos(sum.vested)}, retirado por proveedores ${pesos(sum.withdrawn)}. En acuerdos vigentes: falta devengar ${pesos(sum.pending)} y falta fondear ${pesos(sum.toFund)}.`,
    `Últimos movimientos:\n${recent.join("\n") || "- Ninguno."}`,
  ].join("\n\n");
}

const payerKinds: Record<string, string> = {
  create: "creación del acuerdo con primer tramo",
  topup: "tramo fondeado",
  withdraw: "cobro del proveedor",
  cancel: "cancelación (reintegro al cliente)",
  agent_payment: "pago",
  fee: "comisión Continuum",
};
