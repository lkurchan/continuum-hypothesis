import { isAddressEqual } from "viem";
import { ensure } from "./environment.mjs";

const publicUserFields = new Set(["id", "name", "role", "address", "beloAddress", "avatarUrl"]);

export async function verifyApi(api, wallets) {
  const users = await api.request("/api/users");
  ensure(Array.isArray(users), "La API no devolvió usuarios válidos.");
  ensure(users.every(user => user && typeof user === "object" && Object.keys(user).every(key => publicUserFields.has(key))),
    "La respuesta de usuarios contiene campos fuera del contrato público. Revisá el servidor.");
  const checks = [];
  for (const wallet of wallets) {
    const matches = users.filter(user => user.id === wallet.id);
    ensure(matches.length === 1 && matches[0].role === wallet.role && typeof matches[0].address === "string" &&
      isAddressEqual(matches[0].address, wallet.address), `La API no tiene la wallet y el rol esperados para ${wallet.id}.`);
    const id = encodeURIComponent(wallet.id);
    const [streams, activity] = await Promise.all([api.request(`/api/streams?userId=${id}`), api.request(`/api/activity?userId=${id}`)]);
    ensure(Array.isArray(streams) && Array.isArray(activity), `Respuesta inválida de streams o actividad para ${wallet.id}.`);
    ensure(streams.every(stream => stream && (wallet.role === "payer" ? stream.payerId : stream.workerId) === wallet.id),
      `La API expone streams de otro participante a ${wallet.id}.`);
    const streamIds = new Set(streams.map(stream => stream.id));
    ensure(activity.every(row => row && streamIds.has(row.streamId)), `La API expone actividad de otro participante a ${wallet.id}.`);
    checks.push({ userId: wallet.id, walletMatches: true, streams: streams.length, activity: activity.length });
  }
  return { mode: api.mode, readOnly: true, origin: api.origin, checks };
}
