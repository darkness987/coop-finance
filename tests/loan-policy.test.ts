import test from "node:test";
import assert from "node:assert/strict";
import { assetBorrowingCapacity } from "../lib/loans/loan-capacity";
import { readLoanPolicy } from "../lib/loans/loan-policy";
import { changeLoans } from "../lib/loans/loans";
import type { Database } from "../database/store";
const fixture = () =>
  ({
    loans: { contracts: [], schedules: [], applications: [], payments: [] },
  }) as unknown as Database;
test("single ceiling applies from first loan and ignores obsolete first/additional split", () => {
  const db = fixture();
  db.loans.policy = { totalPercent: 60, firstPercent: 45 };
  assert.deepEqual(readLoanPolicy(db), {
    totalPercent: 60,
    firstPercent: 60,
    additionalPercent: 0,
  });
  assert.equal(
    assetBorrowingCapacity(db, "m", 10000000).availableAmount,
    60000,
  );
  changeLoans(
    db,
    { id: "a", role: "admin", member: "" },
    { action: "asset-policy", totalPercent: 70 },
  );
  assert.equal(
    assetBorrowingCapacity(db, "m", 10000000).availableAmount,
    70000,
  );
  db.loans.contracts.push({
    id: "c",
    member: "m",
    amount: 45000,
    status: "approved",
    loanMode: "asset",
  });
  db.loans.schedules.push({ contract: "c", paidPrincipal: 500000 });
  assert.equal(
    assetBorrowingCapacity(db, "m", 10000000).availableAmount,
    30000,
  );
  db.loans.policy = { totalPercent: 30, firstPercent: 30 };
  assert.equal(assetBorrowingCapacity(db, "m", 10000000).availableAmount, 0);
  assert.equal(db.loans.contracts[0].amount, 45000);
});
test("invalid ceilings and unauthorized policy edits are rejected", () => {
  const db = fixture(),
    a = { id: "a", role: "admin", member: "" };
  for (const totalPercent of [0, 101, 60.001, NaN])
    assert.throws(() =>
      changeLoans(db, a, { action: "asset-policy", totalPercent }),
    );
  assert.throws(
    () =>
      changeLoans(
        db,
        { ...a, accessRole: "loan_officer" },
        { action: "asset-policy", totalPercent: 70 },
      ),
    { status: 403 },
  );
  assert.equal(db.loans.policy, undefined);
});

test("ordinary uses 95 percent and other products keep independent ceilings while sharing outstanding exposure", () => {
  const db = fixture();
  db.loans.products = [
    { id: "ordinary" },
    { id: "emergency" },
    { id: "special" },
  ];
  assert.equal(readLoanPolicy(db, "ordinary").totalPercent, 95);
  assert.equal(readLoanPolicy(db, "emergency").totalPercent, 60);
  assert.equal(
    assetBorrowingCapacity(db, "m", 10000000, "", "ordinary").availableAmount,
    95000,
  );
  const admin = { id: "admin", role: "admin", member: "" };
  changeLoans(db, admin, {
    action: "asset-policy",
    product: "emergency",
    totalPercent: 55,
  });
  assert.equal(readLoanPolicy(db, "ordinary").totalPercent, 95);
  assert.equal(readLoanPolicy(db, "emergency").totalPercent, 55);
  changeLoans(db, admin, {
    action: "asset-policy",
    product: "ordinary",
    totalPercent: 90,
  });
  assert.equal(readLoanPolicy(db, "ordinary").totalPercent, 90);
  db.loans.contracts.push({
    id: "loan",
    member: "m",
    amount: 10000,
    status: "approved",
    loanMode: "asset",
    product: "emergency",
  });
  db.loans.applications.push({
    id: "pending",
    member: "m",
    amount: 5000,
    status: "submitted",
    loanMode: "asset",
    product: "special",
  });
  assert.equal(
    assetBorrowingCapacity(db, "m", 10000000, "", "ordinary").availableAmount,
    75000,
  );
  assert.equal(
    assetBorrowingCapacity(db, "m", 10000000, "", "emergency").availableAmount,
    40000,
  );
  assert.throws(() =>
    changeLoans(db, admin, {
      action: "asset-policy",
      product: "missing",
      totalPercent: 80,
    }),
  );
  assert.equal(readLoanPolicy(db, "ordinary").totalPercent, 90);
});
