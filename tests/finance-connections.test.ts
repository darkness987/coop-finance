import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readDatabase, updateDatabase, type Database } from "../database/store";
import { readBenefits, changeBenefits } from "../lib/returns/benefits";
import { readTransactions } from "../lib/reports/transactions";
import { readLoans, changeLoans } from "../lib/loans/loans";
import { loanSecurity } from "../lib/loans/loan-guarantor";
import { applicationReview } from "../lib/loans/application-review";
import { changeDeposits, readDeposits } from "../lib/deposits/deposits";
const member = { id: "test-user", member: "test-member", role: "member" },
  admin = { id: "test-admin", member: "", role: "admin" };
function fixture(): Database {
  return {
    version: 1,
    members: {
      records: [
        {
          id: member.member,
          name: "สมาชิก ทดสอบ",
          active: 1,
          joined: "2020-01-01",
          profile: { income: 100000 },
        },
        { id: "other", name: "อื่น", active: 1 },
      ],
      applications: [],
    },
    shares: {
      rules: [],
      accounts: [
        { member: member.member, opening_amount: 10000, opening_units: 100 },
      ],
      payments: [
        {
          id: 1,
          member: member.member,
          period: "2026-01",
          amount: 1000,
          date: "2026-01-01",
          received: "2026-01-01",
          method: "เงินสด",
        },
        {
          id: 2,
          member: member.member,
          period: "2026-02",
          amount: 500,
          date: "2026-02-01",
          received: null,
          method: "เงินโอน",
        },
      ],
      changeRequests: [],
    },
    returns: {
      allocations: [{ year: 2025, dividend_rate: 400, approved: 1 }],
      dividends: [
        { year: 2025, member: member.member, basis: 10000, cents: 40000 },
      ],
      rebates: [{ year: 2025, member: member.member, cents: 10000 }],
    },
    deposits: {
      accounts: [
        {
          id: "SA-TEST",
          member: member.member,
          type: "savings",
          status: "active",
          balanceCents: 200000,
        },
        {
          id: "SA-OTHER",
          member: "other",
          type: "savings",
          status: "active",
          balanceCents: 999999,
        },
      ],
      transactions: [],
    },
    loans: {
      products: [],
      applications: [],
      contracts: [
        {
          id: "loan-test",
          member: member.member,
          number: "LN-TEST",
          amount: 1000,
          installment: "1020",
          status: "active",
          disbursed: "2026-01-01",
          loanMode: "asset",
        },
      ],
      schedules: [
        {
          contract: "loan-test",
          number: 1,
          principalCents: 100000,
          interestCents: 2000,
          paidPrincipal: 0,
          paidInterest: 0,
        },
      ],
      payments: [],
      documents: [],
      handoffs: [],
      decisions: [],
    },
    auth: { users: [], auditLogs: [] },
  };
}
const input = {
  contract: "loan-test",
  amount: 500,
  method: "deposit",
  account: "SA-TEST",
  requestId: "repayment-test-one",
};
function request(db: Database, extra = {}) {
  const payload = { ...input, ...extra };
  const challenge = changeLoans(db, member, {
    ...payload,
    action: "repayment-otp",
  }) as any;
  return changeLoans(db, member, {
    ...payload,
    action: "request-repayment",
    challengeId: challenge.challengeId,
    otp: challenge.demoCode,
  }) as any;
}
test("benefit estimates follow confirmed shares/deposit balances; historical approved amounts never change", () => {
  const db = fixture();
  const before = readBenefits(db, member);
  assert.equal(before.shares.estimatedCents, 44000);
  assert.equal(before.deposits.estimatedCents, 2500);
  db.shares.payments[1].received = "2026-02-01";
  db.deposits.accounts[0].balanceCents += 100000;
  const after = readBenefits(db, member);
  assert.equal(after.shares.estimatedCents, 46000);
  assert.equal(after.deposits.estimatedCents, 3750);
  assert.equal(after.shares.history[0].cents, 40000);
  assert.equal(after.deposits.accounts.length, 1);
  db.deposits.accounts[0].type = "monthly";
  assert.equal(
    readBenefits(db, member).deposits.accounts[0].estimatedCents,
    null,
  );
});
test("receiving account is shared by both benefit pages and loan repayment; loan API exposes only masked details", () => {
  const db = fixture();
  changeBenefits(db, member, {
    action: "save-receiving-account",
    bank: "ธนาคารทดสอบ",
    holder: "สมาชิก ทดสอบ",
    accountNumber: "1234567890",
  });
  assert.equal(
    readBenefits(db, member).receivingAccount.accountNumber,
    "1234567890",
  );
  const loans = readLoans(db, member);
  assert.equal(loans.linkedAccount!.last4, "7890");
  assert.equal(JSON.stringify(loans).includes("1234567890"), false);
  assert.throws(() =>
    changeBenefits(db, member, {
      action: "save-receiving-account",
      bank: "X",
      holder: "X",
      accountNumber: "bad",
    }),
  );
  assert.throws(() => readBenefits(db, admin));
  assert.throws(() =>
    changeBenefits(db, admin, { action: "save-receiving-account" }),
  );
});
test("deposit loan repayment needs matching OTP and immediately debits deposit and debt exactly once", () => {
  const db = fixture();
  assert.ok(
    (changeLoans(db, member, { ...input, action: "request-repayment" }) as any)
      .error,
  );
  const challenge = changeLoans(db, member, {
    ...input,
    action: "repayment-otp",
  }) as any;
  assert.ok(
    (
      changeLoans(db, member, {
        ...input,
        amount: 400,
        action: "request-repayment",
        challengeId: challenge.challengeId,
        otp: challenge.demoCode,
      }) as any
    ).error,
  );
  const result = changeLoans(db, member, {
    ...input,
    action: "request-repayment",
    challengeId: challenge.challengeId,
    otp: challenge.demoCode,
  }) as any;
  assert.equal(db.deposits.accounts[0].balanceCents, 150000);
  assert.equal(db.loans.schedules[0].paidPrincipal, 48000);
  assert.equal(db.loans.repaymentRequests![0].status, "confirmed");
  assert.throws(() =>
    changeLoans(db, member, { action: "confirm-repayment", id: result.id }),
  );
  changeLoans(db, admin, { action: "confirm-repayment", id: result.id });
  changeLoans(db, admin, { action: "confirm-repayment", id: result.id });
  assert.equal(db.deposits.accounts[0].balanceCents, 150000);
  assert.equal(db.loans.schedules[0].paidInterest, 2000);
  assert.equal(db.loans.schedules[0].paidPrincipal, 48000);
  assert.equal(db.loans.payments.length, 1);
  assert.equal(db.deposits.transactions.length, 1);
  assert.throws(() =>
    changeLoans(db, member, {
      ...input,
      action: "request-repayment",
      challengeId: challenge.challengeId,
      otp: challenge.demoCode,
    }),
  );
});
test("payment reservations protect loan/deposit balances; owner and disbursement checks cannot be bypassed", () => {
  const db = fixture();
  request(db);
  assert.throws(
    () =>
      changeLoans(db, member, {
        ...input,
        amount: 600,
        requestId: "second-request",
        action: "repayment-otp",
      }),
    /เกินหนี้/,
  );
  assert.throws(
    () =>
      changeDeposits(db, member, {
        action: "request-otp",
        account: "SA-TEST",
        type: "withdrawal",
        amount: 1600,
        requestId: "withdraw-test",
        channel: "counter",
      }),
    /ไม่เพียงพอ/,
  );
  assert.throws(
    () =>
      changeLoans(db, member, {
        ...input,
        account: "SA-OTHER",
        requestId: "another-request",
        action: "repayment-otp",
      }),
    /บัญชี/,
  );
  assert.throws(
    () =>
      changeLoans(db, member, {
        ...input,
        method: "linked-account",
        requestId: "linked-request",
        action: "repayment-otp",
      }),
    /บัญชีรับเงิน/,
  );
  db.loans.contracts[0].status = "closed";
  assert.throws(
    () =>
      changeLoans(db, member, {
        ...input,
        requestId: "approved-request",
        action: "repayment-otp",
      }),
    /อนุมัติ/,
  );
});
test("QR and linked-account requests stay pending and never debit deposit automatically", () => {
  for (const method of ["qr", "linked-account"]) {
    const db = fixture();
    changeBenefits(db, member, {
      action: "save-receiving-account",
      bank: "ทดสอบ",
      holder: "สมาชิก",
      accountNumber: "1234567890",
    });
    const r = request(db, { method, account: null });
    assert.equal(db.loans.repaymentRequests![0].status, "pending");
    changeLoans(db, admin, { action: "confirm-repayment", id: r.id });
    assert.equal(db.deposits.accounts[0].balanceCents, 200000);
    assert.equal(db.loans.payments.length, 1);
  }
});
test("history includes all financial systems, preserves pending status, and does not duplicate confirmed repayment requests", () => {
  const db = fixture();
  const pending = request(db, { method: "qr", account: null });
  let rows = readTransactions(db, member).rows;
  assert.ok(
    rows.some((r) => r.title === "แจ้งชำระเงินกู้" && r.status === "pending"),
  );
  changeLoans(db, admin, { action: "confirm-repayment", id: pending.id });
  rows = readTransactions(db, member).rows;
  assert.equal(rows.filter((r) => r.title === "ชำระเงินกู้").length, 1);
  assert.equal(rows.filter((r) => r.title === "แจ้งชำระเงินกู้").length, 0);
  db.loans.repaymentOtps!.forEach((challenge) => (challenge.resendAt = 0));
  request(db, { amount: 100, requestId: "history-deposit-two" });
  rows = readTransactions(db, member).rows;
  assert.ok(rows.some((r) => r.category === "shares"));
  assert.ok(rows.some((r) => r.category === "deposits"));
  assert.ok(rows.some((r) => r.category === "loans"));
  assert.ok(rows.some((r) => r.category === "returns"));
  assert.equal(JSON.stringify(rows).includes("SA-OTHER"), false);
  assert.throws(() => readTransactions(db, admin));
});
test("confirmation failure rolls back the whole transaction; incorrect OTP attempts persist", () => {
  const folder = mkdtempSync(join(tmpdir(), "coop-payments-"));
  const previous = process.env.ALLPROJECT_DATA_FILE;
  process.env.ALLPROJECT_DATA_FILE = join(folder, "data.ts");
  try {
    writeFileSync(
      process.env.ALLPROJECT_DATA_FILE,
      "export const database = " + JSON.stringify(fixture()) + ";",
    );
    const otp = updateDatabase((db) =>
      changeLoans(db, member, { ...input, action: "repayment-otp" }),
    ) as any;
    updateDatabase((db) =>
      changeLoans(db, member, {
        ...input,
        action: "request-repayment",
        challengeId: otp.challengeId,
        otp: "bad",
      }),
    );
    assert.equal(readDatabase().loans.repaymentOtps![0].attempts, 1);
    const before = readDatabase();
    assert.throws(() =>
      updateDatabase((db) => {
        changeLoans(db, member, {
          ...input,
          action: "request-repayment",
          challengeId: otp.challengeId,
          otp: otp.demoCode,
        });
        throw new Error("simulated transaction failure after repayment");
      }),
    );
    assert.deepEqual(readDatabase(), before);
    const result = updateDatabase((db) =>
      changeLoans(db, member, {
        ...input,
        action: "request-repayment",
        challengeId: otp.challengeId,
        otp: otp.demoCode,
      }),
    ) as any;
    assert.equal(result.status, "confirmed");
    assert.equal(readDatabase().deposits.accounts[0].balanceCents, 150000);
    assert.equal(readDatabase().loans.payments.length, 1);
  } finally {
    if (previous) process.env.ALLPROJECT_DATA_FILE = previous;
    else delete process.env.ALLPROJECT_DATA_FILE;
    rmSync(folder, { recursive: true, force: true });
  }
});

