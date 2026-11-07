"use client";

import { useState } from "react";
import { PROPOSAL_SEPARATOR, type Proposal } from "@/lib/agent/proposal";

export type ChatMessage = { role: "user" | "assistant"; content: string; proposal?: Proposal };

/** Streams /api/agent/chat; a client reply may end with a proposal after PROPOSAL_SEPARATOR. */
export function useChat(userId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy || !userId) return;
    const history: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setBusy(true);
    const write = (reply: string) => {
      const [text, json] = reply.split(PROPOSAL_SEPARATOR);
      let proposal: Proposal | undefined;
      try { proposal = json ? JSON.parse(json) : undefined; } catch { /* still streaming */ }
      setMessages([...history, { role: "assistant", content: text, proposal }]);
    };
    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, messages: history.filter((m) => m.content).map(({ role, content }) => ({ role, content })) }),
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

  return { messages, busy, send };
}

export function Bubble({ role, children, i = 0 }: { role: ChatMessage["role"]; children: React.ReactNode; i?: number }) {
  if (role === "user") {
    return <p className="animate-enter ml-10 max-w-[560px] origin-bottom-right self-end whitespace-pre-wrap rounded-[18px_18px_4px_18px] bg-ink px-3.5 py-2.5 text-sm leading-normal text-white">{children}</p>;
  }
  return (
    <div className="animate-enter mr-6 flex items-start gap-2.5" style={{ "--i": i } as React.CSSProperties}>
      <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-ink">
        <svg width="16" height="16" viewBox="0 0 28 28"><path d="M6 14h9.5" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" /><circle cx="20" cy="14" r="3" fill="#6CB4EE" /></svg>
      </span>
      <div className="tnum max-w-[640px] whitespace-pre-wrap rounded-[4px_18px_18px_18px] bg-surface px-3.5 py-2.5 text-sm leading-normal text-[#1F1F23]">{children}</div>
    </div>
  );
}

export function Typing() {
  return (
    <span className="inline-flex gap-1 py-1" aria-label="Escribiendo">
      {[0, 1, 2].map((i) => <span key={i} className="size-1.5 rounded-full bg-subtle animate-typing" style={{ animationDelay: `${i * 160}ms` }} />)}
    </span>
  );
}
