"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/kit";
import { useWorker } from "@/components/worker/WorkerContext";

type Message = { role: "user" | "assistant"; content: string };

const suggestions = [
  "¿Cuánto puedo retirar hoy?",
  "¿Cuánto voy a tener a fin de mes?",
  "Armame un presupuesto: alquiler $180.000 el 5, monotributo $30.000",
];

export default function CopilotPage() {
  const { user } = useWorker();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy || !user) return;
    const history: Message[] = [...messages, { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setDraft("");
    setBusy(true);
    const write = (reply: string) => setMessages([...history, { role: "assistant", content: reply }]);
    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, messages: history.filter((m) => m.content) }),
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        write((data as { error?: string }).error ?? "No pude responder ahora.");
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        write(reply);
      }
    } catch {
      write("No pude conectarme. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-0 grow flex-col">
      <header className="flex h-11 shrink-0 items-center gap-2.5">
        <h1 className="text-[28px] font-semibold tracking-[-0.035em]">Copiloto</h1>
        <span className="rounded-md border border-line px-[7px] py-[3px] text-[11px] font-semibold tracking-[0.04em] text-ink-2">BETA</span>
      </header>

      <div className="flex grow flex-col gap-3 py-5">
        {messages.length === 0 ? (
          <div className="flex grow flex-col justify-end gap-3">
            <Bubble role="assistant">Hola{user ? `, ${user.name.split(" ")[0]}` : ""}. Te ayudo a organizar lo que vas ganando. ¿Qué querés saber?</Bubble>
            <div className="flex flex-col items-start gap-2 pl-[38px]">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => send(s)}
                  className="rounded-2xl border border-line px-3.5 py-2 text-left text-[13px] text-ink-2 transition hover:bg-page">
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
        className="sticky bottom-[84px] mb-3 flex h-[52px] shrink-0 items-center gap-2 rounded-2xl border border-line bg-white pl-4 pr-1.5 focus-within:border-ink">
        <label htmlFor="ask" className="sr-only">Preguntale algo al copiloto</label>
        <input id="ask" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Preguntá sobre tu plata…"
          autoComplete="off" maxLength={1000} className="min-w-0 grow bg-transparent text-[15px] outline-none placeholder:text-subtle" />
        <button type="submit" aria-label="Enviar" disabled={busy || !draft.trim()}
          className="flex size-10 items-center justify-center rounded-xl bg-ink text-white transition disabled:bg-track disabled:text-subtle">
          <Icon name="send" />
        </button>
      </form>
    </div>
  );
}

function Bubble({ role, children }: { role: Message["role"]; children: React.ReactNode }) {
  if (role === "user") {
    return <p className="ml-10 self-end whitespace-pre-wrap rounded-[18px_18px_4px_18px] bg-ink px-3.5 py-2.5 text-sm leading-normal text-white">{children}</p>;
  }
  return (
    <div className="mr-6 flex items-start gap-2.5">
      <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-ink">
        <svg width="16" height="16" viewBox="0 0 28 28"><path d="M6 14h9.5" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" /><circle cx="20" cy="14" r="3" fill="#6CB4EE" /></svg>
      </span>
      <div className="tnum whitespace-pre-wrap rounded-[4px_18px_18px_18px] bg-surface px-3.5 py-2.5 text-sm leading-normal text-[#1F1F23]">{children}</div>
    </div>
  );
}

function Typing() {
  return (
    <span className="inline-flex gap-1 py-1" aria-label="Escribiendo">
      {[0, 1, 2].map((i) => <span key={i} className="size-1.5 animate-pulse rounded-full bg-subtle" style={{ animationDelay: `${i * 150}ms` }} />)}
    </span>
  );
}
