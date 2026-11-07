"use client";

import Link from "next/link";
import { useState } from "react";
import { liveStatus, liveVested, money } from "@/components/ui/format";
import { useNow } from "@/components/ui/hooks";
import { Avatar, ErrorNote, Icon, Skeleton, StatusPill, StreamLine, buttonStyles } from "@/components/ui/kit";
import { Enter, Page, useIntro } from "@/components/ui/motion";
import { StreamDetail } from "@/components/payer/StreamDetail";
import { usePayer } from "@/components/payer/PayerContext";
import type { StreamView } from "@/lib/domain/types";

export default function PayerPanel() {
  const { users, streams, error } = usePayer();
  const now = useNow(100);
  const [selected, setSelected] = useState<string | null>(null);
  const intro = useIntro();

  if (error) return <Page><ErrorNote>{error}</ErrorNote></Page>;
  if (!streams) return <Page><div className="flex flex-col gap-7"><Skeleton className="h-16 w-72 rounded-2xl" /><div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[92px] rounded-3xl" />)}</div><Skeleton className="h-80 rounded-3xl" /></div></Page>;

  const ordered = [...streams].sort((a, b) => Number(!!a.canceledAt) - Number(!!b.canceledAt) || b.start - a.start);
  const current = ordered.find((s) => s.id === selected) ?? ordered[0];
  const name = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  const active = streams.filter((s) => liveStatus(s, now) === "streaming").length;
  const sum = (f: (s: StreamView) => number) => streams.reduce((acc, s) => acc + f(s), 0);
  const vested = sum((s) => liveVested(s, now));
  const funded = sum((s) => Number(s.deposited));
  const withdrawn = sum((s) => Number(s.withdrawn));

  return (
    <Page>
    <div className="flex flex-col gap-7">
      <Enter className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[30px] font-semibold tracking-[-0.04em]">Pagos en curso</h1>
          <span className="text-sm text-muted">{active} {active === 1 ? "activo" : "activos"} · ARGt</span>
        </div>
        <Link href="/payer/nuevo" transitionTypes={["nav-forward"]} className={buttonStyles.small}><Icon name="plus" size={16} /> Nuevo pago</Link>
      </Enter>

      <section aria-label="Resumen" className="grid gap-3 sm:grid-cols-3">
        <Kpi i={1} label={<><span className="size-1.5 rounded-full bg-celeste animate-pulse-dot" />Ganado ahora</>} value={money(vested * intro, 2)} />
        <Kpi i={2} label="Fondeado" value={money(funded * intro)} />
        <Kpi i={3} label="Retirado" value={money(withdrawn * intro)} />
      </section>

      {ordered.length === 0 ? (
        <div className="animate-enter flex flex-col items-center gap-4 rounded-3xl bg-white py-20">
          <span className="text-muted">Todavía no creaste pagos.</span>
          <Link href="/payer/nuevo" transitionTypes={["nav-forward"]} className={buttonStyles.small}>Crear el primero</Link>
        </div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_360px]">
          <Enter i={4} as="section" className="overflow-hidden rounded-3xl border border-line bg-white">
            <div className="grid grid-cols-[1.4fr_1.2fr_1fr_auto] gap-4 border-b border-line-soft px-5 py-3 text-xs text-subtle">
              <span>Trabajador</span><span>Progreso</span><span className="text-right">Ganado</span><span className="w-[104px]">Estado</span>
            </div>
            {ordered.map((s, idx) => {
              const total = Number(s.totalAmount);
              const v = liveVested(s, now);
              const status = liveStatus(s, now);
              const on = s.id === current?.id;
              return (
                <button key={s.id} type="button" aria-pressed={on} onClick={() => setSelected(s.id)} style={{ "--i": 5 + idx } as React.CSSProperties}
                  className={`animate-enter grid w-full grid-cols-[1.4fr_1.2fr_1fr_auto] items-center gap-4 border-b border-line-soft px-5 py-3.5 text-left transition-colors duration-300 last:border-0 ${on ? "bg-[#F4F8FC]" : "hover:bg-page"}`}>
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar name={name(s.workerId)} tone="neutral" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">{name(s.workerId)}</span>
                      {s.label && <span className="truncate text-xs text-subtle">{s.label}</span>}
                    </span>
                  </span>
                  <span className="flex flex-col gap-1">
                    <StreamLine earned={v / total} funded={Number(s.deposited) / total} live={status === "streaming"} />
                  </span>
                  <span className="tnum text-right text-sm font-semibold">{money(v)}</span>
                  <span className="w-[104px]"><StatusPill status={status} /></span>
                </button>
              );
            })}
          </Enter>
          {current && <StreamDetail key={current.id} stream={current} workerName={name(current.workerId)} now={now} onSelect={() => setSelected(current.id)} />}
        </div>
      )}
    </div>
    </Page>
  );
}

function Kpi({ label, value, i }: { label: React.ReactNode; value: string; i: number }) {
  return (
    <div className="animate-enter flex flex-col gap-2 rounded-3xl border border-line bg-white px-5 py-4" style={{ "--i": i } as React.CSSProperties}>
      <span className="inline-flex items-center gap-2 text-[13px] text-muted">{label}</span>
      <span className="tnum text-[28px] font-medium leading-none tracking-[-0.04em]">{value}</span>
    </div>
  );
}
