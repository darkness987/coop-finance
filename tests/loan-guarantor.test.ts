import test from "node:test";
import assert from "node:assert/strict";
import type { Database } from "../database/store";
import { loanSecurity, findGuarantor } from "../lib/loans/loan-guarantor";
import { changeLoans, loanEstimate, readLoans } from "../lib/loans/loans";
const borrower = { id: "borrower-user", role: "member", member: "10001" };
const guarantor = { id: "guarantor-user", role: "member", member: "10002" };
const admin = { id: "admin-test", role: "admin", member: "" };
function fixture() {
  const db = {
    version: 1,
    members: {
      records: [
        {
          id: "10001",
          name: "ผู้กู้ ทดสอบ",
          active: 1,
          joined: "2020-01-01",
          profile: { income: 50000 },
        },
        { id: "10002", name: "ผู้ค้ำ ทดสอบ", active: 1, joined: "2020-01-01" },
        { id: "10003", name: "สมาชิก ปิด", active: 0 },
        { id: "10004", name: "ผู้ค้ำ สอง", active: 1 },
      ],
      applications: [],
    },
    shares: {
      rules: [],
      accounts: [
        { member: "10001", opening_amount: 1000, opening_units: 10 },
        { member: "10002", opening_amount: 1000, opening_units: 10 },
      ],
      payments: [
        { member: "10001", amount: 500, received: "2026-01-01" },
        { member: "10001", amount: 5000, received: null },
      ],
      changeRequests: [],
    },
    deposits: {
      accounts: [{ member: "10001", balanceCents: 50000 }],
      transactions: [
        { member: "10001", amountCents: 990000, status: "pending" },
      ],
    },
    returns: { allocations: [], dividends: [], rebates: [] },
    loans: {
      products: [
        {
          id: "demo",
          name: "สินเชื่อทดสอบ",
          active: true,
          annualRate: 6,
          minAmount: 100,
          maxAmount: 100000,
          minMonths: 1,
          maxMonths: 120,
        },
      ],
      applications: [],
      contracts: [],
      schedules: [],
      payments: [],
      documents: [],
      handoffs: [],
      decisions: [],
    },
    auth: { users: [], auditLogs: [] },
  } as unknown as Database;
  const input = {
    product: "demo",
    amount: 10000,
    months: 12,
    reason: "ทดสอบผู้ค้ำ",
    disbursementMethod: "cash",
  };
  function create(extra = {}) {
    const created = changeLoans(db, borrower, {
      action: "create",
      ...input,
      ...extra,
    }) as any;
    return db.loans.applications.find((r) => r.id === created.id)!;
  }
  function step(row: any, action: string, extra = {}, actor = borrower) {
    return changeLoans(db, actor, {
      action,
      id: row.id,
      revision: row.revision,
      ...extra,
    }) as any;
  }
  return { db, input, create, step };
}
test("asset limits use only confirmed shares and deposit balance", () => {
  const { db, input } = fixture();
  const security = loanSecurity(db, "10001", 900);
  assert.equal(security.shareAmount, 1500);
  assert.equal(security.depositAmount, 500);
  assert.equal(security.totalAmount, 2000);
  assert.equal(security.firstLoanLimit, 1200);
  assert.equal(security.additionalLoanLimit, 0);
  assert.equal(security.totalLoanLimit, 1200);
  assert.equal(security.requiresGuarantor, false);
  assert.equal(loanSecurity(db, "10001", 1200.01).requiresGuarantor, true);
  assert.equal(
    loanEstimate(db, borrower, { ...input, amount: 2000 }).eligible,
    false,
  );
  assert.equal(
    loanEstimate(db, borrower, {
      ...input,
      guarantorMembers: ["10002", "10004"],
    }).eligible,
    true,
  );
});
test("lookup returns only server-owned name/id and rejects self, missing and inactive members", () => {
  const { db } = fixture();
  assert.deepEqual(
    changeLoans(db, borrower, {
      action: "lookup-guarantor",
      guarantorMember: "10002",
    }),
    { member: "10002", name: "ผู้ค้ำ ทดสอบ" },
  );
  for (const id of ["10001", "10003", "missing"])
    assert.throws(() => findGuarantor(db, "10001", id));
});
test("draft can be incomplete but OTP and submission require guarantor above assets; changed balance is rechecked", () => {
  const { db, create, step } = fixture();
  const row = create();
  assert.equal(row.status, "draft");
  assert.throws(() => step(row, "request-otp"), /ผู้ค้ำ/);
  assert.throws(() => step(row, "submit"), /ผู้ค้ำ/);
  db.shares.accounts[0].opening_amount = 10000;
  const small = create({ amount: 4000 });
  const otp = step(small, "request-otp");
  db.deposits.accounts[0].balanceCents = 0;
  db.shares.accounts[0].opening_amount = 5000;
  assert.throws(
    () =>
      step(small, "submit", {
        challengeId: otp.challengeId,
        otp: otp.demoCode,
      }),
    /ผู้ค้ำ/,
  );
  assert.equal(small.status, "draft");
});
test("guarantor is bound to OTP, snapshots into contract and sees only relevant guarantee details", () => {
  const { db, create, step } = fixture();
  const row = create({
    guarantorMembers: ["10002", "10004"],
    guarantor: { name: "ปลอม" },
  });
  assert.equal(row.guarantor.name, "ผู้ค้ำ ทดสอบ");
  const otp = step(row, "request-otp");
  row.guarantor = null;
  row.guarantors = [];
  assert.throws(
    () =>
      step(row, "submit", { challengeId: otp.challengeId, otp: otp.demoCode }),
    /ผู้ค้ำ/,
  );
  row.guarantor = { member: "10002", name: "ผู้ค้ำ ทดสอบ" };
  row.guarantors = [row.guarantor, { member: "10004", name: "ผู้ค้ำ สอง" }];
  step(row, "submit", { challengeId: otp.challengeId, otp: otp.demoCode });
  step(row, "check", {}, admin);
  step(row, "forward", {}, admin);
  step(row, "approve", {}, admin);
  const contract = db.loans.contracts[0];
  assert.deepEqual(contract.guarantor, row.guarantor);
  const view = readLoans(db, guarantor);
  assert.equal(view.applications.length, 0);
  assert.equal(view.contracts.length, 0);
  assert.equal(view.guarantees.length, 1);
  assert.equal(view.guarantees[0].borrowerName, "ผู้กู้ ทดสอบ");
  assert.equal(view.guarantees[0].amount, 10000);
  assert.equal(view.guarantees[0].contractNumber, contract.number);
  assert.equal("reason" in view.guarantees[0], false);
  const schedules = db.loans.schedules.filter(
    (s) => s.contract === contract.id,
  );
  assert.equal(view.guarantees[0].schedules.length, row.months);
  assert.equal(view.guarantees[0].schedules[0].dueDate, schedules[0].dueDate);
  assert.equal(
    view.guarantees[0].schedules[0].principalCents,
    schedules[0].principalCents,
  );
  schedules[0].paidPrincipal = schedules[0].principalCents;
  assert.equal(
    readLoans(db, guarantor).guarantees[0].schedules[0].paidPrincipal,
    schedules[0].principalCents,
  );
  assert.equal(view.schedules.length, 0);
  db.members.records.push({ id: "10005", name: "สมาชิกอื่น", active: 1 });
  db.shares.accounts.push({
    member: "10005",
    opening_amount: 1000,
    opening_units: 10,
  });
  assert.equal(
    readLoans(db, { ...guarantor, member: "10005" }).guarantees.length,
    0,
  );
});
test("inactive guarantor cannot pass final submission or approval", () => {
  const { db, create, step } = fixture();
  const row = create({ guarantorMembers: ["10002", "10004"] });
  const otp = step(row, "request-otp");
  db.members.records[1].active = 0;
  assert.throws(
    () =>
      step(row, "submit", { challengeId: otp.challengeId, otp: otp.demoCode }),
    /ผู้ค้ำ/,
  );
  db.members.records[1].active = 1;
  step(row, "submit", { challengeId: otp.challengeId, otp: otp.demoCode });
  step(row, "check", {}, admin);
  step(row, "forward", {}, admin);
  db.members.records[1].active = 0;
  assert.throws(() => step(row, "approve", {}, admin), /ผู้ค้ำ/);
  assert.equal(row.status, "forwarded");
  assert.equal(db.loans.contracts.length, 0);
});

