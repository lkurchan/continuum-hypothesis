"use client";

import Link from "next/link";
import { useState } from "react";
import { fundingView, isFee } from "@/components/ui/agreement";
import { clock, dateLabel, liveParts, liveStatus, liveVested, money } from "@/components/ui/format";
import { useNow } from "@/components/ui/hooks";
import { ErrorNote, FundingPill, Icon, InfoIcon, LiveChip, Skeleton, StreamLine, buttonStyles } from "@/components/ui/kit";
import { Enter, Page, useIntro } from "@/components/ui/motion";
import { ActivityRow } from "@/components/worker/ActivityRow";
import { nameOf, primaryStream, useWorker } from "@/components/worker/WorkerContext";
import { totalAvailable, totalRate, totalWithdrawable } from "@/components/worker/split";
import type { StreamView } from "@/lib/domain/types";

const when = (sec: number, span: number) => (span < 86_400 ? clock(sec) : `${dateLabel(sec)}, ${clock(sec)}`);
const serviceName = (s: StreamView) => s.label ?? `Acuerdo #${s.id}`;

export default function ProviderHome() {
  const { user, users, streams, activity, error } = useWorker();
  const now = useNow(100);
  const [selected, setSelected] = useState<string | null>(null);

  if (error) return <Page><div className="pt-10"><ErrorNote>{error}</ErrorNote></div></Page>;
  if (!user || !streams) return <Page><HomeSkeleton /></Page>;

  const client = (s: StreamView) => nameOf(users, s.payerId);
  const stream = streams.find((s) => s.id === selected) ?? primaryStream(streams, now);
  const late = streams.map((s) => ({ s, f: fundingView(s, now) })).filter(({ f }) => f.state === "atrasado");
  const streaming = streams.some((s) => liveStatus(s, now) === "streaming");
  const visible = activity.filter((a) => !isFee(a));

  return (
    <Page>
    <div className="flex flex-col gap-6">
      <Enter className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[30px] font-semibold tracking-[-0.04em]">Cobros</h1>
          <span className="text-sm text-muted">{streams.length} {streams.length === 1 ? "acuerdo de servicio" : "acuerdos de servicio"} · ARGt</span>
        </div>
        {streaming && <LiveChip />}
      </Enter>

      {late.map(({ s, f }) => (
        <div key={s.id} role="alert" className="animate-enter flex items-start gap-2.5 rounded-2xl bg-danger-soft px-4 py-3 text-sm leading-snug text-danger">
          <InfoIcon className="mt-0.5" />
          <span><b className="font-semibold">{client(s)} está atrasado: te debe {money(f.debt)}.</b> Podés cobrar hasta lo fondeado.</span>
        </div>
      ))}

      {!stream ? (
        <Enter i={1} className="flex flex-col items-center gap-2 rounded-3xl border border-line bg-white py-20 text-center">
          <span className="text-[15px] font-medium">Todavía no tenés acuerdos de servicio.</span>
          <span className="text-sm text-muted">Cuando un cliente fondee el primer tramo, vas a ver acá lo que cobrás segundo a segundo.</span>
        </Enter>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_380px]">
          <div className="flex min-w-0 flex-col gap-5">
            <Hero streams={streams} now={now} />
            {streams.length > 1 && (
              <Enter i={2} as="section" className="overflow-hidden rounded-3xl border border-line bg-white">
                <div className="grid grid-cols-[1.6fr_1fr_auto] gap-4 border-b border-line-soft px-5 py-3 text-xs text-subtle">
                  <span>Servicio</span><span className="text-right">Devengado</span><span className="w-[104px]">Estado</span>
                </div>
                {[...streams].sort((a, b) => Number(!!a.canceledAt) - Number(!!b.canceledAt) || b.start - a.start).map((s, idx) => {
                  const on = s.id === stream.id;
                  return (
                    <button key={s.id} type="button" aria-pressed={on} onClick={() => setSelected(s.id)} style={{ "--i": 3 + idx } as React.CSSProperties}
                      className={`animate-enter grid w-full grid-cols-[1.6fr_1fr_auto] items-center gap-4 border-b border-line-soft px-5 py-3.5 text-left transition-colors duration-300 last:border-0 ${on ? "bg-[#F4F8FC]" : "hover:bg-page"}`}>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium">{serviceName(s)}</span>
                        <span className="truncate text-xs text-subtle">{client(s)}</span>
                      </span>
                      <span className="tnum text-right text-sm font-semibold">{money(liveVested(s, now))}</span>
                      <span className="w-[104px]"><FundingPill state={fundingView(s, now).state} /></span>
                    </button>
                  );
                })}
              </Enter>
            )}
            {visible.length > 0 && (
              <Enter i={4} as="section" className="flex flex-col rounded-3xl border border-line bg-white px-5 pb-2 pt-4">
                <div className="mb-1 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Últimos movimientos</h2>
                  <Link href="/worker/actividad" transitionTypes={["tab"]} className="flex min-h-8 items-center text-[13px] text-celeste-ink">Ver todo</Link>
                </div>
                {visible.slice(0, 4).map((a, idx) => (
                  <ActivityRow key={a.id} i={6 + idx} activity={a} payerName={nameOf(users, streams.find((s) => s.id === a.streamId)?.payerId ?? "")} showHash />
                ))}
              </Enter>
            )}
          </div>
          <div className="flex flex-col gap-4 lg:sticky lg:top-24">
            <AgreementCard key={stream.id} stream={stream} client={client(stream)} now={now} />
            <CollectButton streams={streams} now={now} />
          </div>
        </div>
      )}
    </div>
    </Page>
  );
}

