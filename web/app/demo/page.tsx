"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/components/ui/api";
import {
  clock, dateLabel, durationLabel, groupWhole, initials, isOnchain, liveAvailable, liveParts, liveVested, money,
  parseWhole, ratePerSecond,
} from "@/components/ui/format";
import { useAccount, useNow } from "@/components/ui/hooks";
import { ErrorNote, Hash, Icon, MockNotice, NetworkChip } from "@/components/ui/kit";
import { availableCents, pickRoles, planWithdrawal, splitStreams, withdrawalReceiver, type DemoRoles } from "@/lib/demo/account";
import type { Activity, DemoUser, StreamView } from "@/lib/domain/types";
import { addAmounts } from "@/lib/domain/amounts";
import { feeFor } from "@/lib/domain/fees";
import { presentationAt } from "@/lib/demo/presentation";

// Presentation name of the composed demo account (payer + receiver identities).
const ACCOUNT_NAME = "Nodo Software SRL";
const DURATIONS = [
  { id: "15m", label: "15 min · demo", seconds: 900 },
  { id: "30d", label: "1 mes", seconds: 30 * 86400 },
] as const;

const sum = <T,>(list: T[], f: (x: T) => number) => list.reduce((a, x) => a + f(x), 0);
const streaming = (s: StreamView, now: number) => !s.canceledAt && now >= s.start && now < s.end;

function untilLabel(s: StreamView, now: number): string {
  if (s.canceledAt) return "Cancelado";
  if (now >= s.end) return "Completado";
  if (now < s.start) return `Empieza ${clock(s.start)}`;
  const fundedUntil = s.start + (Number(s.deposited) / Number(s.totalAmount)) * (s.end - s.start);
  if (fundedUntil < s.end) return `Fondeado hasta ${s.end - s.start > 86400 ? dateLabel(fundedUntil) : clock(fundedUntil)}`;
  if (s.end - now < 3600) return `${Math.max(1, Math.ceil((s.end - now) / 60))} min restantes`;
  return "Período fondeado";
}

export default function DemoAccountPage() {
  const [users, setUsers] = useState<DemoUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.users().then(setUsers).catch((e: Error) => setError(e.message));
  }, []);
  const roles = useMemo(() => (users ? pickRoles(users) : null), [users]);

  if (error) return <Gate message={error} />;
  if (!users) return <Shell><div className="skeleton h-[420px] rounded-[24px]" /></Shell>;
  if (!roles) return <Gate message="Faltan usuarios demo: se necesitan un pagador y dos proveedores." />;
  return <Account roles={roles} users={users} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-page">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1216px] flex-wrap items-center justify-between gap-3 px-[clamp(16px,3vw,32px)] py-3">
          <Link href="/" aria-label="Continuum, portada" className="flex items-center gap-2.5">
            <svg width="26" height="26" viewBox="0 0 28 28" aria-hidden="true">
              <rect width="28" height="28" rx="8" fill="#0B0B0C" />
              <path d="M7 14h9.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
              <circle cx="20" cy="14" r="2.6" fill="#6CB4EE" />
            </svg>
            <span className="text-[17px] font-semibold tracking-[-0.03em]">continuum</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <Link href="/entrar" className="text-xs text-muted hover:text-ink">Vistas por rol</Link>
            <NetworkChip />
            <span role="img" aria-label={`Perfil de ${ACCOUNT_NAME}`} className="flex size-9 items-center justify-center rounded-[10px] bg-ink text-celeste-dark ring-1 ring-white/10">
              <Icon name="building" size={20} strokeWidth={1.7} />
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-[1216px] flex-col gap-5 px-[clamp(16px,3vw,32px)] pb-12 pt-8">{children}</main>
    </div>
  );
}

