import type { Amount, DemoUser, StreamView } from "@/lib/domain/types";
import { getBackend } from "@/lib/db/runtime";

export interface StreamGateway {
  createStreams(payer: DemoUser, items: { worker: DemoUser; totalAmount: Amount; initialDeposit: Amount }[], start: number, end: number): Promise<{ txHash: string; streamIds: string[] }>;
  topUp(payer: DemoUser, streamId: string, amount: Amount): Promise<{ txHash: string }>;
  withdrawTo(worker: DemoUser, streamId: string, to: `0x${string}`, amount: Amount): Promise<{ txHash: string }>;
  cancel(payer: DemoUser, streamId: string): Promise<{ txHash: string; refunded: Amount; kept: Amount }>;
  getStream(streamId: string): Promise<Omit<StreamView, 'payerId' | 'workerId' | 'label'>>;
  balanceOf(address: `0x${string}`): Promise<Amount>;
  // Sends the Continuum commission from the payer's custodial wallet to the treasury.
  transferFee(payer: DemoUser, amount: Amount): Promise<{ txHash: string }>;
}

export function getGateway(): StreamGateway {
  return getBackend().gateway;
}