test("loan limits are removed for preview, draft, edits, OTP and approval while other rules remain", () => {
  const { db, input, create, step } = fixture();
  db.loans.products[0].maxAmount = 50000; // ข้อมูลเก่าต้องไม่บังคับเพดานอีก
  db.members.records[0].profile.income = 100000000;
  for (const amount of [50000.01, 500000, 20000000]) {
    const preview = loanEstimate(db, borrower, {
      ...input,
      amount,
      guarantorMembers: ["10002", "10004"],
    });
    assert.equal(preview.eligible, true);
    assert.equal(preview.calculation.rows.at(-1)?.balance, "0.00");
  }
  const row = create({ amount: 500000, guarantorMembers: ["10002", "10004"] });
  step(row, "save", {
    ...input,
    amount: 20000000,
    guarantorMembers: ["10002", "10004"],
  });
  assert.equal(row.amount, 20000000);
  const otp = step(row, "request-otp");
  step(row, "submit", { challengeId: otp.challengeId, otp: otp.demoCode });
  step(row, "check", {}, admin);
  step(row, "forward", {}, admin);
  step(row, "approve", {}, admin);
  assert.equal(db.loans.contracts[0].amount, 20000000);
  assert.equal(
    db.loans.schedules.reduce((sum, r) => sum + r.principalCents, 0),
    2000000000,
  );
  changeLoans(db, admin, {
    action: "product",
    id: "demo",
    annualRate: 6,
    maxMonths: 120,
    active: true,
  });
  assert.equal(db.loans.products[0].active, true);
  assert.equal(
    loanEstimate(db, borrower, {
      ...input,
      amount: 500000,
      guarantorMembers: ["10002", "10004"],
    }).eligible,
    true,
  );
  assert.throws(() => create({ amount: 0 }));
  assert.throws(() => create({ amount: 500000, months: 121 }));
});

