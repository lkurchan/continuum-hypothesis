import { describe, expect, it } from "vitest";
import type { DemoUser, StreamView } from "@/lib/domain/types";
import { availableCents, pickRoles, planWithdrawal, splitStreams } from "./account";

const user = (id: string, role: DemoUser["role"]): DemoUser => ({ id, name: id, role, address: `0x${"1".repeat(40)}` });
const users = [user("worker2", "worker"), user("platform", "payer"), user("worker1", "worker")];

const stream = (id: string, workerId: string, deposited: string, withdrawn = "0"): StreamView => ({
  id, payerId: "platform", workerId, totalAmount: "1000", deposited, withdrawn,
  start: 0, end: 1000, canceledAt: null, status: "streaming",
});

describe("pickRoles", () => {
  it("composes the first payer and the first worker by id", () => {
    const roles = pickRoles(users)!;
    expect(roles.payer.id).toBe("platform");
    expect(roles.receiver.id).toBe("worker1");
    expect(roles.providers.map((p) => p.id)).toEqual(["worker2"]);
  });

  it("needs a payer and two workers", () => {
    expect(pickRoles([user("platform", "payer"), user("worker1", "worker")])).toBeNull();
  });
});

describe("splitStreams", () => {
  it("separates incoming from outgoing without repeating streams", () => {
    const roles = pickRoles(users)!;
    const toReceiver = stream("0", "worker1", "1000");
    const toProvider = stream("1", "worker2", "1000");
    const { incoming, outgoing } = splitStreams(roles, [toReceiver, toProvider], [toReceiver]);
    expect(incoming.map((s) => s.id)).toEqual(["0"]);
    expect(outgoing.map((s) => s.id)).toEqual(["1"]);
  });
});

describe("planWithdrawal", () => {
  const a = stream("0", "worker1", "1000", "100");  // 500 vested at t=500 → 400 available
  const b = stream("1", "worker1", "300");          // capped by deposit → 300 available

  it("measures availability at the last whole second", () => {
    expect(availableCents(a, 500.9)).toBe(40000);
  });

  it("takes from the largest balance first", () => {
    expect(planWithdrawal([b, a], 500, 500)).toEqual([
      { streamId: "0", amount: "400.00" },
      { streamId: "1", amount: "100.00" },
    ]);
  });

  it("returns an empty plan when the balance is not enough", () => {
    expect(planWithdrawal([a, b], 700.01, 500)).toEqual([]);
  });

  it("ignores non-positive amounts", () => {
    expect(planWithdrawal([a], 0, 500)).toEqual([]);
  });

  it("preserves decimal cents without floating-point truncation", () => {
    const small = stream("2", "worker1", "0.29");
    expect(availableCents(small, 500)).toBe(29);
    expect(planWithdrawal([small], 0.29, 500)).toEqual([{ streamId: "2", amount: "0.29" }]);
    expect(planWithdrawal([small], 0.30, 500)).toEqual([]);
  });

  it("rejects non-finite and unsafe requested amounts", () => {
    for (const amount of [NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
      expect(planWithdrawal([a], amount, 500)).toEqual([]);
    }
  });
});
