import type { Amount, StreamView } from "@/lib/domain/types";

const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** es-AR money: $126.964,52. Display only; never feed the result back to the API. */
export function money(value: Amount | number, decimals = 0): string {
  const n = typeof value === "number" ? value : Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  const [int, dec] = Math.abs(safe).toFixed(decimals).split(".");
  return `${safe < 0 ? "−" : ""}$${group(int)}${dec ? `,${dec}` : ""}`;
}

/** Splits a live amount into integer, cents and the two extra "flow" digits. */
export function liveParts(value: number) {
  const [int, dec] = Math.max(0, value).toFixed(4).split(".");
  return { int: group(int), cents: dec.slice(0, 2), micro: dec.slice(2, 4) };
}

/** Integer pesos typed by the user ("50.000" → 50000). */
export function parseWhole(text: string): number {
  const digits = text.replace(/\D/g, "").slice(0, 10);
  return digits ? Number.parseInt(digits, 10) : 0;
}

export const groupWhole = (n: number) => (n ? group(String(n)) : "");

export function shortHash(hash: string): string {
  if (!hash.startsWith("0x")) return hash.length > 14 ? `${hash.slice(0, 13)}…` : hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

export const shortAddress = shortHash;

export function isOnchain(hash: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(hash);
}

export function explorerTx(hash: string): string | null {
  return isOnchain(hash) ? `https://arbiscan.io/tx/${hash}` : null;
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

const time = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const day = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });

export function when(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return `Hoy, ${time.format(d)}`;
  if (same(d, yesterday)) return `Ayer, ${time.format(d)}`;
  return `${day.format(d)}, ${time.format(d)}`;
}

export function dateLabel(unixSec: number): string {
  return day.format(new Date(unixSec * 1000));
}

export function clock(unixSec: number): string {
  return time.format(new Date(unixSec * 1000));
}

/** Human duration for a stream period. */
export function durationLabel(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)} h`;
  return `${Math.round(seconds / 86_400)} días`;
}

/**
 * Smooth display mirror of the contract formula with fractional seconds, so the
 * counter moves every frame. Limits and validation use lib/domain/vesting.
 */
export function liveVested(s: Pick<StreamView, "totalAmount" | "start" | "end" | "canceledAt">, nowSec: number): number {
  const t = s.canceledAt ?? nowSec;
  const total = Number(s.totalAmount);
  if (t <= s.start) return 0;
  if (t >= s.end) return total;
  return (total * (t - s.start)) / (s.end - s.start);
}

export function liveAvailable(s: StreamView, nowSec: number): number {
  return Math.max(0, Math.min(liveVested(s, nowSec), Number(s.deposited)) - Number(s.withdrawn));
}

export function ratePerSecond(s: StreamView): number {
  return Number(s.totalAmount) / (s.end - s.start);
}

export function liveStatus(s: StreamView, nowSec: number): StreamView["status"] {
  if (s.canceledAt) return "canceled";
  if (nowSec < s.start) return "scheduled";
  return nowSec >= s.end ? "completed" : "streaming";
}