// สินทรัพย์สมมุติ 100,000 บาท: กู้แรก 45,000 เพิ่ม 15,000 และคืนวงเงินตามเงินต้น
function assetFixture() {
  const fixtureData = fixture();
  fixtureData.db.shares.accounts[0].opening_amount = 99000;
  fixtureData.db.members.records[0].profile.income = 1000000;
  return fixtureData;
}
function submitAndApprove(f: ReturnType<typeof fixture>, row: any) {
  const otp = f.step(row, "request-otp");
  f.step(row, "submit", { challengeId: otp.challengeId, otp: otp.demoCode });
  f.step(row, "check", {}, admin);
  f.step(row, "forward", {}, admin);
  f.step(row, "approve", {}, admin);
  return f.db.loans.contracts.at(-1)!;
}
function allowAnotherOtp(db: Database) {
  for (const otp of db.loans.submissionOtps || []) otp.resendAt = 0;
}
test("first self loan can use 60% immediately; later loans share the remaining ceiling", () => {
  const f = assetFixture();
  assert.equal(loanSecurity(f.db, "10001").availableAmount, 60000);
  const tooLarge = f.create({ amount: 60000.01, loanMode: "asset" });
  assert.throws(() => f.step(tooLarge, "request-otp"), /วงเงิน/);
  const first = f.create({ amount: 45000, loanMode: "asset" });
  submitAndApprove(f, first);
  const secondCapacity = loanSecurity(f.db, "10001");
  assert.equal(secondCapacity.availableAmount, 15000);
  assert.equal(secondCapacity.outstandingAmount, 45000);
  allowAnotherOtp(f.db);
  const second = f.create({ amount: 15000, loanMode: "asset" });
  submitAndApprove(f, second);
  assert.equal(loanSecurity(f.db, "10001").availableAmount, 0);
  assert.equal(loanSecurity(f.db, "10001").outstandingAmount, 60000);
  const third = f.create({ amount: 1000, loanMode: "asset" });
  assert.throws(() => f.step(third, "request-otp"), /วงเงิน/);
});
test("pending applications reserve capacity; own application excluded for approval; rejected/drafts release it", () => {
  const f = assetFixture();
  const first = f.create({ amount: 45000, loanMode: "asset" });
  const otp = f.step(first, "request-otp");
  f.step(first, "submit", { challengeId: otp.challengeId, otp: otp.demoCode });
  assert.equal(loanSecurity(f.db, "10001").reservedAmount, 45000);
  assert.equal(loanSecurity(f.db, "10001").availableAmount, 15000);
  assert.equal(
    loanSecurity(f.db, "10001", 45000, first.id).availableAmount,
    60000,
  );
  const other = f.create({ amount: 15000.01, loanMode: "asset" });
  assert.throws(() => f.step(other, "request-otp"), /วงเงิน/);
  first.status = "rejected";
  assert.equal(loanSecurity(f.db, "10001").availableAmount, 60000);
  assert.equal(loanSecurity(f.db, "10001").hasPreviousLoan, false);
});
test("repayment restores only principal credit, redrawing consumes it once, asset drop and guarantees stay separate", () => {
  const f = assetFixture();
  const first = f.create({ amount: 45000, loanMode: "asset" });
  const contract = submitAndApprove(f, first);
  allowAnotherOtp(f.db);
  submitAndApprove(f, f.create({ amount: 15000, loanMode: "asset" }));
  const schedules = f.db.loans.schedules.filter(
    (s) => s.contract === contract.id,
  );
  let remaining = 1000000;
  for (const schedule of schedules) {
    const payment = Math.min(remaining, schedule.principalCents);
    schedule.paidPrincipal = payment;
    remaining -= payment;
    if (!remaining) break;
  }
  schedules[0].paidInterest = 10000;
  let capacity = loanSecurity(f.db, "10001");
  assert.equal(capacity.principalRepaid, 10000);
  assert.equal(capacity.availableAmount, 10000);
  allowAnotherOtp(f.db);
  submitAndApprove(f, f.create({ amount: 10000, loanMode: "asset" }));
  capacity = loanSecurity(f.db, "10001");
  assert.equal(capacity.availableAmount, 0);
  assert.equal(capacity.outstandingAmount, 60000);
  f.db.loans.contracts.push({
    id: "guaranteed-contract",
    member: "10001",
    amount: 999999,
    status: "active",
    loanMode: "guaranteed",
    guarantor: { member: "10002" },
  });
  assert.equal(loanSecurity(f.db, "10001").outstandingAmount, 60000);
  f.db.shares.accounts[0].opening_amount = 49000;
  assert.equal(loanSecurity(f.db, "10001").totalLoanLimit, 30000);
  assert.equal(loanSecurity(f.db, "10001").availableAmount, 0);
});
test("self loan cannot bypass cap with a guarantor field; guaranteed loans still require a member", () => {
  const f = assetFixture();
  assert.equal(
    loanEstimate(f.db, borrower, {
      ...f.input,
      amount: 60000.01,
      loanMode: "asset",
      guarantorMembers: ["10002", "10004"],
    }).eligible,
    false,
  );
  const noGuarantor = f.create({ amount: 10000, loanMode: "guaranteed" });
  assert.throws(() => f.step(noGuarantor, "request-otp"), /ผู้ค้ำ/);
  const first = f.create({ amount: 45000, loanMode: "asset" });
  const otp = f.step(first, "request-otp");
  f.db.shares.accounts[0].opening_amount = 49000;
  assert.throws(
    () =>
      f.step(first, "submit", {
        challengeId: otp.challengeId,
        otp: otp.demoCode,
      }),
    /วงเงิน/,
  );
  assert.equal(first.status, "draft");
});

