"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/kit";
import { Enter, Page } from "@/components/ui/motion";
import { useWorker } from "@/components/worker/WorkerContext";
import { Bubble, Typing, useChat } from "@/components/ui/chat";

const suggestions = [
  "¿Cuánto puedo cobrar hoy?",
  "¿Algún cliente está atrasado?",
  "¿Hasta cuándo tengo cubierto cada servicio?",
];

export default function CopilotPage() {
  const { user } = useWorker();
  const { messages, busy, send: ask } = useChat(user?.id);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages]);

  const send = (text: string) => { if (!busy) setDraft(""); void ask(text); };

  return (
    <Page>
    <div className="mx-auto flex min-h-[calc(100dvh-160px)] w-full max-w-[760px] grow flex-col rounded-3xl border border-line bg-white px-6 pt-6">
      <header className="flex h-11 shrink-0 items-center gap-2.5">
        <Enter><h1 className="text-[28px] font-semibold tracking-[-0.035em]">Copiloto</h1></Enter>
        <span className="rounded-md border border-line px-[7px] py-[3px] text-[11px] font-semibold tracking-[0.04em] text-ink-2">BETA</span>
      </header>

      <div className="flex grow flex-col gap-3 py-5">
        {messages.length === 0 ? (
          <div className="flex grow flex-col justify-end gap-3">
            <Bubble role="assistant" i={1}>Hola{user ? `, ${user.name}` : ""}. Te ayudo a seguir lo que cobrás de cada servicio y cómo vienen fondeando tus clientes. ¿Qué querés saber?</Bubble>
            <div className="flex flex-col items-start gap-2 pl-[38px]">
              {suggestions.map((s, idx) => (
                <button key={s} type="button" onClick={() => send(s)} style={{ "--i": 3 + idx } as React.CSSProperties}
                  className="animate-enter rounded-2xl border border-line px-3.5 py-2 text-left text-[13px] text-ink-2 transition-[background-color,transform] duration-300 hover:bg-page active:scale-[.97]">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => <Bubble key={i} role={m.role}>{m.content || <Typing />}</Bubble>)
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void send(draft); }}
        className="sticky bottom-4 mb-6 flex h-[52px] shrink-0 items-center gap-2 rounded-2xl border border-line bg-white pl-4 pr-1.5 focus-within:border-ink">
        <label htmlFor="ask" className="sr-only">Preguntale algo al copiloto</label>
        <input id="ask" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Preguntá sobre tu plata…"
          autoComplete="off" maxLength={1000} className="min-w-0 grow bg-transparent text-[15px] outline-none placeholder:text-subtle" />
        <button type="submit" aria-label="Enviar" disabled={busy || !draft.trim()}
          className="flex size-10 items-center justify-center rounded-xl bg-ink text-white transition disabled:bg-track disabled:text-subtle">
          <Icon name="send" />
        </button>
      </form>
    </div>
    </Page>
  );
}
