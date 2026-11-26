import test from "node:test";
import assert from "node:assert/strict";
import type { Database } from "../database/store";
import { changeDeposits, readDeposits } from "../lib/deposits/deposits";
import { depositSettings } from "../lib/deposits/deposit-settings";
import { readBenefits } from "../lib/returns/benefits";
import { estimateMonthlyPlan } from "../lib/deposits/monthly-estimate";
const member = { id: "m-user", role: "member", member: "44444444" },
  admin = { id: "admin", role: "admin", member: "" };
function fixture() {
  return {
    version: 1,
    members: {
      records: [{ id: member.member, name: "Test", active: 1 }],
      applications: [],
    },
    shares: {
      accounts: [{ member: member.member, opening_amount: 1000 }],
      payments: [],
      rules: [],
      changeRequests: [],
    },
    returns: { allocations: [], dividends: [], rebates: [] },
    deposits: {
      accounts: [
        {
          id: "savings",
          member: member.member,
          type: "savings",
          balanceCents: 100000,
          status: "active",
          created: "2026-01-01",
        },
      ],
      transactions: [],
    },
    loans: { contracts: [], applications: [], payments: [], schedules: [] },
    auth: { users: [], auditLogs: [] },
  } as unknown as Database;
}
function input(db: Database, extra: any = {}) {
  const c = depositSettings(db);
  return {
    action: "save-settings",
    revision: c.revision,
    savingsRate: 1.5,
    specialRate: 2.1,
    minimumMonthlyAmount: 500,
    monthlyTerms: c.monthlyTerms.map((t) =>
      t.months === 12 ? { ...t, months: 11, rate: 2.6 } : t,
    ),
    openingEnabled: { savings: true, special: true, monthly: true },
    ...extra,
  };
}
test("admin changes 12 to 11 and rates; member API, opening, estimates and central rates all use saved settings", () => {
  const db = fixture();
  changeDeposits(db, admin, input(db));
  const view = readDeposits(db, member);
  assert.equal(view.monthlyTerms[0].months, 11);
  assert.equal(view.monthlyTerms[0].rate, 2.6);
  assert.equal(view.canConfigure, false);
  assert.throws(() =>
    changeDeposits(db, member, {
      action: "open",
      type: "monthly",
      termMonths: 12,
      monthlyAmount: 1000,
    }),
  );
  assert.throws(() =>
    changeDeposits(db, member, {
      action: "open",
      type: "monthly",
      termMonths: 11,
      monthlyAmount: 499.99,
    }),
  );
  changeDeposits(db, member, {
    action: "open",
    type: "monthly",
    termMonths: 11,
    monthlyAmount: 1000,
    annualRate: 0,
  });
  const account = db.deposits.accounts.find((a) => a.type === "monthly")!;
  assert.equal(account.monthlyPlan.termMonths, 11);
  assert.equal(account.monthlyPlan.annualRate, 2.6);
  assert.equal(account.balanceCents, 0);
  const benefits = readBenefits(db, member);
  assert.equal(
    benefits.deposits.accounts.find((a) => a.account === account.id)!
      .monthlyPlan!.annualRate,
    2.6,
  );
  assert.equal(
    benefits.deposits.accounts.find((a) => a.account === "savings")!
      .estimatedCents,
    1500,
  );
  assert.ok(
    estimateMonthlyPlan(11, 1000, "2026-11", view.monthlyTerms).interestCents >
      0,
  );
});
test("changed or removed options never reprice saved contracts; explicitly saving a new plan snapshots its new rate", () => {
  const db = fixture();
  changeDeposits(db, member, {
    action: "open",
    type: "monthly",
    termMonths: 12,
    monthlyAmount: 1000,
  });
  const account = db.deposits.accounts.find((a) => a.type === "monthly")!;
  const before = readBenefits(db, member).deposits.accounts.find(
    (a) => a.account === account.id,
  )!.monthlyPlan;
  changeDeposits(db, admin, input(db));
  assert.deepEqual(
    readBenefits(db, member).deposits.accounts.find(
      (a) => a.account === account.id,
    )!.monthlyPlan,
    before,
  );
  changeDeposits(db, member, {
    action: "monthly-plan",
    account: account.id,
    termMonths: 12,
    monthlyAmount: 2000,
  });
  assert.equal(account.monthlyPlan.annualRate, 2.25);
  changeDeposits(db, member, {
    action: "monthly-plan",
    account: account.id,
    termMonths: 11,
    monthlyAmount: 1000,
  });
  assert.equal(account.monthlyPlan.annualRate, 2.6);
  const settings = depositSettings(db);
  changeDeposits(
    db,
    admin,
    input(db, {
      monthlyTerms: settings.monthlyTerms.map((t) => ({ ...t, rate: 5 })),
    }),
  );
  assert.equal(
    readDeposits(db, member).accounts.find((a) => a.id === account.id)!.rate,
    2.6,
  );
});
test("member and non-admin staff cannot change deposit policy or bypass server-side rate validation", () => {
  const db = fixture(),
    original = structuredClone(db);
  for (const a of [
    member,
    { ...admin, accessRole: "accountant" },
    { ...admin, accessRole: "member_officer" },
  ])
    assert.throws(() => changeDeposits(db, a, input(db)), { status: 403 });
  for (const extra of [
    { savingsRate: -1 },
    { specialRate: 31 },
    { savingsRate: 1.111 },
    { minimumMonthlyAmount: 0 },
    { minimumMonthlyAmount: 1.001 },
    { monthlyTerms: [{ id: "t", months: 0, rate: 2, active: true }] },
    {
      monthlyTerms: [
        { id: "a", months: 11, rate: 2, active: true },
        { id: "b", months: 11, rate: 3, active: true },
      ],
    },
    { monthlyTerms: [{ id: "t", months: 11, rate: 2, active: false }] },
  ])
    assert.throws(() => changeDeposits(db, admin, input(db, extra)));
  assert.deepEqual(db, original);
});
test("closing new-account intake blocks opening while existing deposits remain usable and stale policy writes fail", () => {
  const db = fixture();
  const stale = input(db);
  changeDeposits(
    db,
    admin,
    input(db, {
      openingEnabled: { savings: false, special: false, monthly: false },
      monthlyTerms: depositSettings(db).monthlyTerms.map((t) => ({
        ...t,
        active: false,
      })),
    }),
  );
  assert.throws(() => changeDeposits(db, admin, stale), { status: 409 });
  for (const type of ["special", "monthly"])
    assert.throws(() =>
      changeDeposits(db, member, {
        action: "open",
        type,
        termMonths: 12,
        monthlyAmount: 1000,
      }),
    );
  changeDeposits(db, member, {
    action: "request",
    account: "savings",
    type: "deposit",
    amount: 1000,
    channel: "counter",
    requestId: "existing-still-works",
  });
  assert.equal(db.deposits.transactions.length, 1);
});
test("monthly tracking scopes owners, separates confirmed and pending deposits, and reports remaining current installment", () => {
  const db = fixture();
  changeDeposits(db, member, {
    action: "open",
    type: "monthly",
    termMonths: 24,
    monthlyAmount: 1000,
  });
  const account = db.deposits.accounts.find((a) => a.type === "monthly")!;
  const request = (id: string, amount: number) =>
    changeDeposits(db, member, {
      action: "request",
      account: account.id,
      type: "deposit",
      amount,
      channel: "counter",
      requestId: id,
    });
  request("first-confirmed", 400);
  changeDeposits(db, admin, {
    action: "confirm",
    id: db.deposits.transactions[0].id,
  });
  request("second-pending", 600);
  const report = readDeposits(db, admin).monthlyTracking[0];
  assert.equal(report.paidCents, 40000);
  assert.equal(report.dueCents, 60000);
  assert.equal(report.pendingCents, 60000);
  db.deposits.accounts.push({ ...account, id: "other", member: "other" });
  assert.equal(readDeposits(db, member).monthlyTracking.length, 1);
});

