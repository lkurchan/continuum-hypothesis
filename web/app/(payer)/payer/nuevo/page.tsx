"use client";

import Link from "next/link";
import { useState } from "react";
import { feeFor } from "@/components/ui/agreement";
import { api } from "@/components/ui/api";
import { durationLabel, groupWhole, money, parseWhole } from "@/components/ui/format";
import { ErrorNote, Hash, Icon, buttonStyles } from "@/components/ui/kit";
import { Enter, Page, Segmented } from "@/components/ui/motion";
import { usePayer } from "@/components/payer/PayerContext";

const periods = [
  { value: 900, label: "15 min" },
  { value: 3600, label: "1 hora" },
  { value: 86_400, label: "1 día" },
  { value: 7 * 86_400, label: "Semana" },
  { value: 30 * 86_400, label: "Mes" },
];
const DEFAULT_PRICE = 18_000;
const nowSec = () => Math.floor(Date.now() / 1000);

export default function NewAgreement() {
  const { user, users, refresh } = usePayer();
  const providers = users.filter((u) => u.role === "worker");
  const [providerId, setProviderId] = useState<string | null>(null);
  const [service, setService] = useState("");
  const [price, setPrice] = useState(DEFAULT_PRICE);
  const [period, setPeriod] = useState(3600);
  const [share, setShare] = useState(25);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ hash: string; feeHash?: string } | null>(null);

  const provider = providers.find((p) => p.id === providerId) ?? providers[0];
  const tranche = Math.floor((price * share) / 100);
  const fee = feeFor(tranche);
  const covered = (period * share) / 100;
  const ready = !!provider && price > 0 && tranche > 0;

  const create = async () => {
    if (!user || !provider || !ready) return;
    setBusy(true);
    setError(null);
    try {
      const start = nowSec();
      const r = await api.create(user.id, [{
        workerId: provider.id, totalAmount: String(price), initialDeposit: String(tranche),
        ...(service.trim() ? { label: service.trim() } : {}),
      }], start, start + period);
      setDone({ hash: r.txHash, feeHash: r.feeTxHash });
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const edit = <T,>(set: (v: T) => void) => (v: T) => { set(v); setDone(null); };

  return (
    <Page>
    <div className="flex flex-col gap-7">
      <Enter className="flex flex-col gap-2">
        <Link href="/payer" transitionTypes={["nav-back"]} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-ink"><Icon name="back" size={16} />Acuerdos</Link>
        <h1 className="text-[30px] font-semibold tracking-[-0.04em]">Nuevo acuerdo de servicio</h1>
        <p className="text-[15px] text-muted">Pagás menos que a 60 días y tu proveedor cobra al segundo. El precio queda fijo en la blockchain.</p>
      </Enter>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-5">
          <Step i={1} n={1} title="Proveedor y servicio">
            {providers.length > 0 && (
              <Segmented label="Proveedor" value={provider?.id ?? ""} onChange={edit(setProviderId)}
                options={providers.map((p) => ({ value: p.id, label: p.name }))} />
            )}
            <label className="flex flex-col gap-1.5 text-[13px] text-muted" htmlFor="service">
              Servicio contratado
              <input id="service" value={service} maxLength={80} onChange={(e) => edit(setService)(e.target.value)}
                placeholder="Logística de última milla"
                className="h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none placeholder:text-subtle focus:border-ink" />
            </label>
          </Step>

          <Step i={2} n={2} title="Precio fijo del período">
            <label className="flex h-12 max-w-xs items-center gap-1 rounded-xl border border-line bg-white px-3 focus-within:border-ink">
              <span className="text-faint">$</span>
              <input inputMode="numeric" aria-label="Precio del período en ARGt" value={groupWhole(price)}
                onChange={(e) => edit(setPrice)(parseWhole(e.target.value))} className="tnum w-full bg-transparent text-base font-medium outline-none" />
              <span className="text-xs font-semibold text-subtle">ARGt</span>
            </label>
            <Segmented label="Duración" value={period} onChange={edit(setPeriod)} options={periods} />
          </Step>

          <Step i={3} n={3} title="Primer tramo">
            <Segmented label="Porcentaje del precio a fondear ahora" value={share} onChange={edit(setShare)}
              options={[10, 25, 50, 100].map((v) => ({ value: v, label: `${v} %` }))} />
            <p className="text-[13px] text-muted">Cubre {durationLabel(covered)} de servicio. Después fondeás por tramos, cuando quieras.</p>
          </Step>
        </div>

        <aside aria-label="Resumen" className="animate-enter flex flex-col gap-5 rounded-3xl border border-line bg-white p-5 lg:sticky lg:top-24" style={{ "--i": 2 } as React.CSSProperties}>
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">Fondeás ahora</span>
            <span className="tnum text-[34px] font-medium leading-none tracking-[-0.045em]">{money(tranche + fee, 2)}</span>
            <span className="text-[13px] text-subtle">{provider ? `para ${provider.name}` : ""}</span>
          </div>
          <dl className="tnum flex flex-col text-sm">
            <Row k="Primer tramo" v={money(tranche)} />
            <Row k="Comisión Continuum (0,05 %)" v={money(fee, 2)} />
            <Row k="Precio fijo" v={`${money(price)} · ${durationLabel(period)}`} />
            <Row k="Cubierto por" v={durationLabel(covered)} />
          </dl>

          {done ? (
            <div role="status" className="animate-enter flex flex-col gap-2.5 rounded-2xl bg-celeste-soft p-4">
              <span className="flex items-center gap-2 text-sm font-semibold text-celeste-ink">
                <span className="animate-pop"><Icon name="check" size={16} /></span> Acuerdo creado
              </span>
              <span className="flex items-center gap-2 text-xs text-muted">Depósito <Hash hash={done.hash} /></span>
              {done.feeHash && <span className="flex items-center gap-2 text-xs text-muted">Comisión <Hash hash={done.feeHash} /></span>}
              <Link href="/payer" transitionTypes={["nav-back"]} className={`${buttonStyles.small} mt-1`}>Ver acuerdos</Link>
            </div>
          ) : (
            <button type="button" onClick={create} disabled={!ready || busy} className={buttonStyles.primary}>
              {busy ? "Firmando en Arbitrum…" : "Crear acuerdo y fondear"}
            </button>
          )}
          {error && <div className="animate-enter"><ErrorNote>{error}</ErrorNote></div>}
        </aside>
      </div>
    </div>
    </Page>
  );
}

function Step({ n, i, title, children }: { n: number; i: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="animate-enter flex flex-col gap-4 rounded-3xl border border-line bg-white p-5" style={{ "--i": i } as React.CSSProperties}>
      <div className="flex items-center gap-3">
        <span className="flex size-6 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{n}</span>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line-soft py-2.5 last:border-0">
      <dt className="text-muted">{k}</dt><dd className="font-medium">{v}</dd>
    </div>
  );
}
