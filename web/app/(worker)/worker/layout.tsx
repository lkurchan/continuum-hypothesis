import type { Metadata } from "next";
import { WorkerNav } from "@/components/worker/WorkerNav";
import { WorkerProvider } from "@/components/worker/WorkerContext";

export const metadata: Metadata = { title: "Continuum · Proveedor" };

// Self-contained module (PRD 6.1): its own layout, no dependency on /payer.
export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkerProvider>
      <div className="flex min-h-dvh flex-col bg-page">
        <WorkerNav />
        <main className="mx-auto flex w-full max-w-[1200px] grow flex-col px-6 pb-16 pt-8">{children}</main>
      </div>
    </WorkerProvider>
  );
}
