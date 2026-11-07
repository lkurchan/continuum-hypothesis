"use client";

import { useState } from "react";
import { liveVested, money } from "@/components/ui/format";
import { useNow } from "@/components/ui/hooks";
import { ErrorNote } from "@/components/ui/kit";
import { Enter, Page, Segmented, useIntro } from "@/components/ui/motion";
import { ActivityRow, describe } from "@/components/worker/ActivityRow";
import { nameOf, useWorker } from "@/components/worker/WorkerContext";
import type { Activity } from "@/lib/domain/types";

type Filter = "all" | "out" | "in";

const dayTitle = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Hoy";
  if (d.toDateString() === new Date(today.getTime() - 86_400_000).toDateString()) return "Ayer";
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long" }).format(d);
};

export default function ActivityPage() {
  const { users, streams, activity, error } = useWorker();
  const now = useNow(1000);
  const [filter, setFilter] = useState<Filter>("all");
  const intro = useIntro();

  const payerOf = (a: Activity) => nameOf(users, streams?.find((s) => s.id === a.streamId)?.payerId ?? "");
  const earned = (streams ?? []).reduce((sum, s) => sum + liveVested(s, now), 0);
  const withdrawn = (streams ?? []).reduce((sum, s) => sum + Number(s.withdrawn), 0);

  const visible = activity.filter((a) => {
    const dir = describe(a, "").direction;
    return filter === "all" || (filter === "out" ? dir === "out" : dir !== "out");
  });
  const groups = visible.reduce<{ title: string; items: Activity[] }[]>((acc, a) => {
    const title = dayTitle(a.createdAt);
    const last = acc.at(-1);
    if (last?.title === title) last.items.push(a); else acc.push({ title, items: [a] });
    return acc;
  }, []);

  return (
    <Page>
    <div className="flex flex-col gap-[18px] pb-6">
      <Enter as="header" className="flex h-11 items-center justify-between">
        <h1 className="text-[28px] font-semibold tracking-[-0.035em]">Actividad</h1>
        <span className="text-[13px] text-muted">Arbitrum One</span>
      </Enter>

      <Enter i={1} as="section" className="grid grid-cols-2 gap-2.5">
        {[["Ganado", earned], ["Retirado", withdrawn]].map(([k, v]) => (
          <div key={k as string} className="flex flex-col gap-1 rounded-[18px] bg-surface px-4 py-3.5">
            <span className="text-xs text-muted">{k}</span>
            <span className="tnum text-xl font-semibold tracking-[-0.02em]">{money((v as number) * intro)}</span>
          </div>
        ))}
      </Enter>

      <Enter i={2}>
        <Segmented label="Filtrar movimientos" value={filter} onChange={setFilter}
          options={[{ value: "all", label: "Todo" }, { value: "out", label: "Retiros" }, { value: "in", label: "Ingresos" }]} />
      </Enter>

      {error && <ErrorNote>{error}</ErrorNote>}
      {groups.length === 0 && !error && <p className="py-16 text-center text-sm text-muted">Sin movimientos.</p>}
      {groups.map((g, gi) => (
        <section key={`${filter}-${g.title}`} className="flex flex-col">
          <h2 className="mb-1 text-[13px] font-medium text-muted">{g.title}</h2>
          {g.items.map((a, idx) => <ActivityRow key={a.id} i={3 + gi + idx} activity={a} payerName={payerOf(a)} showHash />)}
        </section>
      ))}
    </div>
    </Page>
  );
}
