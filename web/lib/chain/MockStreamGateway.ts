import "server-only";
import { randomUUID } from "node:crypto";
import { addAmounts, amountFromUnits, compareAmounts, normalizeAmount, positiveAmount, subtractAmounts, unitsText } from "@/lib/domain/amounts";
import { requireCondition } from "@/lib/domain/errors";
import type { Amount, DemoUser, StreamView } from "@/lib/domain/types";
import { statusAt, validatePeriod, vestedAt, withdrawableAt } from "@/lib/domain/vesting";
import type { StreamGateway } from "./StreamGateway";

type StoredStream = StreamView & { payerAddress: string; workerAddress: string };
type Options = {
  now?: () => number;
  balances?: Record<string, Amount>;
  streams?: { stream: StreamView; payer: DemoUser; worker: DemoUser }[];
};

export class MockStreamGateway implements StreamGateway {
  private readonly streams = new Map<string, StoredStream>();
  private readonly balances = new Map<string, bigint>();
  private nextId = 0n;
  private readonly now: () => number;

  constructor(options: Options = {}) {
    this.now = options.now ?? (() => Math.floor(Date.now() / 1000));
    for (const [address, amount] of Object.entries(options.balances ?? {})) {
      this.balances.set(address.toLowerCase(), BigInt(unitsText(amount)));
    }
    for (const { stream, payer, worker } of options.streams ?? []) {
      this.streams.set(stream.id, { ...stream, payerAddress: payer.address.toLowerCase(), workerAddress: worker.address.toLowerCase() });
      if (BigInt(stream.id) >= this.nextId) this.nextId = BigInt(stream.id) + 1n;
    }
  }

  private hash(): string { return `mock:${randomUUID()}`; }
  private read(id: string): StoredStream {
    const stream = this.streams.get(id);
    requireCondition(stream, "Stream inexistente.", 404);
    return stream;
  }
  private balance(address: string): bigint { return this.balances.get(address.toLowerCase()) ?? 0n; }
  private transfer(address: string, units: bigint): void {
    this.balances.set(address.toLowerCase(), this.balance(address) + units);
  }
  private payer(user: DemoUser, stream: StoredStream): void {
    requireCondition(user.role === "payer" && user.id === stream.payerId && user.address.toLowerCase() === stream.payerAddress,
      "Solo el pagador puede realizar esta operación.", 403);
  }

  async createStreams(payer: DemoUser, items: { worker: DemoUser; totalAmount: Amount; initialDeposit: Amount }[], start: number, end: number) {
    requireCondition(payer.role === "payer", "Se requiere un pagador.", 403);
    validatePeriod(start, end);
    requireCondition(items.length > 0 && items.length <= 100, "El lote debe contener entre 1 y 100 trabajadores.");
    const validated = items.map(({ worker, totalAmount, initialDeposit }) => {
      requireCondition(worker.role === "worker", "El destinatario debe ser un trabajador.");
      const total = positiveAmount(totalAmount);
      const deposit = normalizeAmount(initialDeposit);
      requireCondition(compareAmounts(deposit, total) <= 0, "El fondeo excede el total.");
      return { worker, total, deposit };
    });
    const required = validated.reduce((sum, item) => addAmounts(sum, item.deposit), "0");
    const units = BigInt(unitsText(required));
    requireCondition(this.balance(payer.address) >= units, "Saldo insuficiente del pagador.", 409);
    // All checks precede the first mutation; no await splits the state transition.
    const streamIds = validated.map(({ worker, total, deposit }) => {
      const id = (this.nextId++).toString();
      this.streams.set(id, { id, payerId: payer.id, workerId: worker.id, totalAmount: total, deposited: deposit,
        withdrawn: "0", start, end, canceledAt: null, status: statusAt({ start, end, canceledAt: null }, this.now()),
        payerAddress: payer.address.toLowerCase(), workerAddress: worker.address.toLowerCase() });
      return id;
    });
    this.transfer(payer.address, -units);
    return { txHash: this.hash(), streamIds };
  }

  async topUp(payer: DemoUser, streamId: string, amount: Amount) {
    const stream = this.read(streamId);
    this.payer(payer, stream);
    requireCondition(!stream.canceledAt, "El stream está cancelado.", 409);
    const value = positiveAmount(amount);
    const next = addAmounts(stream.deposited, value);
    requireCondition(compareAmounts(next, stream.totalAmount) <= 0, "El fondeo excede el total.", 409);
    const units = BigInt(unitsText(value));
    requireCondition(this.balance(payer.address) >= units, "Saldo insuficiente del pagador.", 409);
    this.transfer(payer.address, -units);
    stream.deposited = next;
    return { txHash: this.hash() };
  }

  async withdrawTo(worker: DemoUser, streamId: string, to: `0x${string}`, amount: Amount) {
    const stream = this.read(streamId);
    requireCondition(worker.role === "worker" && worker.id === stream.workerId && worker.address.toLowerCase() === stream.workerAddress,
      "Solo el trabajador del stream puede retirar.", 403);
    requireCondition(/^0x[0-9a-fA-F]{40}$/.test(to) && !/^0x0{40}$/.test(to), "Dirección de destino inválida.");
    const value = positiveAmount(amount);
    requireCondition(compareAmounts(value, withdrawableAt(stream, this.now())) <= 0, "El monto supera el saldo disponible.", 409);
    stream.withdrawn = addAmounts(stream.withdrawn, value);
    this.transfer(to, BigInt(unitsText(value)));
    return { txHash: this.hash() };
  }

  async cancel(payer: DemoUser, streamId: string) {
    const stream = this.read(streamId);
    this.payer(payer, stream);
    requireCondition(!stream.canceledAt, "El stream ya está cancelado.", 409);
    const now = Math.floor(this.now());
    requireCondition(now > 0, "Reloj inválido.");
    const vested = vestedAt(stream, now);
    const kept = compareAmounts(vested, stream.deposited) < 0 ? vested : stream.deposited;
    const refunded = subtractAmounts(stream.deposited, kept);
    stream.canceledAt = now;
    stream.deposited = kept;
    this.transfer(payer.address, BigInt(unitsText(refunded)));
    return { txHash: this.hash(), refunded, kept };
  }

  async getStream(streamId: string): Promise<Omit<StreamView, "payerId" | "workerId" | "label">> {
    const stream = this.read(streamId);
    return { id: stream.id, totalAmount: stream.totalAmount, deposited: stream.deposited, withdrawn: stream.withdrawn,
      start: stream.start, end: stream.end, canceledAt: stream.canceledAt, status: statusAt(stream, this.now()) };
  }

  async balanceOf(address: `0x${string}`): Promise<Amount> {
    return amountFromUnits(this.balance(address).toString());
  }
}
