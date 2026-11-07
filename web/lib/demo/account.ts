import type { DemoUser, StreamView } from "@/lib/domain/types";
import { withdrawableAt } from "@/lib/domain/vesting";

/**
 * The demo account buys and sells. The API keeps strict roles, so the account
 * composes the first payer (pays providers) and the first worker by id
 * (collects from clients). The remaining workers are the providers.
 */
export interface DemoRoles { payer: DemoUser; receiver: DemoUser; providers: DemoUser[] }

export function pickRoles(users: DemoUser[]): DemoRoles | null {
  const payer = users.find((u) => u.role === "payer");
  const workers = users.filter((u) => u.role === "worker").sort((a, b) => a.id.localeCompare(b.id));
  if (!payer || workers.length < 2) return null;
  const [receiver, ...providers] = workers;
  return { payer, receiver, providers };
}

/** Incoming: streams paid to the receiver. Outgoing: payer streams to any other worker. */
export function splitStreams(roles: DemoRoles, payerStreams: StreamView[], receiverStreams: StreamView[]) {
  const incoming = receiverStreams.filter((s) => s.workerId === roles.receiver.id);
  const outgoing = payerStreams.filter((s) => s.payerId === roles.payer.id && s.workerId !== roles.receiver.id);
  return { incoming, outgoing };
}

const cents = (amount: string) => Math.floor(Number(amount) * 100);

/** Whole cents withdrawable from a stream, measured at the last whole second. */
export function availableCents(stream: StreamView, nowSec: number): number {
  return Math.max(0, cents(withdrawableAt(stream, Math.floor(nowSec))));
}

/**
 * Splits a withdrawal across incoming streams, largest balance first. Returns
 * an empty plan when the streams cannot cover the amount.
 */
export function planWithdrawal(incoming: StreamView[], amount: number, nowSec: number): { streamId: string; amount: string }[] {
  let rest = Math.floor(amount * 100);
  if (rest <= 0) return [];
  const pool = incoming
    .map((s) => ({ id: s.id, cents: availableCents(s, nowSec) }))
    .filter((x) => x.cents > 0)
    .sort((a, b) => b.cents - a.cents);
  const plan: { streamId: string; amount: string }[] = [];
  for (const x of pool) {
    if (rest <= 0) break;
    const take = Math.min(rest, x.cents);
    plan.push({ streamId: x.id, amount: (take / 100).toFixed(2) });
    rest -= take;
  }
  return rest > 0 ? [] : plan;
}
