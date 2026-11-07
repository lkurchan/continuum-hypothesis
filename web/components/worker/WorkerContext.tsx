"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useAccount, useDemoUser } from "@/components/ui/hooks";
import { liveAvailable } from "@/components/ui/format";
import type { Activity, DemoUser, StreamView } from "@/lib/domain/types";

type WorkerState = {
  user: DemoUser | null;
  users: DemoUser[];
  streams: StreamView[] | null;
  activity: Activity[];
  error: string | null;
  refresh: () => void;
};

const Ctx = createContext<WorkerState | null>(null);

export function WorkerProvider({ children }: { children: ReactNode }) {
  const { user, users, error: userError } = useDemoUser("worker");
  const account = useAccount(user?.id);
  return (
    <Ctx.Provider value={{ user, users, ...account, error: userError ?? account.error }}>
      {children}
    </Ctx.Provider>
  );
}

export function useWorker(): WorkerState {
  const value = useContext(Ctx);
  if (!value) throw new Error("useWorker must be used inside WorkerProvider");
  return value;
}

/** The stream the home screen follows: running first, then the one with money left. */
export function primaryStream(streams: StreamView[], nowSec: number): StreamView | null {
  const rank = (s: StreamView) =>
    s.canceledAt ? (liveAvailable(s, nowSec) > 0 ? 2 : 4)
      : nowSec < s.start ? 1
      : nowSec < s.end ? 0
      : liveAvailable(s, nowSec) > 0 ? 2 : 3;
  return [...streams].sort((a, b) => rank(a) - rank(b) || b.start - a.start)[0] ?? null;
}

export function nameOf(users: DemoUser[], id: string): string {
  return users.find((u) => u.id === id)?.name ?? id;
}
