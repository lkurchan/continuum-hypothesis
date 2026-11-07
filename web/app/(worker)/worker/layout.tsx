import type { Metadata } from "next";
import { WorkerNav } from "@/components/worker/WorkerNav";
import { WorkerProvider } from "@/components/worker/WorkerContext";

export const metadata: Metadata = { title: "Continuum" };

// Self-contained module (PRD 6.1): its own layout, no dependency on /payer.
export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkerProvider>
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-white">
        <div className="flex grow flex-col px-6 pt-[max(24px,env(safe-area-inset-top))]">{children}</div>
        <WorkerNav />
      </div>
    </WorkerProvider>
  );
}
