import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createDemoBackend } from "@/lib/db/demo";
import { workerSnapshot } from "./context";

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
