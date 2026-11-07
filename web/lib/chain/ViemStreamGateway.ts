import "server-only";
import { BaseError, ContractFunctionRevertedError, createPublicClient, createWalletClient, decodeEventLog, erc20Abi, http, isAddress, isAddressEqual, zeroAddress,
  type Abi, type Address, type Hex, type TransactionReceipt } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";
import { amountFromUnits, normalizeAmount, positiveAmount, unitsText } from "@/lib/domain/amounts";
import { DomainError, requireCondition } from "@/lib/domain/errors";
import type { Amount, DemoUser, StreamView } from "@/lib/domain/types";
import { statusAt, validatePeriod } from "@/lib/domain/vesting";
import { continuumStreamsAbi } from "./abi";
import { ARBITRUM_CHAIN_ID, ARGT_ADDRESS, ARGT_DECIMALS } from "./constants";
import type { StreamGateway } from "./StreamGateway";

type Receipt = Pick<TransactionReceipt, "transactionHash" | "status" | "logs">;
export interface ChainIO {
  chainId(): Promise<number>;
  read(address: Address, abi: Abi, name: string, args: readonly unknown[]): Promise<unknown>;
  send(user: DemoUser, address: Address, abi: Abi, name: string, args: readonly unknown[]): Promise<Receipt>;
}
type ChainStream = { payer: Address; recipient: Address; token: Address; totalAmount: bigint; deposited: bigint; withdrawn: bigint; start: bigint; end: bigint; canceledAt: bigint };
const uint256Max = (1n << 256n) - 1n;

function address(value: unknown): asserts value is Address {
  requireCondition(typeof value === "string" && isAddress(value, { strict: false }) && !isAddressEqual(value, zeroAddress), "Dirección de wallet, token o contrato inválida.");
}
function idValue(id: string): bigint {
  requireCondition(/^(0|[1-9]\d{0,77})$/.test(id), "Identificador de stream inválido.");
  const value = BigInt(id);
  requireCondition(value <= uint256Max, "Identificador de stream fuera de rango.");
  return value;
}
function providerError(error: unknown): never {
  if (error instanceof DomainError) throw error;
  if (error instanceof BaseError) {
    const revert = error.walk(cause => cause instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      if (revert.data?.errorName === "StreamNotFound") throw new DomainError("Stream inexistente.", 404);
      if (revert.data?.errorName === "NotPayer" || revert.data?.errorName === "NotRecipient") {
        throw new DomainError("La wallet no tiene permiso para operar este stream.", 403);
      }
      throw new DomainError("El contrato rechazó la operación. Revisá permisos, saldo y estado del stream.", 409);
    }
  }
  throw new DomainError("No se pudo completar la operación en Arbitrum.", 503);
}

export function createViemIO(rpcUrl: string, resolveKey: (user: DemoUser) => string | undefined): ChainIO {
  const publicClient = createPublicClient({ chain: arbitrum, transport: http(rpcUrl, { timeout: 15_000, retryCount: 0 }) });
  return {
    chainId: () => publicClient.getChainId(),
    read: (contract, abi, functionName, args) => publicClient.readContract({ address: contract, abi, functionName, args }),
    async send(user, contract, abi, functionName, args) {
      const key = resolveKey(user);
      requireCondition(key && /^0x[0-9a-fA-F]{64}$/.test(key), "Falta una clave demo válida en el servidor.", 503);
      const account = privateKeyToAccount(key as Hex);
      requireCondition(isAddressEqual(account.address, user.address), "La clave demo no corresponde a la wallet del usuario.", 503);
      const wallet = createWalletClient({ account, chain: arbitrum, transport: http(rpcUrl, { timeout: 15_000, retryCount: 0 }) });
      const { request } = await publicClient.simulateContract({ address: contract, abi, functionName, args, account });
      let hash: Hex;
      try { hash = await wallet.writeContract(request); } catch {
        throw new DomainError("No se pudo confirmar el envío de la transacción. Revisá la wallet en Arbiscan antes de repetir la operación.", 503);
      }
      try {
        return await publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 60_000 });
      } catch {
        throw new DomainError(`La transacción ${hash} fue enviada, pero su confirmación sigue pendiente. Consultá el hash antes de repetir.`, 503);
      }
    },
  };
}

export class ViemStreamGateway implements StreamGateway {
  private readonly queues = new Map<string, Promise<unknown>>();
  constructor(private readonly config: { contract: Address; token: Address; abi: Abi; io: ChainIO; now?: () => number }) {
    address(config.contract);
    address(config.token);
    requireCondition(isAddressEqual(config.token, ARGT_ADDRESS), "El token configurado no es ARGt en Arbitrum.", 503);
    requireCondition(config.abi.length > 0, "Falta el ABI de ContinuumStreams exportado por el módulo A.", 503);
  }

