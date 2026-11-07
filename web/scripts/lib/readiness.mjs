import { createPublicClient, erc20Abi, formatEther, formatUnits, http, isAddress, isAddressEqual, parseAbi, zeroAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";
import { createClient } from "@supabase/supabase-js";
import { ensure } from "./environment.mjs";

export const tokenAddress = "0x59863989d080B22476DB95656d0C3CC18be92214";
export const users = [{ id: "platform", role: "payer" }, { id: "worker1", role: "worker" }, { id: "worker2", role: "worker" }];
const streamsAbi = parseAbi(["function nextStreamId() view returns (uint256)"]);

export function walletPlan(env) {
  const wallets = users.map(user => {
    const key = env[`DEMO_PK_${user.id.toUpperCase()}`];
    ensure(typeof key === "string" && /^0x[0-9a-fA-F]{64}$/.test(key), `Falta una clave válida para ${user.id}.`);
    let address;
    try { address = privateKeyToAccount(key).address; } catch { ensure(false, `La clave de ${user.id} está fuera de rango.`); }
    return { ...user, address };
  });
  ensure(new Set(wallets.map(user => user.address.toLowerCase())).size === wallets.length, "Cada usuario demo debe tener una wallet distinta.");
  return wallets;
}

export function database(env) {
  let url;
  try { url = new URL(env.NEXT_PUBLIC_SUPABASE_URL); } catch { ensure(false, "Falta NEXT_PUBLIC_SUPABASE_URL válida."); }
  ensure(url.protocol === "https:" && !url.username && !url.password, "La URL de Supabase debe usar HTTPS sin credenciales en la URL.");
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  ensure(typeof key === "string" && key.length > 0, "Falta SUPABASE_SERVICE_ROLE_KEY (service_role o secret)." );
  if (!key.startsWith("sb_secret_")) {
    let role;
    try { role = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role; } catch { /* Invalid JWT or public key. */ }
    ensure(role === "service_role", "Usá la clave service_role o secret del servidor, no la clave anon/publishable.");
  }
  return createClient(url.href, key, { auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }) } });
}

export function walletUpdates(wallets, rows) {
  return wallets.map(wallet => {
    const row = rows.find(user => user.id === wallet.id);
    ensure(row, `Falta el usuario ${wallet.id}; aplicá supabase/seed.sql.`);
    ensure(row.role === wallet.role, `El rol de ${wallet.id} no coincide con el seed.`);
    ensure(isAddress(row.address, { strict: false }), `La dirección guardada de ${wallet.id} es inválida.`);
    ensure(isAddressEqual(row.address, zeroAddress) || isAddressEqual(row.address, wallet.address),
      `La wallet guardada de ${wallet.id} es distinta. No se sobrescribe; revisá claves y base.`);
    return { ...wallet, previous: row.address, change: !isAddressEqual(row.address, wallet.address) };
  });
}

export async function syncWallets(client, wallets, apply = false) {
  const { data, error } = await client.from("users").select("id,role,address").in("id", users.map(user => user.id));
  ensure(!error && Array.isArray(data), "No se pudieron leer los usuarios demo. Revisá Supabase, migraciones y seed.");
  const plan = walletUpdates(wallets, data);
  if (apply) {
    for (const item of plan.filter(item => item.change)) {
      // Compare-and-set: never replace an address changed after the initial read.
      const result = await client.from("users").update({ address: item.address })
        .eq("id", item.id).eq("role", item.role).eq("address", item.previous).select("id");
      ensure(!result.error && result.data?.length === 1, `No se pudo configurar ${item.id}; la base pudo cambiar. Volvé a revisar el plan.`);
    }
  }
  return plan;
}

