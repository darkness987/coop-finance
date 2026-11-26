import test from "node:test";
import assert from "node:assert/strict";
import { findLoginAccount } from "../lib/auth/login-identity";
import type { Database } from "../database/store";
test("existing member username and member number resolve to the same account without selecting admin", () => {
  const db = {
    auth: {
      users: [
        {
          id: "member",
          username: "member",
          member: "66001239",
          role: "member",
          active: true,
        },
        {
          id: "admin",
          username: "admin",
          member: "66001239",
          role: "admin",
          active: true,
        },
      ],
    },
  } as unknown as Database;
  assert.equal(findLoginAccount(db, "66001239")!.id, "member");
  assert.equal(findLoginAccount(db, " member ")!.id, "member");
  assert.equal(findLoginAccount(db, "admin")!.id, "admin");
  db.auth.users[0].active = false;
  assert.equal(findLoginAccount(db, "66001239"), undefined);
  db.auth.users.push({
    id: "another",
    username: "another",
    member: "66001239",
    role: "member_officer",
    active: true,
  });
  assert.equal(findLoginAccount(db, "66001239"), undefined);
});
test("number usernames remain supported and unregistered or ambiguous numbers cannot login", () => {
  const db = {
    auth: {
      users: [
        {
          id: "one",
          username: "88000001",
          member: "88000001",
          role: "member",
          active: true,
        },
      ],
    },
  } as unknown as Database;
  assert.equal(findLoginAccount(db, "88000001")!.id, "one");
  assert.equal(findLoginAccount(db, "00000000"), undefined);
  assert.equal(findLoginAccount(db, "not-a-user"), undefined);
  db.auth.users[0].active = false;
  assert.equal(findLoginAccount(db, "88000001"), undefined);
});
