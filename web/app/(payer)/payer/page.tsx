"use client";

import Link from "next/link";
import { useState } from "react";
import { liveStatus, liveVested, money } from "@/components/ui/format";
import { useNow } from "@/components/ui/hooks";
import { Avatar, ErrorNote, Icon, StatusPill, StreamLine, buttonStyles } from "@/components/ui/kit";
import { StreamDetail } from "@/components/payer/StreamDetail";
import { usePayer } from "@/components/payer/PayerContext";
import type { StreamView } from "@/lib/domain/types";

export default function PayerPanel() {
  const { users, streams, error } = usePayer();
  const now = useNow(100);
  const [selected, setSelected] = useState<string | null>(null);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!streams) return <div className="h-96 animate-pulse rounded-3xl bg-white" />;

  const ordered = [...streams].sort((a, b) => Number(!!a.canceledAt) - Number(!!b.canceledAt) || b.start - a.start);
  const current = ordered.find((s) => s.id === selected) ?? ordered[0];
  const name = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  const active = streams.filter((s) => liveStatus(s, now) === "streaming").length;
  const sum = (f: (s: StreamView) => number) => streams.reduce((acc, s) => acc + f(s), 0);
  const vested = sum((s) => liveVested(s, now));
  const funded = sum((s) => Number(s.deposited));
  const withdrawn = sum((s) => Number(s.withdrawn));

  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[30px] font-semibold tracking-[-0.04em]">Pagos en curso</h1>
          <span className="text-sm text-muted">{active} {active === 1 ? "activo" : "activos"} · ARGt</span>
        </div>
        <Link href="/payer/nuevo" className={buttonStyles.small}><Icon name="plus" size={16} /> Nuevo pago</Link>
      </div>

      <section aria-label="Resumen" className="grid gap-3 sm:grid-cols-3">
        <Kpi label={<><span className="size-1.5 rounded-full bg-celeste animate-pulse-dot" />Ganado ahora</>} value={money(vested, 2)} />
        <Kpi label="Fondeado" value={money(funded)} />
        <Kpi label="Retirado" value={money(withdrawn)} />
      </section>

      {ordered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-white py-20">
          <span className="text-muted">Todavía no creaste pagos.</span>
          <Link href="/payer/nuevo" className={buttonStyles.small}>Crear el primero</Link>
        </div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_360px]">
          <section aria-label="Trabajadores" className="overflow-hidden rounded-3xl border border-line bg-white">
            <div className="grid grid-cols-[1.4fr_1.2fr_1fr_auto] gap-4 border-b border-line-soft px-5 py-3 text-xs text-subtle">
              <span>Trabajador</span><span>Progreso</span><span className="text-right">Ganado</span><span className="w-[104px]">Estado</span>
            </div>
            {ordered.map((s) => {
              const total = Number(s.totalAmount);
              const v = liveVested(s, now);
              const status = liveStatus(s, now);
              const on = s.id === current?.id;
              return (
                <button key={s.id} type="button" aria-pressed={on} onClick={() => setSelected(s.id)}
                  className={`grid w-full grid-cols-[1.4fr_1.2fr_1fr_auto] items-center gap-4 border-b border-line-soft px-5 py-3.5 text-left transition last:border-0 ${on ? "bg-[#F4F8FC]" : "hover:bg-page"}`}>
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
          </section>
          {current && <StreamDetail key={current.id} stream={current} workerName={name(current.workerId)} now={now} />}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: React.ReactNode; value: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-3xl border border-line bg-white px-5 py-4">
      <span className="inline-flex items-center gap-2 text-[13px] text-muted">{label}</span>
      <span className="tnum text-[28px] font-medium leading-none tracking-[-0.04em]">{value}</span>
    </div>
  );
}
