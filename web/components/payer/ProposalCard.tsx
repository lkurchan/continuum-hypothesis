"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/components/ui/api";
import { durationLabel, money } from "@/components/ui/format";
import { Avatar, ErrorNote, Hash, Icon, buttonStyles } from "@/components/ui/kit";
import type { Proposal } from "@/lib/agent/proposal";
import { usePayer } from "./PayerContext";

/** The assistant only proposes; this card is the human confirmation that signs the transaction. */
export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const { user, refresh } = usePayer();
  const [state, setState] = useState<"open" | "busy" | "discarded" | { hash: string }>("open");
  const [error, setError] = useState<string | null>(null);
  const total = proposal.items.reduce((s, i) => s + Number(i.totalAmount), 0);
  const deposit = proposal.items.reduce((s, i) => s + Number(i.initialDeposit), 0);

  const confirm = async () => {
    if (!user || state !== "open") return;
    setState("busy");
    setError(null);
    try {
      const start = Math.floor(Date.now() / 1000);
      const items = proposal.items.map(({ workerId, totalAmount, initialDeposit }) => ({ workerId, totalAmount, initialDeposit }));
      const { txHash } = await api.create(user.id, items, start, start + proposal.period);
      setState({ hash: txHash });
      refresh();
    } catch (e) {
      setError((e as Error).message);
      setState("open");
    }
  };

  if (state === "discarded") return <p className="ml-[38px] text-[13px] text-subtle">Propuesta descartada.</p>;

  return (
    <section aria-label="Propuesta de acuerdo" className="animate-enter ml-[38px] flex max-w-[520px] flex-col gap-4 rounded-3xl border border-line bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{proposal.items.length === 1 ? "Nuevo acuerdo de servicio" : `${proposal.items.length} acuerdos de servicio`}</h2>
        <span className="text-[13px] text-muted">{durationLabel(proposal.period)}</span>
      </div>
      <ul className="flex flex-col">
        {proposal.items.map((i) => (
          <li key={i.workerId} className="tnum flex items-center gap-3 border-b border-line-soft py-2.5 last:border-0">
            <Avatar name={i.name} tone="neutral" />
            <span className="grow text-sm font-medium">{i.name}</span>
            <span className="flex flex-col items-end text-sm">
              <span className="font-medium">{money(i.totalAmount)}</span>
              <span className="text-[12px] text-muted">primer tramo {money(i.initialDeposit)}</span>
            </span>
          </li>
        ))}
      </ul>
      <dl className="tnum flex justify-between rounded-2xl bg-surface px-4 py-3 text-sm">
        <div><dt className="text-muted">Fondeás ahora</dt><dd className="text-lg font-semibold">{money(deposit)}</dd></div>
        <div className="text-right"><dt className="text-muted">Precio total</dt><dd className="text-lg font-semibold">{money(total)}</dd></div>
      </dl>

      {typeof state === "object" ? (
        <div role="status" className="animate-enter flex flex-col gap-3 rounded-2xl bg-celeste-soft p-4">
          <span className="flex items-center gap-2 text-sm font-semibold text-celeste-ink">
            <span className="animate-pop"><Icon name="check" size={16} /></span> {proposal.items.length === 1 ? "Acuerdo creado" : "Acuerdos creados"}
          </span>
          <Hash hash={state.hash} />
          <Link href="/payer" transitionTypes={["nav-back"]} className={buttonStyles.small}>Ver en el panel</Link>
        </div>
      ) : (
        <div className="flex gap-2">
          <button type="button" onClick={confirm} disabled={state === "busy"} className={`${buttonStyles.small} grow`}>
            {state === "busy" ? "Firmando en Arbitrum…" : "Confirmar y fondear"}
          </button>
          <button type="button" onClick={() => setState("discarded")} disabled={state === "busy"} className={buttonStyles.ghost}>Descartar</button>
        </div>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
    </section>
  );
}
