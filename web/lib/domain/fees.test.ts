import { describe, expect, it } from "vitest";
import { FEE_BPS, feeFor } from "./fees";

describe("feeFor", () => {
  it("charges 5 bps (0.05%)", () => {
    expect(FEE_BPS).toBe(5);
    expect(feeFor("1000000")).toBe("500");
  });
  it("keeps decimal precision", () => {
    expect(feeFor("1500.5")).toBe("0.75025");
  });
  it("is zero for a zero deposit", () => {
    expect(feeFor("0")).toBe("0");
  });
  it("rounds down to the smallest unit", () => {
    // 1999 units * 5 / 10000 = 0.9995 units -> 0.
    expect(feeFor("0.000000000000001999")).toBe("0");
    // 2001 units -> 1.0005 units -> 1 unit.
    expect(feeFor("0.000000000000002001")).toBe("0.000000000000000001");
  });
});
