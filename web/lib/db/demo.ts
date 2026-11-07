import "server-only";
import { MockStreamGateway } from "@/lib/chain/MockStreamGateway";
import { StreamService } from "@/lib/domain/StreamService";
import type { Activity, DemoUser, StreamView } from "@/lib/domain/types";
import { MemoryRepository } from "./MemoryRepository";

// These addresses exist only in the isolated in-memory demo, never in real mode.
export const demoUsers: DemoUser[] = [
  { id: "platform", name: "Plataforma demo", role: "payer", address: `0x${"1".repeat(40)}` },
  { id: "worker1", name: "Ana García", role: "worker", address: `0x${"2".repeat(40)}`, beloAddress: `0x${"4".repeat(40)}` },
  { id: "worker2", name: "Martín López", role: "worker", address: `0x${"3".repeat(40)}`, beloAddress: `0x${"5".repeat(40)}` },
];

export function createDemoBackend(now = () => Math.floor(Date.now() / 1000)) {
  const started = now();
  const streams: StreamView[] = [
    { id: "0", payerId: "platform", workerId: "worker1", label: "Repartos de Ana", totalAmount: "18000", deposited: "9000",
      withdrawn: "0", start: started - 300, end: started + 600, canceledAt: null, status: "streaming" },
    { id: "1", payerId: "platform", workerId: "worker2", label: "Proyecto de Martín", totalAmount: "24000", deposited: "18000",
      withdrawn: "0", start: started - 900, end: started + 2700, canceledAt: null, status: "streaming" },
  ];
  const createdAt = new Date((started - 900) * 1000).toISOString();
  const activity: Activity[] = streams.map(s => ({ id: crypto.randomUUID(), streamId: s.id, kind: "create", amount: s.deposited,
    txHash: `mock:seed-${s.id}`, explorerUrl: "", userId: "platform", createdAt, note: "Simulación local: no es una transacción onchain." }));
  const repository = new MemoryRepository(demoUsers, streams.map(s => ({ id: s.id, payerId: s.payerId, workerId: s.workerId,
    label: s.label, createdTx: `mock:seed-${s.id}`, createdAt })), activity);
  const gateway = new MockStreamGateway({ now, balances: { [demoUsers[0].address]: "1000000" },
    streams: streams.map((stream, i) => ({ stream, payer: demoUsers[0], worker: demoUsers[i + 1] })) });
  return { mode: "mock" as const, gateway, repository, service: new StreamService(gateway, repository, "mock", now) };
}
