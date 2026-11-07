"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useAccount, useDemoUser } from "@/components/ui/hooks";
import type { Activity, DemoUser, StreamView } from "@/lib/domain/types";

type PayerState = {
  user: DemoUser | null;
  users: DemoUser[];
  streams: StreamView[] | null;
  activity: Activity[];
  error: string | null;
  refresh: () => void;
};

const Ctx = createContext<PayerState | null>(null);

export function PayerProvider({ children }: { children: ReactNode }) {
  const { user, users, error } = useDemoUser("payer");
  const account = useAccount(user?.id);
  return <Ctx.Provider value={{ user, users, ...account, error: error ?? account.error }}>{children}</Ctx.Provider>;
}

export function usePayer(): PayerState {
  const value = useContext(Ctx);
  if (!value) throw new Error("usePayer must be used inside PayerProvider");
  return value;
}
