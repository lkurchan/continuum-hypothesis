"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/components/ui/api";
import {
  clock, dateLabel, durationLabel, initials, liveParts, money,
} from "@/components/ui/format";
import { useAccount, useNow } from "@/components/ui/hooks";
import { ErrorNote, Hash, Icon } from "@/components/ui/kit";
import { availableCents, pickRoles, planWithdrawal, splitStreams, withdrawalReceiver, type DemoRoles } from "@/lib/demo/account";
import type { Activity, DemoUser, StreamView } from "@/lib/domain/types";
import { addAmounts } from "@/lib/domain/amounts";
import { feeFor } from "@/lib/domain/fees";
import { presentationAt } from "@/lib/demo/presentation";
import { contractTerms, type DurationUnit } from "@/lib/demo/contract-form";
import { Bubble, Typing, useChat } from "@/components/ui/chat";
import { PayerProvider } from "@/components/payer/PayerContext";
import { ProposalCard } from "@/components/payer/ProposalCard";

// Presentation name of the composed demo account (payer + receiver identities).
const ACCOUNT_NAME = "Acosta Servicios SRL";
type View = "inicio" | "copiloto" | "contratos";
type DisplayContract = { name: string; service: string; monthly: number; earned: number; direction: "in" | "out"; period?: number; deposited?: number };
const ACTION_STYLE = "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 text-[15px] font-semibold text-white transition hover:opacity-85 disabled:opacity-40";
const compactMoney = (value: string | number) => {
  const n = Math.abs(Number(value));
  const decimals = n > 0 && n < 0.01 ? Math.min(18, Math.ceil(-Math.log10(n)) + 1) : 2;
  return money(value, decimals).replace(/(,\d*?[1-9])0+$/, "$1").replace(/,0+$/, "");
};
const SELECT_STYLE = "appearance-none bg-no-repeat bg-[length:16px_16px] bg-[position:right_14px_center] !pr-10";
const SELECT_ARROW = { backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2362626C' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` };
const sum = <T,>(list: T[], f: (x: T) => number) => list.reduce((a, x) => a + f(x), 0);

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

function Shell({ children, view = "inicio", onNavigate }: { children: React.ReactNode; view?: View; onNavigate?: (view: View) => void }) {
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
          <nav aria-label="Navegación principal" className="order-last flex w-full justify-center gap-1 sm:order-none sm:w-auto">
            {([["inicio", "Inicio"], ["copiloto", "Copiloto"], ["contratos", "Contratos"]] as const).map(([id, label]) => (
              <button key={id} type="button" aria-current={view === id ? "page" : undefined} onClick={() => onNavigate?.(id)}
                className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium ${view === id ? "bg-ink text-white" : "text-muted hover:bg-surface"}`}>
                {label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2.5">
            <Link href="/entrar" aria-label="Cambiar cuenta" title="Cambiar cuenta" className="flex size-10 items-center justify-center rounded-xl bg-ink text-celeste-dark hover:bg-ink-2">
              <Icon name="person" size={21} strokeWidth={1.7} />
            </Link>
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
          <Link href="/entrar" className="inline-flex h-11 items-center rounded-xl border border-line px-4 text-sm font-semibold">Cambiar cuenta</Link>
        </div>
      </div>
    </Shell>
  );
}

function Account({ roles, users }: { roles: DemoRoles; users: DemoUser[] }) {
  const payer = useAccount(roles.payer.id);
  const receiver = useAccount(roles.receiver.id);
  const now = useNow(100);
  const [view, setView] = useState<View>("inicio");
  const [panel, setPanel] = useState<null | "new" | "withdraw">(null);
  const [detail, setDetail] = useState<DisplayContract | null>(null);
  const [created, setCreated] = useState<DisplayContract[]>([]);
  const preview = presentationAt(now);
  const { outgoing } = splitStreams(roles, payer.streams ?? [], receiver.streams ?? []);
  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  const refresh = () => { payer.refresh(); receiver.refresh(); };
  const moves = useMemo(() => {
    const seen = new Set<string>();
    return [...payer.activity, ...receiver.activity]
      .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
      .sort((x, y) => y.createdAt.localeCompare(x.createdAt)).slice(0, 5);
  }, [payer.activity, receiver.activity]);
  const contracts: DisplayContract[] = [
    ...preview.incoming.map(c => ({ ...c, direction: "in" as const })),
    ...preview.outgoing.map(c => ({ ...c, direction: "out" as const })), ...created,
  ];
  const loading = !payer.streams || !receiver.streams;
  const navigate = (next: View) => { setView(next); setDetail(null); };

  return (
    <Shell view={view} onNavigate={navigate}>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[32px] font-semibold tracking-[-0.04em]">{ACCOUNT_NAME}</h1>
      </div>
      {(payer.error || receiver.error) && <ErrorNote>{payer.error || receiver.error}</ErrorNote>}
      <div hidden={view !== "inicio"}>
        <div className="grid gap-4 lg:grid-cols-2">
          {(["in", "out"] as const).map(direction => {
            const dark = direction === "in";
            const list = contracts.filter(c => c.direction === direction);
            const amount = liveParts(dark ? preview.earned : preview.paid);
            return <section key={direction} aria-label={dark ? "Cobrás" : "Pagás"}
              className={`flex min-w-0 flex-col gap-6 rounded-[24px] border px-5 pb-3 pt-6 sm:px-7 ${dark ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <h2 className="flex items-center gap-2 text-base font-semibold">{dark ? "Cobrás" : "Pagás"}</h2>
                  <span className={`tnum text-sm ${dark ? "text-celeste-dark" : "text-muted"}`}>{dark ? "+" : "−"}{money(dark ? preview.inRate : preview.outRate, 2)} /s</span>
                </div>
                <span className={`text-xs ${dark ? "text-faint" : "text-muted"}`}>{list.length} contratos</span>
              </div>
              <span className="tnum whitespace-nowrap text-[clamp(32px,4.6vw,60px)] font-medium leading-none tracking-[-0.055em]">
                ${amount.int}<span className={dark ? "text-subtle" : "text-faint"}>,{amount.cents}</span>
              </span>
              <button type="button" onClick={() => setPanel(dark ? "withdraw" : "new")} disabled={dark && loading} className={`${ACTION_STYLE} ${dark ? "!bg-white !text-ink" : ""}`}>
                <Icon name={dark ? "in" : "plus"} size={18} />{dark ? "Retirar" : "Nuevo contrato"}
              </button>
              <ul>{list.map(c => <Row key={c.name + c.service} dark={dark} name={c.name} sub={c.service} amount={money(c.earned, 2)}
                note={c.period ? durationLabel(c.period) : "Servicio mensual"} earned={c.period ? 0 : preview.progress} funded={c.deposited === undefined ? 1 : c.deposited / c.monthly} onClick={() => setDetail(c)} />)}</ul>
            </section>;
          })}
        </div>
        <section aria-label="Movimientos" className="mt-5 rounded-[20px] border border-line bg-white px-5 py-2">
          <h2 className="flex min-h-[52px] items-center text-base font-semibold">Movimientos</h2>
          {preview.incoming.map(c => <div key={c.name} className="flex items-center gap-3 border-t border-line-soft py-4">
            <span className="flex size-9 items-center justify-center rounded-full bg-celeste-soft text-celeste-ink"><Icon name="in" /></span>
            <span className="grow text-sm font-medium">Cobro de {c.name}<span className="block text-xs font-normal text-muted">{c.service}</span></span>
            <span className="tnum text-sm font-semibold text-celeste-ink">+{money(c.earned, 2)}</span>
          </div>)}
        </section>
      </div>
      <div hidden={view !== "contratos"}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">Contratos</h2>
          <button type="button" className={`${ACTION_STYLE} max-w-[210px]`} onClick={() => setPanel("new")}><Icon name="plus" />Nuevo contrato</button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="hidden grid-cols-[minmax(0,2fr)_100px_minmax(140px,1fr)_100px_24px] gap-6 border-b border-line bg-page px-6 py-3 text-xs font-medium text-muted md:grid"><span>Empresa / servicio</span><span>Tipo</span><span className="text-right">Importe</span><span className="text-center">Estado</span><span /></div>
          {contracts.map(c => <button key={c.name + c.service} type="button" onClick={() => setDetail(c)}
            className="grid w-full grid-cols-[minmax(0,1fr)_auto_16px] items-center gap-3 border-b border-line-soft px-4 py-5 text-left transition hover:bg-page last:border-0 md:grid-cols-[minmax(0,2fr)_100px_minmax(140px,1fr)_100px_24px] md:gap-6 md:px-6">
            <span className="min-w-0"><span className="block truncate text-base font-semibold">{c.name}</span><span className="mt-1 block truncate text-xs text-muted">{c.service}</span><span className="mt-2 block text-xs text-muted md:hidden">{c.direction === "in" ? "Cobrás" : "Pagás"} · En curso</span></span>
            <span className="hidden text-sm text-muted md:block">{c.direction === "in" ? "Cobrás" : "Pagás"}</span>
            <span className="text-right"><span className="tnum block text-base font-semibold">{money(c.monthly)}</span><span className="text-xs text-muted">{c.period ? durationLabel(c.period) : "por mes"}</span></span>
            <span className="hidden rounded-full bg-surface px-3 py-1.5 text-center text-xs text-muted md:block">En curso</span>
            <Icon name="chevron" size={16} className="text-subtle" />
          </button>)}
        </div>
        <details className="mt-5 rounded-2xl border border-line bg-white px-5 py-4">
          <summary className="cursor-pointer text-sm font-medium">Comprobantes onchain</summary>
          <ul className="mt-3">{moves.map(m => <Move key={m.id} move={m} nameOf={nameOf} outgoing={outgoing} />)}</ul>
        </details>
      </div>
      <div hidden={view !== "copiloto"}><PayerProvider><Copilot userId={roles.payer.id} /></PayerProvider></div>
      {detail && <Drawer title="Contrato de servicio" onClose={() => setDetail(null)}>
        <span className="text-xs font-medium text-celeste-ink">{detail.direction === "in" ? "Cobrás" : "Pagás"} · En curso</span>
        <h3 className="text-2xl font-semibold">{detail.name}</h3><p className="-mt-4 text-sm text-muted">{detail.service}</p>
        <div className="rounded-2xl bg-ink p-5 text-white"><p className="mb-2 text-xs text-faint">{detail.period ? "Monto del contrato" : "Importe mensual"}</p><p className="tnum text-4xl font-medium">{money(detail.monthly)}</p></div>
        <dl className="space-y-4 text-sm"><div className="flex justify-between"><dt className="text-muted">Devengado</dt><dd className="tnum font-semibold">{money(detail.earned, 2)}</dd></div><div className="flex justify-between"><dt className="text-muted">Duración</dt><dd>{detail.period ? durationLabel(detail.period) : "Mensual"}</dd></div><div className="flex justify-between"><dt className="text-muted">Fondeo</dt><dd>{detail.deposited === undefined ? "100%" : money(detail.deposited, 2)}</dd></div></dl>
        <button className={ACTION_STYLE} type="button" onClick={() => { setPanel(detail.direction === "in" ? "withdraw" : "new"); setDetail(null); }}>{detail.direction === "in" ? "Retirar" : "Nuevo contrato"}</button>
      </Drawer>}
      {panel === "new" && <NewContract roles={roles} onClose={() => setPanel(null)} onCreated={c => { setCreated(x => [...x, c]); refresh(); }} />}
      {panel === "withdraw" && <Withdraw users={users} receiver={withdrawalReceiver(roles, payer.streams ?? [], now)} now={now} onClose={() => setPanel(null)} onDone={refresh} />}
    </Shell>
  );
}

function Copilot({ userId }: { userId: string }) {
  const [scenario] = useState(() => {
    const p = presentationAt(Date.now() / 1000);
    return `Analizá este escenario de Acosta Servicios SRL que muestra la interfaz. Para este análisis usá estos contratos ilustrativos, no los saldos de la prueba onchain: cobros mensuales ${p.incoming.map(c => `${c.name}: ${c.monthly}`).join(", ")}; pagos mensuales ${p.outgoing.map(c => `${c.name}: ${c.monthly}`).join(", ")}; cobrado en el mes ${p.earned.toFixed(2)}, pagado ${p.paid.toFixed(2)} ARGt. No presentes estas cifras como fondos onchain verificables. No propongas contratos nuevos salvo pedido explícito. Si el usuario pide operar, el monto y destinatario deben confirmarse y las restricciones reales siguen vigentes.`;
  });
  const { messages, busy, send } = useChat(userId, scenario);
  const [draft, setDraft] = useState("");
  const ask = (text: string) => { if (!busy && text.trim()) { setDraft(""); void send(text); } };
  return <section aria-label="Copiloto" className="mx-auto flex min-h-[500px] w-full max-w-[760px] flex-col gap-5 rounded-3xl border border-line bg-white p-5 sm:p-7">
    <div><h2 className="text-2xl font-semibold tracking-tight">Copiloto</h2><p className="mt-1 text-sm text-muted">Tus cobros, pagos y próximos pasos, en una conversación.</p></div>
    <div className="flex grow flex-col gap-4">{messages.length === 0 ? <>
      <Bubble role="assistant">Hola. Te ayudo a entender el flujo de caja de Acosta Servicios SRL y a planificar tus próximos pagos.</Bubble>
      <div className="flex flex-wrap gap-2">{["Resumen de mis contratos", "¿Cuánto me queda a fin de mes?", "¿Cómo organizar mis próximos pagos?"].map(t => <button key={t} type="button" onClick={() => ask(t)} className="rounded-full border border-line px-4 py-2 text-xs hover:bg-surface">{t}</button>)}</div>
    </> : messages.map((m, i) => <div key={i} className="flex flex-col gap-3"><Bubble role={m.role}>{m.content || <Typing />}</Bubble>{m.proposal && <ProposalCard proposal={m.proposal} />}</div>)}</div>
    <form className="flex items-center gap-2 rounded-2xl border border-line p-2 pl-4" onSubmit={e => { e.preventDefault(); ask(draft); }}>
      <input aria-label="Mensaje al copiloto" value={draft} onChange={e => setDraft(e.target.value)} maxLength={1000} placeholder="Preguntá por tus cobros y pagos…" className="min-w-0 grow bg-transparent text-sm outline-none" />
      <button type="submit" aria-label="Enviar" disabled={busy || !draft.trim()} className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink text-white disabled:opacity-40"><Icon name="send" /></button>
    </form>
  </section>;
}

function Row({ name, sub, amount, note, earned, funded, dark = false, fresh = false, onClick }: {
  name: string; sub: string; amount: string; note: string; earned: number; funded: number; dark?: boolean; fresh?: boolean; onClick?: () => void;
}) {
  const pct = (v: number) => `${Math.max(0, Math.min(1, v)) * 100}%`;
  return (
    <li><button type="button" onClick={onClick} className={`-mx-3 w-[calc(100%+24px)] text-left grid grid-cols-[32px_minmax(0,1fr)_auto] sm:grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3.5 rounded-xl border-t px-3 py-4 ${dark ? "border-[#222226]" : "border-line-soft"} ${fresh ? "bg-celeste-soft/60" : ""}`}>
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
    </button></li>
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

function NewContract({ roles, onClose, onCreated }: {
  roles: DemoRoles; onClose: () => void; onCreated: (contract: DisplayContract) => void;
}) {
  const now = useNow(1000);
  const [providerId, setProviderId] = useState(roles.providers[0].id);
  const [amountText, setAmountText] = useState("90000");
  const [depositText, setDepositText] = useState("0.10");
  const [percent, setPercent] = useState<number | null>(null);
  const [duration, setDuration] = useState("30");
  const [unit, setUnit] = useState<DurationUnit>("days");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ids: string[]; hash: string } | null>(null);
  const provider = roles.providers.find(u => u.id === providerId) ?? roles.providers[0];
  const terms = contractTerms(amountText, depositText, percent, duration, unit);
  const fee = feeFor(terms?.initialDeposit ?? "0");
  const totalDebit = addAmounts(terms?.initialDeposit ?? "0", fee);
  const valid = Boolean(terms) && !busy;

  const handleCreate = async () => {
    if (!terms || busy) return;
    setBusy(true); setError(null);
    try {
      const start = Math.floor(now);
      const { txHash, streamIds } = await api.create(roles.payer.id,
        [{ workerId: provider.id, totalAmount: terms.totalAmount, initialDeposit: terms.initialDeposit }], start, start + terms.seconds);
      setResult({ ids: streamIds, hash: txHash });
      onCreated({ name: provider.name, service: `Contrato #${streamIds.join(", #")} · ${durationLabel(terms.seconds)}`, monthly: Number(terms.totalAmount), earned: 0, direction: "out", period: terms.seconds, deposited: Number(terms.initialDeposit) });
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const field = "h-12 min-w-0 rounded-xl border border-line bg-white px-3 text-base outline-none focus:border-ink disabled:opacity-50";
  return <Drawer title="Nuevo contrato" onClose={() => { if (!busy) onClose(); }}>
    {result ? <Done title={`Contrato #${result.ids.join(", #")}`} subtitle={`${money(terms?.totalAmount ?? "0")} en servicios · ${compactMoney(terms?.initialDeposit ?? "0")} depositados`}
      hashes={[result.hash]} onClose={onClose} action="Ver contrato" /> : <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2"><label htmlFor="provider" className="text-sm font-semibold">Pagás a</label>
        <select style={SELECT_ARROW} id="provider" value={providerId} onChange={e => setProviderId(e.target.value)} disabled={busy} className={`${field} ${SELECT_STYLE}`}>
          {roles.providers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-2"><label htmlFor="amount" className="text-sm font-semibold">Monto del contrato</label>
        <div className="flex h-14 items-center gap-2 rounded-xl border border-line px-4"><span className="text-xl text-faint">$</span>
          <input id="amount" inputMode="decimal" autoComplete="off" value={amountText} disabled={busy} onChange={e => setAmountText(e.target.value)} className="tnum min-w-0 grow bg-transparent text-2xl font-medium outline-none" />
          <span className="text-xs text-muted">ARGt</span>
        </div>
      </div>
      <fieldset disabled={busy}><legend className="mb-2 text-sm font-semibold">Duración</legend>
        <div className="grid grid-cols-2 gap-2">
          <input aria-label="Cantidad de duración" type="number" min="1" step="1" value={duration} onChange={e => setDuration(e.target.value)} className={field} />
          <select style={SELECT_ARROW} aria-label="Unidad de duración" value={unit} onChange={e => setUnit(e.target.value as DurationUnit)} className={`${field} ${SELECT_STYLE}`}>
            <option value="minutes">Minutos</option><option value="hours">Horas</option><option value="days">Días</option><option value="months">Meses</option>
          </select>
        </div>
        <div className="mt-2 flex gap-2">{([[15, "minutes", "15 min"], [7, "days", "7 días"], [30, "days", "30 días"]] as const).map(([n, u, label]) => <button key={label} type="button" onClick={() => { setDuration(String(n)); setUnit(u); }} className="rounded-full border border-line px-3 py-1.5 text-xs hover:bg-surface">{label}</button>)}</div>
        {unit === "months" && <p className="mt-2 text-xs text-muted">Cada mes equivale a 30 días.</p>}
      </fieldset>
      <fieldset disabled={busy}><legend className="mb-2 text-sm font-semibold">Fondeo inicial</legend>
        <div className="grid grid-cols-4 gap-2">{([25, 50, 100, null] as const).map(value => <button key={value ?? "custom"} type="button" aria-pressed={percent === value} onClick={() => setPercent(value)}
          className={`h-10 rounded-xl border text-xs font-medium ${percent === value ? "border-ink bg-ink text-white" : "border-line"}`}>{value === null ? "Otro" : `${value}%`}</button>)}</div>
        {percent === null && <div className="mt-2 flex items-center gap-2 rounded-xl border border-line px-3"><span className="text-muted">$</span><input aria-label="Importe de fondeo inicial" inputMode="decimal" autoComplete="off" value={depositText} onChange={e => setDepositText(e.target.value)} className="tnum h-12 min-w-0 grow bg-transparent outline-none" /><span className="text-xs text-muted">ARGt</span></div>}
        <p className="mt-2 text-xs text-muted">Podés completar el resto del fondeo más adelante.</p>
      </fieldset>
      <div className="flex flex-col gap-3 rounded-2xl bg-ink p-5 text-white">
        <span className="text-xs text-faint">{provider.name} cobra</span>
        <span className="tnum text-3xl font-medium tracking-tight">{compactMoney(terms ? Number(terms.totalAmount) / terms.seconds : 0)}<span className="text-base text-subtle"> /s</span></span>
        <div className="tnum border-t border-[#26262B] pt-3 text-sm"><span className="text-faint">Fondeás ahora </span>{compactMoney(terms?.initialDeposit ?? "0")}</div>
        <span className="tnum text-xs text-faint">Comisión 0,05%: {compactMoney(fee)} · Total: {compactMoney(totalDebit)}</span>
      </div>
      {!terms && <p className="text-xs text-danger">Revisá los importes y la duración. El fondeo inicial no puede superar el monto del contrato.</p>}
      {error && <ErrorNote>{error}</ErrorNote>}
      <button type="button" onClick={() => { void handleCreate(); }} disabled={!valid} className="flex h-14 shrink-0 items-center justify-center gap-2 rounded-xl bg-ink text-sm font-semibold text-white disabled:opacity-40">
        {busy && <Spinner />}{busy ? "Creando contrato…" : `Crear y fondear ${compactMoney(terms?.initialDeposit ?? "0")}`}
      </button>
    </div>}
  </Drawer>;
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
  const a = liveParts(presentationAt(now).earned);

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
            <select style={SELECT_ARROW} id="withdraw-account" value={receiver.id} disabled={busy} onChange={e => onSelect(e.target.value)}
              className={`h-12 rounded-xl border border-line bg-white px-3 text-sm ${SELECT_STYLE}`}>
              {workers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 rounded-[18px] bg-ink p-5 text-white">
            <span className="flex items-center gap-2 text-[13px] text-faint">Disponible para retirar</span>
            <span className="tnum text-4xl font-medium leading-none tracking-[-0.05em]">${a.int}<span className="text-subtle">,{a.cents}</span></span>
            <span className="text-xs text-faint">ARGt · Acosta Servicios SRL</span>
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
