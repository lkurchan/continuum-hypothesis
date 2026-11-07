import { describe, expect, it } from "vitest";
import { paymentReputation } from "./reputation";
import type { Activity, StreamView } from "./types";

const DAY = 86_400;
const iso = (sec: number) => new Date(sec * 1000).toISOString();

function stream(id: string, over: Partial<StreamView> = {}): StreamView {
  return { id, payerId: "client", workerId: "provider", totalAmount: "300", deposited: "300", withdrawn: "0",
    start: 0, end: 30 * DAY, canceledAt: null, status: "completed", ...over };
}
function deposit(streamId: string, kind: "create" | "topup", amount: string, atSec: number, txHash = `0x${streamId}${atSec}`): Activity {
  return { id: `${streamId}-${atSec}`, streamId, kind, amount, txHash, explorerUrl: `https://arbiscan.io/tx/${txHash}`,
    userId: "client", createdAt: iso(atSec) };
}

describe("paymentReputation", () => {
  it("returns sin_historial for a client without agreements", () => {
    const rep = paymentReputation("client", [], [], 100 * DAY);
    expect(rep).toMatchObject({ clientId: "client", agreements: 0, fullyFunded: 0, lateEpisodes: 0, daysLate: 0, score: "sin_historial" });
    expect(rep.lastTx).toBeNull();
  });

  it("scores a punctual client as excelente and averages the funding lead", () => {
    // 300 over 30 days: each 100 covers 10 days. Tramos arrive 2 and 1 days before coverage ends.
    const activity = [deposit("s1", "create", "100", 0), deposit("s1", "topup", "100", 8 * DAY), deposit("s1", "topup", "100", 19 * DAY)];
    const rep = paymentReputation("client", [stream("s1")], activity, 40 * DAY);
    expect(rep).toMatchObject({ agreements: 1, fullyFunded: 1, lateEpisodes: 0, daysLate: 0, score: "excelente" });
    expect(rep.avgFundingLeadDays).toBeCloseTo(1.5, 5);
    expect(rep.lastTx?.hash).toBe(`0xs1${19 * DAY}`);
  });

  it("counts a late tramo and the days it was late", () => {
    const activity = [deposit("s1", "create", "100", 0), deposit("s1", "topup", "200", 12 * DAY)];
    const rep = paymentReputation("client", [stream("s1")], activity, 40 * DAY);
    expect(rep.lateEpisodes).toBe(1);
    expect(rep.daysLate).toBeCloseTo(2, 5);
    expect(rep.avgFundingLeadDays).toBeCloseTo(-2, 5);
    expect(rep.score).toBe("buena");
  });

  it("counts an agreement that is currently underfunded as late until now (capped at the end)", () => {
    const s = stream("s2", { deposited: "100", status: "streaming" });
    const rep = paymentReputation("client", [s], [deposit("s2", "create", "100", 0)], 15 * DAY);
    expect(rep).toMatchObject({ agreements: 1, fullyFunded: 0, lateEpisodes: 1 });
    expect(rep.daysLate).toBeCloseTo(5, 5);
    const afterEnd = paymentReputation("client", [{ ...s, status: "completed" }], [deposit("s2", "create", "100", 0)], 90 * DAY);
    expect(afterEnd.daysLate).toBeCloseTo(20, 5);
  });

  it("scores several late episodes as regular and ignores other clients' agreements", () => {
    const activity = [
      deposit("a", "create", "100", 0), deposit("a", "topup", "200", 11 * DAY),
      deposit("b", "create", "100", 0), deposit("b", "topup", "200", 13 * DAY),
    ];
    const other = stream("x", { payerId: "someone-else", deposited: "0" });
    const rep = paymentReputation("client", [stream("a"), stream("b"), other], activity, 40 * DAY);
    expect(rep.agreements).toBe(2);
    expect(rep.lateEpisodes).toBe(2);
    expect(rep.score).toBe("regular");
  });

  it("does not penalize canceled agreements after their cancellation", () => {
    const s = stream("c", { deposited: "100", canceledAt: 5 * DAY, status: "canceled" });
    const rep = paymentReputation("client", [s], [deposit("c", "create", "100", 0)], 40 * DAY);
    expect(rep.lateEpisodes).toBe(0);
    expect(rep.score).toBe("excelente");
  });
});
