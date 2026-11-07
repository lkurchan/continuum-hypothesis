import type { DemoUser } from "@/lib/domain/types";

/** Same options as /payer/nuevo. */
export const PERIODS = [900, 3600, 86_400, 604_800, 2_592_000] as const;
export const FUND_PERCENTS = [25, 50, 100] as const;

export type Proposal = {
  items: { workerId: string; name: string; totalAmount: string; initialDeposit: string }[];
  period: number;
};

/** Separates the streamed text from the proposal JSON in /api/agent/chat. */
export const PROPOSAL_SEPARATOR = "\u001e";

/**
 * Validates the model's `proponer_acuerdo` arguments against real demo users.
 * Throws a Spanish message the chat shows when the model asks for something invalid.
 */
export function toProposal(users: DemoUser[], args: unknown, userText?: string): Proposal {
  const said = userText === undefined ? null : amountsIn(userText);
  const a = (args ?? {}) as { items?: unknown; period?: unknown; fundPercent?: unknown };
  if (!PERIODS.includes(a.period as never)) throw new Error("La duración no es una de las opciones disponibles.");
  if (!FUND_PERCENTS.includes(a.fundPercent as never)) throw new Error("El primer tramo tiene que ser 25, 50 o 100 %.");
  if (!Array.isArray(a.items) || a.items.length < 1 || a.items.length > 100) throw new Error("La propuesta necesita entre 1 y 100 proveedores.");
  const fund = a.fundPercent as number;
  const seen = new Set<string>();
  const items = a.items.map((raw) => {
    const item = (raw ?? {}) as { workerId?: unknown; totalAmount?: unknown };
    const user = users.find((u) => u.id === item.workerId && u.role === "worker");
    if (!user) throw new Error(`No encontré al proveedor "${String(item.workerId)}".`);
    if (seen.has(user.id)) throw new Error(`${user.name} aparece dos veces.`);
    seen.add(user.id);
    const total = item.totalAmount;
    // Small models call the tool with 0 or an invented price when the user gave none: ask instead.
    if (total === 0 || (said && typeof total === "number" && !said.has(total))) throw new Error(`¿Cuál es el precio total en pesos del acuerdo con ${user.name}?`);
    if (typeof total !== "number" || !Number.isSafeInteger(total) || total <= 0 || total > 1e12) throw new Error(`El monto para ${user.name} no es válido.`);
    return { workerId: user.id, name: user.name, totalAmount: String(total), initialDeposit: String(Math.floor((total * fund) / 100)) };
  });
  return { items, period: a.period as number };
}

/** Peso amounts the user wrote: "300.000", "$300 mil", "300k", "1,5 millones". */
export function amountsIn(text: string): Set<number> {
  const found = new Set<number>();
  for (const [, raw, unit = ""] of text.matchAll(/(\d[\d.,]*)\s*(k|mil|millones|millón|millon|palos?|m)?\b/gi)) {
    const n = Number(raw.replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
    const u = unit.toLowerCase();
    const mult = u === "k" || u === "mil" ? 1e3 : u ? 1e6 : 1;
    if (Number.isFinite(n)) found.add(Math.round(n * mult));
  }
  return found;
}