test("guaranteed loans require two distinct active members and both see their guarantee", () => {
  const f = assetFixture();
  const one = f.create({
    amount: 50000,
    loanMode: "guaranteed",
    guarantorMembers: ["10002"],
  });
  assert.throws(() => f.step(one, "request-otp"), /2 คน/);
  assert.throws(
    () =>
      f.create({
        amount: 50000,
        loanMode: "guaranteed",
        guarantorMembers: ["10002", "10002"],
      }),
    /ซ้ำ/,
  );
  assert.throws(
    () =>
      f.create({
        amount: 50000,
        loanMode: "guaranteed",
        guarantorMembers: ["10001", "10002"],
      }),
    /ตนเอง/,
  );
  assert.throws(
    () =>
      f.create({
        amount: 50000,
        loanMode: "guaranteed",
        guarantorMembers: ["10002", "10003"],
      }),
    /ใช้งาน/,
  );
  const row = f.create({
    amount: 50000,
    loanMode: "guaranteed",
    guarantorMembers: ["10002", "10004"],
  });
  const contract = submitAndApprove(f, row);
  assert.equal(contract.guarantors.length, 2);
  f.db.shares.accounts.push({
    member: "10004",
    opening_amount: 1000,
    opening_units: 10,
  });
  assert.ok(
    readLoans(f.db, {
      id: "second-guarantor",
      role: "member",
      member: "10004",
    }).guarantees.some((r) => r.application === row.id),
  );
});
test("receiving method must be selected before OTP; changing it invalidates old code and persists to contract", () => {
  const f = assetFixture();
  const row = f.create({
    amount: 10000,
    loanMode: "asset",
    disbursementMethod: null,
  });
  assert.throws(() => f.step(row, "request-otp"), /วิธีรับเงิน/);
  assert.throws(
    () => f.step(row, "choose-disbursement", { disbursementMethod: "account" }),
    /บัญชีรับเงิน/,
  );
  f.db.members.records[0].receivingAccount = {
    bank: "ธนาคารทดสอบ",
    holder: "ผู้กู้ ทดสอบ",
    accountNumber: "1234567890",
    updated: "test",
  };
  f.step(row, "choose-disbursement", { disbursementMethod: "account" });
  const first = f.step(row, "request-otp");
  assert.equal(row.disbursementAccount.last4, "7890");
  f.step(row, "choose-disbursement", { disbursementMethod: "cash" });
  assert.match(
    f.step(row, "submit", {
      challengeId: first.challengeId,
      otp: first.demoCode,
    }).error,
    /เปลี่ยน/,
  );
  allowAnotherOtp(f.db);
  const contract = submitAndApprove(f, row);
  assert.equal(contract.disbursementMethod, "cash");
  assert.equal(contract.disbursementAccount, null);
  assert.throws(() =>
    f.step(row, "choose-disbursement", { disbursementMethod: "account" }),
  );
});

