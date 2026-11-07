import type { StreamGateway } from "@/lib/chain/StreamGateway";
import type { Repository } from "@/lib/db/Repository";
import { addAmounts, compareAmounts, normalizeAmount, positiveAmount } from "./amounts";
import { DomainError, requireCondition } from "./errors";
import type { Activity, ActivityKind, Amount, DemoUser, StreamView } from "./types";
import { feeFor } from "./fees";
import { validatePeriod } from "./vesting";

const FEE_NOTE = "Comisión Continuum 0,05%";

export type CreateInput = { payerId: string; items: { workerId: string; totalAmount: Amount; initialDeposit: Amount; label?: string }[]; start: number; end: number };

export class StreamService {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly gateway: StreamGateway, private readonly repo: Repository,
    readonly mode: "mock" | "real", private readonly now = () => Math.floor(Date.now() / 1000)) {}

  // Serializes the complete read/check/write/log operation within one demo process.
  private mutate<T>(operation: () => Promise<T>): Promise<T> {
    const task = this.queue.then(operation);
    this.queue = task.catch(() => undefined);
    return task;
  }

  private async user(id: string): Promise<DemoUser> {
    const user = await this.repo.user(id);
    requireCondition(user, "Usuario inexistente.", 404);
    return user;
  }
  private async owned(id: string, userId: string, role: "payer" | "worker") {
    const user = await this.user(userId);
    const stream = await this.repo.stream(id);
    requireCondition(stream, "Stream inexistente.", 404);
    requireCondition(user.role === role && (role === "payer" ? stream.payerId : stream.workerId) === userId,
      "No tenés permiso para operar este stream.", 403);
    return { user, stream };
  }
  private activityRow(streamId: string, kind: ActivityKind, amount: Amount, txHash: string, userId: string): Activity {
    return { id: crypto.randomUUID(), streamId, kind, amount, txHash, userId,
      explorerUrl: this.mode === "real" ? `https://arbiscan.io/tx/${txHash}` : "",
      createdAt: new Date(this.now() * 1000).toISOString(),
      ...(this.mode === "mock" ? { note: "Simulación local: no es una transacción onchain." } : {}) };
  }
  private async saveAfterTransaction(txHash: string, save: () => Promise<void>) {
    try { await save(); } catch {
      throw new DomainError(`La operación ${txHash} fue confirmada, pero no se pudo guardar el historial. No repitas la operación; reconciliá ese hash.`, 503);
    }
  }

  private async requireFunds(payer: DemoUser, deposit: Amount) {
    const required = addAmounts(deposit, feeFor(deposit));
    if (required === "0") return;
    requireCondition(compareAmounts(await this.gateway.balanceOf(payer.address), required) >= 0,
      "Saldo insuficiente para cubrir el depósito y la comisión del 0,05%.", 409);
  }
  // Runs after the confirmed deposit. Never throws: the provider must keep the funds even if our fee fails.
  private async chargeFee(payer: DemoUser, streamId: string, deposit: Amount): Promise<string | undefined> {
    const fee = feeFor(deposit);
    if (fee === "0") return undefined;
    let txHash: string | undefined;
    try { txHash = (await this.gateway.transferFee(payer, fee)).txHash; } catch { txHash = undefined; }
    const row = txHash
      ? { ...this.activityRow(streamId, "fee", fee, txHash, payer.id),
        note: this.mode === "mock" ? `${FEE_NOTE}. Simulación local: no es una transacción onchain.` : FEE_NOTE }
      : { ...this.activityRow(streamId, "fee", fee, "", payer.id), explorerUrl: "", note: "fee pendiente" };
    try { await this.repo.recordActivity(row); } catch { /* The deposit already succeeded; the fee row is best effort. */ }
    return txHash;
  }

  users() { return this.repo.users(); }
  async streams(userId: string): Promise<StreamView[]> {
    await this.user(userId);
    const records = await this.repo.streams(userId);
    return Promise.all(records.map(async record => ({ ...await this.gateway.getStream(record.id), payerId: record.payerId,
      workerId: record.workerId, ...(record.label ? { label: record.label } : {}) })));
  }
  async activity(userId: string) {
    const user = await this.user(userId);
    const rows = await this.repo.activity(userId);
    // The commission is the client's cost; the provider never sees it.
    return user.role === "worker" ? rows.filter(row => row.kind !== "fee") : rows;
  }

  create(input: CreateInput, userId = input.payerId) {
    return this.mutate(async () => {
      requireCondition(input.payerId === userId, "La identidad no coincide con el pagador.", 403);
      const payer = await this.user(userId);
      requireCondition(payer.role === "payer", "Se requiere un pagador.", 403);
      validatePeriod(input.start, input.end);
      requireCondition(input.items.length > 0 && input.items.length <= 100, "El lote debe contener entre 1 y 100 trabajadores.");
      const items = await Promise.all(input.items.map(async item => {
        const worker = await this.user(item.workerId);
        requireCondition(worker.role === "worker", "El destinatario debe ser un trabajador.");
        const totalAmount = positiveAmount(item.totalAmount);
        const initialDeposit = normalizeAmount(item.initialDeposit);
        requireCondition(compareAmounts(initialDeposit, totalAmount) <= 0, "El fondeo excede el total.");
        const label = item.label?.trim().slice(0, 80) || undefined;
        return { worker, totalAmount, initialDeposit, label };
      }));
      const deposit = items.reduce((sum, item) => addAmounts(sum, item.initialDeposit), "0");
      await this.requireFunds(payer, deposit);
      const result = await this.gateway.createStreams(payer, items.map(({ worker, totalAmount, initialDeposit }) => ({ worker, totalAmount, initialDeposit })), input.start, input.end);
      requireCondition(result.streamIds.length === items.length, `La operación ${result.txHash} devolvió una cantidad inesperada de streams; revisá el hash antes de repetir.`, 503);
      const records = result.streamIds.map((id, i) => ({ id, payerId: payer.id, workerId: items[i].worker.id, ...(items[i].label ? { label: items[i].label } : {}),
        createdTx: result.txHash, createdAt: new Date(this.now() * 1000).toISOString() }));
      const activity = result.streamIds.map((id, i) => this.activityRow(id, "create", items[i].initialDeposit, result.txHash, payer.id));
      await this.saveAfterTransaction(result.txHash, () => this.repo.recordCreation(records, activity));
      // One fee for the whole batch, charged only after the deposit is confirmed and saved.
      const feeTxHash = await this.chargeFee(payer, result.streamIds[0], deposit);
      return { ...result, ...(feeTxHash ? { feeTxHash } : {}) };
    });
  }

  topUp(id: string, userId: string, amount: Amount) {
    return this.mutate(async () => {
      const { user } = await this.owned(id, userId, "payer");
      const value = positiveAmount(amount);
      const stream = await this.gateway.getStream(id);
      requireCondition(!stream.canceledAt, "El stream está cancelado.", 409);
      requireCondition(compareAmounts(addAmounts(stream.deposited, value), stream.totalAmount) <= 0, "El fondeo excede el total.", 409);
      await this.requireFunds(user, value);
      const result = await this.gateway.topUp(user, id, value);
      await this.saveAfterTransaction(result.txHash, () => this.repo.recordActivity(this.activityRow(id, "topup", value, result.txHash, user.id)));
      const feeTxHash = await this.chargeFee(user, id, value);
      return { ...result, ...(feeTxHash ? { feeTxHash } : {}) };
    });
  }

  withdraw(id: string, userId: string, amount: Amount, destination: "wallet" | "belo") {
    return this.mutate(async () => {
      const { user } = await this.owned(id, userId, "worker");
      requireCondition(destination === "wallet" || destination === "belo", "Destino inválido.");
      const to = destination === "wallet" ? user.address : user.beloAddress;
      requireCondition(to && /^0x[0-9a-fA-F]{40}$/.test(to) && !/^0x0{40}$/.test(to), "El destino no tiene una dirección válida configurada.");
      const value = positiveAmount(amount);
      // The gateway validates available funds against its authoritative clock/state.
      const result = await this.gateway.withdrawTo(user, id, to, value);
      await this.saveAfterTransaction(result.txHash, () => this.repo.recordActivity(this.activityRow(id, "withdraw", value, result.txHash, user.id)));
      return result;
    });
  }

  cancel(id: string, userId: string) {
    return this.mutate(async () => {
      const { user } = await this.owned(id, userId, "payer");
      const stream = await this.gateway.getStream(id);
      requireCondition(!stream.canceledAt, "El stream ya está cancelado.", 409);
      const result = await this.gateway.cancel(user, id);
      // Activity amount is the refund; kept remains in the mutation response.
      normalizeAmount(result.kept);
      normalizeAmount(result.refunded);
      // A concurrent top-up can make the pre-transaction snapshot obsolete.
      await this.saveAfterTransaction(result.txHash, () => this.repo.recordActivity(this.activityRow(id, "cancel", result.refunded, result.txHash, user.id)));
      return result;
    });
  }
}
