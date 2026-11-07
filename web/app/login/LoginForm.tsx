"use client";

import { useEffect, useState, type FormEvent } from "react";
import { buttonStyles, ErrorNote, Logo } from "@/components/ui/kit";

type Session = { required: boolean; authenticated: boolean };

export function LoginForm({ next }: { next: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/auth/session", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No se pudo comprobar el acceso.");
        setSession(data);
      })
      .catch((e: Error) => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, []);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, next }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo ingresar. Probá de nuevo.");
      setPassword("");
      window.location.assign(data.next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo conectar. Probá de nuevo.");
      setBusy(false);
    }
  };

  const logout = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("No se pudo cerrar la sesión. Probá de nuevo.");
      try { localStorage.removeItem("continuum.payer"); localStorage.removeItem("continuum.worker"); } catch { /* Private mode. */ }
      // Drop all account state from the previous authenticated document.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo conectar. Probá de nuevo.");
      setBusy(false);
    }
  };

  const hasAccess = session && (!session.required || session.authenticated);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-7">
      <header><Logo /></header>
      <section className="flex grow flex-col justify-center gap-6 py-12">
        <div className="flex flex-col gap-3">
          <h1 className="text-[36px] font-medium leading-tight tracking-[-0.04em]">Ingresá a la demo</h1>
          <p className="text-base leading-normal text-muted">Usá la clave del equipo para entrar a Continuum.</p>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        {!session && !error ? <p role="status" className="text-sm text-muted">Comprobando acceso…</p> : hasAccess ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">Ya tenés acceso a la demo.</p>
            <a href={next} className={buttonStyles.primary}>Continuar</a>
            {session.required && <button type="button" disabled={busy} onClick={() => void logout()} className={buttonStyles.secondary}>
              {busy ? "Cerrando sesión…" : "Cerrar sesión"}
            </button>}
          </div>
        ) : (
          <form onSubmit={login} className="flex flex-col gap-4">
            <label htmlFor="demo-password" className="flex flex-col gap-2 text-sm font-medium">
              Clave de la demo
              <input id="demo-password" name="password" type="password" autoComplete="current-password"
                value={password} onChange={event => setPassword(event.target.value)} required minLength={16} maxLength={256} disabled={busy}
                className="h-14 w-full rounded-2xl border border-line bg-white px-4 text-base outline-none focus:border-ink"
                placeholder="Ingresá la clave del equipo" />
            </label>
            <button type="submit" disabled={busy || !password} className={buttonStyles.primary}>
              {busy ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
        )}
      </section>
      <p className="text-center text-xs text-subtle">Acceso privado para el equipo.</p>
    </main>
  );
}