function Hero({ streams, now }: { streams: StreamView[]; now: number }) {
  const intro = useIntro();
  // The hero adds up every agreement: a new one must never hide money already earned.
  const available = totalAvailable(streams, now) * intro;
  const rate = totalRate(streams, now);
  const parts = liveParts(available);
  const subCent = rate > 0 && Math.abs(rate * 100 - Math.round(rate * 100)) > 1e-6;
  const active = streams.filter((s) => Number(s.deposited) - Number(s.withdrawn) > 0).length;

  return (
    <Enter i={1} as="section" className="flex flex-col gap-2.5 rounded-3xl border border-line bg-white p-6">
      <span className="text-sm text-muted">Lo que ya cobraste de tus servicios, segundo a segundo</span>
      <div className="tnum flex items-baseline whitespace-nowrap tracking-[-0.045em]" aria-live="off">
        <span className="mr-1.5 text-[30px] text-subtle">$</span>
        <span className="text-[clamp(44px,6vw,64px)] font-medium leading-none">{parts.int}</span>
        <span className="text-[30px] font-medium">,{parts.cents}</span>
        {subCent && <span className="ml-0.5 text-base font-medium tracking-normal text-subtle">{parts.micro}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-ink-2">
        <span>Disponible para cobrar{active > 1 ? ` · ${active} acuerdos` : ""}</span>
        {rate > 0 && <>
          <span className="text-subtle">·</span>
          <span className="tnum text-muted">+{money(rate * 3600)}/h</span>
        </>}
      </div>
    </Enter>
  );
}

function AgreementCard({ stream, client, now }: { stream: StreamView; client: string; now: number }) {
  const total = Number(stream.totalAmount);
  const deposited = Number(stream.deposited);
  const vested = liveVested(stream, now);
  const status = liveStatus(stream, now);
  const funding = fundingView(stream, now);
  const span = stream.end - stream.start;
  const capped = status === "streaming" && vested >= deposited;

  return (
    <Enter i={3} as="section" className="flex flex-col gap-3.5 rounded-3xl border border-line bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[15px] font-semibold tracking-[-0.01em]">{serviceName(stream)}</span>
          <span className="truncate text-[13px] text-muted">{client}</span>
        </span>
        <FundingPill state={funding.state} />
      </div>
      <StreamLine earned={vested / total} funded={deposited / total} live={status === "streaming"} />
      <div className="flex justify-between text-xs text-subtle">
        <span>{when(stream.start, span)}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-2.5 rounded bg-celeste/35" />fondeado</span>
        <span>{when(stream.end, span)}</span>
      </div>
      {capped && (
        <p className="flex items-start gap-2 rounded-xl bg-surface px-3 py-2.5 text-[13px] leading-snug text-ink-2">
          <InfoIcon className="mt-0.5" />
          Llegaste a lo fondeado. El resto se libera cuando {client} fondee el próximo tramo.
        </p>
      )}
      <div className="h-px bg-track" />
      <dl className="grid grid-cols-3 gap-2">
        {[["Devengado", vested], ["Fondeado", deposited], ["Cobrado", Number(stream.withdrawn)]].map(([k, v]) => (
          <div key={k as string} className="flex flex-col gap-0.5">
            <dt className="text-xs text-subtle">{k}</dt>
            <dd className="tnum text-[15px] font-semibold tracking-[-0.01em]">{money(v as number)}</dd>
          </div>
        ))}
      </dl>
      <p className="text-[13px] text-muted">
        {funding.state === "cancelado" ? "Acuerdo cancelado."
          : funding.fundedUntil === null ? "Fondeado completo."
          : <>Fondeado hasta <b className="tnum font-semibold text-ink">{when(funding.fundedUntil, span)}</b></>}
      </p>
    </Enter>
  );
}

function CollectButton({ streams, now }: { streams: StreamView[]; now: number }) {
  const intro = useIntro();
  const withdrawable = totalWithdrawable(streams, now);
  const off = withdrawable < 1 && intro === 1;
  return (
    <Link href="/worker/retirar" transitionTypes={["nav-forward"]} aria-disabled={off}
      className={`${buttonStyles.primary} ${off ? "pointer-events-none bg-track text-subtle" : ""}`}>
      Cobrar ahora <Icon name="arrow" />
    </Link>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-16 w-72 rounded-2xl" />
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    </div>
  );
}