test("approved existing contracts can repay directly without marking a cash disbursement", () => {
  const db = fixture();
  db.loans.contracts[0].status = "approved";
  delete db.loans.contracts[0].disbursed;
  const r = request(db);
  assert.equal(r.status, "confirmed");
  assert.equal(db.deposits.accounts[0].balanceCents, 150000);
  assert.equal(db.loans.schedules[0].paidPrincipal, 48000);
  assert.equal(db.loans.contracts[0].disbursed, undefined);
  assert.equal(db.loans.payments.length, 1);
});

test("deposit benefits exclude retired fixed accounts and include current monthly savings, new accounts, and contract projections", () => {
  const db = fixture();
  db.deposits.accounts.push({
    id: "FD-OLD",
    member: member.member,
    type: "fixed",
    balanceCents: 9999999,
  });
  let d = readBenefits(db, member);
  assert.equal(
    d.deposits.accounts.some((a) => a.account === "FD-OLD"),
    false,
  );
  assert.equal(
    d.deposits.accounts.reduce((s, a) => s + a.balance, 0),
    2000,
  );
  const opened = changeDeposits(db, member, {
    action: "open",
    type: "monthly",
    termMonths: 36,
    monthlyAmount: 1000,
  }) as any;
  d = readBenefits(db, member);
  let monthly = d.deposits.accounts.find((a) => a.account === opened.id)!;
  assert.equal(monthly.rate, 3);
  assert.equal(monthly.balance, 0);
  assert.ok(monthly.monthlyPlan!.interestCents > 0);
  changeDeposits(db, member, {
    action: "request",
    account: opened.id,
    type: "deposit",
    amount: 1000,
    channel: "counter",
    requestId: "benefit-monthly-deposit",
  });
  assert.equal(
    readBenefits(db, member).deposits.accounts.find(
      (a) => a.account === opened.id,
    )!.balance,
    0,
  );
  changeDeposits(db, admin, {
    action: "confirm",
    id: db.deposits.transactions.at(-1)!.id,
  });
  d = readBenefits(db, member);
  monthly = d.deposits.accounts.find((a) => a.account === opened.id)!;
  assert.equal(monthly.balance, 1000);
  assert.equal(monthly.estimatedCents, 3000);
  assert.equal(
    d.deposits.accounts.reduce((s, a) => s + a.balance, 0),
    3000,
  );
  assert.equal(d.deposits.estimatedCents, 5500);
  changeDeposits(db, member, {
    action: "monthly-plan",
    account: opened.id,
    termMonths: 24,
    monthlyAmount: 2000,
  });
  monthly = readBenefits(db, member).deposits.accounts.find(
    (a) => a.account === opened.id,
  )!;
  assert.equal(monthly.rate, 2.75);
  assert.equal(monthly.estimatedCents, 2750);
  assert.equal(monthly.monthlyPlan!.monthlyCents, 200000);
  assert.equal(
    db.deposits.accounts.find((a) => a.id === "FD-OLD")!.balanceCents,
    9999999,
  );
});