function Gate({ message }: { message: string }) {
  return (
    <Shell>
      <div className="mx-auto flex max-w-[420px] flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">Cuenta demo</h1>
        <ErrorNote>{message}</ErrorNote>
        <div className="flex gap-2">
          <Link href="/login?next=%2Fdemo" className="inline-flex h-11 items-center rounded-xl bg-ink px-4 text-sm font-semibold text-white">Ingresar</Link>
          <Link href="/entrar" className="inline-flex h-11 items-center rounded-xl border border-line px-4 text-sm font-semibold">Vistas por rol</Link>
        </div>
      </div>
    </Shell>
  );
}

function Account({ roles, users }: { roles: DemoRoles; users: DemoUser[] }) {
  const payer = useAccount(roles.payer.id);
  const receiver = useAccount(roles.receiver.id);
  const now = useNow(100);
  const [panel, setPanel] = useState<null | "new" | "withdraw">(null);
  const [createdIds, setCreatedIds] = useState<string[]>([]);
  const [presentation, setPresentation] = useState(true);
  const preview = presentationAt(now);

  const { incoming, outgoing } = splitStreams(roles, payer.streams ?? [], receiver.streams ?? []);
  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  const available = sum(incoming, (s) => liveAvailable(s, now));
  const inRate = sum(incoming.filter((s) => streaming(s, now) && liveVested(s, now) < Number(s.deposited)), ratePerSecond);
  const paid = sum(outgoing, (s) => Math.min(liveVested(s, now), Number(s.deposited)));
  const outRate = sum(outgoing.filter((s) => streaming(s, now) && liveVested(s, now) < Number(s.deposited)), ratePerSecond);
  const refresh = () => { payer.refresh(); receiver.refresh(); };

  const moves = useMemo(() => {
    const seen = new Set<string>();
    return [...payer.activity, ...receiver.activity]
      .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
      .sort((x, y) => y.createdAt.localeCompare(x.createdAt))
      .slice(0, 5);
  }, [payer.activity, receiver.activity]);
  const onchain = moves.some((m) => isOnchain(m.txHash));
  const loadError = payer.error ?? receiver.error;
  const loading = !payer.streams || !receiver.streams;

  const a = liveParts(presentation ? preview.earned : available);
  const p = liveParts(presentation ? preview.paid : paid);
  const incomingCount = presentation ? preview.incoming.length : incoming.length;
  const outgoingCount = presentation ? preview.outgoing.length : outgoing.length;

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[32px] font-semibold tracking-[-0.04em]">{ACCOUNT_NAME}</h1>
          <span className="text-sm text-muted">Compra y vende servicios</span>
        </div>
        <div aria-label="Vista de importes" className="inline-flex rounded-full border border-line bg-white p-1">
          {([[true, "Presentación"], [false, "Saldo real"]] as const).map(([value, label]) => (
            <button key={label} type="button" aria-pressed={presentation === value} onClick={() => setPresentation(value)}
              className={`rounded-full px-4 py-2 text-xs font-medium ${presentation === value ? "bg-ink text-white" : "text-muted"}`}>{label}</button>
          ))}
        </div>
      </div>
      {loadError && <ErrorNote>{loadError}</ErrorNote>}

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="in-t" className="flex flex-col gap-[22px] rounded-[24px] bg-ink px-7 pb-2.5 pt-[26px] text-white">
          <div className="flex items-center justify-between gap-3">
            <h2 id="in-t" className="flex items-center gap-2.5 text-base font-semibold">
              <span className="size-2 rounded-full bg-celeste-dark animate-pulse-dot" />Cobrás
            </h2>
            <span className="text-[13px] text-faint">{incomingCount} {incomingCount === 1 ? "contrato" : "contratos"}</span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-2.5">
              <span className="tnum text-[clamp(44px,4.8vw,62px)] font-medium leading-none tracking-[-0.055em]">
                ${a.int}<span className="text-subtle">,{a.cents}</span>
              </span>
              <span className="tnum text-sm text-faint">{presentation ? "devengado este mes" : "disponible"} · <span className="text-celeste-dark">+{money(presentation ? preview.inRate : inRate, 2)} / s</span></span>
            </div>
            <button type="button" onClick={() => setPanel("withdraw")} disabled={loading}
              className="h-12 rounded-xl bg-white px-[22px] text-[15px] font-semibold text-ink disabled:opacity-50">Retirar</button>
          </div>
          <ul>
            {presentation ? preview.incoming.map(c => (
              <Row key={c.name} dark name={c.name} sub={c.service} amount={money(c.earned, 2)}
                note="Servicio mensual" earned={preview.progress} funded={1} />
            )) : incoming.map((s) => (
              <Row key={s.id} dark name={s.label ?? `Contrato #${s.id}`} sub={`#${s.id} · ${durationLabel(s.end - s.start)}`}
                amount={money(liveVested(s, now), 2)} note={untilLabel(s, now)}
                earned={(now - s.start) / (s.end - s.start)} funded={Number(s.deposited) / Number(s.totalAmount)} />
            ))}
            {!presentation && loading && <li className="h-[72px] border-t border-[#222226]" />}
            {!presentation && !loading && incoming.length === 0 && <li className="border-t border-[#222226] py-5 text-sm text-faint">Sin contratos de cobro.</li>}
          </ul>
        </section>

        <section aria-labelledby="out-t" className="flex flex-col gap-[22px] rounded-[24px] border border-line bg-white px-7 pb-2.5 pt-[26px]">
          <div className="flex items-center justify-between gap-3">
            <h2 id="out-t" className="text-base font-semibold">Pagás</h2>
            <span className="text-[13px] text-muted">{outgoingCount} {outgoingCount === 1 ? "contrato" : "contratos"}</span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-2.5">
              <span className="tnum text-[clamp(44px,4.8vw,62px)] font-medium leading-none tracking-[-0.055em]">
                ${p.int}<span className="text-faint">,{p.cents}</span>
              </span>
              <span className="tnum text-sm text-muted">devengado a proveedores · <span className="text-ink">−{money(presentation ? preview.outRate : outRate, 2)} / s</span></span>
            </div>
            <button type="button" onClick={() => setPanel("new")}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-ink px-5 text-[15px] font-semibold text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
              Nuevo contrato
            </button>
          </div>
          <ul>
            {presentation ? preview.outgoing.map(c => (
              <Row key={c.name} name={c.name} sub={c.service} amount={money(c.earned, 2)}
                note="Servicio mensual" earned={preview.progress} funded={1} />
            )) : [...outgoing].sort((x, y) => Number(y.id) - Number(x.id)).map((s) => (
              <Row key={s.id} name={nameOf(s.workerId)} sub={s.label ?? `#${s.id} · ${durationLabel(s.end - s.start)}`}
                fresh={createdIds.includes(s.id)} amount={money(Math.min(liveVested(s, now), Number(s.deposited)), 2)}
                note={untilLabel(s, now)} earned={(now - s.start) / (s.end - s.start)} funded={Number(s.deposited) / Number(s.totalAmount)} />
            ))}
            {!presentation && loading && <li className="h-[72px] border-t border-line-soft" />}
            {!presentation && !loading && outgoing.length === 0 && <li className="border-t border-line-soft py-5 text-sm text-muted">Todavía no pagás a ningún proveedor.</li>}
          </ul>
        </section>
      </div>

      <section aria-labelledby="mov-t" className="rounded-[20px] border border-line bg-white px-[22px] py-1.5">
        <h2 id="mov-t" className="flex min-h-[52px] items-center text-base font-semibold">{onchain ? "Movimientos onchain" : "Movimientos"}</h2>
        <ul>
          {moves.map((m) => <Move key={m.id} move={m} nameOf={nameOf} outgoing={outgoing} />)}
          {moves.length === 0 && <li className="border-t border-line-soft py-5 text-sm text-muted">Sin movimientos todavía.</li>}
        </ul>
      </section>

      {panel === "new" && (
        <NewContract roles={roles} defaultAmount={onchain ? 1 : 90000} onClose={() => setPanel(null)}
          onCreated={(ids) => { setCreatedIds((x) => [...ids, ...x]); setPresentation(false); refresh(); }} />
      )}
      {panel === "withdraw" && (
        <Withdraw users={users} receiver={withdrawalReceiver(roles, payer.streams ?? [], now)} now={now} onClose={() => setPanel(null)} onDone={refresh} />
      )}
    </Shell>
  );
}

