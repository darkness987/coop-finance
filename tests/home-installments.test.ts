import test from "node:test";
import assert from "node:assert/strict";
import { dashboard } from "../lib/reports/dashboard";
import type { Database } from "../database/store";
function fixture() {
  return {
    shares: { accounts: [], payments: [] },
    deposits: { accounts: [], transactions: [] },
    loans: {
      contracts: [
        { id: "one", member: "m", status: "approved", amount: 10000 },
        { id: "two", member: "m", status: "active", amount: 10000 },
        { id: "closed", member: "m", status: "closed" },
        { id: "other", member: "other", status: "active" },
      ],
      payments: [],
      schedules: [
        {
          contract: "one",
          number: 1,
          dueDate: "2026-12-19",
          principalCents: 300000,
          interestCents: 36394,
          paidPrincipal: 0,
          paidInterest: 0,
        },
        {
          contract: "two",
          number: 1,
          dueDate: "2026-12-23",
          principalCents: 200000,
          interestCents: 20000,
          paidPrincipal: 0,
          paidInterest: 0,
        },
        {
          contract: "one",
          number: 2,
          dueDate: "2027-01-19",
          principalCents: 310000,
          interestCents: 26394,
          paidPrincipal: 0,
          paidInterest: 0,
        },
        {
          contract: "closed",
          number: 1,
          dueDate: "2026-12-19",
          principalCents: 999999,
          interestCents: 0,
          paidPrincipal: 0,
          paidInterest: 0,
        },
        {
          contract: "other",
          number: 1,
          dueDate: "2026-12-19",
          principalCents: 999999,
          interestCents: 0,
          paidPrincipal: 0,
          paidInterest: 0,
        },
      ],
    },
  } as unknown as Database;
}
test("home installment sums next unpaid row of every approved/active own contract even across due dates", () => {
  const d = dashboard(fixture(), "m", "2026-11");
  assert.equal(d.installmentSummary!.amount, 5563.94);
  assert.equal(d.installmentSummary!.count, 2);
  assert.equal(d.installmentSummary!.firstDue, "2026-12-19");
  assert.equal(d.installmentSummary!.lastDue, "2026-12-23");
});
test("partial payments reduce total; fully paid rows advance once and closed contracts disappear", () => {
  const db = fixture();
  db.loans.schedules[0].paidPrincipal = 100000;
  assert.equal(
    dashboard(db, "m", "2026-11").installmentSummary!.amount,
    4563.94,
  );
  db.loans.schedules[0].paidPrincipal = 300000;
  db.loans.schedules[0].paidInterest = 36394;
  assert.equal(
    dashboard(db, "m", "2026-11").installmentSummary!.amount,
    5563.94,
  );
  db.loans.contracts[0].status = "closed";
  db.loans.contracts[1].status = "closed";
  assert.equal(dashboard(db, "m", "2026-11").installmentSummary, null);
});