// การจัดสรรต้องใช้อัตราจากฐานข้อมูลเดียวกับหน้าตั้งค่า แม้ผู้เรียก API ส่งอัตราอื่นมา
function fundedInterestFixture() {
  const db = fixture();
  const year = new Date().getFullYear() - 1;
  db.deposits.transactions = [
    {
      id: "seed",
      account: "savings",
      member: member.member,
      type: "deposit",
      amountCents: 100000,
      status: "confirmed",
      confirmed: `${year}-01-01T00:00:00+07:00`,
      effectiveDate: `${year}-01-01`,
    },
  ];
  return { db, year };
}
test("interest posting uses centrally saved rate and ignores a forged per-account rate", () => {
  const { db, year } = fundedInterestFixture();
  changeDeposits(db, admin, input(db, { savingsRate: 4 }));
  changeDeposits(db, admin, {
    action: "interest",
    account: "savings",
    year,
    rate: 29,
  });
  assert.equal(db.deposits.accounts[0].balanceCents, 104000);
  assert.equal(db.deposits.transactions.at(-1)!.rate, 4);
});
test("interest posting needs no client rate and monthly contracts retain their agreed rate", () => {
  const { db, year } = fundedInterestFixture();
  const account = db.deposits.accounts[0];
  account.type = "monthly";
  account.monthlyPlan = {
    termMonths: 24,
    annualRate: 2.75,
    monthlyCents: 100000,
    startPeriod: `${year}-01`,
    endPeriod: `${year + 1}-12`,
  };
  changeDeposits(db, admin, input(db));
  changeDeposits(db, admin, { action: "interest", account: account.id, year });
  assert.equal(account.balanceCents, 102750);
  assert.equal(db.deposits.transactions.at(-1)!.rate, 2.75);
});
test("interest posting rejects missing configured rate without adding a transaction", () => {
  const { db, year } = fundedInterestFixture();
  db.returns.settings = {
    dividendPercent: 4,
    rebatePercent: 5,
    depositRates: { savings: null },
  };
  assert.throws(
    () =>
      changeDeposits(db, admin, {
        action: "interest",
        account: "savings",
        year,
        rate: 3,
      }),
    /ยังไม่กำหนด/,
  );
  assert.equal(db.deposits.accounts[0].balanceCents, 100000);
  assert.equal(db.deposits.transactions.length, 1);
});
