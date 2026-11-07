import { formatUnits, isAddress, isAddressEqual, parseUnits, zeroAddress } from "viem";
import { ensure, OperationError } from "./environment.mjs";

export function amount(value) {
  ensure(typeof value === "string" && value.length <= 80 && /^(0|[1-9]\d*)(\.\d{1,18})?$/.test(value), "Usá montos decimales como strings, con hasta 18 decimales.");
  const units = parseUnits(value, 18);
  ensure(units <= (1n << 256n) - 1n, "El monto excede uint256.");
  return formatUnits(units, 18);
}

export function apiClient(baseUrl, mode, fetcher = fetch) {
  let base;
  try { base = new URL(baseUrl); } catch { ensure(false, "URL de API inválida."); }
  ensure(["mock", "real"].includes(mode), "El modo debe ser mock o real.");
  ensure(base.protocol === "https:" || (base.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)), "Usá HTTPS o un servidor HTTP loopback.");
  ensure(!base.username && !base.password && !base.search && !base.hash && base.pathname === "/", "La URL debe ser el origen de la app, sin credenciales ni rutas.");
  return {
    origin: base.origin, mode,
    async request(path, payload) {
      ensure(path.startsWith("/api/") && !path.includes(".."), "Ruta API inválida.");
      let response;
      try {
        response = await fetcher(new URL(path, base), { method: payload === undefined ? "GET" : "POST", redirect: "error",
          headers: { "Content-Type": "application/json" }, body: payload === undefined ? undefined : JSON.stringify(payload),
          signal: AbortSignal.timeout(payload === undefined ? 15_000 : 90_000) });
      } catch { throw new OperationError(payload === undefined ? "No se pudo consultar la API." : "Envío ambiguo. Revisá el journal y la chain antes de repetir."); }
      ensure(response.headers.get("X-Chain-Mode") === mode, "El modo de la API no coincide con el solicitado. Operación detenida.");
      let result;
      try { result = await response.json(); } catch { throw new OperationError("La API devolvió una respuesta inválida. Revisá el journal antes de repetir."); }
      if (!response.ok) {
        const hash = typeof result?.error === "string" ? result.error.match(/0x[0-9a-fA-F]{64}/)?.[0] : undefined;
        const error = new OperationError(`La API rechazó la operación (HTTP ${response.status}).${hash ? ` Revisá la transacción ${hash}; no la repitas.` : " Revisá configuración, permisos, saldo e historial antes de repetir."}`);
        error.txHash = hash;
        throw error;
      }
      return result;
    },
  };
}

export function seedIntent(options = {}) {
  const payerId = options.payerId ?? "platform";
  const workerIds = options.workerIds ?? ["worker1", "worker2"];
  ensure(typeof payerId === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(payerId), "Pagador inválido.");
  ensure(Array.isArray(workerIds) && workerIds.length > 0 && workerIds.length <= 100 &&
    workerIds.every(id => typeof id === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(id)) && new Set(workerIds).size === workerIds.length, "Trabajadores inválidos o repetidos.");
  const totalAmount = amount(options.totalAmount ?? "10");
  const initialDeposit = amount(options.initialDeposit ?? "1");
  ensure(parseUnits(totalAmount, 18) > 0n && parseUnits(initialDeposit, 18) <= parseUnits(totalAmount, 18), "El total debe ser positivo y el depósito no puede excederlo.");
  ensure(parseUnits(initialDeposit, 18) * BigInt(workerIds.length) <= (1n << 256n) - 1n, "El fondeo del lote excede uint256.");
  const duration = options.duration ?? 900;
  ensure(Number.isSafeInteger(duration) && duration > 0 && duration <= 604800, "Duración inválida: entre 1 y 604800 segundos.");
  return { payerId, workerIds, totalAmount, initialDeposit, duration };
}

