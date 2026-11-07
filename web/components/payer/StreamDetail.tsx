"use client";

import { useState } from "react";
import { feeFor, fundingView, trancheUntil, warnWindow } from "@/components/ui/agreement";
import { api } from "@/components/ui/api";
import { clock, dateLabel, durationLabel, groupWhole, liveStatus, liveVested, money, parseWhole, ratePerSecond } from "@/components/ui/format";
import { ErrorNote, FundingPill, Hash, StreamLine, buttonStyles } from "@/components/ui/kit";
import type { StreamView } from "@/lib/domain/types";
import { usePayer } from "./PayerContext";

type Tx = { message: string; hash: string; feeHash?: string };

export function StreamDetail({ stream, workerName, now, onSelect }: { stream: StreamView; workerName: string; now: number; onSelect: () => void }) {
  const { user, refresh } = usePayer();
  const [amount, setAmount] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tx, setTx] = useState<Tx | null>(null);

  const total = Number(stream.totalAmount);
  const deposited = Number(stream.deposited);
  const vested = liveVested(stream, now);
  const status = liveStatus(stream, now);
  const funding = fundingView(stream, now);
  const room = Math.floor(funding.remainingToFund);
  const span = stream.end - stream.start;
  const fmt = (t: number) => (span < 86_400 ? clock(t) : `${dateLabel(t)}, ${clock(t)}`);
  const keep = Math.min(vested, deposited);
  const refund = deposited - keep;

  // Quick tranches: catch up, cover one more step (7 days, or 10 % of a short demo period), or complete.
  const step = Math.min(7 * 86_400, warnWindow(stream));
  const from = Math.max(now, funding.fundedUntil ?? now);
  const quick = [
    ...(funding.state === "atrasado" ? [{ label: "Ponerse al día", value: trancheUntil(stream, now + step) }] : []),
    ...(funding.state !== "atrasado" ? [{ label: `Cubrir ${durationLabel(step)} más`, value: trancheUntil(stream, from + step) }] : []),
    { label: "Completar", value: room },
  ].filter((q, i, all) => q.value > 0 && all.findIndex((o) => o.value === q.value) === i);
  const value = amount ?? quick[0]?.value ?? room;
  const fee = feeFor(value);

  const run = async (op: () => Promise<Tx>) => {
    onSelect();
    setBusy(true);
    setError(null);
    try {
      setTx(await op());
      setAmount(null);
      setConfirming(false);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const fund = () => user && run(async () => {
    const r = await api.topUp(user.id, stream.id, String(value));
    return { message: `Fondeaste un tramo de ${money(value)}`, hash: r.txHash, feeHash: r.feeTxHash };
  });
  const cancel = () => user && run(async () => {
    const r = await api.cancel(user.id, stream.id);
    return { message: `Acuerdo cancelado. Volvieron ${money(r.refunded)}`, hash: r.txHash };
  });

  return (
    <aside aria-label="Detalle del acuerdo" className="animate-enter flex flex-col gap-5 rounded-3xl border border-line bg-white p-5 lg:sticky lg:top-24" style={{ "--i": 4 } as React.CSSProperties}>
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-base font-semibold">{stream.label ?? `Acuerdo #${stream.id}`}</span>
          <span className="truncate text-xs text-subtle">{workerName} · {fmt(stream.start)} – {fmt(stream.end)}</span>
        </span>
        <FundingPill state={funding.state} />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[13px] text-muted">Servicio devengado</span>
        <span className="tnum text-[34px] font-medium leading-none tracking-[-0.045em]">{money(vested, 2)}</span>
        <span className="tnum text-[13px] text-subtle">
          de {money(total)} precio fijo{status === "streaming" ? ` · ${money(ratePerSecond(stream) * 3600)}/h` : ""}
        </span>
      </div>
      <StreamLine earned={vested / total} funded={deposited / total} live={status === "streaming"} />

      <dl className="flex flex-col text-sm">
        <Row k="Fondeado" v={money(deposited)} />
        <Row k="Cubierto hasta" v={funding.state === "cancelado" ? "—" : funding.fundedUntil === null ? "Completo" : fmt(funding.fundedUntil)} />
        {funding.debt >= 0.01 && <Row k="Le debés" v={money(funding.debt, 2)} danger />}
        <Row k={`Cobrado por ${workerName}`} v={money(stream.withdrawn)} />
      </dl>

      {status !== "canceled" && room > 0 && !confirming && (
        <div className="flex flex-col gap-3 rounded-2xl bg-page p-4">
          <span className="text-sm font-semibold">Fondear tramo</span>
          <div className="flex flex-wrap gap-2">
            {quick.map((q) => (
              <button key={q.label} type="button" onClick={() => setAmount(q.value)} aria-pressed={value === q.value}
                className={`h-8 rounded-full border px-3 text-[13px] font-medium transition-colors duration-300 active:scale-[.97] ${value === q.value ? "border-ink bg-ink text-white" : "border-line bg-white hover:bg-surface"}`}>
                {q.label}
              </button>
            ))}
          </div>
          <label className="flex h-11 items-center gap-1 rounded-xl border border-line bg-white px-3 focus-within:border-ink">
            <span className="text-faint">$</span>
            <input inputMode="numeric" aria-label="Monto del tramo" value={groupWhole(value)}
              onChange={(e) => setAmount(parseWhole(e.target.value))} className="tnum w-full bg-transparent text-sm font-medium outline-none" />
          </label>
          <dl className="tnum flex flex-col gap-1 text-[13px]">
            <div className="flex justify-between"><dt className="text-muted">Tramo</dt><dd>{money(value)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Comisión Continuum (0,05 %)</dt><dd>{money(fee, 2)}</dd></div>
            <div className="flex justify-between border-t border-line pt-1.5 font-semibold"><dt>Total</dt><dd>{money(value + fee, 2)}</dd></div>
          </dl>
          {value > room && <span className="text-xs text-danger">Máximo {money(room)}</span>}
          <button type="button" onClick={fund} disabled={busy || value <= 0 || value > room} className={buttonStyles.small}>
            {busy ? "Firmando en Arbitrum…" : "Fondear tramo"}
          </button>
        </div>
      )}

      {confirming && (
        <div role="alertdialog" aria-label="Confirmar cancelación" className="animate-enter flex flex-col gap-3 rounded-2xl bg-danger-soft/60 p-4">
          <span className="text-sm font-semibold">¿Cancelar el acuerdo con {workerName}?</span>
          <div className="tnum flex flex-col gap-1.5 text-sm">
            <span className="flex justify-between"><span className="text-ink-2">{workerName} se queda con</span><strong>{money(keep, 2)}</strong></span>
            <span className="flex justify-between"><span className="text-ink-2">Vuelve a tu wallet</span><strong>{money(refund, 2)}</strong></span>
            {funding.debt >= 0.01 && (
              <span className="flex justify-between text-danger"><span>Devengado sin fondear</span><strong>{money(funding.debt, 2)}</strong></span>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={cancel} disabled={busy} className={`${buttonStyles.dangerSolid} grow`}>{busy ? "Cancelando…" : "Sí, cancelar"}</button>
            <button type="button" onClick={() => setConfirming(false)} className={buttonStyles.ghost}>Volver</button>
          </div>
        </div>
      )}

      {error && <div className="animate-enter"><ErrorNote>{error}</ErrorNote></div>}
      {tx && (
        <div key={tx.hash} role="status" className="animate-enter flex flex-col gap-1.5 rounded-2xl bg-surface px-4 py-3 text-sm">
          <span className="font-medium">{tx.message}</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">Depósito <Hash hash={tx.hash} /></span>
          {tx.feeHash && <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">Comisión <Hash hash={tx.feeHash} /></span>}
        </div>
      )}

      {status !== "canceled" && status !== "completed" && !confirming && (
        <button type="button" onClick={() => { onSelect(); setConfirming(true); setTx(null); }}
          className="self-start text-[13px] text-muted underline-offset-4 hover:text-danger hover:underline">
          Cancelar acuerdo
        </button>
      )}
    </aside>
  );
}

function Row({ k, v, danger = false }: { k: string; v: string; danger?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 border-b border-line-soft py-2.5 last:border-0 ${danger ? "text-danger" : ""}`}>
      <dt className={danger ? "" : "text-muted"}>{k}</dt><dd className="tnum font-medium">{v}</dd>
    </div>
  );
}
