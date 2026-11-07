import { describe, expect, it } from "vitest";
import { normalizeAmount } from "./amounts";
import { vestedAt, withdrawableAt } from "./vesting";

const stream = { totalAmount: "100", deposited: "40", withdrawn: "10", start: 100, end: 200, canceledAt: null };

describe("vesting", () => {
  it.each([[0, "0"], [100, "0"], [125, "25"], [199, "99"], [200, "100"], [300, "100"]])("vests at %s", (now, expected) => {
    expect(vestedAt(stream, now)).toBe(expected);
  });
  it("uses whole seconds, floors atomic units and preserves all 18 decimals", () => {
    expect(vestedAt({ ...stream, totalAmount: "1", end: 103 }, 101.99)).toBe("0.333333333333333333");
    expect(vestedAt({ ...stream, totalAmount: "9007199254740993.000000000000000002" }, 150)).toBe("4503599627370496.500000000000000001");
  });
  it("freezes at cancellation, including before the stream starts", () => {
    expect(vestedAt({ ...stream, canceledAt: 125 }, 300)).toBe("25");
    expect(vestedAt({ ...stream, canceledAt: 90 }, 300)).toBe("0");
  });
  it("caps withdrawals by funding and accounts for previous withdrawals", () => {
    expect(withdrawableAt(stream, 150)).toBe("30");
    expect(withdrawableAt({ ...stream, deposited: "100" }, 125)).toBe("15");
  });
  it("rejects invalid intervals and clocks", () => {
    expect(() => vestedAt({ ...stream, end: 100 }, 150)).toThrow();
    expect(() => vestedAt(stream, NaN)).toThrow();
  });
});

describe("amount validation", () => {
  it.each(["-1", "1e18", "0.0000000000000000001", "NaN", " 1", "", "01", 1])("rejects %s", (amount) => {
    expect(() => normalizeAmount(amount)).toThrow();
  });
  it("enforces uint256 without rounding", () => {
    const max = "115792089237316195423570985008687907853269984665640564039457.584007913129639935";
    expect(normalizeAmount(max)).toBe(max);
    expect(() => normalizeAmount("115792089237316195423570985008687907853269984665640564039457.584007913129639936")).toThrow();
    expect(normalizeAmount("10.5000")).toBe("10.5");
  });
});