export async function prepareSeed(api, intent, now = () => Math.floor(Date.now() / 1000)) {
  const users = await api.request("/api/users");
  ensure(Array.isArray(users), "La API no devolvió usuarios válidos.");
  for (const [id, role] of [[intent.payerId, "payer"], ...intent.workerIds.map(id => [id, "worker"])]) {
    const user = users.find(user => user.id === id);
    ensure(user?.role === role && isAddress(user.address, { strict: false }) && !isAddressEqual(user.address, zeroAddress), `Usuario ${id} ausente, con rol incorrecto o sin wallet configurada.`);
  }
  const streams = await api.request(`/api/streams?userId=${encodeURIComponent(intent.payerId)}`);
  ensure(Array.isArray(streams), "La API no devolvió streams válidos.");
  const start = now();
  ensure(Number.isSafeInteger(start) && start > 0, "Reloj inválido.");
  ensure(!streams.some(stream => intent.workerIds.includes(stream.workerId) && !stream.canceledAt && stream.end > start),
    "Ya hay streams activos o programados para estos trabajadores. No se duplicará el seed.");
  return { payerId: intent.payerId, items: intent.workerIds.map(workerId => ({ workerId, totalAmount: intent.totalAmount, initialDeposit: intent.initialDeposit })), start, end: start + intent.duration };
}

export async function verifySeed(api, request, result) {
  ensure(result && typeof result.txHash === "string" && (api.mode === "real" ? /^0x[0-9a-fA-F]{64}$/.test(result.txHash) : result.txHash.startsWith("mock:")), "Hash de creación inválido.");
  ensure(Array.isArray(result.streamIds) && result.streamIds.length === request.items.length &&
    result.streamIds.every(id => typeof id === "string" && /^(0|[1-9]\d*)$/.test(id)) &&
    new Set(result.streamIds).size === result.streamIds.length, "IDs de creación inválidos.");
  const [streams, activity] = await Promise.all([
    api.request(`/api/streams?userId=${encodeURIComponent(request.payerId)}`),
    api.request(`/api/activity?userId=${encodeURIComponent(request.payerId)}`),
  ]);
  ensure(Array.isArray(streams) && Array.isArray(activity), "No se pudo verificar el seed en la API.");
  for (const [index, id] of result.streamIds.entries()) {
    const item = request.items[index];
    ensure(streams.some(stream => stream.id === id && stream.payerId === request.payerId && stream.workerId === item.workerId &&
      amount(stream.totalAmount) === amount(item.totalAmount) && stream.start === request.start && stream.end === request.end), `El stream ${id} no aparece con la metadata esperada. Revisá ${result.txHash}; no repitas el envío.`);
    ensure(activity.some(row => row.streamId === id && row.kind === "create" && row.txHash === result.txHash &&
      amount(row.amount) === amount(item.initialDeposit)), `Falta actividad de creación para ${id}. Reconciliá ${result.txHash}; no repitas el envío.`);
  }
}

export async function seedDemo(api, options, journal, now = () => Math.floor(Date.now() / 1000)) {
  const intent = seedIntent(options);
  const existing = options.execute ? await journal.read() : null;
  if (existing) {
    ensure(existing.version === 1 && existing.origin === api.origin && existing.mode === api.mode && JSON.stringify(existing.intent) === JSON.stringify(intent), "El journal pertenece a otra operación. Revisalo antes de usar otro archivo.");
    ensure(existing.result, "Hay un envío pendiente o ambiguo en el journal. Revisá chain e historial; no se reenviará.");
    await verifySeed(api, existing.request, existing.result);
    await journal.save({ ...existing, state: "verified" });
    return { dryRun: false, reused: true, ...existing.result };
  }
  const request = await prepareSeed(api, intent, now);
  if (!options.execute) return { dryRun: true, mode: api.mode, origin: api.origin, request };
  const record = { version: 1, origin: api.origin, mode: api.mode, state: "pending", intent, request, startedAt: new Date().toISOString() };
  await journal.create(record); // Exclusive file creation precedes the first possible transaction.
  let result;
  try { result = await api.request("/api/streams", request); }
  catch (error) {
    if (error.txHash) await journal.save({ ...record, txHash: error.txHash });
    throw error;
  }
  const confirmed = { ...record, state: "confirmed", result };
  await journal.save(confirmed);
  await verifySeed(api, request, result);
  await journal.save({ ...confirmed, state: "verified" });
  return { dryRun: false, reused: false, ...result };
}
