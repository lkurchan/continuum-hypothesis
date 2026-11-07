"use client";

import { useCallback, useEffect, useState } from "react";
import type { Activity, DemoUser, Role, StreamView } from "@/lib/domain/types";
import { api } from "./api";

const storageKey = (role: Role) => `continuum.${role}`;

export function rememberUser(user: DemoUser) {
  try { localStorage.setItem(storageKey(user.role), user.id); } catch { /* private mode */ }
}

function recalled(role: Role): string | null {
  try { return localStorage.getItem(storageKey(role)); } catch { return null; }
}

/** Demo identity for a role: the remembered user, or the first one with that role. */
export function useDemoUser(role: Role) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api.users().then((list) => {
      if (!alive) return;
      setUsers(list);
      const id = recalled(role);
      setUser(list.find((u) => u.id === id && u.role === role) ?? list.find((u) => u.role === role) ?? null);
    }).catch((e: Error) => alive && setError(e.message));
    return () => { alive = false; };
  }, [role]);

  return { user, users, error };
}

/** Wall clock in fractional unix seconds, refreshed every `ms`. */
export function useNow(ms = 100): number {
  const [now, setNow] = useState(() => Date.now() / 1000);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() / 1000), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** Streams and activity for a user, with a manual refresh after each transaction. */
export function useAccount(userId: string | undefined) {
  const [streams, setStreams] = useState<StreamView[] | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    Promise.all([api.streams(userId), api.activity(userId)]).then(([s, a]) => {
      if (!alive) return;
      setStreams(s);
      setActivity([...a].sort((x, y) => y.createdAt.localeCompare(x.createdAt)));
      setError(null);
    }).catch((e: Error) => alive && setError(e.message));
    return () => { alive = false; };
  }, [userId, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  return { streams, activity, error, refresh };
}