test("small pending requests reserve their amount without zeroing all remaining self-loan credit", () => {
  const f = assetFixture();
  submitAndApprove(f, f.create({ amount: 10000, loanMode: "asset" }));
  f.db.loans.applications.push(
    {
      id: "pending-one",
      member: "10001",
      amount: 1000,
      status: "submitted",
      loanMode: "asset",
    },
    {
      id: "pending-two",
      member: "10001",
      amount: 2000,
      status: "needs_documents",
      loanMode: "asset",
    },
  );
  let capacity = loanSecurity(f.db, "10001");
  assert.equal(capacity.reservedAmount, 3000);
  assert.equal(capacity.availableAmount, 47000);
  assert.equal(
    loanEstimate(f.db, borrower, {
      ...f.input,
      amount: 9999.84,
      loanMode: "asset",
    }).eligible,
    true,
  );
  assert.equal(
    loanEstimate(f.db, borrower, {
      ...f.input,
      amount: 47000.01,
      loanMode: "asset",
    }).eligible,
    false,
  );
  capacity = loanSecurity(f.db, "10001", 0, "pending-two");
  assert.equal(capacity.availableAmount, 49000);
});
test("pending requests also reserve the single 60% ceiling correctly and approval never double-counts its own request", () => {
  const f = assetFixture();
  const first = f.create({ amount: 5000, loanMode: "asset" });
  const otp = f.step(first, "request-otp");
  f.step(first, "submit", { challengeId: otp.challengeId, otp: otp.demoCode });
  assert.equal(loanSecurity(f.db, "10001").availableAmount, 55000);
  assert.equal(loanSecurity(f.db, "10001", 0, first.id).availableAmount, 60000);
  f.step(first, "check", {}, admin);
  f.step(first, "forward", {}, admin);
  f.step(first, "approve", {}, admin);
  assert.equal(loanSecurity(f.db, "10001").availableAmount, 55000);
});
test("reported 503500 asset case leaves 279100 available after a 13000 reservation", () => {
  const f = assetFixture();
  f.db.shares.accounts[0].opening_amount = 502500;
  submitAndApprove(f, f.create({ amount: 10000, loanMode: "asset" }));
  for (const [index, amount] of [1000, 1000, 10000, 1000].entries())
    f.db.loans.applications.push({
      id: "pending-" + index,
      member: "10001",
      amount,
      status: "submitted",
      loanMode: "asset",
    });
  const capacity = loanSecurity(f.db, "10001");
  assert.equal(capacity.totalAmount, 503500);
  assert.equal(capacity.reservedAmount, 13000);
  assert.equal(capacity.availableAmount, 279100);
  assert.equal(
    loanEstimate(f.db, borrower, {
      ...f.input,
      amount: 9999.84,
      loanMode: "asset",
    }).eligible,
    true,
  );
});

