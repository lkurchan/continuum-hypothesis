import type { Amount, DemoUser, StreamView } from "@/lib/domain/types";

export interface StreamGateway {
  createStreams(payer: DemoUser, items: { worker: DemoUser; totalAmount: Amount; initialDeposit: Amount }[], start: number, end: number): Promise<{ txHash: string; streamIds: string[] }>;
  topUp(payer: DemoUser, streamId: string, amount: Amount): Promise<{ txHash: string }>;
  withdrawTo(worker: DemoUser, streamId: string, to: `0x${string}`, amount: Amount): Promise<{ txHash: string }>;
  cancel(payer: DemoUser, streamId: string): Promise<{ txHash: string; refunded: Amount; kept: Amount }>;
  getStream(streamId: string): Promise<Omit<StreamView, 'payerId' | 'workerId' | 'label'>>;
  balanceOf(address: `0x${string}`): Promise<Amount>;
}

export function getGateway(): StreamGateway {
  const mode = process.env.CHAIN_MODE ?? "mock";
  if (mode === "mock") throw new Error("TODO B2");
  if (mode === "real") throw new Error("TODO B5");
  throw new Error("Invalid CHAIN_MODE: expected mock or real");
}
