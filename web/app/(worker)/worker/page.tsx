"use client";

import Link from "next/link";
import { clock, dateLabel, liveAvailable, liveParts, liveStatus, liveVested, money, ratePerSecond } from "@/components/ui/format";
import { useNow } from "@/components/ui/hooks";
import { Avatar, ErrorNote, Icon, InfoIcon, LiveChip, StatusPill, StreamLine, buttonStyles } from "@/components/ui/kit";
import { ActivityRow } from "@/components/worker/ActivityRow";
import { nameOf, primaryStream, useWorker } from "@/components/worker/WorkerContext";

export default function WorkerHome() {
  const { user, users, streams, activity, error } = useWorker();
  const now = useNow(100);

  if (error) return <div className="pt-10"><ErrorNote>{error}</ErrorNote></div>;
  if (!user || !streams) return <HomeSkeleton />;

  const first = user.name.split(" ")[0];
  const stream = primaryStream(streams, now);

  return (
    <div className="flex flex-col pb-6">
      <header className="flex h-11 items-center justify-between">
        <Link href="/" aria-label="Cambiar de usuario" className="flex items-center gap-3">
          <Avatar name={user.name} />
          <span className="flex flex-col">
            <span className="text-[15px] font-semibold tracking-[-0.01em]">Hola, {first}</span>
            {stream?.label && <span className="text-[13px] text-muted">{stream.label}</span>}
          </span>
        </Link>
        {stream && liveStatus(stream, now) === "streaming" ? <LiveChip /> : stream && <StatusPill status={liveStatus(stream, now)} />}
      </header>

      {!stream ? (
        <p className="mt-24 text-center text-[15px] text-muted">Todavía no tenés pagos en curso.</p>
      ) : (
        <StreamSummary stream={stream} now={now} />
      )}

      {activity.length > 0 && (
        <section aria-label="Últimos movimientos" className="mt-7 flex flex-col">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Últimos movimientos</h2>
            <Link href="/worker/actividad" className="flex min-h-8 items-center text-[13px] text-celeste-ink">Ver todo</Link>
          </div>
          {activity.slice(0, 3).map((a) => (
            <ActivityRow key={a.id} activity={a} payerName={nameOf(users, streams.find((s) => s.id === a.streamId)?.payerId ?? "")} />
          ))}
        </section>
      )}
    </div>
  );
}

function StreamSummary({ stream, now }: { stream: NonNullable<ReturnType<typeof primaryStream>>; now: number }) {
  const available = liveAvailable(stream, now);
  const vested = liveVested(stream, now);
  const total = Number(stream.totalAmount);
  const deposited = Number(stream.deposited);
  const status = liveStatus(stream, now);
  const rate = status === "streaming" ? ratePerSecond(stream) : 0;
  const parts = liveParts(available);
  const capped = status === "streaming" && vested >= deposited;
  const span = stream.end - stream.start;
  const elapsed = Math.min(Math.max((stream.canceledAt ?? now) - stream.start, 0), span);
  const short = span < 86_400;
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <>
      <section aria-label="Saldo disponible" className="mt-10 flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Disponible para retirar</span>
          <span className="rounded-md border border-line px-[7px] py-[3px] text-[11px] font-semibold tracking-[0.04em] text-ink-2">ARGt</span>
        </div>
        <div className="tnum flex items-baseline whitespace-nowrap tracking-[-0.045em]" aria-live="off">
          <span className="mr-1.5 text-[30px] text-faint">$</span>
          <span className="text-[clamp(44px,15vw,58px)] font-medium leading-none">{parts.int}</span>
          <span className="text-[30px] font-medium">,{parts.cents}</span>
          {rate > 0 && <span className="ml-0.5 text-base font-medium tracking-normal text-faint">{parts.micro}</span>}
        </div>
        {rate > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-ink-2">
            <Icon name="out" size={16} className="text-celeste" strokeWidth={2.2} />
            <span className="tnum">+ {money(rate, rate < 1 ? 4 : 2)} por segundo</span>
            <span className="text-faint">·</span>
            <span className="tnum text-muted">{money(rate * 3600)} por hora</span>
          </div>
        )}
      </section>

      {capped && (
        <div role="status" className="mt-4 flex items-start gap-2.5 rounded-[14px] bg-surface px-3.5 py-3 text-[13px] leading-snug text-ink-2">
          <InfoIcon className="mt-0.5" />
          <span>Llegaste a lo fondeado ({money(deposited)}). Lo demás se libera cuando la plataforma recargue.</span>
        </div>
      )}

      <section aria-label="Período" className="mt-7 flex flex-col gap-3.5 rounded-[22px] border border-line p-[18px] pb-4">
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
      </section>

      <Link href="/worker/retirar" aria-disabled={available < 1}
        className={`${buttonStyles.primary} mt-5 ${available < 1 ? "pointer-events-none bg-track text-subtle" : ""}`}>
        Retirar <Icon name="arrow" />
      </Link>
    </>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4 pt-1">
      <div className="h-11 w-40 rounded-full bg-page" />
      <div className="mt-8 h-4 w-36 rounded bg-page" />
      <div className="h-14 w-64 rounded-xl bg-page" />
      <div className="mt-6 h-48 rounded-[22px] bg-page" />
    </div>
  );
}
