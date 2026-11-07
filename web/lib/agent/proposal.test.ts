import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { demoUsers as users } from "@/lib/db/demo";
import { amountsIn, toProposal } from "./proposal";

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
    [{ ...ok, items: [{ workerId: "worker1", totalAmount: 0 }] }, "¿Cuál es el precio total en pesos del acuerdo con Ana García?"],
    [{ ...ok, items: [{ workerId: "worker1", totalAmount: -5 }] }, "no es válido"],
    [{ ...ok, items: [ok.items[0], ok.items[0]] }, "dos veces"],
    [{ ...ok, period: 42 }, "duración"],
    [{ ...ok, fundPercent: 10 }, "25, 50 o 100"],
    [{ ...ok, items: [] }, "entre 1 y 100"],
  ])("rejects %j", (args, message) => {
    expect(() => toProposal(users, args)).toThrow(message);
  });
});

describe("amountsIn", () => {
  it("reads the ways people write pesos", () => {
    const found = amountsIn("Ana $300.000, Martín 250 mil, Juan 80k, Sofi 1,5 millones y 50 %");
    for (const n of [300_000, 250_000, 80_000, 1_500_000, 50]) expect(found.has(n)).toBe(true);
  });

  it("asks for the price when the model invents one", () => {
    const args = { items: [{ workerId: "worker2", totalAmount: 18_000 }], period: 604_800, fundPercent: 50 };
    expect(() => toProposal(users, args, "Quiero contratar a Martín")).toThrow("¿Cuál es el precio total");
    expect(toProposal(users, args, "Quiero contratar a Martín\n18 mil").items[0].totalAmount).toBe("18000");
  });
});
