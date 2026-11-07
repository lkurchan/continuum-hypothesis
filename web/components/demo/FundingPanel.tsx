"use client";

import { useState } from "react";
import { api } from "@/components/ui/api";
import { fundingView } from "@/components/ui/agreement";
import { clock, dateLabel } from "@/components/ui/format";
import { ErrorNote, Hash } from "@/components/ui/kit";
import { addAmounts, compareAmounts, subtractAmounts } from "@/lib/domain/amounts";
import { feeFor } from "@/lib/domain/fees";
import { fundingAmounts, fundingTerms, formatFundingAmount } from "@/lib/demo/funding";
import type { StreamView } from "@/lib/domain/types";

export function fundingLabel(stream: StreamView, now: number) {
  const state = fundingView(stream, now).state;
  return state === "cancelado" ? "Cancelado" : state === "completo" ? "Depósito completo" : state === "atrasado" ? "Falta dinero" : state === "por_vencer" ? "Saldo por agotarse" : "Depósito parcial";
}

export function FundingPanel({ stream, payerId, now, onUpdate, onBusy }: {
  stream: StreamView; payerId: string; now: number; onUpdate: (stream: StreamView) => void; onBusy: (busy: boolean) => void;
}) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ hash: string; feeHash?: string; amount: string } | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const amounts = fundingAmounts(stream, now);
  const terms = fundingTerms(stream, amount, payerId);
  const fee = feeFor(terms?.amount ?? "0");
  const debit = addAmounts(terms?.amount ?? "0", fee);
  const canFund = stream.payerId === payerId && stream.canceledAt === null && compareAmounts(amounts.remaining, "0") > 0;
  const fmt = formatFundingAmount;
  const time = (value: number) => `${dateLabel(value)}, ${clock(value)}`;
  const remainingAfter = terms ? subtractAmounts(amounts.remaining, terms.amount) : amounts.remaining;


  async function reload() {
    const updated = (await api.streams(payerId)).find(s => s.id === stream.id);
    if (!updated) throw new Error("No se pudo actualizar el contrato.");
    onUpdate(updated);
    setNeedsRefresh(false);
  }
  async function fund() {
    if (!terms || busy || needsRefresh) return;
    setBusy(true); onBusy(true); setError(null); setReceipt(null);
    try {
      const result = await api.topUp(payerId, stream.id, terms.amount);
      setReceipt({ hash: result.txHash, feeHash: result.feeTxHash, amount: terms.amount });
      setNeedsRefresh(true); setAmount("");
      try { await reload(); } catch { setError("El depósito se confirmó. Actualizá el saldo antes de volver a depositar."); }
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); onBusy(false); }
  }

  return <section aria-label="Depósitos del contrato" className="flex flex-col gap-4">
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><dt className="text-muted">Ya depositaste</dt><dd className="tnum text-lg font-semibold">{fmt(stream.deposited)}</dd></div>
        <div className="flex flex-wrap items-baseline justify-between gap-2"><dt className="text-muted">Falta depositar</dt><dd className="tnum text-lg font-semibold">{fmt(amounts.remaining)}</dd></div>
      </dl>
        <div className="h-2 overflow-hidden rounded-full bg-track" aria-hidden="true"><div className="h-full rounded-full bg-ink" style={{ width: `${Math.min(100, Number(stream.deposited) / Number(stream.totalAmount) * 100)}%` }} /></div>
      <p className="text-xs leading-relaxed text-muted">{stream.canceledAt !== null ? "Este contrato está cancelado." : <>Lo depositado cubre el trabajo hasta el <span className="font-medium text-ink">{time(Math.min(amounts.coveredUntil, stream.end))}</span>.</>}</p>
    </div>
    <div className="flex flex-col gap-3 border-t border-line-soft pt-4">
      {canFund && <>
        <div className="flex flex-wrap items-baseline justify-between gap-1"><h3 className="text-base font-semibold">Agregar dinero</h3><span className="text-xs text-muted">Podés completar el resto después.</span></div>
        <div className="flex flex-wrap gap-2">{(compareAmounts(amounts.quarter, amounts.remaining) < 0 ? [{ label: "Una parte", value: amounts.quarter }, { label: "Todo lo que falta", value: amounts.remaining }] : [{ label: "Todo lo que falta", value: amounts.remaining }]).map(q => <button key={q.label} type="button" aria-pressed={terms?.amount === q.value} disabled={busy || needsRefresh} onClick={() => setAmount(q.value)} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-left disabled:opacity-40 ${terms?.amount === q.value ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}><span className="text-xs">{q.label}</span><span className="tnum text-sm font-semibold">{fmt(q.value)}</span></button>)}</div>
        <label className="flex flex-col gap-2 text-sm font-semibold">¿Cuánto querés agregar?<input aria-label="¿Cuánto querés agregar?" inputMode="decimal" value={amount} disabled={busy || needsRefresh} onChange={e => setAmount(e.target.value)} placeholder="0,00" className="tnum h-12 rounded-xl border border-line px-3 font-normal outline-none focus:border-ink" /></label>
        <p className="-mt-2 text-xs text-muted">Ingresá hasta {fmt(amounts.remaining)} ARGt.</p>
        {amount && !terms && <ErrorNote>El monto debe ser mayor que cero y no superar {fmt(amounts.remaining)}.</ErrorNote>}
        {terms && <div className="space-y-2 rounded-xl bg-page p-3 text-sm">
          <p className="flex justify-between gap-3"><span>Para el contrato</span><span className="tnum break-all text-right">{fmt(terms.amount)}</span></p>
          <p className="flex justify-between gap-3"><span>Comisión (0,05%)</span><span className="tnum break-all text-right">{fmt(fee)}</span></p>
          <p className="flex justify-between gap-3 border-t border-line pt-2 font-semibold"><span>Total que pagás</span><span className="tnum break-all text-right">{fmt(debit)}</span></p>
          <p className="text-xs leading-relaxed text-muted">{compareAmounts(remainingAfter, "0") === 0 ? "Con este depósito completás el monto del contrato." : <>Después te quedan {fmt(remainingAfter)} por depositar.</>}</p>
        </div>}
        <button type="button" onClick={fund} disabled={!terms || busy || needsRefresh} className="h-12 rounded-xl bg-ink text-sm font-semibold text-white disabled:opacity-40">{busy ? "Depositando…" : "Confirmar depósito"}</button>
      </>}
      {!canFund && <p className="text-sm text-muted">{stream.canceledAt !== null ? "Este contrato está cancelado y no admite nuevos depósitos." : "Ya depositaste el monto total del contrato."}</p>}
      {receipt && <div role="status" className="space-y-2 rounded-xl border border-line p-4 text-sm"><p className="font-semibold">Depósito de {fmt(receipt.amount)} confirmado</p><Hash hash={receipt.hash} />{receipt.feeHash && <p>Comisión: <Hash hash={receipt.feeHash} /></p>}</div>}
      {error && <ErrorNote>{error}</ErrorNote>}
      {needsRefresh && <button type="button" disabled={busy} onClick={() => { setBusy(true); onBusy(true); void reload().then(() => setError(null)).catch(() => setError("No se pudo actualizar. Volvé a intentar.")).finally(() => { setBusy(false); onBusy(false); }); }} className="h-11 rounded-xl border border-line text-sm">Actualizar saldo</button>}
    </div>
  </section>;
}
