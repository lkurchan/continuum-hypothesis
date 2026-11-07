import { describe, expect, it } from "vitest";
import type { StreamView } from "@/lib/domain/types";
import { splitWithdrawal, totalRate, totalWithdrawable } from "./split";

const stream = (id: string, o: Partial<StreamView>): StreamView => ({
  id, payerId: "p", workerId: "w", totalAmount: "1000", deposited: "1000", withdrawn: "0",
  start: 0, end: 100, canceledAt: null, status: "streaming", ...o,
});

const now = 51; // whole-second rule: withdrawable is read at second 50
// old: finished, 300 left. capped: earned 500 of 1000 but only 200 funded. live: earning 10/s, 500 vested.
const old = stream("old", { totalAmount: "300", start: 0, end: 10 });
const capped = stream("capped", { deposited: "200" });
const live = stream("live", { end: 100 });

describe("worker split", () => {
  it("adds up what every stream lets you withdraw", () => {
    expect(totalWithdrawable([old, capped, live], now)).toBe(300 + 200 + 500);
  });

  it("only counts the rate of streams still accruing", () => {
    expect(totalRate([old, capped, live], now)).toBe(10);
  });

  it("takes from stopped streams before the one still earning", () => {
    expect(splitWithdrawal([live, capped, old], now, 600)).toEqual([
      { streamId: "old", amount: 300 },
      { streamId: "capped", amount: 200 },
      { streamId: "live", amount: 100 },
    ]);
  });

  it("uses a single transaction when one stream covers it", () => {
    expect(splitWithdrawal([live, old], now, 120)).toEqual([{ streamId: "old", amount: 120 }]);
  });

  it("never asks for a fraction of a second the server has not reached", () => {
    expect(totalWithdrawable([live], 50.9)).toBe(490);
  });

  it("refuses more than the total", () => {
    expect(() => splitWithdrawal([old], now, 301)).toThrow();
  });
});
