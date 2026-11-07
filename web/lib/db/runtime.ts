import "server-only";
import type { StreamGateway } from "@/lib/chain/StreamGateway";
import { ViemStreamGateway } from "@/lib/chain/ViemStreamGateway";
import { StreamService } from "@/lib/domain/StreamService";
import { requireCondition } from "@/lib/domain/errors";
import { createDemoBackend } from "./demo";
import type { Repository } from "./Repository";
import { SupabaseRepository } from "./SupabaseRepository";

export type Backend = { mode: "mock" | "real"; gateway: StreamGateway; repository: Repository; service: StreamService };
const shared = globalThis as typeof globalThis & { continuumBackend?: Backend };

export function getBackend(): Backend {
  const mode = process.env.CHAIN_MODE ?? "mock";
  requireCondition(mode === "mock" || mode === "real", "CHAIN_MODE debe ser mock o real.", 503);
  if (shared.continuumBackend?.mode === mode) return shared.continuumBackend;
  if (mode === "mock") shared.continuumBackend = createDemoBackend();
  else {
    const repository = SupabaseRepository.fromEnv();
    const gateway = ViemStreamGateway.fromEnv();
    shared.continuumBackend = { mode, gateway, repository, service: new StreamService(gateway, repository, mode) };
  }
  return shared.continuumBackend;
}
