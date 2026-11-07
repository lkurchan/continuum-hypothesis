"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/components/ui/api";
import { explorerTx, groupWhole, liveAvailable, money, parseWhole, shortAddress, shortHash } from "@/components/ui/format";
import { useNow } from "@/components/ui/hooks";
import { ErrorNote, Icon, MockNotice, buttonStyles } from "@/components/ui/kit";
import { Enter, Page, Segmented } from "@/components/ui/motion";
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

  if (receipt && user) return <Page><Confirmed receipt={receipt} name={user.name} beloAddress={user.beloAddress} address={user.address} remaining={stream ? liveAvailable(stream, now) : 0} /></Page>;

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
  const activeChip = chips.find(([, share]) => value > 0 && Math.floor(available * share) === value)?.[0] ?? "";
  const destinations = [
    { id: "belo" as const, title: "Belo", sub: "Para gastar con tu tarjeta", addr: user?.beloAddress, icon: "card" as const },
    { id: "wallet" as const, title: "Mi wallet", sub: "Queda en ARGt", addr: user?.address, icon: "wallet" as const },
  ].filter((d) => d.addr);

  return (
    <Page>
    <div className="flex grow flex-col pb-[max(28px,env(safe-area-inset-bottom))]">
      <header className="grid h-11 grid-cols-[44px_1fr_44px] items-center">
        <Link href="/worker" transitionTypes={["nav-back"]} aria-label="Volver al inicio" className="flex size-11 items-center justify-center rounded-full border border-line transition-transform duration-500 ease-spring active:scale-90">
          <Icon name="back" />
        </Link>
        <h1 className="text-center text-[17px] font-semibold tracking-[-0.01em]">Retirar</h1>
      </header>

      <Enter i={1} as="section" className="mt-9 flex flex-col items-center gap-3.5">
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
        <div className="mt-1.5 w-full">
          <Segmented label="Montos rápidos" tone="ink" fill value={activeChip}
            options={chips.map(([label]) => ({ value: label, label }))}
            onChange={(label) => setAmount(Math.floor(available * (chips.find(([l]) => l === label)?.[1] ?? 0)))} />
        </div>
      </Enter>

      <Enter i={2} as="section" className="mt-8 flex flex-col gap-2.5">
        <span className="text-sm font-semibold">¿A dónde lo mandás?</span>
        {destinations.map((d) => {
          const on = dest === d.id;
          return (
            <button key={d.id} type="button" aria-pressed={on} onClick={() => setDestination(d.id)}
              className={`flex min-h-[72px] items-center gap-3.5 rounded-[18px] border bg-white px-4 py-3 text-left transition-[border-color,transform] duration-300 active:scale-[.98] ${on ? "border-ink" : "border-line"}`}>
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300 ${on ? "bg-ink text-white" : "bg-surface text-ink-2"}`}>
                <Icon name={d.icon} size={20} />
              </span>
              <span className="flex grow flex-col gap-0.5">
                <span className="text-[15px] font-semibold">{d.title}</span>
                <span className="text-[13px] text-muted">{d.sub} · <span className="font-mono text-xs">{shortAddress(d.addr!)}</span></span>
              </span>
              <span aria-hidden="true" className={`flex size-5 items-center justify-center rounded-full border-2 transition-colors duration-300 ${on ? "border-ink" : "border-[#C8C8CE]"}`}>
                <span className={`size-2.5 rounded-full bg-ink transition-transform duration-500 ease-spring ${on ? "scale-100" : "scale-0"}`} />
              </span>
            </button>
          );
        })}
      </Enter>

      <div className="grow" />
      {error && <div className="mb-3 mt-6"><ErrorNote>{error}</ErrorNote></div>}
      <button type="button" onClick={submit} disabled={!valid || busy} className={`${buttonStyles.primary} mt-6`}>
        {busy ? "Firmando en Arbitrum…" : valid ? `Retirar ${money(value)} ${destName}` : over ? "Supera lo disponible" : "Ingresá un monto"}
      </button>
      <p className="mt-3 text-center text-xs text-subtle">Solo retirás lo que ya ganaste. No es un adelanto.</p>
    </div>
    </Page>
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
        <Link href="/worker" transitionTypes={["nav-back"]} aria-label="Cerrar" className="flex size-11 items-center justify-center rounded-full border border-line transition-transform duration-500 ease-spring active:scale-90"><Icon name="close" /></Link>
      </header>
      <section role="status" className="mt-7 flex flex-col items-center gap-2.5 text-center">
        <span className="relative mb-3.5 flex size-[76px] items-center justify-center">
          <span aria-hidden="true" className="absolute inset-0 rounded-full border-2 border-celeste animate-ring" />
          <span className="flex size-full items-center justify-center rounded-full bg-ink text-white animate-pop">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" className="draw-check animate-draw" />
            </svg>
          </span>
        </span>
        <Enter i={3} as="span" className="text-sm text-muted">{url ? "Confirmado en Arbitrum" : "Simulado"}</Enter>
        <Enter i={4}><h1 className="tnum text-[40px] font-medium leading-[1.05] tracking-[-0.045em]">Retiraste {money(receipt.amount)}</h1></Enter>
        <Enter i={5} as="span" className="text-[15px] text-ink-2">{toBelo ? "a tu cuenta de Belo" : "a tu wallet"} · {name}</Enter>
      </section>

      <dl className="mt-8 rounded-[22px] border border-line px-[18px] py-1.5">
        {rows.map(([k, v], idx) => (
          <div key={k} className="animate-enter flex min-h-12 items-center justify-between border-b border-line-soft" style={{ "--i": 7 + idx } as React.CSSProperties}>
            <dt className="text-sm text-muted">{k}</dt>
            <dd className="tnum text-sm font-medium">{v}</dd>
          </div>
        ))}
        <div className="animate-enter flex min-h-[52px] items-center justify-between" style={{ "--i": 10 } as React.CSSProperties}>
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
      {!url && <Enter i={11} className="mt-3.5"><MockNotice /></Enter>}

      <div className="grow" />
      <Enter i={12} className="mt-8 flex flex-col gap-2.5">
        {url && <a href={url} target="_blank" rel="noreferrer" className={buttonStyles.secondary}>Ver en Arbiscan <Icon name="out" size={16} /></a>}
        <Link href="/worker" transitionTypes={["nav-back"]} className={buttonStyles.primary}>Volver al inicio</Link>
        <p className="tnum mt-1 text-center text-[13px] text-muted">Te quedan {money(remaining, 2)} disponibles, y siguen sumando.</p>
      </Enter>
    </div>
  );
}
