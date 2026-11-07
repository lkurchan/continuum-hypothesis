"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/components/ui/api";
import { rememberUser } from "@/components/ui/hooks";
import { Avatar, ErrorNote, Icon, Logo, NetworkChip, Skeleton } from "@/components/ui/kit";
import { Enter } from "@/components/ui/motion";
import type { DemoUser } from "@/lib/domain/types";

export default function EntryPage() {
  const router = useRouter();
  const [users, setUsers] = useState<DemoUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.users().then(setUsers).catch((e: Error) => setError(e.message));
  }, []);

  const enter = (user: DemoUser) => {
    rememberUser(user);
    router.push("/demo");
  };

  const ordered = users ? [...users].sort((a, b) => (a.role === b.role ? 0 : a.role === "worker" ? -1 : 1)) : [];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[1100px] flex-col px-6 pb-10 pt-7">
      <header className="animate-enter flex items-center justify-between">
        <Logo />
        <NetworkChip />
      </header>

      <div className="grid grow items-center gap-12 py-12 lg:grid-cols-[1.15fr_1fr]">
      <section className="flex flex-col gap-7">
        <Enter i={1}>
          <h1 className="text-[clamp(40px,5vw,60px)] font-medium leading-[1.02] tracking-[-0.045em]">
            Tus servicios se cobran segundo a segundo.
          </h1>
        </Enter>
        <div aria-hidden="true" className="animate-enter relative flex h-3 items-center" style={{ "--i": 3 } as React.CSSProperties}>
          <div className="absolute inset-x-0 h-0.5 rounded bg-track" />
          <div className="relative flex h-0.5 items-center justify-end rounded bg-ink animate-flow" style={{ width: "40%" }}>
            <span className="-mr-[5px] size-2.5 rounded-full border-2 border-white bg-celeste animate-pulse-dot box-content" />
          </div>
        </div>
        <Enter i={4} as="p" className="text-base leading-normal text-muted">
          Acuerdos de servicio entre empresas, pagados de forma continua en pesos onchain (ARGt). El cliente paga menos que a 60 días y fondea por tramos; la PyME cobra lo devengado cuando quiere. El precio queda fijo en la blockchain.
        </Enter>
      </section>

      <nav aria-label="Entrar como usuario demo" className="animate-enter flex flex-col gap-2.5" style={{ "--i": 6 } as React.CSSProperties}>
        <span className="pl-1 text-[13px] text-muted">Entrar como</span>
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="flex flex-col overflow-hidden rounded-[20px] border border-line">
          {!users && !error && [0, 1, 2].map((i) => <Skeleton key={i} className="h-[68px] border-b border-white last:border-0" />)}
          {ordered.map((u, i) => (
            <button key={u.id} type="button" onClick={() => enter(u)}
              style={{ "--i": 7 + i } as React.CSSProperties}
              className={`group animate-enter flex min-h-[68px] items-center gap-3.5 px-4 text-left transition-colors duration-200 hover:bg-page active:bg-surface ${i ? "border-t border-line-soft" : ""}`}>
              {u.role === "payer"
                ? <span className="flex size-10 items-center justify-center rounded-xl bg-ink text-white"><Icon name="building" /></span>
                : <Avatar name={u.name} tone={i === 0 ? "celeste" : "neutral"} />}
              <span className="flex grow flex-col gap-0.5">
                <span className="text-base font-medium">{u.name}</span>
                <span className="text-[13px] text-muted">Nodo Software SRL · cobrás y pagás</span>
              </span>
              <Icon name="chevron" className="text-faint transition-transform duration-500 ease-spring group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-subtle">ARGt es un medio de pago, sin rendimiento.</p>
      </nav>
      </div>
    </main>
  );
}