test("land and house collateral bind to OTP, require assessed limit, and persist into contract", () => {
  const f = fixture();
  const collateral = {
    type: "land",
    owner: "Test owner",
    documentNumber: "DEED-1",
    address: "Test address",
  };
  assert.throws(() =>
    f.create({
      loanMode: "collateral",
      collateral: { ...collateral, type: "car" },
    }),
  );
  const row = f.create({ amount: 10000, loanMode: "collateral", collateral });
  const otp = f.step(row, "request-otp");
  row.collateral.documentNumber = "CHANGED";
  assert.ok(
    f.step(row, "submit", { challengeId: otp.challengeId, otp: otp.demoCode })
      .error,
  );
  row.collateral.documentNumber = "DEED-1";
  f.step(row, "submit", { challengeId: otp.challengeId, otp: otp.demoCode });
  f.step(row, "check", {}, admin);
  f.step(row, "forward", {}, admin);
  assert.throws(() => f.step(row, "approve", {}, admin));
  assert.equal(row.status, "forwarded");
  assert.throws(() =>
    f.step(row, "approve", { collateralLimit: 9999, note: "checked" }, admin),
  );
  f.step(
    row,
    "approve",
    { collateralLimit: 15000, note: "checked deed and valuation" },
    admin,
  );
  assert.deepEqual(f.db.loans.contracts[0].collateral, collateral);
  assert.equal(f.db.loans.contracts[0].collateralReview.approvedLimit, 15000);
});

