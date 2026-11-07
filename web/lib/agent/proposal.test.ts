import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { demoUsers as users } from "@/lib/db/demo";
import { toProposal } from "./proposal";

describe("toProposal", () => {
  const ok = { items: [{ workerId: "worker1", totalAmount: 300_001 }], period: 604_800, fundPercent: 25 };

  it("maps names and floors the first tranche", () => {
    expect(toProposal(users, ok)).toEqual({
      items: [{ workerId: "worker1", name: "Ana García", totalAmount: "300001", initialDeposit: "75000" }],
      period: 604_800,
    });
  });

  it.each([
    [{ ...ok, items: [{ workerId: "nobody", totalAmount: 1 }] }, "No encontré"],
    [{ ...ok, items: [{ workerId: "platform", totalAmount: 1 }] }, "No encontré"],
    [{ ...ok, items: [{ workerId: "worker1", totalAmount: 0 }] }, "no es válido"],
    [{ ...ok, items: [ok.items[0], ok.items[0]] }, "dos veces"],
    [{ ...ok, period: 42 }, "duración"],
    [{ ...ok, fundPercent: 10 }, "25, 50 o 100"],
    [{ ...ok, items: [] }, "entre 1 y 100"],
  ])("rejects %j", (args, message) => {
    expect(() => toProposal(users, args)).toThrow(message);
  });
});
