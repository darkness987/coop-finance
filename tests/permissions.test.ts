import test from "node:test";
import assert from "node:assert/strict";
import {
  canAccess,
  canAccessPath,
  landingPage,
  roles,
} from "../lib/auth/permissions";
import { changeUsers, readUsers } from "../lib/auth/users";
import { changeLoans } from "../lib/loans/loans";
import { changeDeposits } from "../lib/deposits/deposits";
import type { Database } from "../database/store";
const staff = (role: string) => ({
  id: role,
  role: "admin",
  accessRole: role,
  member: "m",
});
test("five roles give membership officers loan review/approval while preserving accounting separation", () => {
  assert.equal(roles.length, 5);
  const officer = staff("loan_officer"),
    accountant = staff("accountant"),
    membership = staff("member_officer");
  assert.equal(canAccess(officer, "loans", "check"), true);
  assert.equal(canAccess(officer, "loans", "forward"), true);
  assert.equal(canAccess(officer, "loans", "approve"), true);
  assert.equal(canAccess(officer, "loans", "disburse"), false);
  for (const action of [
    "read",
    "check",
    "request-correction",
    "forward",
    "approve",
    "reject",
  ])
    assert.equal(canAccess(membership, "loans", action), true);
  assert.equal(canAccessPath(membership, "/admin/loans"), true);
  assert.equal(canAccess(membership, "loans", "repay"), false);
  assert.equal(canAccess(membership, "loans", "disburse"), false);
  assert.equal(canAccess(staff("approver"), "loans", "approve"), false);
  assert.equal(canAccess(accountant, "loans", "repay"), true);
  assert.equal(canAccess(accountant, "loans", "confirm-repayment"), true);
  assert.equal(canAccess(accountant, "loans", "approve"), false);
  assert.equal(canAccess(membership, "members", "save"), true);
  assert.equal(canAccess(membership, "deposits"), false);
  for (const user of [officer, accountant, membership]) {
    assert.equal(canAccess(user, "users", "create"), false);
    assert.equal(canAccess(user, "users", "password"), true);
    assert.equal(canAccess(user, "dashboard"), false);
    assert.equal(canAccessPath(user, "/admin/users"), false);
    assert.equal(canAccessPath(user, landingPage(user)), true);
  }
  assert.equal(canAccess({ role: "member" }, "users"), false);
  assert.equal(canAccessPath({ role: "member" }, "/admin/loans"), false);
  assert.equal(canAccess({ role: "unknown" }, "members"), false);
});
test("forbidden service calls fail before accessing or mutating financial records", () => {
  const db = {} as Database;
  assert.throws(
    () => changeLoans(db, staff("loan_officer"), { action: "product" }),
    { status: 403 },
  );
  assert.throws(
    () => changeLoans(db, staff("member_officer"), { action: "disburse" }),
    { status: 403 },
  );
  assert.throws(
    () => changeDeposits(db, staff("member_officer"), { action: "confirm" }),
    { status: 403 },
  );
  assert.throws(() => readUsers(db, staff("accountant")), { status: 403 });
});
test("only admin changes roles; stale sessions are revoked and secrets never returned", () => {
  const db = {
    auth: {
      users: [
        {
          id: "admin",
          username: "admin",
          role: "admin",
          member: "m",
          active: true,
          passwordHash: "secret",
          sessions: [],
        },
        {
          id: "target",
          username: "worker",
          role: "member",
          member: "m",
          active: true,
          passwordHash: "private",
          sessions: [{ hash: "session-secret" }],
        },
      ],
      auditLogs: [],
    },
    members: { records: [] },
  } as unknown as Database;
  const admin = staff("admin");
  changeUsers(db, admin, {
    action: "role",
    id: "target",
    role: "member_officer",
  });
  assert.equal(db.auth.users[1].role, "member_officer");
  assert.deepEqual(db.auth.users[1].sessions, []);
  assert.throws(
    () =>
      changeUsers(db, staff("member_officer"), {
        action: "role",
        id: "target",
        role: "admin",
      }),
    { status: 403 },
  );
  assert.throws(() =>
    changeUsers(db, admin, { action: "role", id: "admin", role: "member" }),
  );
  assert.throws(() =>
    changeUsers(db, admin, { action: "role", id: "target", role: "invented" }),
  );
  assert.throws(() =>
    changeUsers(db, admin, { action: "role", id: "target", role: "approver" }),
  );
  const json = JSON.stringify(readUsers(db, admin));
  assert.equal(json.includes("passwordHash"), false);
  assert.equal(json.includes("sessions"), false);
});

test("accountants read only the minimal member directory", () => {
  const a = staff("accountant");
  assert.equal(canAccess(a, "directory"), true);
  assert.equal(canAccess(a, "directory", "save"), false);
  assert.equal(canAccess(a, "members", "save"), false);
  assert.equal(canAccess({ role: "unknown" }, "users", "password"), false);
});

test("create by name and member number uses member login and rejects mismatched names", () => {
  const db = {
    members: { records: [{ id: "66000001", name: "ชื่อ ทดสอบ" }] },
    auth: { users: [], auditLogs: [] },
  } as unknown as Database;
  const base = {
    action: "create",
    member: "66000001",
    role: "loan_officer",
    password: "Temporary-test-123",
  };
  assert.throws(() =>
    changeUsers(db, staff("admin"), { ...base, name: "คนอื่น" }),
  );
  assert.equal(db.auth.users.length, 0);
  changeUsers(db, staff("admin"), { ...base, name: "  ชื่อ   ทดสอบ  " });
  assert.equal(db.auth.users[0].username, "66000001");
  assert.equal(db.auth.users[0].member, "66000001");
  assert.equal(db.auth.users[0].role, "loan_officer");
  assert.ok(db.auth.users[0].passwordHash);
  assert.equal("password" in db.auth.users[0], false);
});
