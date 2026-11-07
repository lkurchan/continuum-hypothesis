"use client";

import { useState } from "react";
import { api } from "@/components/ui/api";
import { dateLabel, clock, groupWhole, liveAvailable, liveStatus, liveVested, money, parseWhole, ratePerSecond } from "@/components/ui/format";
import { ErrorNote, Hash, StatusPill, StreamLine, buttonStyles } from "@/components/ui/kit";
import type { StreamView } from "@/lib/domain/types";
import { usePayer } from "./PayerContext";

type Tx = { message: string; hash: string };

export function StreamDetail({ stream, workerName, now }: { stream: StreamView; workerName: string; now: number }) {
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
  const room = Math.floor(total - deposited);
  const value = amount ?? room;
  const first = workerName.split(" ")[0];
  const keep = Math.min(vested, deposited);
  const refund = deposited - keep;
  const span = stream.end - stream.start;
  const fmt = (t: number) => (span < 86_400 ? clock(t) : dateLabel(t));

  const run = async (op: () => Promise<Tx>) => {
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

  const topUp = () => user && run(async () => {
    const { txHash } = await api.topUp(user.id, stream.id, String(value));
    return { message: `Recargaste ${money(value)}`, hash: txHash };
  });
  const cancel = () => user && run(async () => {
    const r = await api.cancel(user.id, stream.id);
    return { message: `Cancelado. Volvieron ${money(r.refunded)}`, hash: r.txHash };
  });

  return (
    <aside aria-label="Detalle del pago" className="flex flex-col gap-5 rounded-3xl border border-line bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex flex-col">
          <span className="text-base font-semibold">{workerName}</span>
          <span className="text-xs text-subtle">{fmt(stream.start)} – {fmt(stream.end)}</span>
        </span>
        <StatusPill status={status} />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[13px] text-muted">Ganado</span>
        <span className="tnum text-[34px] font-medium leading-none tracking-[-0.045em]">{money(vested, 2)}</span>
        <span className="tnum text-[13px] text-subtle">
          de {money(total)}{status === "streaming" ? ` · ${money(ratePerSecond(stream), 4)}/seg` : ""}
        </span>
      </div>
      <StreamLine earned={vested / total} funded={deposited / total} live={status === "streaming"} />

      <dl className="flex flex-col text-sm">
        {[["Fondeado", money(deposited)], ["Retirado", money(stream.withdrawn)], ["Disponible para retirar", money(liveAvailable(stream, now), 2)]].map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-line-soft py-2.5 last:border-0">
            <dt className="text-muted">{k}</dt><dd className="tnum font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      {status !== "canceled" && status !== "completed" && !confirming && (
        <div className="flex flex-col gap-2.5">
          {room > 0 && (
            <div className="flex gap-2">
              <label className="flex h-11 grow items-center gap-1 rounded-xl border border-line px-3 focus-within:border-ink">
                <span className="text-faint">$</span>
                <input inputMode="numeric" aria-label="Monto a recargar" value={groupWhole(value)}
                  onChange={(e) => setAmount(parseWhole(e.target.value))} className="tnum w-full bg-transparent text-sm font-medium outline-none" />
              </label>
              <button type="button" onClick={topUp} disabled={busy || value <= 0 || value > room} className={buttonStyles.small}>Recargar</button>
            </div>
          )}
          {value > room && <span className="text-xs text-danger">Máximo {money(room)}</span>}
          <button type="button" onClick={() => { setConfirming(true); setTx(null); }} className={buttonStyles.danger}>Cancelar pago</button>
        </div>
      )}

      {confirming && (
        <div role="alertdialog" aria-label="Confirmar cancelación" className="flex flex-col gap-3 rounded-2xl bg-danger-soft/60 p-4">
          <span className="text-sm font-semibold">¿Cancelar el pago de {first}?</span>
          <div className="tnum flex flex-col gap-1.5 text-sm">
            <span className="flex justify-between"><span className="text-ink-2">{first} se queda con</span><strong>{money(keep, 2)}</strong></span>
            <span className="flex justify-between"><span className="text-ink-2">Vuelve a tu wallet</span><strong>{money(refund, 2)}</strong></span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={cancel} disabled={busy} className={`${buttonStyles.small} grow bg-danger`}>{busy ? "Cancelando…" : "Sí, cancelar"}</button>
            <button type="button" onClick={() => setConfirming(false)} className={buttonStyles.ghost}>Volver</button>
          </div>
        </div>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}
      {tx && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface px-4 py-3 text-sm">
          <span className="font-medium">{tx.message}</span>
          <Hash hash={tx.hash} />
        </div>
      )}
    </aside>
  );
}
