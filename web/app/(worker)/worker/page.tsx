"use client";

import Link from "next/link";
import { clock, dateLabel, liveParts, liveStatus, liveVested, money } from "@/components/ui/format";
import { useNow } from "@/components/ui/hooks";
import { Avatar, ErrorNote, Icon, InfoIcon, LiveChip, Skeleton, StatusPill, StreamLine, buttonStyles } from "@/components/ui/kit";
import { Enter, Page, useIntro } from "@/components/ui/motion";
import { ActivityRow } from "@/components/worker/ActivityRow";
import { nameOf, primaryStream, useWorker } from "@/components/worker/WorkerContext";
import { totalAvailable, totalRate, totalWithdrawable } from "@/components/worker/split";
import type { StreamView } from "@/lib/domain/types";

export default function WorkerHome() {
  const { user, users, streams, activity, error } = useWorker();
  const now = useNow(100);

  if (error) return <Page><div className="pt-10"><ErrorNote>{error}</ErrorNote></div></Page>;
  if (!user || !streams) return <Page><HomeSkeleton /></Page>;

  const first = user.name.split(" ")[0];
  const stream = primaryStream(streams, now);

  return (
    <Page>
    <div className="flex flex-col pb-6">
      <Enter as="header" className="flex h-11 items-center justify-between">
        <Link href="/" aria-label="Cambiar de usuario" className="flex items-center gap-3">
          <Avatar name={user.name} />
          <span className="flex flex-col">
            <span className="text-[15px] font-semibold tracking-[-0.01em]">Hola, {first}</span>
            {stream?.label && <span className="text-[13px] text-muted">{stream.label}</span>}
          </span>
        </Link>
        {stream && liveStatus(stream, now) === "streaming" ? <LiveChip /> : stream && <StatusPill status={liveStatus(stream, now)} />}
      </Enter>

      {!stream ? (
        <Enter i={1} as="p" className="mt-24 text-center text-[15px] text-muted">Todavía no tenés pagos en curso.</Enter>
      ) : (
        <StreamSummary stream={stream} streams={streams} now={now} />
      )}

      {activity.length > 0 && (
        <Enter i={5} as="section" className="mt-7 flex flex-col">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Últimos movimientos</h2>
            <Link href="/worker/actividad" transitionTypes={["tab"]} className="flex min-h-8 items-center text-[13px] text-celeste-ink">Ver todo</Link>
          </div>
          {activity.slice(0, 3).map((a, idx) => (
            <ActivityRow key={a.id} i={6 + idx} activity={a} payerName={nameOf(users, streams.find((s) => s.id === a.streamId)?.payerId ?? "")} />
          ))}
        </Enter>
      )}
    </div>
    </Page>
  );
}

function StreamSummary({ stream, streams, now }: { stream: StreamView; streams: StreamView[]; now: number }) {
  const intro = useIntro();
  // The hero adds up every stream: a new batch must never hide money already earned.
  const available = totalAvailable(streams, now) * intro;
  const withdrawable = totalWithdrawable(streams, now);
  const funding = streams.filter((s) => Number(s.deposited) - Number(s.withdrawn) > 0).length;
  const vested = liveVested(stream, now);
  const total = Number(stream.totalAmount);
  const deposited = Number(stream.deposited);
  const status = liveStatus(stream, now);
  const rate = totalRate(streams, now);
  const parts = liveParts(available);
  // The extra digits only move when the rate has sub-cent precision; otherwise they sit at "00".
  const subCent = rate > 0 && Math.abs(rate * 100 - Math.round(rate * 100)) > 1e-6;
  const capped = status === "streaming" && vested >= deposited;
  const span = stream.end - stream.start;
  const elapsed = Math.min(Math.max((stream.canceledAt ?? now) - stream.start, 0), span);
  const short = span < 86_400;
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <>
      <Enter i={1} as="section" className="mt-10 flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Disponible para retirar{funding > 1 ? ` · ${funding} pagos` : ""}</span>
          <span className="rounded-md border border-line px-[7px] py-[3px] text-[11px] font-semibold tracking-[0.04em] text-ink-2">ARGt</span>
        </div>
        <div className="tnum flex items-baseline whitespace-nowrap tracking-[-0.045em]" aria-live="off">
          <span className="mr-1.5 text-[30px] text-subtle">$</span>
          <span className="text-[clamp(44px,15vw,58px)] font-medium leading-none">{parts.int}</span>
          <span className="text-[30px] font-medium">,{parts.cents}</span>
          {subCent && <span className="ml-0.5 text-base font-medium tracking-normal text-subtle">{parts.micro}</span>}
        </div>
        {rate > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-ink-2">
            <span className="tnum">{money(rate, rate < 1 ? 4 : 2)} por segundo trabajado</span>
            <span className="text-subtle">·</span>
            <span className="tnum whitespace-nowrap text-muted">{money(rate * 3600)}/h</span>
          </div>
        )}
      </Enter>

      {capped && (
        <div role="status" className="animate-enter mt-4 flex items-start gap-2.5 rounded-[14px] bg-surface px-3.5 py-3 text-[13px] leading-snug text-ink-2">
          <InfoIcon className="mt-0.5" />
          <span>Llegaste a lo fondeado ({money(deposited)}). Lo demás se libera cuando la plataforma recargue.</span>
        </div>
      )}

      <Enter i={2} as="section" className="mt-7 flex flex-col gap-3.5 rounded-[22px] border border-line p-[18px] pb-4">
        <div className="flex items-baseline justify-between">
          <span className="tnum text-[15px] font-semibold tracking-[-0.01em]">
            {short ? `${mmss(elapsed)} de ${mmss(span)}` : `Día ${Math.min(Math.floor(elapsed / 86_400) + 1, Math.ceil(span / 86_400))} de ${Math.ceil(span / 86_400)}`}
          </span>
          <span className="tnum text-[13px] text-muted">{((elapsed / span) * 100).toFixed(1).replace(".", ",")} %</span>
        </div>
        <StreamLine earned={vested / total} funded={deposited / total} live={status === "streaming"} />
        <div className="flex justify-between text-xs text-subtle">
          <span>{short ? clock(stream.start) : dateLabel(stream.start)}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-2.5 rounded bg-celeste/35" />fondeado</span>
          <span>{short ? clock(stream.end) : dateLabel(stream.end)}</span>
        </div>
        <div className="h-px bg-track" />
        <dl className="grid grid-cols-3 gap-2">
          {[["Ganado", vested], ["Fondeado", deposited], ["Retirado", Number(stream.withdrawn)]].map(([k, v]) => (
            <div key={k as string} className="flex flex-col gap-0.5">
              <dt className="text-xs text-subtle">{k}</dt>
              <dd className="tnum text-[15px] font-semibold tracking-[-0.01em]">{money(v as number)}</dd>
            </div>
          ))}
        </dl>
      </Enter>

      <Enter i={3} className="mt-5 flex flex-col">
        <Link href="/worker/retirar" transitionTypes={["nav-forward"]} aria-disabled={withdrawable < 1 && intro === 1}
          className={`${buttonStyles.primary} ${withdrawable < 1 && intro === 1 ? "pointer-events-none bg-track text-subtle" : ""}`}>
          Retirar <Icon name="arrow" />
        </Link>
      </Enter>
    </>
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
