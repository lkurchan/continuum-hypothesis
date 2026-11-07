import type { DemoUser } from "./types";

// Temporary Belo destination supplied by the demo operator; custody addresses stay unchanged.
export const DEMO_BELO_ADDRESS = "0x5d474d0744284a72afbc4032fd001de50ea72b7c" as const;

export function withDemoDestinations(user: DemoUser): DemoUser {
  return user.role === "worker" && (user.id === "worker1" || user.id === "worker2")
    ? { ...user, beloAddress: DEMO_BELO_ADDRESS }
    : user;
}
