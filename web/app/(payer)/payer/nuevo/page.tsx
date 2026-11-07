"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/components/ui/api";
import { durationLabel, groupWhole, money, parseWhole } from "@/components/ui/format";
import { Avatar, ErrorNote, Hash, Icon, Segmented, buttonStyles } from "@/components/ui/kit";
import { usePayer } from "@/components/payer/PayerContext";

const periods = [
  { value: 900, label: "Exprés · 15 min" },
  { value: 3600, label: "1 hora" },
  { value: 86_400, label: "1 día" },
  { value: 7 * 86_400, label: "Semana" },
  { value: 30 * 86_400, label: "Mes" },
];
const DEFAULT_AMOUNT = 18_000;
const nowSec = () => Math.floor(Date.now() / 1000);

export default function NewPayment() {
  const { user, users, refresh } = usePayer();
  const workers = users.filter((u) => u.role === "worker");
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [period, setPeriod] = useState(900);
  const [fund, setFund] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ hash: string; count: number } | null>(null);

  const isOn = (id: string) => picked[id] ?? true;
  const amountOf = (id: string) => amounts[id] ?? DEFAULT_AMOUNT;
  const chosen = workers.filter((w) => isOn(w.id) && amountOf(w.id) > 0);
  const total = chosen.reduce((sum, w) => sum + amountOf(w.id), 0);
  const deposit = chosen.reduce((sum, w) => sum + Math.floor((amountOf(w.id) * fund) / 100), 0);
  const n = chosen.length;

  const create = async () => {
    if (!user || !n) return;
    setBusy(true);
    setError(null);
    try {
      const start = nowSec();
      const items = chosen.map((w) => ({
        workerId: w.id,
        totalAmount: String(amountOf(w.id)),
        initialDeposit: String(Math.floor((amountOf(w.id) * fund) / 100)),
      }));
      const { txHash, streamIds } = await api.create(user.id, items, start, start + period);
      setDone({ hash: txHash, count: streamIds.length });
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setDone(null); };

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <Link href="/payer" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-ink"><Icon name="back" size={16} />Panel</Link>
        <h1 className="text-[30px] font-semibold tracking-[-0.04em]">Nuevo pago</h1>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-5">
          <Step n={1} title="Trabajadores" aside={`${n} de ${workers.length}`}>
            <div className="flex flex-col">
              {workers.map((w) => {
                const on = isOn(w.id);
                return (
                  <div key={w.id} className={`flex items-center gap-3 border-b border-line-soft py-3 last:border-0 ${on ? "" : "opacity-50"}`}>
                    <input id={`w-${w.id}`} type="checkbox" checked={on} className="size-[18px] accent-ink"
                      onChange={() => { setPicked({ ...picked, [w.id]: !on }); setDone(null); }} />
                    <label htmlFor={`w-${w.id}`} className="flex grow cursor-pointer items-center gap-3">
                      <Avatar name={w.name} tone="neutral" />
                      <span className="text-sm font-medium">{w.name}</span>
                    </label>
                    <label className="flex h-11 w-40 items-center gap-1 rounded-xl border border-line px-3 focus-within:border-ink">
                      <span className="text-faint">$</span>
                      <input inputMode="numeric" aria-label={`Monto para ${w.name}`} value={groupWhole(amountOf(w.id))}
                        onChange={(e) => { setAmounts({ ...amounts, [w.id]: parseWhole(e.target.value) }); setDone(null); }}
                        className="tnum w-full bg-transparent text-right text-sm font-medium outline-none" />
                    </label>
                  </div>
                );
              })}
            </div>
          </Step>

          <Step n={2} title="Duración">
            <Segmented label="Duración" value={period} onChange={reset(setPeriod)} options={periods} />
          </Step>

          <Step n={3} title="Fondeo inicial">
            <Segmented label="Porcentaje a depositar ahora" value={fund} onChange={reset(setFund)}
              options={[25, 50, 100].map((v) => ({ value: v, label: `${v} %` }))} />
          </Step>
        </div>

        <aside aria-label="Resumen" className="flex flex-col gap-5 rounded-3xl border border-line bg-white p-5 lg:sticky lg:top-24">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">Depositás ahora</span>
            <span className="tnum text-[34px] font-medium leading-none tracking-[-0.045em]">{money(deposit)}</span>
            <span className="tnum text-[13px] text-subtle">de {money(total)}</span>
          </div>
          <dl className="tnum flex flex-col text-sm">
            {[["Pagos", String(n)], ["Duración", durationLabel(period)], ["Ritmo total", `${money(total / period, 2)}/seg`]].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-line-soft py-2.5 last:border-0">
                <dt className="text-muted">{k}</dt><dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>

          {done ? (
            <div role="status" className="flex flex-col gap-3 rounded-2xl bg-celeste-soft p-4">
              <span className="flex items-center gap-2 text-sm font-semibold text-celeste-ink">
                <Icon name="check" size={16} /> {done.count === 1 ? "Pago creado" : `${done.count} pagos creados`}
              </span>
              <Hash hash={done.hash} />
              <Link href="/payer" className={buttonStyles.small}>Ver en el panel</Link>
            </div>
          ) : (
            <button type="button" onClick={create} disabled={!n || busy} className={buttonStyles.primary}>
              {busy ? "Firmando en Arbitrum…" : !n ? "Elegí al menos uno" : n === 1 ? "Crear pago" : `Crear ${n} pagos`}
            </button>
          )}
          {error && <ErrorNote>{error}</ErrorNote>}
        </aside>
      </div>
    </div>
  );
}

function Step({ n, title, aside, children }: { n: number; title: string; aside?: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-4 rounded-3xl border border-line bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-6 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{n}</span>
        <h2 className="text-base font-semibold">{title}</h2>
        {aside && <span className="tnum ml-auto text-[13px] text-muted">{aside}</span>}
      </div>
      {children}
    </section>
  );
}
