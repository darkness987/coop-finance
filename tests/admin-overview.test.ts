import test from "node:test";
import assert from "node:assert/strict";
import { adminOverview } from "../lib/reports/admin-overview";
import type { Database } from "../database/store";
test("admin charts use confirmed deposits and funded principal; drafts and waiting funds are excluded", () => {
  const db = {
    members: { records: [{ id: "m", name: "Test" }] },
    shares: {},
    returns: { allocations: [] },
    deposits: {
      accounts: [{ id: "SA-m", balanceCents: 150000, created: "2026-01-01" }],
      transactions: [
        {
          account: "SA-m",
          amountCents: 50000,
          type: "deposit",
          status: "confirmed",
          created: "2026-11-01",
        },
        {
          account: "SA-m",
          amountCents: 900000,
          type: "deposit",
          status: "pending",
          created: "2026-10-01",
        },
      ],
    },
    loans: {
      products: [
        { id: "ordinary", name: "Ordinary", active: true, annualRate: 5 },
      ],
      applications: [
        {
          id: "a",
          member: "m",
          product: "ordinary",
          status: "approved",
          created: "2026-01-01",
          amount: 1000,
        },
        {
          id: "b",
          member: "m",
          product: "ordinary",
          status: "submitted",
          created: "2026-11-01",
          amount: 2000,
        },
        {
          id: "c",
          member: "m",
          product: "ordinary",
          status: "draft",
          created: "2026-11-01",
          amount: 9999,
        },
      ],
      contracts: [
        {
          id: "funded",
          application: "a",
          status: "active",
          amount: 1000,
          disbursed: "2026-10-01",
        },
        { id: "unfunded", application: "a", status: "approved", amount: 99999 },
      ],
      payments: [
        {
          contract: "funded",
          principalCents: 20000,
          interestCents: 500,
          date: "2026-11-05",
        },
      ],
    },
  } as unknown as Database;
  const v = adminOverview(db, new Date("2026-11-20T00:00:00Z"));
  const trend = v.trends.find((t) => t.year === 2026)!;
  assert.equal(trend.months.length, 11);
  assert.equal(trend.months[9].deposits, 1000);
  assert.equal(trend.months[10].deposits, 1500);
  assert.equal(trend.months[9].loans, 1000);
  assert.equal(trend.months[10].loans, 800);
  assert.equal(v.loanTypes[0].amount, 800);
  assert.equal(v.loanTypes[0].approvedAmount, 99999);
  assert.equal(v.loanTypes[0].contractAmount, 100799);
  assert.deepEqual(v.contractTotals, {
    amount: 800,
    approvedAmount: 99999,
    contractAmount: 100799,
  });
  assert.deepEqual(v.approval, { approved: 1, rejected: 0, pending: 1 });
  assert.equal(v.waitingLoans.length, 1);
  assert.equal(v.interestIncome, 5);
  assert.equal(v.netProfit, null);
});