test("retired fixed deposits are absent from account lists, transaction history, review assets and repayment choices", () => {
  const db = fixture();
  db.deposits.accounts.push({
    id: "retired",
    member: member.member,
    type: "fixed",
    balanceCents: 999999,
    status: "active",
  });
  db.deposits.transactions.push({
    id: "retired-t",
    member: member.member,
    account: "retired",
    amountCents: 999999,
    type: "deposit",
    status: "confirmed",
    confirmed: "2026-01-01",
    created: "2026-01-01",
  });
  const deposits = readDeposits(db, member);
  assert.equal(
    deposits.types.some((t) => t.id === "fixed"),
    false,
  );
  assert.equal(
    deposits.accounts.some((a) => a.id === "retired"),
    false,
  );
  assert.equal(
    deposits.transactions.some((t) => t.id === "retired-t"),
    false,
  );
  assert.equal(
    readTransactions(db, member).rows.some((r) => r.id === "deposit-retired-t"),
    false,
  );
  assert.equal(loanSecurity(db, member.member).depositAmount, 2000);
  assert.equal(
    readLoans(db, member).depositAccounts.some((a) => a.id === "retired"),
    false,
  );
  const review = applicationReview(db, {
    id: "test",
    member: member.member,
    product: "ordinary",
    loanMode: "asset",
    amount: 1000,
    months: 12,
    terms: { annualRate: 6 },
  });
  assert.equal(
    review.deposits.some((a) => a.id === "retired"),
    false,
  );
  assert.equal(review.security.depositAmount, 2000);
  assert.throws(() =>
    changeDeposits(db, member, {
      action: "request",
      account: "retired",
      type: "deposit",
      amount: 100,
      requestId: "retired-not-available",
    }),
  );
  assert.equal(
    db.deposits.accounts.find((a) => a.id === "retired")!.balanceCents,
    999999,
  );
});
