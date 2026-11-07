import { describe, expect, it } from "vitest";
import { contractTerms } from "./contract-form";

describe("contract terms", () => {
  it("keeps the small initial deposit independent from the full service price", () => {
    expect(contractTerms("90000", "0,10", null, "17", "days"))
      .toEqual({ totalAmount: "90000", initialDeposit: "0.1", seconds: 17 * 86400 });
  });
  it("calculates partial funding exactly and supports custom duration", () => {
    expect(contractTerms("123.45", "", 25, "45", "minutes"))
      .toEqual({ totalAmount: "123.45", initialDeposit: "30.8625", seconds: 2700 });
  });
  it("rejects excess funding and invalid durations", () => {
    expect(contractTerms("1", "1.01", null, "1", "days")).toBeNull();
    for (const duration of ["0", "-1", "1.5", "", "Infinity", "999999999999"]) {
      expect(contractTerms("100", "0.1", null, duration, "days")).toBeNull();
    }
    expect(contractTerms("100", "0.1", 101, "1", "days")).toBeNull();
  });
});