test("staff review shows confirmed assets, deposit breakdown and installment; member cannot read another borrower review", () => {
  const f = fixture();
  f.db.members.records[0].profile.citizenNumber = "PRIVATE-CITIZEN";
  f.db.members.records[0].receivingAccount = {
    bank: "Test",
    accountNumber: "PRIVATE-BANK",
  };
  const row = f.create({ amount: 1000, loanMode: "asset" });
  const staffView = readLoans(f.db, admin).applications.find(
    (r) => r.id === row.id,
  )!;
  assert.equal(staffView.review.security.shareAmount, 1500);
  assert.equal(staffView.review.shareUnits, 15);
  assert.equal(staffView.review.security.depositAmount, 500);
  assert.equal(staffView.review.income, 50000);
  assert.equal(staffView.review.deposits[0].balance, 500);
  assert.equal(staffView.review.calculation.rows.length, 12);
  assert.equal(
    staffView.review.checks.every((c) => c.passed),
    true,
  );
  assert.equal(
    JSON.stringify(staffView.review).includes("PRIVATE-CITIZEN"),
    false,
  );
  assert.equal(
    JSON.stringify(staffView.review).includes("PRIVATE-BANK"),
    false,
  );
  assert.equal(readLoans(f.db, borrower).applications[0].review, undefined);
  assert.equal(readLoans(f.db, guarantor).applications.length, 0);
});
test("submission snapshots remain unchanged while staff review reads latest shares, income and deposit balances", () => {
  const f = fixture();
  const row = f.create({ amount: 1000, loanMode: "asset" });
  const otp = f.step(row, "request-otp");
  f.step(row, "submit", { challengeId: otp.challengeId, otp: otp.demoCode });
  assert.equal(row.reviewAtSubmission.income, 50000);
  assert.equal(row.securityAtSubmission.shareAmount, 1500);
  f.db.members.records[0].profile.income = 25000;
  f.db.shares.accounts[0].opening_amount = 2000;
  f.db.deposits.accounts[0].balanceCents = 150000;
  const review = readLoans(f.db, admin).applications[0].review;
  assert.equal(review.income, 25000);
  assert.equal(review.security.shareAmount, 2500);
  assert.equal(review.security.depositAmount, 1500);
  assert.equal(row.reviewAtSubmission.income, 50000);
  assert.equal(row.securityAtSubmission.shareAmount, 1500);
});
test("approval rechecks latest income and debt without granting loan or altering history on rejected validation", () => {
  const f = fixture();
  const row = f.create({ amount: 1000, loanMode: "asset" });
  const otp = f.step(row, "request-otp");
  f.step(row, "submit", { challengeId: otp.challengeId, otp: otp.demoCode });
  f.step(row, "check", {}, admin);
  f.step(row, "forward", {}, admin);
  f.db.members.records[0].profile.income = 1;
  assert.equal(
    readLoans(f.db, admin).applications[0].review.incomeEligible,
    false,
  );
  assert.throws(() => f.step(row, "approve", {}, admin), /40%/);
  assert.equal(row.status, "forwarded");
  assert.equal(f.db.loans.contracts.length, 0);
  f.db.members.records[0].profile.income = 50000;
  f.step(row, "approve", {}, admin);
  assert.equal(f.db.loans.contracts.length, 1);
});

// ตรวจการตัดสินจากทุกสถานะเก่า โดยไม่ต้องกดเริ่มตรวจหรือส่งต่อก่อน
for (const accessRole of ["admin", "member_officer", "loan_officer"]) {
  for (const status of [
    "submitted",
    "checking",
    "needs_documents",
    "forwarded",
  ]) {
    test(`${accessRole} decides directly from ${status}, creates one contract and prevents replay`, () => {
      const { db, create, step } = fixture();
      const row = create({
        loanMode: "guaranteed",
        guarantorMembers: ["10002", "10004"],
      });
      row.status = status;
      const officer = {
        id: "staff-test",
        role: "admin",
        accessRole,
        member: "",
      };
      step(row, "approve", {}, officer);
      assert.equal(row.status, "approved");
      assert.equal(db.loans.contracts.length, 1);
      assert.equal(db.loans.contracts[0].guarantors.length, 2);
      assert.equal(db.loans.schedules.length, row.months);
      assert.throws(() => step(row, "approve", {}, officer));
      assert.equal(db.loans.contracts.length, 1);
    });
  }
}
test("direct rejection saves reason, creates no contract; drafts and final decisions cannot be decided", () => {
  const { db, create, step } = fixture();
  const row = create({
    loanMode: "guaranteed",
    guarantorMembers: ["10002", "10004"],
  });
  assert.throws(() => step(row, "approve", {}, admin));
  row.status = "submitted";
  step(row, "reject", { note: "ข้อมูลไม่ผ่านเกณฑ์" }, admin);
  assert.equal(row.status, "rejected");
  assert.equal(db.loans.decisions[0].note, "ข้อมูลไม่ผ่านเกณฑ์");
  assert.equal(db.loans.contracts.length, 0);
  assert.throws(() => step(row, "approve", {}, admin));
});

