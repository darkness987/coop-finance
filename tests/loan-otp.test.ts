import test from "node:test";
import assert from "node:assert/strict";
import { changeLoans, readLoans } from "../lib/loans/loans";
import type { Database } from "../database/store";
const member = { id: "otp-user", role: "member", member: "otp-member" };
function fixture() {
  const row = {
    id: "loan-otp",
    member: member.member,
    amount: 10000,
    months: 12,
    reason: "ทดสอบ",
    status: "draft",
    disbursementMethod: "cash",
    revision: 1,
    terms: { name: "สินเชื่อทดสอบ", annualRate: 6 },
    history: [],
  };
  const db = {
    members: {
      records: [
        {
          id: member.member,
          active: 1,
          joined: "2020-01-01",
          profile: { income: 50000 },
        },
      ],
    },
    shares: {
      accounts: [
        { member: member.member, opening_amount: 50000, opening_units: 500 },
      ],
      payments: [],
    },
    loans: {
      products: [],
      applications: [row],
      contracts: [],
      schedules: [],
      payments: [],
      handoffs: [],
      decisions: [],
    },
  } as unknown as Database;
  const act = (action: string, extra = {}) =>
    changeLoans(db, member, {
      action,
      id: row.id,
      revision: row.revision,
      ...extra,
    }) as any;
  return { db, row, act };
}
test("loan stays draft until valid OTP; rejected attempts persist and successful code is single-use", () => {
  const { db, row, act } = fixture();
  assert.match(act("submit").error, /OTP/);
  const code = act("request-otp");
  assert.equal(row.status, "draft");
  assert.equal(row.revision, 1);
  assert.equal(row.history.length, 0);
  assert.equal(
    JSON.stringify(readLoans(db, member)).includes("submissionOtps"),
    false,
  );
  assert.equal("demoCode" in db.loans.submissionOtps![0], false);
  assert.notEqual(db.loans.submissionOtps![0].codeHash, code.demoCode);
  assert.match(
    act("submit", { challengeId: code.challengeId, otp: "bad" }).error,
    /ไม่ถูกต้อง/,
  );
  assert.equal(db.loans.submissionOtps![0].attempts, 1);
  act("submit", { challengeId: code.challengeId, otp: code.demoCode });
  assert.equal(row.status, "submitted");
  assert.ok(row.otpVerifiedAt);
  assert.equal(db.loans.submissionOtps![0].used, true);
  assert.throws(() =>
    act("submit", { challengeId: code.challengeId, otp: code.demoCode }),
  );
  assert.equal(row.history.length, 1);
});
test("loan OTP rejects a changed request, wrong owner, expired code and five failures", () => {
  const { db, row, act } = fixture();
  const code = act("request-otp");
  assert.throws(() =>
    changeLoans(
      db,
      { ...member, id: "other", member: "other" },
      { action: "request-otp", id: row.id, revision: 1 },
    ),
  );
  row.amount = 20000;
  assert.match(
    act("submit", { challengeId: code.challengeId, otp: code.demoCode }).error,
    /เปลี่ยน/,
  );
  row.amount = 10000;
  db.loans.submissionOtps![0].expiresAt = 0;
  assert.match(
    act("submit", { challengeId: code.challengeId, otp: code.demoCode }).error,
    /หมดอายุ/,
  );
  db.loans.submissionOtps![0].expiresAt = Date.now() + 300000;
  const wrong = code.demoCode === "000000" ? "111111" : "000000";
  for (let n = 0; n < 5; n++)
    assert.ok(
      act("submit", { challengeId: code.challengeId, otp: wrong }).error,
    );
  assert.match(
    act("submit", { challengeId: code.challengeId, otp: code.demoCode }).error,
    /5 ครั้ง/,
  );
  assert.equal(row.status, "draft");
  assert.throws(() => act("request-otp"), /30 วินาที/);
});

test("loan edit needs a new OTP; resend revokes the previous challenge", () => {
  const { db, row, act } = fixture();
  const first = act("request-otp");
  row.revision += 1;
  assert.match(
    act("submit", { challengeId: first.challengeId, otp: first.demoCode })
      .error,
    /เปลี่ยน/,
  );
  db.loans.submissionOtps![0].resendAt = 0;
  const second = act("request-otp");
  assert.notEqual(first.challengeId, second.challengeId);
  assert.match(
    act("submit", { challengeId: first.challengeId, otp: first.demoCode })
      .error,
    /ขอรหัส/,
  );
  act("submit", { challengeId: second.challengeId, otp: second.demoCode });
  assert.equal(row.status, "submitted");
});
