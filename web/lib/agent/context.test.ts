import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createDemoBackend } from "@/lib/db/demo";
import { payerSnapshot, workerSnapshot } from "./context";

describe("payerSnapshot", () => {
  it("gives the client assistant coverage, totals and provider ids", async () => {
    const now = 1_800_000_000;
    const { service } = createDemoBackend(() => now);
    const text = await payerSnapshot(service, "platform", now);
    expect(text).toContain("id worker1: Ana García");
    expect(text).toContain("cubierto hasta");
    expect(text).toContain("Falta fondear $");
    expect(text).toContain("hash mock:seed-0");
  });

  it("flags agreements where vested exceeds funding", async () => {
    let now = 1_800_000_000;
    const { service } = createDemoBackend(() => now);
    now += 600; // Ana's seeded stream is funded at 50 % and is past its midpoint here.
    expect(await payerSnapshot(service, "platform", now)).toContain("ATRASADO: le debe $");
  });

  it("rejects providers", async () => {
    const { service } = createDemoBackend();
    await expect(payerSnapshot(service, "worker1")).rejects.toThrow("solo para clientes");
  });
});

describe("workerSnapshot", () => {
  it("gives the copilot the worker's computed balances", async () => {
    const now = 1_800_000_000;
    const { service } = createDemoBackend(() => now);
    const text = await workerSnapshot(service, "worker1", now);
    expect(text).toContain("Ana García");
    expect(text).toContain("Disponible para retirar ahora: $");
    expect(text).toContain("fondeo inicial del pagador");
  });

  it("rejects payers and unknown users", async () => {
    const { service } = createDemoBackend();
    await expect(workerSnapshot(service, "platform")).rejects.toThrow("solo para trabajadores");
    await expect(workerSnapshot(service, "nobody")).rejects.toThrow("Usuario inexistente");
  });
});