export async function checkReadiness(env, dependencies = {}) {
  const checks = [];
  const add = (name, status, detail) => checks.push({ name, status, detail });
  const mode = env.CHAIN_MODE ?? "mock";
  add("modo", ["mock", "real"].includes(mode) ? "ok" : "error", `CHAIN_MODE=${["mock", "real"].includes(mode) ? mode : "inválido"}. El diagnóstico comprueba requisitos del modo real.`);
  let wallets = [];
  try { wallets = walletPlan(env); add("claves", "ok", "Tres claves válidas con wallets distintas."); }
  catch (error) { add("claves", "error", error.message); }

  let chain;
  try {
    const rpc = new URL(env.ARBITRUM_RPC_URL);
    ensure(["http:", "https:"].includes(rpc.protocol), "RPC inválido.");
    chain = dependencies.chain ?? createPublicClient({ chain: arbitrum, transport: http(rpc.href, { timeout: 10_000, retryCount: 0 }) });
    ensure(await chain.getChainId() === 42161, "El RPC no es Arbitrum One.");
    add("red", "ok", "Arbitrum One (42161).");
  } catch { add("red", "error", "RPC ausente, inaccesible o de otra chain."); chain = undefined; }
  if (chain) {
    const configuredToken = env.ARGT_ADDRESS || tokenAddress;
    try {
      ensure(isAddress(configuredToken, { strict: false }) && isAddressEqual(configuredToken, tokenAddress), "Token incorrecto.");
      ensure(await chain.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "decimals" }) === 18, "Decimales incorrectos.");
      add("token", "ok", "ARGt de Arbitrum, 18 decimales.");
    } catch { add("token", "error", "Dirección de ARGt o decimales incorrectos, o lectura fallida."); }
    try {
      const contract = env.STREAMS_CONTRACT_ADDRESS;
      ensure(isAddress(contract, { strict: false }) && !isAddressEqual(contract, zeroAddress), "Contrato inválido.");
      const code = await chain.getCode({ address: contract });
      ensure(code && code !== "0x", "Contrato sin código.");
      const next = await chain.readContract({ address: contract, abi: streamsAbi, functionName: "nextStreamId" });
      ensure(typeof next === "bigint" && next > 0n, "Interfaz incorrecta.");
      add("contrato", "ok", `${contract}; próximo stream ${next}.`);
    } catch { add("contrato", "error", "Contrato ausente, sin código o sin la interfaz esperada."); }
    await Promise.all(wallets.map(async wallet => {
      try {
        const [gas, argt] = await Promise.all([chain.getBalance({ address: wallet.address }),
          chain.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "balanceOf", args: [wallet.address] })]);
        add(`saldo:${wallet.id}`, gas > 0n && (wallet.role !== "payer" || argt > 0n) ? "ok" : "error",
          `${wallet.address}: ${formatEther(gas)} ETH, ${formatUnits(argt, 18)} ARGt. Gas positivo no garantiza que alcance para todo el flujo.`);
      } catch { add(`saldo:${wallet.id}`, "error", "No se pudieron consultar los balances."); }
    }));
  }
  try {
    const db = dependencies.db ?? database(env);
    for (const [table, columns] of [["users", "id,role,address,belo_address"], ["streams", "id,payer_id,worker_id,created_tx"],
      ["activity", "id,stream_id,kind,amount::text,tx_hash"], ["agent_rules", "id,worker_id,kind,active"]]) {
      const result = await db.from(table).select(columns).limit(1);
      add(`tabla:${table}`, result.error ? "error" : "ok", result.error ? "No accesible; revisá migraciones, clave y Data API." : "Lectura disponible.");
    }
    const result = await db.from("users").select("id,role,address,belo_address").in("id", users.map(user => user.id));
    ensure(!result.error && Array.isArray(result.data), "No se pudieron leer usuarios.");
    if (wallets.length) {
      const updates = walletUpdates(wallets, result.data);
      add("usuarios", updates.some(item => item.change) ? "error" : "ok",
        updates.some(item => item.change) ? "Hay direcciones cero. Ejecutá backend:wallets y revisá el plan." : "Roles y wallets coinciden con las claves locales.");
      const belo = result.data.filter(user => user.role === "worker" && isAddress(user.belo_address, { strict: false }) && !isAddressEqual(user.belo_address, zeroAddress));
      add("belo", belo.length === 2 ? "ok" : "warning", `${belo.length}/2 direcciones configuradas. La compatibilidad con ARGt requiere confirmación externa.`);
    }
    // PostgREST's schema document is a read-only check for the batch RPC.
    const schema = dependencies.schema ?? (async () => {
      const key = env.SUPABASE_SERVICE_ROLE_KEY;
      const headers = { apikey: key, Accept: "application/openapi+json" };
      if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;
      const response = await fetch(new URL("/rest/v1/", env.NEXT_PUBLIC_SUPABASE_URL), { headers, signal: AbortSignal.timeout(10_000) });
      ensure(response.ok, "Schema no disponible.");
      return response.json();
    });
    try {
      const doc = await schema();
      add("rpc:record_stream_creation", doc.paths?.["/rpc/record_stream_creation"]?.post ? "ok" : "error", "Comprobación del RPC transaccional en el schema de PostgREST.");
    } catch { add("rpc:record_stream_creation", "warning", "No se pudo leer OpenAPI. Confirmá que se aplicó la migración 0002."); }
  } catch { add("supabase", "error", "Supabase no está configurado o usuarios/roles/wallets no coinciden. Revisá backend:wallets, migraciones y seed."); }
  return { ready: checks.every(check => check.status !== "error"), mode, checks };
}
