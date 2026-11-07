"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/components/ui/api";
import { rememberUser } from "@/components/ui/hooks";
import { Avatar, ErrorNote, Icon, Logo, NetworkChip } from "@/components/ui/kit";
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
    router.push(user.role === "payer" ? "/payer" : "/worker");
  };

  const ordered = users ? [...users].sort((a, b) => (a.role === b.role ? 0 : a.role === "worker" ? -1 : 1)) : [];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-7">
      <header className="flex items-center justify-between">
        <Logo />
        <NetworkChip />
      </header>

      <section className="flex grow flex-col justify-center gap-7 py-10">
        <h1 className="text-[44px] font-medium leading-[1.02] tracking-[-0.045em]">
          Cobrá lo que trabajás, segundo a segundo.
        </h1>
        <div aria-hidden="true" className="relative flex h-3 items-center">
          <div className="absolute inset-x-0 h-0.5 rounded bg-track" />
          <div className="relative flex h-0.5 items-center justify-end rounded bg-ink animate-flow" style={{ width: "40%" }}>
            <span className="-mr-[5px] size-2.5 rounded-full border-2 border-white bg-celeste animate-pulse-dot box-content" />
          </div>
        </div>
        <p className="text-base leading-normal text-muted">
          Pesos onchain (ARGt) que se liberan en tiempo real. Retirás lo que ya ganaste, cuando quieras.
        </p>
      </section>

      <nav aria-label="Entrar como usuario demo" className="flex flex-col gap-2.5">
        <span className="pl-1 text-[13px] text-muted">Entrar como</span>
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="flex flex-col overflow-hidden rounded-[20px] border border-line">
          {!users && !error && [0, 1, 2].map((i) => <div key={i} className="h-[68px] animate-pulse border-b border-line-soft bg-page/60 last:border-0" />)}
          {ordered.map((u, i) => (
            <button key={u.id} type="button" onClick={() => enter(u)}
              className={`flex min-h-[68px] items-center gap-3.5 px-4 text-left transition-colors hover:bg-page ${i ? "border-t border-line-soft" : ""}`}>
              {u.role === "payer"
                ? <span className="flex size-10 items-center justify-center rounded-xl bg-ink text-white"><Icon name="building" /></span>
                : <Avatar name={u.name} tone={i === 0 ? "celeste" : "neutral"} />}
              <span className="flex grow flex-col gap-0.5">
                <span className="text-base font-medium">{u.name}</span>
                <span className="text-[13px] text-muted">{u.role === "payer" ? "Pagador" : "Trabajador"}</span>
              </span>
              <Icon name="chevron" className="text-faint" />
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-subtle">ARGt es un medio de pago, sin rendimiento.</p>
      </nav>
    </main>
  );
}
