"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/components/ui/api";
import { explorerTx, groupWhole, liveAvailable, money, parseWhole, shortAddress, shortHash } from "@/components/ui/format";
import { useNow } from "@/components/ui/hooks";
import { ErrorNote, Icon, MockNotice, buttonStyles } from "@/components/ui/kit";
import { primaryStream, useWorker } from "@/components/worker/WorkerContext";

type Destination = "belo" | "wallet";
type Receipt = { amount: number; destination: Destination; txHash: string; at: Date };

export default function WithdrawPage() {
  const { user, streams, refresh } = useWorker();
  const now = useNow(250);
  const [amount, setAmount] = useState<number | null>(null);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const stream = streams ? primaryStream(streams, now) : null;
  const available = stream ? Math.floor(liveAvailable(stream, now)) : 0;

  if (receipt && user) return <Confirmed receipt={receipt} name={user.name} beloAddress={user.beloAddress} address={user.address} remaining={stream ? liveAvailable(stream, now) : 0} />;

  const dest: Destination = destination ?? (user?.beloAddress ? "belo" : "wallet");
  const value = amount ?? Math.min(available, Math.floor(available / 2));
  const over = value > available;
  const valid = value > 0 && !over && !!stream;
  const destName = dest === "belo" ? "a Belo" : "a tu wallet";

  const submit = async () => {
    if (!user || !stream || !valid) return;
    setBusy(true);
    setError(null);
    try {
      const { txHash } = await api.withdraw(user.id, stream.id, String(value), dest);
      setReceipt({ amount: value, destination: dest, txHash, at: new Date() });
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const chips = [["25%", 0.25], ["50%", 0.5], ["75%", 0.75], ["Todo", 1]] as const;
  const destinations = [
    { id: "belo" as const, title: "Belo", sub: "Para gastar con tu tarjeta", addr: user?.beloAddress, icon: "card" as const },
    { id: "wallet" as const, title: "Mi wallet", sub: "Queda en ARGt", addr: user?.address, icon: "wallet" as const },
  ].filter((d) => d.addr);

  return (
    <div className="flex grow flex-col pb-[max(28px,env(safe-area-inset-bottom))]">
      <header className="grid h-11 grid-cols-[44px_1fr_44px] items-center">
        <Link href="/worker" aria-label="Volver al inicio" className="flex size-11 items-center justify-center rounded-full border border-line">
          <Icon name="back" />
        </Link>
        <h1 className="text-center text-[17px] font-semibold tracking-[-0.01em]">Retirar</h1>
      </header>

      <section aria-label="Monto" className="mt-9 flex flex-col items-center gap-3.5">
        <span className="tnum text-sm text-muted">Disponible {money(available)}</span>
        <label className="flex w-full items-baseline justify-center gap-1.5 tracking-[-0.045em]">
          <span className="text-[32px] text-faint">$</span>
          <input inputMode="numeric" autoComplete="off" aria-label="Monto a retirar en ARGt" placeholder="0"
            value={groupWhole(value)} onChange={(e) => setAmount(parseWhole(e.target.value))}
            className="tnum min-w-[1ch] max-w-[300px] bg-transparent text-[60px] font-medium tracking-[-0.045em] outline-none"
            style={{ width: `${Math.max(1, groupWhole(value).length) * 0.62}em` }} />
        </label>
        <span className={`text-[13px] ${over ? "text-danger" : "text-subtle"}`}>
          {over ? "Supera lo que ganaste hasta ahora" : "1 ARGt = 1 peso argentino"}
        </span>
        <div role="group" aria-label="Montos rápidos" className="mt-1.5 grid w-full grid-cols-4 gap-2">
          {chips.map(([label, share]) => {
            const v = Math.floor(available * share);
            const on = value === v && v > 0;
            return (
              <button key={label} type="button" aria-pressed={on} onClick={() => setAmount(v)}
                className={`h-11 rounded-full border text-sm font-medium transition ${on ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-label="Destino" className="mt-8 flex flex-col gap-2.5">
        <span className="text-sm font-semibold">¿A dónde lo mandás?</span>
        {destinations.map((d) => {
          const on = dest === d.id;
          return (
            <button key={d.id} type="button" aria-pressed={on} onClick={() => setDestination(d.id)}
              className={`flex min-h-[72px] items-center gap-3.5 rounded-[18px] border bg-white px-4 py-3 text-left transition ${on ? "border-ink" : "border-line"}`}>
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${on ? "bg-ink text-white" : "bg-surface text-ink-2"}`}>
                <Icon name={d.icon} size={20} />
              </span>
              <span className="flex grow flex-col gap-0.5">
                <span className="text-[15px] font-semibold">{d.title}</span>
                <span className="text-[13px] text-muted">{d.sub} · <span className="font-mono text-xs">{shortAddress(d.addr!)}</span></span>
              </span>
              <span aria-hidden="true" className={`flex size-5 items-center justify-center rounded-full border-2 ${on ? "border-ink" : "border-[#C8C8CE]"}`}>
                {on && <span className="size-2.5 rounded-full bg-ink" />}
              </span>
            </button>
          );
        })}
      </section>

      <div className="grow" />
      {error && <div className="mb-3 mt-6"><ErrorNote>{error}</ErrorNote></div>}
      <button type="button" onClick={submit} disabled={!valid || busy} className={`${buttonStyles.primary} mt-6`}>
        {busy ? "Firmando en Arbitrum…" : valid ? `Retirar ${money(value)} ${destName}` : over ? "Supera lo disponible" : "Ingresá un monto"}
      </button>
      <p className="mt-3 text-center text-xs text-subtle">Solo retirás lo que ya ganaste. No es un adelanto.</p>
    </div>
  );
}

function Confirmed({ receipt, name, beloAddress, address, remaining }: {
  receipt: Receipt; name: string; beloAddress?: string; address: string; remaining: number;
}) {
  const url = explorerTx(receipt.txHash);
  const [copied, setCopied] = useState(false);
  const toBelo = receipt.destination === "belo";
  const rows: [string, React.ReactNode][] = [
    ["Monto", `${money(receipt.amount, 2)} ARGt`],
    ["Destino", <>{toBelo ? "Belo" : "Mi wallet"} <span className="font-mono text-xs text-subtle">{shortAddress((toBelo ? beloAddress : address) ?? "")}</span></>],
    ["Red", "Arbitrum One"],
  ];

  return (
    <div className="flex grow flex-col pb-[max(28px,env(safe-area-inset-bottom))]">
      <header className="flex h-11 justify-end">
        <Link href="/worker" aria-label="Cerrar" className="flex size-11 items-center justify-center rounded-full border border-line"><Icon name="close" /></Link>
      </header>
      <section role="status" className="mt-7 flex flex-col items-center gap-2.5 text-center">
        <span className="mb-3.5 flex size-[76px] items-center justify-center rounded-full bg-ink text-white ring-2 ring-celeste ring-offset-4">
          <Icon name="check" size={34} strokeWidth={2.4} />
        </span>
        <span className="text-sm text-muted">{url ? "Confirmado en Arbitrum" : "Simulado"}</span>
        <h1 className="tnum text-[40px] font-medium leading-[1.05] tracking-[-0.045em]">Retiraste {money(receipt.amount)}</h1>
        <span className="text-[15px] text-ink-2">{toBelo ? "a tu cuenta de Belo" : "a tu wallet"} · {name}</span>
      </section>

      <dl className="mt-8 animate-rise rounded-[22px] border border-line px-[18px] py-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex min-h-12 items-center justify-between border-b border-line-soft">
            <dt className="text-sm text-muted">{k}</dt>
            <dd className="tnum text-sm font-medium">{v}</dd>
          </div>
        ))}
        <div className="flex min-h-[52px] items-center justify-between">
          <dt className="text-sm text-muted">Transacción</dt>
          <dd className="flex items-center gap-1">
            <span className="font-mono text-[13px] font-medium">{shortHash(receipt.txHash)}</span>
            <button type="button" aria-label="Copiar hash" className="flex size-9 items-center justify-center rounded-[10px] text-muted"
              onClick={() => navigator.clipboard?.writeText(receipt.txHash).then(() => setCopied(true))}>
              {copied ? <Icon name="check" size={16} /> : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
              )}
            </button>
          </dd>
        </div>
      </dl>
      {!url && <div className="mt-3.5"><MockNotice /></div>}

      <div className="grow" />
      <div className="mt-8 flex flex-col gap-2.5">
        {url && <a href={url} target="_blank" rel="noreferrer" className={buttonStyles.secondary}>Ver en Arbiscan <Icon name="out" size={16} /></a>}
        <Link href="/worker" className={buttonStyles.primary}>Volver al inicio</Link>
        <p className="tnum mt-1 text-center text-[13px] text-muted">Te quedan {money(remaining, 2)} disponibles, y siguen sumando.</p>
      </div>
    </div>
  );
}