function Row({ name, sub, amount, note, earned, funded, dark = false, fresh = false }: {
  name: string; sub: string; amount: string; note: string; earned: number; funded: number; dark?: boolean; fresh?: boolean;
}) {
  const pct = (v: number) => `${Math.max(0, Math.min(1, v)) * 100}%`;
  return (
    <li className={`-mx-3 grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3.5 rounded-xl border-t px-3 py-4 ${dark ? "border-[#222226]" : "border-line-soft"} ${fresh ? "bg-celeste-soft/60" : ""}`}>
      <span className={`flex size-10 items-center justify-center rounded-[11px] text-[13px] font-semibold ${dark ? "bg-[#1C1C20] text-[#E4E4E7]" : "bg-surface text-ink-2"}`}>{initials(name)}</span>
      <span className="flex min-w-0 flex-col gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold">{name}</span>
          {fresh && <span className="inline-flex h-5 items-center rounded-full bg-ink px-[7px] text-[11px] font-semibold text-white">Nuevo</span>}
          <span className={`truncate text-xs ${dark ? "text-faint" : "text-subtle"}`}>{sub}</span>
        </span>
        <span aria-hidden="true" className="relative block h-1.5 max-w-[280px]">
          <span className={`absolute inset-x-0 top-0.5 block h-0.5 rounded ${dark ? "bg-[#26262B]" : "bg-track"}`} />
          <span className={`absolute left-0 top-0 block h-1.5 rounded ${dark ? "bg-celeste/35" : "bg-celeste/20"}`} style={{ width: pct(funded) }} />
          <span className={`absolute left-0 top-0.5 block h-0.5 rounded ${dark ? "bg-white" : "bg-ink"}`} style={{ width: pct(earned) }} />
        </span>
      </span>
      <span className="flex flex-col items-end gap-1">
        <span className="tnum text-[15px] font-semibold">{amount}</span>
        <span className={`tnum text-xs ${dark ? "text-faint" : "text-subtle"}`}>{note}</span>
      </span>
    </li>
  );
}

