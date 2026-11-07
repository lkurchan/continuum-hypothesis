import { describe, expect, it } from "vitest";
import { coverAmount, monthlyRate, monthProgress } from "./cover";

const nov7 = new Date(2026, 10, 7, 12, 0, 0);

describe("monthProgress", () => {
  it("measures the local month", () => {
    const { elapsed, length } = monthProgress(nov7);
    expect(length).toBe(30 * 86400);
    expect(elapsed).toBe(6.5 * 86400);
  });
});

describe("coverAmount", () => {
  const monthly = 2_400_000;
  const target = (monthly * 6.5) / 30;

  it("starts at zero when the page opens", () => {
    expect(coverAmount(monthly, nov7, nov7.getTime())).toBe(0);
  });

  it("reaches the month-to-date accrual after the ramp", () => {
    const opened = nov7.getTime() - 1800;
    expect(coverAmount(monthly, nov7, opened)).toBeCloseTo(target, 6);
  });

  it("is already past half of the target at a third of the ramp", () => {
    const opened = nov7.getTime() - 600;
    expect(coverAmount(monthly, nov7, opened)).toBeGreaterThan(target / 2);
  });

  it("grows at the contract rate after the ramp", () => {
    const opened = nov7.getTime() - 10_000;
    const later = new Date(nov7.getTime() + 10_000);
    const delta = coverAmount(monthly, later, opened) - coverAmount(monthly, nov7, opened);
    expect(delta).toBeCloseTo(monthlyRate(monthly, nov7) * 10, 6);
  });

  it("skips the ramp when it is disabled", () => {
    expect(coverAmount(monthly, nov7, nov7.getTime(), 0)).toBeCloseTo(target, 6);
  });
});
