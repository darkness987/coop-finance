import test from "node:test";
import assert from "node:assert/strict";
import { sharePeriodTotals } from "../lib/shares/share-period";
test("period totals isolate member/month, exclude pending money and sum multiple receipts", () => {
  const rows = [
    { member: "m", period: "2026-11", amount: 1500, received: "2026-11-19" },
    { member: "m", period: "2026-11", amount: 500, received: null },
    {
      member: "other",
      period: "2026-11",
      amount: 10000,
      received: "2026-11-19",
    },
    { member: "m", period: "2026-10", amount: 2000, received: "2026-10-19" },
  ];
  assert.deepEqual(sharePeriodTotals(rows, "m", "2026-11", 2000), {
    paidAmount: 1500,
    pendingAmount: 500,
    remainingAmount: 500,
    complete: false,
  });
  rows[1].received = "2026-11-19";
  assert.deepEqual(sharePeriodTotals(rows, "m", "2026-11", 2000), {
    paidAmount: 2000,
    pendingAmount: 0,
    remainingAmount: 0,
    complete: true,
  });
});
