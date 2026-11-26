import test from "node:test";
import assert from "node:assert/strict";
import { estimateMonthlyPlan } from "../lib/deposits/monthly-estimate";
test("monthly contract estimate weights each deposit by time held rather than all principal for the full term", () => {
  const result = estimateMonthlyPlan(12, 1000, "2027-01");
  assert.equal(result.annualRate, 2.25);
  assert.equal(result.principalCents, 1200000);
  assert.equal(result.interestCents, 14684);
  assert.equal(result.totalCents, 1214684);
  assert.equal(result.maturityDate, "2028-01-01");
  assert.equal(estimateMonthlyPlan(12, 2000, "2027-01").interestCents, 29367);
});
test("12/24/36 month estimates use contract rates and actual leap-year days", () => {
  for (const [months, rate] of [
    [12, 2.25],
    [24, 2.75],
    [36, 3],
  ]) {
    const result = estimateMonthlyPlan(months, 1000, "2028-01");
    let reference = 0;
    const end = new Date(result.maturityDate + "T00:00:00Z").getTime();
    for (let i = 0; i < months; i++)
      for (let date = Date.UTC(2028, i, 1); date < end; date += 86400000) {
        const year = new Date(date).getUTCFullYear();
        const days =
          (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86400000;
        reference += (100000 * rate) / 100 / days;
      }
    assert.equal(result.interestCents, Math.round(reference));
    assert.equal(
      result.totalCents,
      result.principalCents + result.interestCents,
    );
  }
  for (const [term, amount, period] of [
    [18, 1000, "2028-01"],
    [12, 0, "2028-01"],
    [12, 1000, "2028-13"],
  ])
    assert.throws(() => estimateMonthlyPlan(term, amount, period as string));
});
