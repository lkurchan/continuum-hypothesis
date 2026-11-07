import { describe, expect, it } from "vitest";
import { fundingAmounts, fundingTerms, formatFundingAmount } from "./funding";
import type { StreamView } from "@/lib/domain/types";
const stream: StreamView = { id: "7", payerId: "platform", workerId: "worker2", totalAmount: "1", deposited: "0.5", withdrawn: "0", start: 100, end: 1100, canceledAt: null, status: "streaming" };
describe("tranche funding", () => {
  it("allows cents and the exact remaining amount", () => {
    expect(fundingTerms(stream, "0,10", "platform")?.amount).toBe("0.1");
    expect(fundingTerms(stream, "0.5", "platform")?.remaining).toBe("0.5");
  });
  it("rejects excess, zero, cancellation and another payer", () => {
    for (const amount of ["0", "-1", "0.500000000000000001", "NaN"]) expect(fundingTerms(stream, amount, "platform")).toBeNull();
    expect(fundingTerms(stream, "0.1", "worker2")).toBeNull();
    expect(fundingTerms({ ...stream, canceledAt: 200 }, "0.1", "platform")).toBeNull();
  });
  it("calculates coverage and bounded next tranches", () => {
    expect(fundingAmounts(stream, 200)).toEqual({ remaining: "0.5", quarter: "0.25", next: "0.1", coveredUntil: 600 });
    expect(fundingAmounts({ ...stream, deposited: "0.999" }, 1200).next).toBe("0.001");
    expect(fundingAmounts(stream, 1200).next).toBe("0.5");
    expect(fundingAmounts({ ...stream, deposited: "1" }, 200).remaining).toBe("0");
  });
});

describe("funding amount display", () => {
  it("preserves the exact debit and small fees without trailing zeros", () => {
    expect(formatFundingAmount("9.004500")).toBe("$9,0045");
    expect(formatFundingAmount("0.000000000000000001")).toBe("$0,000000000000000001");
    expect(formatFundingAmount("250125.0000")).toBe("$250.125");
    expect(formatFundingAmount("9007199254740993.01")).toBe("$9.007.199.254.740.993,01");
  });
});
