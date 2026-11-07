export type Role = 'payer' | 'worker';
export type Amount = string;            // ARGt en unidades decimales ("1500.25"); bigint solo adentro del gateway
export interface DemoUser { id: string; name: string; role: Role; address: `0x${string}`; beloAddress?: `0x${string}`; avatarUrl?: string }
export interface StreamView {
  id: string; payerId: string; workerId: string; label?: string;
  totalAmount: Amount; deposited: Amount; withdrawn: Amount;
  start: number; end: number;          // unix seconds
  canceledAt: number | null;
  status: 'scheduled' | 'streaming' | 'completed' | 'canceled';
}
export type ActivityKind = 'create' | 'topup' | 'withdraw' | 'cancel' | 'agent_payment';
export interface Activity { id: string; streamId: string; kind: ActivityKind; amount: Amount; txHash: string; explorerUrl: string; userId: string; createdAt: string; note?: string }
