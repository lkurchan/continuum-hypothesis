import type { ReactNode } from "react";
import type { StreamView } from "@/lib/domain/types";
import { explorerTx, initials, shortHash } from "./format";
import { fundingCopy, type FundingState } from "./agreement";

export function Logo({ size = 28, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
        <rect width="28" height="28" rx="8" fill="#0B0B0C" />
        <path d="M7 14h9.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        <circle cx="20" cy="14" r="2.6" fill="#6CB4EE" />
      </svg>
      {wordmark && <span className="text-[19px] font-semibold tracking-[-0.03em]">continuum</span>}
    </span>
  );
}

const buttonBase = "inline-flex items-center justify-center gap-2 font-semibold tracking-[-0.01em] transition-transform duration-500 ease-spring active:scale-[.97] active:duration-100 disabled:active:scale-100";
export const buttonStyles = {
  primary: `${buttonBase} h-14 rounded-2xl bg-ink px-7 text-base text-white disabled:bg-track disabled:text-subtle`,
  secondary: `${buttonBase} h-14 rounded-2xl border border-line bg-white px-6 text-base text-ink`,
  small: `${buttonBase} h-11 rounded-xl bg-ink px-4 text-sm text-white disabled:bg-track disabled:text-subtle`,
  danger: `${buttonBase} h-11 rounded-xl border border-danger-line bg-white px-4 text-sm text-danger`,
  dangerSolid: `${buttonBase} h-11 rounded-xl bg-danger px-4 text-sm text-white disabled:bg-track disabled:text-subtle`,
  ghost: `${buttonBase} h-11 rounded-xl border border-line bg-white px-4 text-sm text-ink`,
};

export function Avatar({ name, tone = "celeste", square = false }: { name: string; tone?: "celeste" | "neutral" | "ink"; square?: boolean }) {
  const tones = { celeste: "bg-celeste-soft text-celeste-ink", neutral: "bg-surface text-ink-2", ink: "bg-ink text-white" };
  return (
    <span className={`flex size-10 shrink-0 items-center justify-center text-sm font-semibold ${square ? "rounded-xl" : "rounded-full"} ${tones[tone]}`}>
      {initials(name)}
    </span>
  );
}

const statusCopy: Record<StreamView["status"], { label: string; cls: string; dot: string; pulse?: boolean }> = {
  streaming: { label: "En curso", cls: "bg-celeste-soft text-celeste-ink", dot: "bg-celeste-ink", pulse: true },
  scheduled: { label: "Programado", cls: "bg-surface text-ink-2", dot: "bg-ink-2" },
  completed: { label: "Completado", cls: "bg-surface text-ink-2", dot: "bg-ink-2" },
  canceled: { label: "Cancelado", cls: "bg-danger-soft text-danger", dot: "bg-danger" },
};

export function StatusPill({ status }: { status: StreamView["status"] }) {
  const s = statusCopy[status];
  return (
    <span className={`inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-xs font-medium ${s.cls}`}>
      <span className={`size-1.5 rounded-full ${s.dot} ${s.pulse ? "animate-pulse-dot" : ""}`} />
      {s.label}
    </span>
  );
}

/** Agreement funding state from the pivot glossary: Al día, Por vencer, Atrasado, Completo, Cancelado. */
export function FundingPill({ state }: { state: FundingState }) {
  const s = fundingCopy[state];
  return (
    <span className={`inline-flex h-[26px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium transition-colors duration-300 ${s.cls}`}>
      <span className={`size-1.5 rounded-full ${s.dot} ${state === "atrasado" ? "animate-pulse-dot" : ""}`} />
      {s.label}
    </span>
  );
}

export function LiveChip() {
  return (
    <span className="inline-flex h-7 items-center gap-[7px] rounded-full bg-surface px-[11px] text-xs font-medium text-ink-2">
      <span className="size-[7px] rounded-full bg-celeste animate-pulse-dot" />
      En vivo
    </span>
  );
}

export function NetworkChip() {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line px-2.5 text-xs text-muted">
      <span className="size-1.5 rounded-full bg-celeste" />
      Arbitrum One
    </span>
  );
}

/** Black = earned, soft celeste = funded share, pulsing dot = this second. */
export function StreamLine({ earned, funded, live = true }: { earned: number; funded: number; live?: boolean }) {
  const pct = (v: number) => `${Math.max(0, Math.min(1, v)) * 100}%`;
  return (
    <div aria-hidden="true" className="relative h-3.5">
      <div className="absolute inset-x-0 top-1.5 h-0.5 rounded bg-track" />
      <div className="absolute left-0 top-1 h-1.5 rounded bg-celeste/20 transition-[width] duration-700 ease-spring" style={{ width: pct(funded) }} />
      <div className="absolute left-0 top-1.5 h-0.5 rounded bg-ink transition-[width] duration-150 ease-linear" style={{ width: pct(earned) }} />
      {live && (
        <span
          className="absolute top-0.5 -ml-[7px] box-content size-2.5 rounded-full border-2 border-white bg-celeste animate-pulse-dot transition-[left] duration-150 ease-linear"
          style={{ left: pct(earned) }}
        />
      )}
    </div>
  );
}

export function Hash({ hash }: { hash: string }) {
  const url = explorerTx(hash);
  if (!url) return <span className="font-mono text-xs text-subtle">{shortHash(hash)}</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="font-mono text-xs text-celeste-ink hover:underline">
      {shortHash(hash)} <Icon name="out" size={12} className="inline align-[-1px]" />
    </a>
  );
}

export function MockNotice({ children = "Simulación local: no es una transacción onchain." }: { children?: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[14px] bg-mock-soft px-3.5 py-3 text-[13px] leading-snug text-mock">
      <InfoIcon />
      {children}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return <p role="alert" className="rounded-[14px] bg-danger-soft px-3.5 py-3 text-[13px] text-danger">{children}</p>;
}

export function InfoIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 ${className}`}>
      <circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 16h.01" />
    </svg>
  );
}

const paths = {
  out: <><path d="M7 17L17 7" /><path d="M8 7h9v9" /></>,
  in: <><path d="M17 7L7 17" /><path d="M16 17H7V8" /></>,
  flow: <><path d="M4 12h11" /><circle cx="18.5" cy="12" r="2.5" /></>,
  arrow: <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>,
  back: <><path d="M19 12H5" /><path d="M11 18l-6-6 6-6" /></>,
  close: <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>,
  chevron: <path d="M9 6l6 6-6 6" />,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  home: <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></>,
  list: <><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></>,
  chat: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />,
  card: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /><path d="M7 15h4" /></>,
  wallet: <><path d="M20 7H5a2 2 0 0 1 0-4h13v4" /><path d="M3 5v14a2 2 0 0 0 2 2h15V7" /><path d="M16 14h.01" /></>,
  building: <><path d="M3 21h18" /><path d="M5 21V8l7-5 7 5v13" /><path d="M9 21v-6h6v6" /></>,
  send: <><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
};

export function Icon({ name, size = 18, className = "", strokeWidth = 2 }: { name: keyof typeof paths; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {paths[name]}
    </svg>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}
