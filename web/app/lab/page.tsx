"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/components/ui/api";
import { liveAvailable, money } from "@/components/ui/format";
import { ErrorNote, Hash, Logo, buttonStyles } from "@/components/ui/kit";
import type { DemoUser, StreamView } from "@/lib/domain/types";

type Entry = { id: number; at: string; label: string; ok: boolean; detail: string; hash?: string };
type Mode = "mock" | "real" | null;

const EXPRESS = 900;
const AMOUNT = 18_000;
const nowSec = () => Math.floor(Date.now() / 1000);
const stamp = () => new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function LabPage() {
  const [mode, setMode] = useState<Mode>(null);
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [workerId, setWorkerId] = useState("");
  const [log, setLog] = useState<Entry[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [frames, setFrames] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users", { cache: "no-store" }).then(async (r) => {
      setMode(r.headers.get("X-Chain-Mode") as Mode);
      if (!r.ok) throw new Error(((await r.json()) as { error?: string }).error ?? "No se pudo leer la API.");
      const list = (await r.json()) as DemoUser[];
      setUsers(list);
      const first = list.find((u) => u.role === "worker");
      if (first) setWorkerId(first.id);
    }).catch((e: Error) => setError(e.message));
  }, []);

  const payer = users.find((u) => u.role === "payer");
  const workers = users.filter((u) => u.role === "worker");
  const worker = workers.find((w) => w.id === workerId);

  // The embedded views read the demo identity from localStorage (same origin).
  useEffect(() => {
    if (!worker) return;
    try {
      localStorage.setItem("continuum.worker", worker.id);
      if (payer) localStorage.setItem("continuum.payer", payer.id);
    } catch { /* storage blocked: views fall back to the first user */ }
    setFrames((f) => f + 1);
  }, [worker, payer]);

  const lastActive = useCallback(async (): Promise<StreamView> => {
    if (!payer) throw new Error("No hay pagador demo.");
    const streams = (await api.streams(payer.id)).filter((s) => !s.canceledAt && nowSec() < s.end);
    const last = streams.sort((a, b) => Number(b.id) - Number(a.id))[0];
    if (!last) throw new Error("No hay pagos activos. Creá uno primero.");
    return last;
  }, [payer]);

  const run = async (label: string, action: () => Promise<{ detail: string; hash?: string }>) => {
    setBusy(label);
    try {
      const r = await action();
      setLog((l) => [{ id: Date.now(), at: stamp(), label, ok: true, ...r }, ...l]);
    } catch (e) {
      setLog((l) => [{ id: Date.now(), at: stamp(), label, ok: false, detail: (e as Error).message }, ...l]);
    } finally {
      setBusy(null);
      setFrames((f) => f + 1);
    }
  };

  const createFor = (targets: DemoUser[]) => async () => {
    if (!payer) throw new Error("No hay pagador demo.");
    const start = nowSec();
    const items = targets.map((w) => ({ workerId: w.id, totalAmount: String(AMOUNT), initialDeposit: String(AMOUNT / 2) }));
    const r = await api.create(payer.id, items, start, start + EXPRESS);
    return { detail: `${r.streamIds.length === 1 ? "Pago" : `${r.streamIds.length} pagos`} de ${money(AMOUNT)} en 15 min, 50 % fondeado`, hash: r.txHash };
  };

  const scenarios: { label: string; hint: string; action: () => Promise<{ detail: string; hash?: string }>; disabled?: boolean }[] = [
    { label: `Pago exprés a ${worker?.name.split(" ")[0] ?? "trabajador"}`, hint: "15 min · $18.000 · 50 %", action: createFor(worker ? [worker] : []), disabled: !worker },
    { label: "Pago exprés a todos", hint: "Un lote, una transacción", action: createFor(workers), disabled: !workers.length },
    {
      label: "Recargar el último pago", hint: "+25 % del total",
      action: async () => {
        const s = await lastActive();
        const room = Number(s.totalAmount) - Number(s.deposited);
        const amount = Math.min(Math.floor(Number(s.totalAmount) / 4), Math.floor(room));
        if (amount <= 0) throw new Error("El último pago ya está fondeado al 100 %.");
        const r = await api.topUp(payer!.id, s.id, String(amount));
        return { detail: `Pago #${s.id} +${money(amount)}`, hash: r.txHash };
      },
    },
    {
      label: `${worker?.name.split(" ")[0] ?? "Trabajador"} retira la mitad`, hint: "A su wallet", disabled: !worker,
      action: async () => {
        const streams = await api.streams(worker!.id);
        const s = streams.map((x) => ({ x, a: liveAvailable(x, nowSec()) })).sort((p, q) => q.a - p.a)[0];
        const amount = s ? Math.floor(s.a / 2) : 0;
        if (!s || amount < 1) throw new Error("No tiene saldo disponible para retirar.");
        const r = await api.withdraw(worker!.id, s.x.id, String(amount), "wallet");
        return { detail: `Pago #${s.x.id} −${money(amount)}`, hash: r.txHash };
      },
    },
    {
      label: "Cancelar el último pago", hint: "Lo ganado queda, el resto vuelve",
      action: async () => {
        const s = await lastActive();
        const r = await api.cancel(payer!.id, s.id);
        return { detail: `Pago #${s.id}: vuelven ${money(r.refunded, 2)}`, hash: r.txHash };
      },
    },
  ];

  const reset = () => run("Reiniciar datos demo", async () => {
    const r = await fetch("/api/lab/reset", { method: "POST" });
    if (!r.ok) throw new Error(((await r.json()) as { error?: string }).error ?? "No se pudo reiniciar.");
    return { detail: "Volvieron los pagos sembrados" };
  });

  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-line bg-white px-6">
        <Logo size={26} />
        <span className="rounded-md border border-line px-2 py-0.5 text-xs font-semibold tracking-[0.04em] text-ink-2">LAB</span>
        <span className={`ml-auto inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium ${mode === "real" ? "bg-danger-soft text-danger" : "bg-mock-soft text-mock"}`}>
          <span className={`size-1.5 rounded-full ${mode === "real" ? "bg-danger" : "bg-mock"}`} />
          {mode === "real" ? "Arbitrum One · fondos reales" : mode === "mock" ? "Modo mock · simulación local" : "…"}
        </span>
      </header>

      <div className="grid grow gap-6 p-6 xl:grid-cols-[320px_auto_1fr]">
        <aside className="flex flex-col gap-4">
          {error && <ErrorNote>{error}</ErrorNote>}
          {mode === "real" && <ErrorNote>Cada escenario firma una transacción real en Arbitrum.</ErrorNote>}

          <label className="flex flex-col gap-1.5 text-[13px] text-muted">
            Celular muestra a
            <select value={workerId} onChange={(e) => setWorkerId(e.target.value)}
              className="h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-ink">
              {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </label>

          <section aria-label="Escenarios" className="flex flex-col overflow-hidden rounded-3xl border border-line bg-white">
            {scenarios.map((s) => (
              <button key={s.label} type="button" disabled={!!busy || s.disabled} onClick={() => run(s.label, s.action)}
                className="flex flex-col items-start gap-0.5 border-b border-line-soft px-4 py-3 text-left transition last:border-0 hover:bg-page disabled:opacity-50">
                <span className="text-sm font-medium">{busy === s.label ? "Ejecutando…" : s.label}</span>
                <span className="text-xs text-subtle">{s.hint}</span>
              </button>
            ))}
          </section>

          {mode === "mock" && (
            <button type="button" onClick={reset} disabled={!!busy} className={buttonStyles.ghost}>Reiniciar datos demo</button>
          )}

          <section aria-label="Registro" className="flex flex-col gap-2">
            <h2 className="text-[13px] font-medium text-muted">Registro</h2>
            {log.length === 0 && <p className="text-xs text-subtle">Todavía no corriste nada.</p>}
            {log.map((e) => (
              <div key={e.id} className="flex flex-col gap-1 rounded-2xl bg-white px-3.5 py-2.5 text-xs">
                <span className="flex items-center justify-between gap-2">
                  <span className={`font-medium ${e.ok ? "text-ink" : "text-danger"}`}>{e.ok ? "✓" : "✕"} {e.label}</span>
                  <span className="tnum text-subtle">{e.at}</span>
                </span>
                <span className="text-muted">{e.detail}</span>
                {e.hash && <Hash hash={e.hash} />}
              </div>
            ))}
          </section>
        </aside>

        <section aria-label="Vista del trabajador" className="flex flex-col items-center gap-2">
          <span className="text-xs text-subtle">Trabajador · /worker</span>
          <iframe key={`w${frames}`} src="/worker" title="Vista del trabajador"
            className="h-[844px] w-[390px] shrink-0 rounded-[44px] border-[10px] border-ink bg-white shadow-xl" />
        </section>

        <section aria-label="Vista del pagador" className="flex min-w-0 flex-col gap-2">
          <span className="text-xs text-subtle">Pagador · /payer</span>
          <iframe key={`p${frames}`} src="/payer" title="Vista del pagador"
            className="h-[844px] w-full min-w-[640px] rounded-3xl border border-line bg-white shadow-sm" />
        </section>
      </div>
    </div>
  );
}
