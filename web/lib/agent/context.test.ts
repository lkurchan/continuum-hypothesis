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

  it("does not ask to fund the unused amount of a canceled agreement", async () => {
    const now = 1_800_000_000;
    const { service } = createDemoBackend(() => now);
    await service.cancel("0", "platform");
    const text = await payerSnapshot(service, "platform", now);
    const canceled = text.split("- Acuerdo #0")[1].split("- Acuerdo #1")[0];
    expect(canceled).toContain("estado canceled");
    expect(canceled).toContain("Falta fondear $0,00");
    expect(text).toContain("Total pendiente de fondeo (excluye cancelados): $6.000,00");
  });

  it("keeps unfinished funding of completed agreements in the overall total", async () => {
    let now = 1_800_000_000;
    const { service } = createDemoBackend(() => now);
    now += 3600;
    const text = await payerSnapshot(service, "platform", now);
    expect(text).toContain("En acuerdos vigentes: falta devengar $0,00 y falta fondear $0,00");
    expect(text).toContain("Total pendiente de fondeo (excluye cancelados): $15.000,00");
  });
});

describe("workerSnapshot", () => {
  it("gives the copilot the worker's computed balances", async () => {
    const now = 1_800_000_000;
    const { service } = createDemoBackend(() => now);
    const text = await workerSnapshot(service, "worker1", now);
    expect(text).toContain("Ana García");
    expect(text).toContain("Disponible para cobrar ahora: $");
    expect(text).toContain("primer tramo fondeado por el cliente");
  });

  it("rejects payers and unknown users", async () => {
    const { service } = createDemoBackend();
    await expect(workerSnapshot(service, "platform")).rejects.toThrow("solo para proveedores");
    await expect(workerSnapshot(service, "nobody")).rejects.toThrow("Usuario inexistente");
  });
});