  static fromEnv() {
    const rpc = process.env.ARBITRUM_RPC_URL;
    const contract = process.env.STREAMS_CONTRACT_ADDRESS;
    const token = process.env.ARGT_ADDRESS || ARGT_ADDRESS;
    requireCondition(rpc && /^https?:\/\//.test(rpc) && contract, "Falta configurar RPC y contrato de Arbitrum.", 503);
    address(contract);
    address(token);
    return new ViemStreamGateway({ contract, token, abi: continuumStreamsAbi, io: createViemIO(rpc, user => {
      requireCondition(/^[a-zA-Z0-9_-]{1,64}$/.test(user.id), "Identificador de usuario inválido.");
      return process.env[`DEMO_PK_${user.id.toUpperCase()}`];
    }) });
  }

  private async network() {
    requireCondition(await this.config.io.chainId() === ARBITRUM_CHAIN_ID, "El RPC no pertenece a Arbitrum One.", 503);
    const decimals = await this.config.io.read(this.config.token, erc20Abi, "decimals", []);
    requireCondition(decimals === ARGT_DECIMALS || decimals === BigInt(ARGT_DECIMALS), "ARGt debe tener 18 decimales.", 503);
  }
  private async guarded<T>(operation: () => Promise<T>): Promise<T> {
    try { await this.network(); return await operation(); } catch (error) { return providerError(error); }
  }
  private exclusive<T>(user: DemoUser, role: DemoUser["role"], operation: () => Promise<T>): Promise<T> {
    const key = user.address.toLowerCase();
    const task = (this.queues.get(key) ?? Promise.resolve()).then(() => this.guarded(async () => {
      requireCondition(user.role === role, "El usuario no tiene el rol requerido.", 403);
      address(user.address);
      return operation();
    }));
    this.queues.set(key, task.catch(() => undefined));
    return task;
  }
  private async send(user: DemoUser, name: string, args: readonly unknown[], token = false): Promise<Receipt> {
    const receipt = await this.config.io.send(user, token ? this.config.token : this.config.contract,
      token ? erc20Abi : this.config.abi, name, args);
    requireCondition(receipt.status === "success", `La transacción ${receipt.transactionHash} revirtió.`, 409);
    return receipt;
  }
  private async approve(payer: DemoUser, amount: bigint) {
    if (amount === 0n) return;
    const balance = await this.config.io.read(this.config.token, erc20Abi, "balanceOf", [payer.address]);
    requireCondition(typeof balance === "bigint" && balance >= amount, "Saldo insuficiente de ARGt.", 409);
    const allowance = await this.config.io.read(this.config.token, erc20Abi, "allowance", [payer.address, this.config.contract]);
    requireCondition(typeof allowance === "bigint", "No se pudo leer la aprobación de ARGt.", 503);
    if (allowance >= amount) return;
    if (allowance > 0n) await this.send(payer, "approve", [this.config.contract, 0n], true);
    await this.send(payer, "approve", [this.config.contract, amount], true);
  }
  private events(receipt: Receipt, name: string): Record<string, unknown>[] {
    const events: Record<string, unknown>[] = [];
    for (const log of receipt.logs) {
      if (!isAddressEqual(log.address, this.config.contract)) continue;
      try {
        const decoded = decodeEventLog({ abi: this.config.abi, data: log.data, topics: log.topics, strict: true });
        const args: unknown = decoded.args;
        if (decoded.eventName === name && args && typeof args === "object" && !Array.isArray(args)) {
          events.push(args as Record<string, unknown>);
        }
      } catch { /* Other contract events are irrelevant to this operation. */ }
    }
    return events;
  }
  private confirmed(condition: unknown, receipt: Receipt): asserts condition {
    requireCondition(condition, `La transacción ${receipt.transactionHash} fue confirmada, pero sus eventos requieren reconciliación. No repitas la operación.`, 503);
  }
  private async raw(id: string): Promise<ChainStream> {
    const value = await this.config.io.read(this.config.contract, this.config.abi, "getStream", [idValue(id)]);
    requireCondition(value && typeof value === "object", "Respuesta de stream inválida.", 503);
    const stream = value as ChainStream;
    requireCondition(isAddress(stream.payer, { strict: false }) && !isAddressEqual(stream.payer, zeroAddress), "Stream inexistente.", 404);
    requireCondition(isAddressEqual(stream.token, this.config.token), "El stream no usa ARGt.", 409);
    for (const key of ["totalAmount", "deposited", "withdrawn", "start", "end", "canceledAt"] as const) {
      requireCondition(typeof stream[key] === "bigint" && stream[key] >= 0n, "Respuesta de stream inválida.", 503);
    }
    requireCondition(stream.end > stream.start && stream.end <= BigInt(Number.MAX_SAFE_INTEGER) && stream.canceledAt <= BigInt(Number.MAX_SAFE_INTEGER), "Período del stream fuera de rango.", 503);
    return stream;
  }
  private owner(user: DemoUser, expected: Address) {
    requireCondition(isAddressEqual(user.address, expected), "La wallet no tiene permiso para operar este stream.", 403);
  }

  createStreams(payer: DemoUser, items: { worker: DemoUser; totalAmount: Amount; initialDeposit: Amount }[], start: number, end: number) {
    return this.exclusive(payer, "payer", async () => {
      validatePeriod(start, end);
      requireCondition(items.length > 0 && items.length <= 100, "El lote debe contener entre 1 y 100 trabajadores.");
      const amounts = items.map(item => {
        requireCondition(item.worker.role === "worker", "Se requiere un trabajador.");
        address(item.worker.address);
        const total = BigInt(unitsText(positiveAmount(item.totalAmount)));
        const deposit = BigInt(unitsText(normalizeAmount(item.initialDeposit)));
        requireCondition(deposit <= total, "El fondeo excede el total.");
        return { total, deposit };
      });
      const deposit = amounts.reduce((sum, item) => sum + item.deposit, 0n);
      requireCondition(deposit <= uint256Max, "El fondeo del lote excede uint256.");
      await this.approve(payer, deposit);
      const receipt = await this.send(payer, "createStreamsBatch", [items.map(i => i.worker.address), amounts.map(a => a.total),
        amounts.map(a => a.deposit), this.config.token, BigInt(start), BigInt(end)]);
      const events = this.events(receipt, "StreamCreated");
      this.confirmed(events.length === items.length, receipt);
      const streamIds = events.map((event, i) => {
        this.confirmed(typeof event.id === "bigint" && typeof event.payer === "string" && isAddressEqual(event.payer as Address, payer.address)
          && typeof event.recipient === "string" && isAddressEqual(event.recipient as Address, items[i].worker.address)
          && event.totalAmount === amounts[i].total && event.start === BigInt(start) && event.end === BigInt(end)
          && typeof event.token === "string" && isAddressEqual(event.token as Address, this.config.token), receipt);
        return (event.id as bigint).toString();
      });
      this.confirmed(new Set(streamIds).size === streamIds.length, receipt);
      return { txHash: receipt.transactionHash, streamIds };
    });
  }
  topUp(payer: DemoUser, id: string, amount: Amount) {
    return this.exclusive(payer, "payer", async () => {
      const stream = await this.raw(id);
      this.owner(payer, stream.payer);
      requireCondition(stream.canceledAt === 0n, "El stream está cancelado.", 409);
      const value = BigInt(unitsText(positiveAmount(amount)));
      requireCondition(stream.deposited + value <= stream.totalAmount, "El fondeo excede el total.", 409);
      await this.approve(payer, value);
      const receipt = await this.send(payer, "topUp", [idValue(id), value]);
      this.confirmed(this.events(receipt, "ToppedUp").some(e => e.id === idValue(id) && e.amount === value), receipt);
      return { txHash: receipt.transactionHash };
    });
  }
  withdrawTo(worker: DemoUser, id: string, to: Address, amount: Amount) {
    return this.exclusive(worker, "worker", async () => {
      address(to);
      const stream = await this.raw(id);
      this.owner(worker, stream.recipient);
      const value = BigInt(unitsText(positiveAmount(amount)));
      const available = await this.config.io.read(this.config.contract, this.config.abi, "withdrawableAmount", [idValue(id)]);
      requireCondition(typeof available === "bigint" && value <= available, "El monto supera el saldo disponible.", 409);
      const receipt = await this.send(worker, "withdrawTo", [idValue(id), to, value]);
      this.confirmed(this.events(receipt, "Withdrawn").some(e => e.id === idValue(id) && e.amount === value
        && typeof e.to === "string" && isAddressEqual(e.to as Address, to)), receipt);
      return { txHash: receipt.transactionHash };
    });
  }
  cancel(payer: DemoUser, id: string) {
    return this.exclusive(payer, "payer", async () => {
      const stream = await this.raw(id);
      this.owner(payer, stream.payer);
      requireCondition(stream.canceledAt === 0n, "El stream ya está cancelado.", 409);
      const receipt = await this.send(payer, "cancel", [idValue(id)]);
      const events = this.events(receipt, "Canceled").filter(e => e.id === idValue(id));
      this.confirmed(events.length === 1 && typeof events[0].refundedToPayer === "bigint" && typeof events[0].keptByRecipient === "bigint", receipt);
      return { txHash: receipt.transactionHash, refunded: amountFromUnits(String(events[0].refundedToPayer)), kept: amountFromUnits(String(events[0].keptByRecipient)) };
    });
  }
  getStream(id: string): Promise<Omit<StreamView, "payerId" | "workerId" | "label">> {
    return this.guarded(async () => {
      const raw = await this.raw(id);
      const schedule = { start: Number(raw.start), end: Number(raw.end), canceledAt: raw.canceledAt === 0n ? null : Number(raw.canceledAt) };
      return { id, ...schedule, totalAmount: amountFromUnits(raw.totalAmount.toString()), deposited: amountFromUnits(raw.deposited.toString()),
        withdrawn: amountFromUnits(raw.withdrawn.toString()), status: statusAt(schedule, this.config.now?.() ?? Math.floor(Date.now() / 1000)) };
    });
  }
  balanceOf(wallet: Address): Promise<Amount> {
    return this.guarded(async () => {
      address(wallet);
      const value = await this.config.io.read(this.config.token, erc20Abi, "balanceOf", [wallet]);
      requireCondition(typeof value === "bigint", "Respuesta de saldo inválida.", 503);
      return amountFromUnits(value.toString());
    });
  }
}
