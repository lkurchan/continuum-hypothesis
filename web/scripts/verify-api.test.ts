import { expect, it, vi } from "vitest";
import { apiClient } from "./lib/demo-api.mjs";
import { verifyApi } from "./lib/verify-api.mjs";

const wallets = [
  { id: "platform", role: "payer", address: `0x${"1".repeat(40)}` },
  { id: "worker1", role: "worker", address: `0x${"2".repeat(40)}` },
  { id: "worker2", role: "worker", address: `0x${"3".repeat(40)}` },
];
const stream = { id: "1", payerId: "platform", workerId: "worker1" };

function fixture(overrides: Record<string, unknown> = {}) {
  const fetcher = vi.fn<typeof fetch>(async input => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const user = url.searchParams.get("userId");
    const shared = user === "platform" || user === "worker1";
    const body = url.pathname === "/api/users" ? wallets : url.pathname === "/api/streams" ? (shared ? [stream] : []) : (shared ? [{ streamId: "1" }] : []);
    return Response.json(overrides[url.pathname + url.search] ?? body, { headers: { "X-Chain-Mode": "real" } });
  });
  return { fetcher, api: apiClient("http://127.0.0.1:3000", "real", fetcher) };
}

it("verifies all demo views using GET only and matching public wallets", async () => {
  const { api, fetcher } = fixture();
  expect(await verifyApi(api, wallets)).toMatchObject({ readOnly: true, mode: "real", checks: [
    { userId: "platform", streams: 1, activity: 1 }, { userId: "worker1", streams: 1, activity: 1 }, { userId: "worker2", streams: 0, activity: 0 },
  ] });
  expect(fetcher).toHaveBeenCalledTimes(7);
  for (const call of fetcher.mock.calls) expect(call).toEqual([expect.any(URL), expect.objectContaining({ method: "GET", body: undefined })]);
});

it("rejects unexpected fields and mismatched wallets without printing private values", async () => {
  const { api } = fixture({ "/api/users": [{ ...wallets[0], privateKey: "must-not-escape" }, ...wallets.slice(1)] });
  await expect(verifyApi(api, wallets)).rejects.toThrow("contrato público");
  await expect(verifyApi(api, wallets)).rejects.not.toThrow("must-not-escape");
  const other = fixture({ "/api/users": [{ ...wallets[0], address: wallets[1].address }, ...wallets.slice(1)] });
  await expect(verifyApi(other.api, wallets)).rejects.toThrow("wallet y el rol");
});

it("rejects streams or activity leaked across worker identities", async () => {
  const streams = fixture({ "/api/streams?userId=worker2": [stream] });
  await expect(verifyApi(streams.api, wallets)).rejects.toThrow("streams de otro participante");
  const activity = fixture({ "/api/activity?userId=worker2": [{ streamId: "1" }] });
  await expect(verifyApi(activity.api, wallets)).rejects.toThrow("actividad de otro participante");
});
