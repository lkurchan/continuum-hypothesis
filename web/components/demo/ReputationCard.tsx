"use client";

import { useEffect, useState } from "react";
import { reputationProfiles } from "@/lib/demo/reputation-profiles";
import { api } from "@/components/ui/api";
import { Hash } from "@/components/ui/kit";
import type { PaymentReputation } from "@/lib/domain/reputation";

const labels = { excelente: "Excelente", buena: "Buena", regular: "Regular", sin_historial: "Sin historial" };

export function ReputationCard({ clientId, revision, demoName }: { clientId?: string; revision: string; demoName?: string }) {
  const [data, setData] = useState<PaymentReputation | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!clientId) return;
    const id = clientId;
    let alive = true;
    let pending = false;
    const load = async () => {
      if (pending || !alive) return;
      pending = true;
      try {
        const result = await api.reputation(id);
        if (alive) { setData(result); setError(false); }
      } catch { if (alive) setError(true); }
      finally { pending = false; }
    };
    const refreshVisible = () => { if (document.visibilityState === "visible") void load(); };
    void load();
    const timer = setInterval(refreshVisible, 30_000);
    window.addEventListener("focus", refreshVisible);
    return () => { alive = false; clearInterval(timer); window.removeEventListener("focus", refreshVisible); };
  }, [clientId, revision, attempt]);

  const profile = !clientId && demoName ? reputationProfiles[demoName] : undefined;
  if (profile) return <section aria-label="Reputación de pago" className="overflow-hidden rounded-xl border border-line">
    <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3"><h3 className="text-sm font-semibold">Reputación de pago</h3><span className="text-[11px] text-muted">Perfil demo</span></div>
    <div className="grid grid-cols-3 items-center gap-3 px-4 py-4">
      <div><p className="tnum text-2xl font-semibold">{profile.rating}<span className="text-sm font-normal text-muted"> / 5</span></p><p aria-hidden="true" className="mt-1 text-xs tracking-widest">★★★★★</p></div>
      <div><p className="tnum text-xl font-semibold">{profile.onTime}</p><p className="mt-1 text-xs text-muted">Pagos a tiempo</p></div>
      <div><p className="tnum text-xl font-semibold">{profile.contracts}</p><p className="mt-1 text-xs text-muted">Contratos finalizados</p></div>
    </div>
    <div className="border-t border-line-soft px-4"><h4 className="pt-3 text-xs font-semibold">Reseñas de proveedores</h4>{profile.reviews.map(review => <figure key={review.author} className="border-b border-line-soft py-3 last:border-0"><figcaption className="flex flex-wrap items-baseline gap-x-2 text-xs"><span className="font-semibold">{review.author}</span><span className="text-muted">{review.service}</span></figcaption><blockquote className="mt-1.5 text-sm leading-relaxed text-muted">{review.text}</blockquote></figure>)}</div>
  </section>;

  return <section aria-label="Reputación de pago" className="overflow-hidden rounded-[20px] border border-line bg-white">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft px-6 py-5">
      <h2 className="text-base font-semibold">Reputación de pago</h2>
      <span className="text-xs text-muted">Basada en el historial de fondeo</span>
    </div>
    {!clientId ? <div className="p-6"><p className="text-lg font-semibold">Sin historial verificado</p><p className="mt-2 text-sm leading-relaxed text-muted">Esta empresa todavía no tiene un historial de pagos vinculado. Su calificación aparecerá cuando haya contratos registrados a su nombre.</p></div> : error ? <div className="flex flex-wrap items-center justify-between gap-3 p-6 text-sm">
      <p className="text-muted" role="status">No pudimos cargar la calificación.</p>
      <button type="button" onClick={() => setAttempt(x => x + 1)} className="rounded-lg border border-line px-4 py-2 font-medium">Reintentar</button>
    </div> : !data ? <div role="status" aria-label="Cargando reputación" className="m-6 h-32 animate-pulse rounded-xl bg-surface" /> : <>
      <div className="grid gap-7 p-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-10">
        <div>
          <p className="text-xs text-muted">Calificación</p>
          <p className="mt-2 text-[32px] font-semibold leading-tight tracking-tight">{labels[data.score]}</p>
          <div aria-hidden="true" className="mt-4 flex max-w-44 gap-1.5">{[1, 2, 3].map(level => <span key={level} className={`h-1.5 flex-1 rounded-full ${level <= ({ excelente: 3, buena: 2, regular: 1, sin_historial: 0 }[data.score]) ? "bg-ink" : "bg-line"}`} />)}</div>
          <p className="mt-3 text-xs text-muted">{data.agreements === 0 ? "Se construye con cada contrato." : `${data.agreements} ${data.agreements === 1 ? "contrato evaluado" : "contratos evaluados"}`}</p>
        </div>
        <div className="min-w-0">
          <dl className="grid grid-cols-2 gap-5">
            <div><dt className="text-xs text-muted">Fondeados al 100%</dt><dd className="tnum mt-2 text-2xl font-semibold">{data.fullyFunded}<span className="text-sm font-normal text-muted"> / {data.agreements}</span></dd></div>
            <div><dt className="text-xs text-muted">Episodios de atraso</dt><dd className="tnum mt-2 text-2xl font-semibold">{data.lateEpisodes}</dd></div>
          </dl>
          <div className="mt-5 border-t border-line-soft pt-4">
            <h3 className="text-xs font-medium">Resumen automático</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{data.agreements === 0
              ? "Todavía no hay contratos para evaluar el comportamiento de pago."
              : data.lateEpisodes === 0
                ? "No se registran atrasos de fondeo en los contratos evaluados."
                : `Se ${data.lateEpisodes === 1 ? "registró un período" : `registraron ${data.lateEpisodes} períodos`} sin cobertura suficiente. Anticipar el próximo tramo ayuda a mantener los pagos al día.`}</p>
          </div>
        </div>
      </div>
      {data.lastTx && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-6 py-4"><span className="text-xs text-muted">Último fondeo registrado</span><Hash hash={data.lastTx.hash} /></div>}
    </>}
  </section>;
}