test("ordinary 95 percent is used by member estimates and final approval; a later product policy change is rechecked", () => {
  const { db, create, step } = fixture();
  db.loans.products[0].id = "ordinary";
  const input = {
    product: "ordinary",
    amount: 1800,
    months: 12,
    loanMode: "asset",
  };
  const preview = loanEstimate(db, borrower, input);
  assert.equal(preview.security.totalPercent, 95);
  assert.equal(preview.security.availableAmount, 1900);
  const row = create(input);
  row.status = "submitted";
  changeLoans(db, admin, {
    action: "asset-policy",
    product: "ordinary",
    totalPercent: 80,
  });
  assert.throws(() => step(row, "approve", {}, admin), /วงเงิน|ผู้ค้ำ/);
  assert.equal(db.loans.contracts.length, 0);
  changeLoans(db, admin, {
    action: "asset-policy",
    product: "ordinary",
    totalPercent: 95,
  });
  step(row, "approve", {}, admin);
  assert.equal(db.loans.contracts[0].securityAtApproval.totalPercent, 95);
});

test("new contract number does not collide after an earlier contract was deleted", () => {
  const { db, create, step } = fixture();
  db.loans.contracts.push({
    id: "existing",
    number: "LN-00004",
    member: "other",
    amount: 1000,
    status: "closed",
  });
  const row = create({
    loanMode: "guaranteed",
    guarantorMembers: ["10002", "10004"],
  });
  row.status = "submitted";
  step(row, "approve", {}, admin);
  assert.equal(db.loans.contracts.at(-1)!.number, "LN-00005");
});

test("guaranteed loans preserve property alongside people and require property assessment before approval", () => {
  const { db, create, step } = fixture();
  const property = {
    type: "house",
    owner: "ผู้กู้ ทดสอบ",
    documentNumber: "TEST-HOUSE-001",
    address: "บ้านทดสอบ 1/1",
  };
  const row = create({
    loanMode: "guaranteed",
    guarantorMembers: ["10002", "10004"],
    collateral: property,
  });
  assert.deepEqual(row.collateral, property);
  row.status = "submitted";
  assert.throws(() => step(row, "approve", {}, admin));
  assert.equal(db.loans.contracts.length, 0);
  step(
    row,
    "approve",
    { collateralLimit: 12000, note: "ตรวจเอกสารแล้ว" },
    admin,
  );
  const contract = db.loans.contracts[0];
  assert.equal(contract.guarantors.length, 2);
  assert.deepEqual(contract.collateral, property);
  assert.equal(contract.collateralReview.approvedLimit, 12000);
  const view = readLoans(db, guarantor).guarantees[0];
  assert.deepEqual(view.collateral, property);
  assert.equal(view.guarantorCount, 2);
  assert.equal(view.contractNumber, contract.number);
});
test("property combined with guarantors is validated and bound to the submission OTP", () => {
  const { create, step } = fixture();
  assert.throws(() =>
    create({
      loanMode: "guaranteed",
      guarantorMembers: ["10002", "10004"],
      collateral: { type: "car" },
    }),
  );
  const row = create({
    loanMode: "guaranteed",
    guarantorMembers: ["10002", "10004"],
    collateral: {
      type: "land",
      owner: "ผู้กู้ ทดสอบ",
      documentNumber: "TEST-LAND-001",
      address: "ที่ดินทดสอบ",
    },
  });
  const otp = step(row, "request-otp");
  row.collateral.documentNumber = "CHANGED";
  const rejected = step(row, "submit", {
    challengeId: otp.challengeId,
    otp: otp.demoCode,
  });
  assert.match(rejected.error, /รายละเอียดรายการเปลี่ยน/);
  assert.equal(row.status, "draft");
});
