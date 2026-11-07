import { ExactDecimal, normalizeAmount } from "@/lib/domain/amounts";

export const durationUnits = { minutes: 60, hours: 3600, days: 86400, months: 30 * 86400 } as const;
export type DurationUnit = keyof typeof durationUnits;

export function contractTerms(totalText: string, depositText: string, percent: number | null, durationText: string, unit: DurationUnit) {
  try {
    const totalAmount = normalizeAmount(totalText.replace(",", "."));
    const total = new ExactDecimal(totalAmount);
    const initialDeposit = percent === null ? normalizeAmount(depositText.replace(",", "."))
      : total.mul(percent).div(100).toDecimalPlaces(18).toFixed();
    const duration = Number(durationText);
    const seconds = duration * durationUnits[unit];
    if (!total.gt(0) || new ExactDecimal(initialDeposit).gt(total) ||
      (percent !== null && (!Number.isFinite(percent) || percent < 0 || percent > 100)) ||
      !/^\d+$/.test(durationText) || !Number.isSafeInteger(duration) || duration <= 0 ||
      !Number.isSafeInteger(seconds) || seconds > 100 * 365 * 86400) return null;
    return { totalAmount, initialDeposit, seconds };
  } catch { return null; }
}