function Move({ move, outgoing, nameOf }: { move: Activity; outgoing: StreamView[]; nameOf: (id: string) => string }) {
  const out = outgoing.find((s) => s.id === move.streamId);
  const isIn = move.kind === "withdraw";
  const text = move.kind === "withdraw" ? "Retiro de cobros"
    : move.kind === "create" ? (out ? `Contrato #${move.streamId} con ${nameOf(out.workerId)}` : `Contrato de cobro #${move.streamId}`)
    : move.kind === "topup" ? `Fondeo del contrato #${move.streamId}`
    : move.kind === "cancel" ? `Cancelación del contrato #${move.streamId}`
    : move.kind === "fee" ? "Comisión Continuum · 0,05%" : "Movimiento";
  const sign = move.kind === "withdraw" ? "+" : move.kind === "fee" || out && (move.kind === "create" || move.kind === "topup") ? "−" : "";
  return (
    <li className="flex min-h-[60px] flex-wrap items-center gap-x-3.5 gap-y-1.5 border-t border-line-soft">
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${isIn ? "bg-celeste-soft text-celeste-ink" : "bg-surface text-ink"}`}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={isIn ? "M17 7L7 17M16 17H7V8" : "M7 17L17 7M8 7h9v9"} />
        </svg>
      </span>
      <span className="flex min-w-[200px] grow basis-[240px] flex-col gap-0.5">
        <span className="text-sm font-medium">{text}</span>
        <span className="text-xs text-subtle">{dateLabel(Date.parse(move.createdAt) / 1000)} · {clock(Date.parse(move.createdAt) / 1000)}</span>
      </span>
      <span className={`tnum text-sm font-semibold ${sign === "+" ? "text-celeste-ink" : "text-ink"}`}>{sign}{money(move.amount, move.kind === "fee" ? 4 : 2)}</span>
      <span className="min-w-[120px] text-right">{move.txHash ? <Hash hash={move.txHash} /> : <span className="text-xs text-muted">Pendiente</span>}</span>
    </li>
  );
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 w-full cursor-default bg-ink/35 animate-[rise_0.2s_ease-out_both]" />
      <aside role="dialog" aria-modal="true" aria-label={title}
        className="absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col gap-6 overflow-y-auto bg-white px-7 py-6 shadow-[-24px_0_48px_-24px_rgba(11,11,12,.3)] animate-enter">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[22px] font-semibold tracking-[-0.03em]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex size-10 items-center justify-center rounded-[10px] bg-surface">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

function Done({ title, subtitle, hashes, onClose, action }: { title: string; subtitle: string; hashes: string[]; onClose: () => void; action: string }) {
  const mock = hashes.some((h) => !isOnchain(h));
  return (
    <div className="flex grow flex-col items-center justify-center gap-5 text-center">
      <span className="flex size-[72px] items-center justify-center rounded-full bg-ink animate-pop">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      </span>
      <div className="flex flex-col gap-1.5">
        <span className="tnum text-[32px] font-semibold leading-tight tracking-[-0.04em]">{title}</span>
        <span className="text-[15px] text-muted">{subtitle}</span>
      </div>
      <div className="flex flex-col items-center gap-1.5">{hashes.map((h) => <Hash key={h} hash={h} />)}</div>
      {mock && <MockNotice />}
      <button type="button" onClick={onClose} className="mt-2 h-[52px] w-full rounded-[14px] bg-ink text-[15px] font-semibold text-white">{action}</button>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="#5F5F67" strokeWidth="3" /><path d="M21 12a9 9 0 00-9-9" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function choice(on: boolean) {
  return on ? "border-2 border-ink" : "border border-line";
}

function NewContract({ roles, defaultAmount, onClose, onCreated }: {
  roles: DemoRoles; defaultAmount: number; onClose: () => void; onCreated: (ids: string[]) => void;
}) {
  const [providerId, setProviderId] = useState(roles.providers[0].id);
  const [amount, setAmount] = useState(defaultAmount);
  const [durationId, setDurationId] = useState<(typeof DURATIONS)[number]["id"]>("15m");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ids: string[]; hash: string } | null>(null);
  const provider = roles.providers.find((u) => u.id === providerId) ?? roles.providers[0];
  const seconds = DURATIONS.find((d) => d.id === durationId)!.seconds;
  const valid = amount > 0 && !busy;
  const fee = feeFor(String(amount));
  const totalDebit = addAmounts(String(amount), fee);

  const create = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const start = Math.floor(Date.now() / 1000);
      const total = String(amount);
      const { txHash, streamIds } = await api.create(roles.payer.id, [{ workerId: provider.id, totalAmount: total, initialDeposit: total }], start, start + seconds);
      setResult({ ids: streamIds, hash: txHash });
      onCreated(streamIds);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer title="Nuevo contrato" onClose={() => { if (!busy) onClose(); }}>
      {result ? (
        <Done title={`Contrato #${result.ids.join(", #")}`} subtitle={`${provider.name} ya está cobrando ${money(amount / seconds, 2)} / s`}
          hashes={[result.hash]} onClose={onClose} action="Ver en Pagás" />
      ) : (
        <div className="flex flex-col gap-[22px]">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2.5 text-sm font-semibold">Pagás a</legend>
            {roles.providers.map((u) => (
              <button key={u.id} type="button" aria-pressed={u.id === provider.id} onClick={() => setProviderId(u.id)}
                className={`flex min-h-[60px] items-center gap-3 rounded-[14px] bg-white px-3.5 py-2.5 text-left ${choice(u.id === provider.id)}`}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-surface text-xs font-semibold text-ink-2">{initials(u.name)}</span>
                <span className="text-sm font-semibold">{u.name}</span>
              </button>
            ))}
          </fieldset>
          <div className="flex flex-col gap-2">
            <label htmlFor="amount" className="text-sm font-semibold">Monto</label>
            <div className="flex h-14 items-center gap-1.5 rounded-[14px] border border-line px-4">
              <span className="text-xl text-faint">$</span>
              <input id="amount" inputMode="numeric" autoComplete="off" value={groupWhole(amount)} onChange={(e) => setAmount(parseWhole(e.target.value))}
                className="tnum min-w-0 grow bg-transparent text-[22px] font-medium outline-none" />
              <span className="text-xs text-subtle">ARGt</span>
            </div>
          </div>
          <fieldset>
            <legend className="mb-2.5 text-sm font-semibold">Duración</legend>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button key={d.id} type="button" aria-pressed={d.id === durationId} onClick={() => setDurationId(d.id)}
                  className={`h-11 flex-1 rounded-xl border text-sm font-medium ${d.id === durationId ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>{d.label}</button>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-3.5 rounded-[18px] bg-ink p-5 text-white">
            <span className="text-[13px] text-faint">{provider.name} cobra</span>
            <span className="tnum text-4xl font-medium leading-none tracking-[-0.05em]">{money(amount / seconds, 2)}<span className="text-lg text-subtle"> / s</span></span>
            <span className="tnum border-t border-[#26262B] pt-3.5 text-sm text-faint">Depositás {money(amount)} ahora</span>
            <span className="tnum text-xs text-faint">Comisión adicional 0,05%: {money(fee, 4)} · Total: {money(totalDebit, 4)}</span>
          </div>
          {error && <ErrorNote>{error}</ErrorNote>}
          <button type="button" onClick={create} disabled={!valid}
            className="flex h-14 items-center justify-center gap-2.5 rounded-[14px] bg-ink text-base font-semibold text-white disabled:bg-[#1F1F23] disabled:text-white/70">
            {busy && <Spinner />}
            {busy ? "Creando contrato…" : amount > 0 ? `Crear y depositar ${money(amount)}` : "Ingresá un monto"}
          </button>
        </div>
      )}
    </Drawer>
  );
}

function Withdraw({ users, receiver, now, onClose, onDone }: {
  users: DemoUser[]; receiver: DemoUser; now: number; onClose: () => void; onDone: () => void;
}) {
  const [receiverId, setReceiverId] = useState(receiver.id);
  const workers = users.filter(u => u.role === "worker");
  const selected = workers.find(u => u.id === receiverId) ?? receiver;
  return <WithdrawalAccount key={selected.id} receiver={selected} workers={workers} onSelect={setReceiverId}
    now={now} onClose={onClose} onDone={onDone} />;
}

function WithdrawalAccount({ receiver, workers, onSelect, now, onClose, onDone }: {
  receiver: DemoUser; workers: DemoUser[]; onSelect: (id: string) => void;
  now: number; onClose: () => void; onDone: () => void;
}) {
  const account = useAccount(receiver.id);
  const incoming = (account.streams ?? []).filter(s => s.workerId === receiver.id);
  const available = sum(incoming, s => liveAvailable(s, now));
  const maxCents = sum(incoming, (s) => availableCents(s, now));
  const maxAmount = maxCents / 100;
  const [amountText, setAmountText] = useState("0.10");
  const amount = Number(amountText.replace(",", "."));
  const [destination, setDestination] = useState<"wallet" | "belo">("wallet");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ amount: number; hashes: string[] } | null>(null);
  const plan = planWithdrawal(incoming, amount, now);
  const valid = /^\d+(?:[.,]\d{1,2})?$/.test(amountText) && plan.length > 0 && !busy && !account.error;
  const a = liveParts(available);

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    const hashes: string[] = [];
    try {
      for (const step of plan) {
        const { txHash } = await api.withdraw(receiver.id, step.streamId, step.amount, destination);
        hashes.push(txHash);
      }
      setResult({ amount, hashes });
    } catch (e) {
      setError(hashes.length ? `${(e as Error).message} Se confirmaron ${hashes.length} de ${plan.length} retiros.` : (e as Error).message);
      setAmountText("");
    } finally {
      setBusy(false);
      account.refresh();
      onDone();
    }
  };

  return (
    <Drawer title="Retirar" onClose={() => { if (!busy) onClose(); }}>
      {result ? (
        <Done title={money(result.amount, 2)} subtitle={`retirados a ${destination === "wallet" ? "tu wallet" : "tu cuenta Belo"}`}
          hashes={result.hashes} onClose={onClose} action="Listo" />
      ) : (
        <div className="flex flex-col gap-[22px]">
          <div className="flex flex-col gap-2">
            <label htmlFor="withdraw-account" className="text-sm font-semibold">Cuenta de cobro</label>
            <select id="withdraw-account" value={receiver.id} disabled={busy} onChange={e => onSelect(e.target.value)}
              className="h-12 rounded-xl border border-line bg-white px-3 text-sm">
              {workers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 rounded-[18px] bg-ink p-5 text-white">
            <span className="flex items-center gap-2 text-[13px] text-faint"><span className="size-[7px] rounded-full bg-celeste-dark animate-pulse-dot" />Saldo real para retirar</span>
            <span className="tnum text-4xl font-medium leading-none tracking-[-0.05em]">${a.int}<span className="text-subtle">,{a.cents}</span></span>
            <span className="text-xs text-faint">{account.streams ? "ARGt disponibles en Arbitrum" : "Consultando saldo…"}</span>
          </div>
          <div className="flex flex-col gap-2.5">
            <label htmlFor="wd" className="text-sm font-semibold">Monto</label>
            <div className={`flex h-14 items-center gap-1.5 rounded-[14px] border px-4 ${amount > maxAmount ? "border-danger" : "border-line"}`}>
              <span className="text-xl text-faint">$</span>
              <input id="wd" inputMode="decimal" autoComplete="off" value={amountText} disabled={busy} onChange={(e) => setAmountText(e.target.value)}
                className="tnum min-w-0 grow bg-transparent text-[22px] font-medium outline-none" />
              <span className="text-xs text-subtle">ARGt</span>
            </div>
            <div className="flex gap-2">
              {([0.1, 0.25, 1] as const).map((v) => {
                const on = v === amount && v > 0;
                return (
                  <button key={v} type="button" aria-pressed={on} disabled={busy || v > maxAmount} onClick={() => setAmountText(v.toFixed(2))}
                    className={`h-10 flex-1 rounded-full border text-sm font-medium disabled:opacity-40 ${on ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>{money(v, 2)}</button>
                );
              })}
            </div>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2.5 text-sm font-semibold">A</legend>
            {([["wallet", "Tu wallet", receiver.address], ["belo", "Cuenta Belo", receiver.beloAddress]] as const).map(([id, label, address]) => (
              <button key={id} type="button" aria-pressed={destination === id} disabled={busy || !address} onClick={() => setDestination(id)}
                className={`flex min-h-[60px] flex-col justify-center gap-0.5 rounded-[14px] bg-white px-3.5 py-2.5 text-left disabled:opacity-40 ${choice(destination === id)}`}>
                <span className="text-sm font-semibold">{label}</span>
                <span className="font-mono text-xs text-subtle">{address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Sin dirección configurada"}</span>
              </button>
            ))}
          </fieldset>
          {(error || account.error) && <ErrorNote>{error || account.error}</ErrorNote>}
          <button type="button" onClick={submit} disabled={!valid}
            className="flex h-14 items-center justify-center gap-2.5 rounded-[14px] bg-ink text-base font-semibold text-white disabled:bg-[#1F1F23] disabled:text-white/70">
            {busy && <Spinner />}
            {busy ? "Enviando…" : amount > maxAmount ? "Supera lo disponible" : valid ? `Retirar ${money(amount, 2)}` : "Ingresá un monto"}
          </button>
        </div>
      )}
    </Drawer>
  );
}
