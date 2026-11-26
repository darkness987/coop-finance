import test from "node:test";
import assert from "node:assert/strict";
import {
  issueWithdrawalOtp,
  verifyWithdrawalOtp,
} from "../lib/deposits/deposit-otp";
import { changeDeposits, readDeposits } from "../lib/deposits/deposits";
import type { Database } from "../database/store";
const member = { id: "user-otp", role: "member", member: "member-otp" };
function fixture() {
  return {
    shares: {
      accounts: [
        { member: member.member, opening_amount: 1000, opening_units: 10 },
      ],
      payments: [],
    },
    members: { records: [{ id: member.member, active: 1 }] },
    deposits: {
      accounts: [
        {
          id: "SA-OTP",
          member: member.member,
          balanceCents: 100000,
          status: "active",
        },
      ],
      transactions: [],
    },
  } as unknown as Database;
}
const binding = {
  user: member.id,
  member: member.member,
  account: "SA-OTP",
  amountCents: 10000,
  requestId: "request-otp-one",
  channel: "counter",
  description: "",
};
test("OTP binds the exact request, expires, throttles resend and rejects replay", () => {
  const db = fixture(),
    now = 1000000;
  const challenge = issueWithdrawalOtp(db, binding, now);
  assert.match(challenge.demoCode, /^\d{6}$/);
  assert.equal(JSON.stringify(db).includes('"demoCode"'), false);
  assert.throws(() => issueWithdrawalOtp(db, binding, now + 1000));
  assert.ok(
    verifyWithdrawalOtp(
      db,
      { ...binding, amountCents: 20000 },
      challenge.challengeId,
      challenge.demoCode,
      now,
    ),
  );
  assert.ok(
    verifyWithdrawalOtp(
      db,
      { ...binding, user: "another-user" },
      challenge.challengeId,
      challenge.demoCode,
      now,
    ),
  );
  assert.equal(
    verifyWithdrawalOtp(
      db,
      binding,
      challenge.challengeId,
      challenge.demoCode,
      now,
    ),
    null,
  );
  assert.ok(
    verifyWithdrawalOtp(
      db,
      binding,
      challenge.challengeId,
      challenge.demoCode,
      now,
    ),
  );
  const next = issueWithdrawalOtp(db, binding, now + 30001);
  assert.ok(
    verifyWithdrawalOtp(
      db,
      binding,
      challenge.challengeId,
      challenge.demoCode,
      now + 30002,
    ),
  );
  assert.ok(
    verifyWithdrawalOtp(
      db,
      binding,
      next.challengeId,
      next.demoCode,
      next.expiresAt,
    ),
  );
});
test("five wrong attempts lock the code", () => {
  const db = fixture(),
    challenge = issueWithdrawalOtp(db, binding);
  const wrong = challenge.demoCode === "000000" ? "111111" : "000000";
  for (let i = 0; i < 5; i++)
    assert.ok(verifyWithdrawalOtp(db, binding, challenge.challengeId, wrong));
  assert.match(
    verifyWithdrawalOtp(
      db,
      binding,
      challenge.challengeId,
      challenge.demoCode,
    )!,
    /5/,
  );
  assert.equal(db.deposits.withdrawalOtps![0].used, false);
});
test("withdrawal needs a correct OTP and creates only a pending request; deposit remains unchanged", () => {
  const db = fixture(),
    input = {
      action: "request",
      account: "SA-OTP",
      type: "withdrawal",
      amount: 100,
      channel: "counter",
      requestId: "request-otp-one",
    };
  assert.ok((changeDeposits(db, member, input) as any).error);
  assert.equal(db.deposits.transactions.length, 0);
  const challenge = changeDeposits(db, member, {
    ...input,
    action: "request-otp",
  }) as any;
  const wrong = challenge.demoCode === "000000" ? "111111" : "000000";
  assert.ok(
    (
      changeDeposits(db, member, {
        ...input,
        challengeId: challenge.challengeId,
        otp: wrong,
      }) as any
    ).error,
  );
  assert.equal(db.deposits.withdrawalOtps![0].attempts, 1);
  changeDeposits(db, member, {
    ...input,
    challengeId: challenge.challengeId,
    otp: challenge.demoCode,
  });
  assert.equal(db.deposits.transactions.length, 1);
  assert.equal(db.deposits.transactions[0].status, "pending");
  assert.ok(db.deposits.transactions[0].otpVerifiedAt);
  assert.equal(db.deposits.accounts[0].balanceCents, 100000);
  assert.throws(() =>
    changeDeposits(db, member, {
      ...input,
      challengeId: challenge.challengeId,
      otp: challenge.demoCode,
    }),
  );
  assert.equal("withdrawalOtps" in readDeposits(db, member), false);
  changeDeposits(db, member, {
    ...input,
    type: "deposit",
    requestId: "request-deposit-no-otp",
  });
  assert.equal(db.deposits.transactions.length, 2);
});
