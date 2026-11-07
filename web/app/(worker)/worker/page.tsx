"use client";

import Link from "next/link";
import { useState } from "react";
import { fundingView, isFee } from "@/components/ui/agreement";
import { clock, dateLabel, liveParts, liveStatus, liveVested, money } from "@/components/ui/format";
import { useNow } from "@/components/ui/hooks";
import { Avatar, ErrorNote, FundingPill, Icon, InfoIcon, LiveChip, Skeleton, StreamLine, buttonStyles } from "@/components/ui/kit";
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
    <div className="flex flex-col pb-6">
      <Enter as="header" className="flex h-11 items-center justify-between gap-3">
        <Link href="/" aria-label="Cambiar de usuario" className="flex min-w-0 items-center gap-3">
          <Avatar name={user.name} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] font-semibold tracking-[-0.01em]">{user.name}</span>
            <span className="text-[13px] text-muted">Proveedor</span>
          </span>
        </Link>
        {streaming && <LiveChip />}
      </Enter>

      {late.map(({ s, f }) => (
        <div key={s.id} role="alert" className="animate-enter mt-5 flex items-start gap-2.5 rounded-[14px] bg-danger-soft px-3.5 py-3 text-[13px] leading-snug text-danger">
          <InfoIcon className="mt-0.5" />
          <span><b className="font-semibold">{client(s)} está atrasado: te debe {money(f.debt)}.</b> Podés cobrar hasta lo fondeado.</span>
        </div>
      ))}

      {!stream ? (
        <Enter i={1} as="p" className="mt-24 text-center text-[15px] text-muted">Todavía no tenés acuerdos de servicio.</Enter>
      ) : (
        <>
          <Hero streams={streams} now={now} />
          {streams.length > 1 && (
            <Enter i={2} as="section" className="mt-7 flex flex-col">
              <h2 className="mb-1 text-sm font-semibold">Tus acuerdos</h2>
              {[...streams].sort((a, b) => Number(!!a.canceledAt) - Number(!!b.canceledAt) || b.start - a.start).map((s) => {
                const on = s.id === stream.id;
                return (
                  <button key={s.id} type="button" aria-pressed={on} onClick={() => setSelected(s.id)}
                    className={`-mx-2 flex min-h-[58px] items-center gap-3 rounded-xl px-2 text-left transition-colors duration-300 ${on ? "bg-surface" : "hover:bg-page"}`}>
                    <span className="flex min-w-0 grow flex-col">
                      <span className="truncate text-sm font-medium">{serviceName(s)}</span>
                      <span className="truncate text-xs text-subtle">{client(s)}</span>
                    </span>
                    <span className="tnum text-sm font-semibold">{money(liveVested(s, now))}</span>
                    <FundingPill state={fundingView(s, now).state} />
                  </button>
                );
              })}
            </Enter>
          )}
          <AgreementCard key={stream.id} stream={stream} client={client(stream)} now={now} />
          <Enter i={4} className="mt-5 flex flex-col">
            <CollectButton streams={streams} now={now} />
          </Enter>
        </>
      )}

      {visible.length > 0 && (
        <Enter i={5} as="section" className="mt-7 flex flex-col">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Últimos movimientos</h2>
            <Link href="/worker/actividad" transitionTypes={["tab"]} className="flex min-h-8 items-center text-[13px] text-celeste-ink">Ver todo</Link>
          </div>
          {visible.slice(0, 3).map((a, idx) => (
            <ActivityRow key={a.id} i={6 + idx} activity={a} payerName={nameOf(users, streams.find((s) => s.id === a.streamId)?.payerId ?? "")} />
          ))}
        </Enter>
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
    <Enter i={1} as="section" className="mt-9 flex flex-col gap-2.5">
      <span className="text-sm text-muted">Lo que ya cobraste de tus servicios, segundo a segundo</span>
      <div className="tnum flex items-baseline whitespace-nowrap tracking-[-0.045em]" aria-live="off">
        <span className="mr-1.5 text-[30px] text-subtle">$</span>
        <span className="text-[clamp(44px,15vw,58px)] font-medium leading-none">{parts.int}</span>
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
    <Enter i={3} as="section" className="mt-7 flex flex-col gap-3.5 rounded-[22px] border border-line p-[18px] pb-4">
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
    <div className="flex flex-col gap-4 pt-1">
      <Skeleton className="h-11 w-40 rounded-full" />
      <Skeleton className="mt-8 h-4 w-36 rounded" />
      <Skeleton className="h-14 w-64 rounded-xl" />
      <Skeleton className="mt-6 h-48 rounded-[22px]" />
    </div>
  );
}
