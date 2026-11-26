import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { submitRegistration } from "../lib/members/registration";
import { changeMembers, readApplications } from "../lib/members/members";
import { withShares } from "../database/shares";
import { readDatabase, type Database } from "../database/store";
import {
  changeMemberServices,
  readMemberServices,
  memberOverview,
} from "../lib/members/member-services";
import { today } from "../lib/shared/date";
function fixture(): Database {
  return {
    version: 1,
    members: {
      records: [
        { id: "12345678", name: "Test", active: 1, joined: "2020-01-01" },
      ],
      applications: [],
    },
    shares: {
      rules: [{ id: 1, price: 100, min: 500 }],
      accounts: [{ member: "12345678", monthly: 2000, opening_amount: 5000 }],
      payments: [
        {
          id: 1,
          member: "12345678",
          period: today().slice(0, 7),
          amount: 1500,
          received: today(),
        },
      ],
      changeRequests: [
        { id: 1, member: "12345678", amount: 1000, status: "pending" },
      ],
    },
    deposits: {
      accounts: [{ member: "12345678", balanceCents: 100000 }],
      transactions: [],
    },
    returns: { allocations: [], dividends: [], rebates: [] },
    loans: {
      products: [],
      applications: [],
      documents: [],
      handoffs: [],
      decisions: [],
      contracts: [],
      payments: [],
      schedules: [],
    },
    auth: { users: [], auditLogs: [] },
  };
}
const officer = {
    id: "officer",
    role: "admin",
    accessRole: "member_officer",
    member: "",
  },
  admin = { id: "admin", role: "admin", member: "" },
  member = { id: "member", role: "member", member: "12345678" };
test("member overview separates paid and pending; preliminary review never applies share amount", () => {
  const db = fixture();
  db.shares.payments.push({
    member: member.member,
    period: today().slice(0, 7),
    amount: 500,
    received: null,
  });
  const o = memberOverview(db, member.member);
  assert.equal(o.paid, 1500);
  assert.equal(o.notified, 500);
  assert.equal(o.shortfall, 500);
  assert.equal(o.shares, 6500);
  changeMemberServices(db, officer, {
    action: "review-share-change",
    id: 1,
    note: "Checked",
  });
  assert.equal(db.shares.accounts[0].monthly, 2000);
  assert.equal(db.shares.changeRequests[0].status, "pending");
  assert.throws(() =>
    changeMemberServices(db, officer, {
      action: "review-share-change",
      id: 1,
      note: "Checked",
    }),
  );
});
test("correction ownership and role permissions are enforced", () => {
  const db = fixture();
  const { id } = changeMemberServices(db, officer, {
    action: "request-correction",
    member: member.member,
    note: "Update phone",
  });
  assert.throws(
    () =>
      changeMemberServices(
        db,
        { ...member, member: "other" },
        { action: "respond-correction", id, note: "Done now" },
      ),
    { status: 403 },
  );
  changeMemberServices(db, member, {
    action: "respond-correction",
    id,
    note: "Updated phone",
  });
  changeMemberServices(db, officer, { action: "complete-correction", id });
  assert.equal(db.members.serviceRequests![0].status, "completed");
  assert.equal(
    readMemberServices(db, { ...member, member: "other" }).requests.length,
    0,
  );
  assert.throws(
    () => readMemberServices(db, { ...officer, accessRole: "accountant" }),
    { status: 403 },
  );
});
test("resignation rechecks debt at forwarding and approval; officer cannot approve", () => {
  const db = fixture();
  const { id } = changeMemberServices(db, officer, {
    action: "create-status-request",
    member: member.member,
    kind: "resign",
    note: "Please resign",
  });
  db.loans.contracts.push({
    id: "c",
    member: member.member,
    status: "approved",
    amount: 1000,
  });
  assert.throws(() =>
    changeMemberServices(db, officer, { action: "forward-status-request", id }),
  );
  db.loans.contracts = [];
  changeMemberServices(db, officer, { action: "forward-status-request", id });
  assert.throws(
    () =>
      changeMemberServices(db, officer, {
        action: "approve-status-request",
        id,
      }),
    { status: 403 },
  );
  db.loans.contracts.push({
    id: "c",
    member: member.member,
    status: "approved",
    amount: 1000,
  });
  assert.throws(() =>
    changeMemberServices(db, admin, { action: "approve-status-request", id }),
  );
  db.loans.contracts = [];
  changeMemberServices(db, admin, { action: "approve-status-request", id });
  assert.equal(db.members.records[0].active, 0);
  assert.equal(db.shares.accounts[0].opening_amount, 5000);
});
const input = {
  fullName: "Applicant Example",
  email: "applicant@example.test",
  phone: "0812345678",
  idCardNumber: "1234567890123",
  birthDate: "1990-01-01",
  address: "Test address",
  occupation: "Employee",
  salary: "25000",
  password: "TestOnly123!",
  confirmPassword: "TestOnly123!",
};
test("registration validates identity; creates inactive member-role account with hashed secret", () => {
  const db = fixture();
  const result = submitRegistration(db, {
    ...input,
    role: "admin",
    active: true,
  });
  assert.match(result.memberId, /^\d{8}$/);
  assert.equal(db.auth.users[0].active, false);
  assert.equal(db.auth.users[0].role, "member");
  assert.notEqual(db.auth.users[0].passwordHash, input.password);
  assert.throws(() => submitRegistration(db, input), { status: 409 });
  assert.throws(() =>
    submitRegistration(fixture(), { ...input, phone: "123" }),
  );
  assert.throws(() =>
    submitRegistration(fixture(), { ...input, confirmPassword: "wrong" }),
  );
});
test("approval activates registration once, preserves profile and service requests; rejection stays inactive", () => {
  const dir = mkdtempSync(join(tmpdir(), "coop-registration-"));
  const previous = process.env.ALLPROJECT_DATA_FILE;
  try {
    const db = fixture();
    const r = submitRegistration(db, input);
    const rejected = submitRegistration(db, {
      ...input,
      email: "second@example.test",
      idCardNumber: "2234567890123",
    });
    db.members.serviceRequests = [{ id: "keep" }];
    const path = join(dir, "fixture.ts");
    writeFileSync(path, "export const database = " + JSON.stringify(db) + ";");
    process.env.ALLPROJECT_DATA_FILE = path;
    withShares((data) => {
      changeMembers(data, "applications", true, {
        action: "approve",
        id: r.memberId,
      });
      changeMembers(data, "applications", true, {
        action: "reject",
        id: rejected.memberId,
      });
    }, true);
    let saved = readDatabase();
    assert.equal(saved.auth.users[0].active, true);
    assert.equal(saved.auth.users[1].active, false);
    assert.equal(saved.members.serviceRequests![0].id, "keep");
    assert.equal(
      saved.members.records.find((m) => m.id === r.memberId)!.profile
        .citizenNumber,
      input.idCardNumber,
    );
    assert.equal(
      saved.shares.accounts.find((a) => a.member === r.memberId)!
        .opening_amount,
      0,
    );
    const apps = withShares((data) => readApplications(data, true));
    assert.equal(apps[0].profile?.citizenNumber, undefined);
    saved.auth.users[0].active = false;
    writeFileSync(
      path,
      "export const database = " + JSON.stringify(saved) + ";",
    );
    withShares(() => {}, true);
    assert.equal(readDatabase().auth.users[0].active, false);
  } finally {
    if (previous === undefined) delete process.env.ALLPROJECT_DATA_FILE;
    else process.env.ALLPROJECT_DATA_FILE = previous;
    rmSync(dir, { recursive: true, force: true });
  }
});
