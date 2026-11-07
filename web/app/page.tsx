"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { coverAmount, monthlyRate, monthProgress } from "@/lib/demo/cover";

// Example contract shown on the cover: month-to-date accrual, live.
const MONTHLY = 2_400_000;
const RAMP_MS = 1800;

const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function useCoverClock() {
  const [clock, setClock] = useState<{ now: number; opened: number; ramp: number } | null>(null);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const opened = Date.now();
    let frame = 0;
    const tick = () => {
      setClock({ now: Date.now(), opened, ramp: reduced ? 0 : RAMP_MS });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return clock;
}

export default function CoverPage() {
  const clock = useCoverClock();
  const now = clock ? new Date(clock.now) : null;
  const value = clock && now ? coverAmount(MONTHLY, now, clock.opened, clock.ramp) : 0;
  const [int, dec] = value.toFixed(2).split(".");
  const progress = now ? monthProgress(now) : null;
  const rate = now ? monthlyRate(MONTHLY, now) : MONTHLY / (30 * 86400);
  const fill = progress ? `${(progress.elapsed / progress.length) * 100}%` : "0%";

  return (
    <div className="flex min-h-dvh flex-col overflow-hidden bg-ink text-white">
      <header className="mx-auto flex w-full max-w-[1216px] items-center justify-between gap-4 px-[clamp(16px,3vw,32px)] py-[22px]">
        <span className="flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
            <rect width="28" height="28" rx="8" fill="#FFFFFF" />
            <path d="M7 14h9.5" stroke="#0B0B0C" strokeWidth="2" strokeLinecap="round" />
            <circle cx="20" cy="14" r="2.6" fill="#3B8FD9" />
          </svg>
          <span className="text-lg font-semibold tracking-[-0.03em]">continuum</span>
        </span>
        <span className="inline-flex h-8 items-center gap-2 rounded-full border border-[#26262B] px-3 text-[13px] text-faint">
          <span className="size-1.5 rounded-full bg-celeste" />
          ARGt · Arbitrum One
        </span>
      </header>

      <main className="flex grow flex-col items-center justify-center gap-7 px-[clamp(16px,3vw,32px)] pb-12 pt-6 text-center">
        <h1 className="animate-enter text-[clamp(26px,3vw,40px)] font-medium leading-[1.1] tracking-[-0.04em]">
          Pagos entre empresas, por segundo.
        </h1>

        <div className="animate-enter flex flex-col items-center gap-4" style={{ "--i": 2 } as React.CSSProperties}>
          <p className="tnum flex items-baseline justify-center whitespace-nowrap font-medium leading-[0.9] tracking-[-0.065em]">
            <span className="mr-[0.08em] text-[clamp(48px,6vw,96px)] text-subtle">$</span>
            <span className="text-[clamp(96px,17vw,272px)]">{group(int)}</span>
            <span className="text-[clamp(48px,6vw,96px)] text-subtle">,{dec}</span>
          </p>
          <span className="inline-flex items-center gap-2.5 text-[15px] text-faint">
            <span className="size-2 rounded-full bg-celeste animate-pulse-dot" />
            cobrados este mes por un contrato de $2.400.000
          </span>
        </div>

        <Link href="/demo"
          className="animate-enter group mt-3 inline-flex h-[60px] items-center gap-3 rounded-full bg-white px-[30px] text-[17px] font-semibold text-ink transition-transform duration-150 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-celeste"
          style={{ "--i": 4 } as React.CSSProperties}>
          Probar demo
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-[3px]">
            <path d="M5 12h14" /><path d="M13 6l6 6-6 6" />
          </svg>
        </Link>
      </main>

      <div aria-hidden="true" className="mx-auto flex w-full max-w-[1216px] flex-col gap-3 px-[clamp(16px,3vw,32px)] pb-9">
        <div className="relative h-3">
          <span className="absolute inset-x-0 top-[5px] block h-0.5 rounded bg-[#26262B]" />
          <span className="absolute left-0 top-[5px] block h-0.5 rounded bg-white" style={{ width: fill }}>
            <span className="absolute -right-1.5 -top-[5px] block size-3 rounded-full bg-celeste" />
          </span>
        </div>
        <span className="tnum flex justify-between text-xs text-faint">
          <span>Mes en curso</span>
          <span>${rate.toFixed(2).replace(".", ",")} / segundo</span>
        </span>
      </div>
    </div>
  );
}
