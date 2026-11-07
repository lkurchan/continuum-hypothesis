import type { Activity, Amount, DemoUser, StreamView } from "@/lib/domain/types";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error ?? "No se pudo completar la operación.");
  return data as T;
}

const post = <T,>(path: string, body: unknown) => call<T>(path, { method: "POST", body: JSON.stringify(body) });

export const api = {
  users: () => call<DemoUser[]>("/api/users"),
  streams: (userId: string) => call<StreamView[]>(`/api/streams?userId=${encodeURIComponent(userId)}`),
  activity: (userId: string) => call<Activity[]>(`/api/activity?userId=${encodeURIComponent(userId)}`),
  create: (payerId: string, items: { workerId: string; totalAmount: Amount; initialDeposit: Amount; label?: string }[], start: number, end: number) =>
    post<{ txHash: string; streamIds: string[]; feeTxHash?: string }>("/api/streams", { payerId, items, start, end }),
  topUp: (userId: string, id: string, amount: Amount) =>
    post<{ txHash: string; feeTxHash?: string }>(`/api/streams/${id}/topup`, { userId, amount }),
  withdraw: (userId: string, id: string, amount: Amount, destination: "wallet" | "belo") =>
    post<{ txHash: string }>(`/api/streams/${id}/withdraw`, { userId, amount, destination }),
  cancel: (userId: string, id: string) =>
    post<{ txHash: string; refunded: Amount; kept: Amount }>(`/api/streams/${id}/cancel`, { userId }),
};
