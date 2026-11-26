import test from "node:test";
import assert from "node:assert/strict";
import type { Database } from "../database/store";
import { changeMembers } from "../lib/members/members";
import { changeMemberServices } from "../lib/members/member-services";
import { requestActor } from "../lib/shared/context";
import {
  createMonthlyPlan,
  monthlySavingsDue,
} from "../lib/deposits/monthly-plan";
import { depositAccountRate } from "../lib/deposits/deposit-types";
import { changeDeposits } from "../lib/deposits/deposits";
import { dashboard } from "../lib/reports/dashboard";
const member = { id: "u", role: "member", member: "12345678" },
  admin = { id: "a", role: "admin", member: "" };
function fixture() {
  return {
    version: 1,
    members: {
      records: [
        {
          id: member.member,
          name: "Original",
          active: 1,
          joined: "2020-01-01",
          phone: "0812345678",
          email: "old@example.test",
          profile: { income: "10000", citizenNumber: "1234567890123" },
        },
      ],
      applications: [],
    },
    shares: {
      accounts: [{ member: member.member, opening_amount: 1000 }],
      payments: [],
      changeRequests: [],
      rules: [],
    },
    deposits: { accounts: [], transactions: [] },
    loans: { contracts: [], schedules: [], payments: [], applications: [] },
    auth: { users: [], auditLogs: [] },
  } as unknown as Database;
}
test("profile stays unchanged until admin approves, rejects duplicates, staff review, replay, and stale baseline", () => {
  const db = fixture(),
    data: any = { members: db.members.records, profile_change_requests: [] };
  const send = () =>
    requestActor.run(member, () =>
      changeMembers(data, "members", false, {
        action: "profile",
        email: "new@example.test",
        phone: "0899999999",
        profile: { income: "20000" },
      }),
    );
  send();
  db.members.profileChanges = data.profile_change_requests;
  assert.equal(db.members.records[0].profile.income, "10000");
  assert.throws(send);
  const r = db.members.profileChanges![0];
  assert.throws(
    () =>
      changeMemberServices(
        db,
        { ...admin, accessRole: "member_officer" },
        { action: "approve-profile-change", id: r.id },
      ),
    { status: 403 },
  );
  changeMemberServices(db, admin, {
    action: "approve-profile-change",
    id: r.id,
  });
  assert.equal(db.members.records[0].profile.income, "20000");
  assert.equal(db.members.records[0].email, "new@example.test");
  assert.equal(db.members.records[0].profile.citizenNumber, "1234567890123");
  assert.throws(() =>
    changeMemberServices(db, admin, {
      action: "approve-profile-change",
      id: r.id,
    }),
  );
  const second: any = {
    ...r,
    id: "second",
    status: "pending",
    before: structuredClone(r.proposed),
    proposed: { ...r.proposed, email: "other@example.test" },
  };
  db.members.profileChanges!.push(second);
  db.members.records[0].email = "staff@example.test";
  assert.throws(() =>
    changeMemberServices(db, admin, {
      action: "approve-profile-change",
      id: "second",
    }),
  );
  changeMemberServices(db, admin, {
    action: "reject-profile-change",
    id: "second",
    note: "ข้อมูลเปลี่ยนแล้ว",
  });
  assert.equal(db.members.records[0].email, "staff@example.test");
  assert.equal(second.status, "rejected");
});
test("monthly savings validates term and amount, allows repeated demo plan changes, and does not post money on opening", () => {
  const db = fixture();
  for (const termMonths of [18, 25, 0])
    assert.throws(() =>
      changeDeposits(db, member, {
        action: "open",
        type: "monthly",
        termMonths,
        monthlyAmount: 1000,
      }),
    );
  assert.equal(db.deposits.accounts.length, 0);
  for (const value of [0, -1, 1.001, NaN])
    assert.throws(() => createMonthlyPlan(24, value, "2026-11"));
  assert.equal(createMonthlyPlan(24, 1000, "2026-11").endPeriod, "2028-10");
  assert.equal(createMonthlyPlan(36, 1000, "2026-11").endPeriod, "2029-10");
  changeDeposits(db, member, {
    action: "open",
    type: "monthly",
    termMonths: 24,
    monthlyAmount: 1000,
  });
  assert.equal(db.deposits.accounts[0].balanceCents, 0);
  assert.equal(db.deposits.transactions.length, 0);
  const originalStart = db.deposits.accounts[0].monthlyPlan.startPeriod;
  for (const [termMonths, rate] of [
    [12, 2.25],
    [24, 2.75],
    [36, 3],
  ]) {
    changeDeposits(db, member, {
      action: "monthly-plan",
      account: db.deposits.accounts[0].id,
      termMonths,
      monthlyAmount: 2000,
    });
    assert.equal(db.deposits.accounts.length, 1);
    assert.equal(db.deposits.accounts[0].monthlyPlan.annualRate, rate);
    assert.equal(depositAccountRate(db, db.deposits.accounts[0]), rate);
    assert.equal(
      db.deposits.accounts[0].monthlyPlan.startPeriod,
      originalStart,
    );
    assert.equal(
      dashboard(db, member.member, originalStart).monthlyObligation,
      2000,
    );
    assert.equal(db.deposits.accounts[0].balanceCents, 0);
    assert.equal(db.deposits.transactions.length, 0);
  }
  delete db.deposits.accounts[0].monthlyPlan;
  assert.throws(() =>
    changeDeposits(
      db,
      { ...member, member: "99999999" },
      {
        action: "monthly-plan",
        account: db.deposits.accounts[0].id,
        termMonths: 24,
        monthlyAmount: 1000,
      },
    ),
  );
  changeDeposits(db, member, {
    action: "monthly-plan",
    account: db.deposits.accounts[0].id,
    termMonths: 36,
    monthlyAmount: 2000,
  });
  assert.equal(db.deposits.accounts[0].monthlyPlan.monthlyCents, 200000);
});
test("home adds monthly savings once to all contract dues, confirmed deposit reduces current due; pending and interest do not", () => {
  const db = fixture();
  db.deposits.accounts.push({
    id: "monthly",
    member: member.member,
    type: "monthly",
    balanceCents: 0,
    monthlyPlan: createMonthlyPlan(24, 1000, "2026-11"),
  });
  db.loans.contracts.push({
    id: "loan",
    member: member.member,
    status: "approved",
    amount: 10000,
  });
  db.loans.schedules.push({
    contract: "loan",
    number: 1,
    dueDate: "2026-12-01",
    principalCents: 300000,
    interestCents: 36394,
    paidPrincipal: 0,
    paidInterest: 0,
  });
  assert.equal(
    dashboard(db, member.member, "2026-11").monthlyObligation,
    4363.94,
  );
  for (const [type, status, amountCents] of [
    ["deposit", "confirmed", 40000],
    ["deposit", "pending", 60000],
    ["interest", "confirmed", 1000],
  ] as const)
    db.deposits.transactions.push({
      account: "monthly",
      member: member.member,
      type,
      status,
      amountCents,
      confirmed: "2026-11-20",
    });
  assert.equal(monthlySavingsDue(db, member.member, "2026-11").amount, 600);
  assert.equal(
    dashboard(db, member.member, "2026-11").monthlyObligation,
    3963.94,
  );
  assert.equal(monthlySavingsDue(db, member.member, "2028-11").amount, 0);
  assert.equal(monthlySavingsDue(db, "other", "2026-11").amount, 0);
});
