import {
  initialShareStatus,
  requireInitialShare,
} from "../lib/shares/initial-share";
import { changeMemberServices } from "../lib/members/member-services";
import { changeMembers } from "../lib/members/members";
import { adminDashboard } from "../lib/reports/admin-dashboard";
import { readDeposits } from "../lib/deposits/deposits";
import { dashboard } from "../lib/reports/dashboard";
import { readUsers, changeUsers } from "../lib/auth/users";
import { verify } from "../lib/auth/session";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readDatabase, updateDatabase } from "../database/store";
import { changeDeposits } from "../lib/deposits/deposits";
import { changeLoans } from "../lib/loans/loans";
import { changeShares, readShares } from "../lib/shares/shares";
import { withShares } from "../database/shares";
import { requestActor } from "../lib/shared/context";
const member = { id: "m", member: "66001239", role: "member" },
  admin = { id: "a", member: "66001239", role: "admin" };
function fixture(fn: () => void) {
  const dir = mkdtempSync(join(tmpdir(), "coop-test-"));
  process.env.ALLPROJECT_DATA_FILE = join(dir, "data.ts");
  writeFileSync(
    process.env.ALLPROJECT_DATA_FILE,
    readFileSync("database/data.ts"),
  );
  try {
    // Fixture ทั่วไปใช้สมาชิกเดิมที่เปิดบริการแล้ว แยกจากสถานะสาธิตในไฟล์จริง
    updateDatabase((db) => {
      for (const account of db.shares.accounts)
        account.initial_payment_required = false;
    });
    fn();
  } finally {
    delete process.env.ALLPROJECT_DATA_FILE;
    rmSync(dir, { recursive: true, force: true });
  }
}
test("rollback, external-edit detection, shared reads", () =>
  fixture(() => {
    const before = readDatabase();
    assert.throws(() =>
      updateDatabase((db) => {
        db.members.records = [];
        throw Error("rollback");
      }),
    );
    assert.deepEqual(readDatabase(), before);
    assert.throws(() =>
      updateDatabase((db) => {
        db.members.records = [];
        writeFileSync(
          process.env.ALLPROJECT_DATA_FILE!,
          readFileSync(process.env.ALLPROJECT_DATA_FILE!, "utf8") + "\n",
        );
      }),
    );
    assert.deepEqual(readDatabase(), before);
  }));
test("deposit pending does not change balance; duplicate confirmation and overdraft rejected", () =>
  fixture(() => {
    updateDatabase((db) => {
      db.deposits.accounts = [];
      db.deposits.transactions = [];
    });
    const act = (a: any, i: any) =>
      updateDatabase((db) => changeDeposits(db, a, i));
    act(member, { action: "open" });
    act(member, {
      action: "request",
      account: "SA-66001239",
      type: "deposit",
      amount: 1000,
      requestId: "deposit-request-one",
    });
    assert.equal(readDatabase().deposits.accounts[0].balanceCents, 0);
    const id = readDatabase().deposits.transactions[0].id;
    assert.throws(() => act(member, { action: "confirm", id }));
    act(admin, { action: "confirm", id });
    assert.equal(readDatabase().deposits.accounts[0].balanceCents, 100000);
    assert.throws(() => act(admin, { action: "confirm", id }));
    assert.throws(() =>
      act(member, {
        action: "request",
        account: "SA-66001239",
        type: "deposit",
        amount: 1000,
        requestId: "deposit-request-one",
      }),
    );
    for (const requestId of [
      "withdrawal-request-one",
      "withdrawal-request-two",
    ]) {
      // จำลองเวลาผ่าน cooldown เพื่อทดสอบสองคำขอที่รอตรวจสอบ
      updateDatabase((db) => {
        for (const row of db.deposits.withdrawalOtps || []) row.resendAt = 0;
      });
      const input = {
        account: "SA-66001239",
        type: "withdrawal",
        amount: 800,
        requestId,
      };
      const challenge = act(member, { ...input, action: "request-otp" }) as any;
      act(member, {
        ...input,
        action: "request",
        challengeId: challenge.challengeId,
        otp: challenge.demoCode,
      });
    }
    const rows = readDatabase().deposits.transactions;
    act(admin, { action: "confirm", id: rows[1].id });
    assert.throws(() => act(admin, { action: "confirm", id: rows[2].id }));
    assert.equal(readDatabase().deposits.accounts[0].balanceCents, 20000);
  }));
test("shares use central member, increase only after receipt, idempotent confirmation", () =>
  fixture(() =>
    requestActor.run(member, () => {
      updateDatabase((db) => (db.shares.payments = []));
      const before = withShares((db) => readShares(db, false)).accounts[0]
        .amount;
      withShares(
        (db) =>
          changeShares(db, false, {
            action: "notify",
            amount: 15000,
            method: "เงินโอน",
          }),
        true,
      );
      assert.equal(
        withShares((db) => readShares(db, false)).accounts[0].amount,
        before,
      );
      const id = readDatabase().shares.payments[0].id;
      withShares(
        (db) =>
          changeShares(db, true, {
            action: "receive",
            id,
            reference: "S1",
            expectedAmount: 15000,
            expectedMethod: "เงินโอน",
            expectedPrice: 100,
          }),
        true,
      );
      withShares(
        (db) =>
          changeShares(db, true, {
            action: "receive",
            id,
            reference: "S1",
            expectedAmount: 15000,
            expectedMethod: "เงินโอน",
            expectedPrice: 100,
          }),
        true,
      );
      assert.equal(
        withShares((db) => readShares(db, false)).accounts[0].amount,
        before + 15000,
      );
    }),
  ));
test("loan submission without uploads, approval, disbursement, repayment and duplicate protections", () =>
  fixture(() => {
    updateDatabase((db) => {
      // แยกกรณีทดสอบออกจากสัญญาที่ผู้ใช้เพิ่มในข้อมูลตัวอย่างจริง
      db.loans.contracts = [];
      db.loans.schedules = [];
      db.loans.payments = [];

      db.members.records[0].profile = {
        ...db.members.records[0].profile,
        income: "30000",
      };
    });
    const act = (a: any, i: any) =>
      updateDatabase((db) => changeLoans(db, a, i));
    act(member, {
      action: "create",
      product: "ordinary",
      amount: 10000,
      months: 12,
      reason: "ทดสอบ",
      loanMode: "guaranteed",
      guarantorMembers: ["66001240", "66001241"],
      disbursementMethod: "cash",
    });
    const row = () => readDatabase().loans.applications.at(-1)!;
    const step = (a: any, action: string, extra = {}) =>
      act(a, { action, id: row().id, revision: row().revision, ...extra });
    const otp = step(member, "request-otp") as any;
    step(member, "submit", { challengeId: otp.challengeId, otp: otp.demoCode });
    assert.throws(() => step(member, "approve"));
    step(admin, "check");
    step(admin, "forward");
    step(admin, "approve");
    assert.throws(() => step(admin, "approve"));
    const c = readDatabase().loans.contracts.at(-1)!;
    assert.throws(() =>
      act(admin, { action: "repay", id: c.id, amount: 100, reference: "P0" }),
    );
    act(admin, { action: "disburse", id: c.id, reference: "L1" });
    assert.throws(() =>
      act(admin, { action: "disburse", id: c.id, reference: "L2" }),
    );
    const total = readDatabase()
      .loans.schedules.filter((s) => s.contract === c.id)
      .reduce((sum, s) => sum + s.principalCents + s.interestCents, 0);
    act(admin, {
      action: "repay",
      id: c.id,
      amount: total / 100,
      reference: "P1",
    });
    assert.equal(readDatabase().loans.contracts.at(-1)!.status, "closed");
    assert.throws(() =>
      act(admin, { action: "repay", id: c.id, amount: 10, reference: "P1" }),
    );
  }));

test("annual interest posts once with correct day weighting", () =>
  fixture(() => {
    updateDatabase((db) => {
      db.returns.settings = {
        dividendPercent: 4,
        rebatePercent: 5,
        depositRates: { savings: 3 },
      };
      db.deposits.accounts = [
        { id: "SA-66001239", member: "66001239", balanceCents: 100000 },
      ];
      db.deposits.transactions = [
        {
          id: "seed",
          account: "SA-66001239",
          member: "66001239",
          type: "deposit",
          amountCents: 100000,
          status: "confirmed",
          confirmed: "2025-01-01T00:00:00+07:00",
          effectiveDate: "2025-01-01",
        },
      ];
    });
    updateDatabase((db) =>
      changeDeposits(db, admin, {
        action: "interest",
        account: "SA-66001239",
        year: 2025,
        rate: 3,
      }),
    );
    assert.equal(readDatabase().deposits.accounts[0].balanceCents, 103000);
    assert.throws(() =>
      updateDatabase((db) =>
        changeDeposits(db, admin, {
          action: "interest",
          account: "SA-66001239",
          year: 2025,
          rate: 3,
        }),
      ),
    );
  }));

test("user management restricts roles and never returns password hashes or sessions", () =>
  fixture(() => {
    // ตรวจด้วย service บนสำเนาฐานข้อมูลเท่านั้น
    assert.throws(() => readUsers(readDatabase(), member));
    assert.throws(() =>
      updateDatabase((db) =>
        changeUsers(db, member, {
          action: "create",
          username: "tester",
          password: "Example123!",
          member: member.member,
          role: "admin",
        }),
      ),
    );
    updateDatabase((db) =>
      changeUsers(db, admin, {
        action: "create",
        username: "tester",
        password: "Example123!",
        member: member.member,
        role: "member",
      }),
    );
    const row = readDatabase().auth.users.find((u) => u.username === "tester")!;
    assert.notEqual(row.passwordHash, "Example123!");
    assert.equal(verify("Example123!", row.passwordHash), true);
    const publicUser = readUsers(readDatabase(), admin).users.find(
      (u) => u.username === "tester",
    )!;
    assert.equal("passwordHash" in publicUser, false);
    assert.equal("sessions" in publicUser, false);
    assert.throws(() =>
      updateDatabase((db) =>
        changeUsers(db, admin, {
          action: "create",
          username: "tester",
          password: "Example123!",
          member: member.member,
          role: "member",
        }),
      ),
    );
  }));

test("dashboard scopes all totals to member and ignores unconfirmed entries", () =>
  fixture(() => {
    const db = readDatabase();
    db.shares.accounts = [
      { member: "66001239", opening_amount: 1000, opening_date: "2020-01-01" },
      { member: "other", opening_amount: 90000, opening_date: "2020-01-01" },
    ];
    db.shares.payments = [
      { id: 1, member: "66001239", amount: 500, received: "2026-10-05" },
      { id: 2, member: "66001239", amount: 700, received: null },
    ];
    db.deposits.accounts = [
      { member: "66001239", balanceCents: 20000 },
      { member: "other", balanceCents: 90000 },
    ];
    db.deposits.transactions = [
      {
        id: "d",
        member: "66001239",
        type: "deposit",
        status: "confirmed",
        amountCents: 20000,
        confirmed: "2026-10-05",
        created: "2026-10-01",
      },
      {
        id: "pending",
        member: "66001239",
        type: "deposit",
        status: "pending",
        amountCents: 80000,
        created: "2026-10-01",
      },
    ];
    db.loans.contracts = [
      { id: "c", member: "66001239", status: "active", number: "LN-1" },
      { id: "other", member: "other", status: "active" },
    ];
    db.loans.schedules = [
      {
        contract: "c",
        number: 1,
        dueDate: "2026-12-01",
        principalCents: 10000,
        interestCents: 100,
        paidPrincipal: 2000,
        paidInterest: 100,
      },
      {
        contract: "other",
        number: 1,
        dueDate: "2026-11-01",
        principalCents: 999999,
        interestCents: 0,
        paidPrincipal: 0,
        paidInterest: 0,
      },
    ];
    const d = dashboard(db, "66001239", "2026-11");
    assert.equal(d.shareTotal, 1500);
    assert.equal(d.depositTotal, 200);
    assert.equal(d.loanTotal, 80);
    assert.equal(d.nextPayment?.amount, 80);
    assert.equal(d.loan?.paidPercent, 20);
    assert.equal(d.monthly[4].shares, 1500);
    assert.equal(d.monthly[4].deposits, 200);
    assert.equal(d.monthly.length, 6);
    assert.equal(d.monthly[5].period, "2026-11");
    assert.equal(d.recent.length, 2);
  }));

test("loan preview and draft editing restore original flow without duplicate applications", () =>
  fixture(() => {
    const act = (actor: any, input: any) =>
      updateDatabase((db) => changeLoans(db, actor, input));
    const db = readDatabase();
    const before = JSON.stringify(db.loans);
    const preview = changeLoans(db, member, {
      action: "estimate",
      product: "ordinary",
      amount: 10000,
      months: 12,
    }) as any;
    assert.equal(preview.calculation.rows.length, 12);
    assert.ok(Number(preview.calculation.installment) > 0);
    assert.equal(JSON.stringify(db.loans), before);
    const created = act(member, {
      action: "create",
      product: "ordinary",
      amount: 10000,
      months: 12,
      reason: "ทดสอบร่าง",
    }) as any;
    assert.ok(created.id);
    const find = () =>
      readDatabase().loans.applications.find((r) => r.id === created.id)!;
    const original = find();
    act(member, {
      action: "save",
      id: created.id,
      revision: original.revision,
      product: "ordinary",
      amount: 15000,
      months: 24,
      reason: "แก้ไขร่าง",
    });
    assert.equal(find().amount, 15000);
    assert.equal(find().months, 24);
    assert.equal(
      readDatabase().loans.applications.filter((r) => r.id === created.id)
        .length,
      1,
    );
    assert.throws(() =>
      act(member, {
        action: "save",
        id: created.id,
        revision: original.revision,
        product: "ordinary",
        amount: 20000,
        months: 24,
        reason: "เก่า",
      }),
    );
    assert.throws(() =>
      act(
        { ...member, member: "66001240" },
        {
          action: "save",
          id: created.id,
          revision: find().revision,
          product: "ordinary",
          amount: 20000,
          months: 24,
          reason: "คนอื่น",
        },
      ),
    );
    assert.throws(() =>
      act(admin, {
        action: "save",
        id: created.id,
        revision: find().revision,
        product: "ordinary",
        amount: 20000,
        months: 24,
        reason: "เจ้าหน้าที่",
      }),
    );
    assert.equal(find().amount, 15000);
  }));

test("admin overview is cooperative-wide and inaccessible to member", () =>
  fixture(() => {
    const db = readDatabase();
    assert.throws(() => adminDashboard(db, member));
    const summary = adminDashboard(db, admin);
    assert.equal(summary.members, db.members.records.length);
    assert.equal(
      summary.depositTotal,
      db.deposits.accounts.reduce((s, a) => s + a.balanceCents / 100, 0),
    );
    assert.equal(
      summary.pending.deposits,
      db.deposits.transactions.filter((t) => t.status === "pending").length,
    );
    assert.ok(
      summary.shareTotal >= dashboard(db, member.member, "2026-11").shareTotal,
    );
  }));

test("deposit views isolate member data; only admin can freeze and confirm accounts", () =>
  fixture(() => {
    const db = readDatabase();
    const own = readDeposits(db, member);
    assert.ok(own.accounts.every((a) => a.member === member.member));
    assert.ok(own.transactions.every((t) => t.member === member.member));
    assert.equal(
      readDeposits(db, admin).accounts.length,
      db.deposits.accounts.length,
    );
    const pending = db.deposits.transactions.find(
      (t) => t.member === member.member && t.status === "pending",
    );
    assert.ok(pending);
    const act = (a: any, i: any) =>
      updateDatabase((db) => changeDeposits(db, a, i));
    assert.throws(() =>
      act(member, {
        action: "account-status",
        id: pending.account,
        status: "suspended",
      }),
    );
    act(admin, {
      action: "account-status",
      id: pending.account,
      status: "suspended",
    });
    const before = readDatabase().deposits.accounts.find(
      (a) => a.id === pending.account,
    )!.balanceCents;
    assert.throws(() => act(admin, { action: "confirm", id: pending.id }));
    assert.throws(() =>
      act(member, {
        action: "request",
        account: pending.account,
        type: "deposit",
        amount: 100,
        reference: "FROZEN-TEST",
      }),
    );
    assert.equal(
      readDatabase().deposits.accounts.find((a) => a.id === pending.account)!
        .balanceCents,
      before,
    );
    act(admin, {
      action: "account-status",
      id: pending.account,
      status: "active",
    });
    act(admin, { action: "confirm", id: pending.id });
    assert.equal(
      readDatabase().deposits.accounts.find((a) => a.id === pending.account)!
        .balanceCents,
      before + pending.amountCents,
    );
    assert.throws(() => act(admin, { action: "confirm", id: pending.id }));
    assert.throws(() =>
      act(admin, {
        action: "request",
        account: pending.account,
        type: "deposit",
        amount: 100,
        reference: "ADMIN-NO-SELF",
      }),
    );
  }));

test("three deposit formats have separate accounts; requests require no manual reference and retry stays unique", () =>
  fixture(() => {
    updateDatabase((db) => {
      db.deposits.accounts = [];
      db.deposits.transactions = [];
    });
    const act = (actor: any, i: any) =>
      updateDatabase((db) => changeDeposits(db, actor, i));
    for (const type of ["savings", "special", "monthly"]) {
      const result = act(member, {
        action: "open",
        type,
        termMonths: 24,
        monthlyAmount: 1000,
      }) as any;
      assert.ok(result.id);
      const account = readDatabase().deposits.accounts.find(
        (a) => a.id === result.id,
      )!;
      assert.equal(account.type, type);
      assert.equal(account.balanceCents, 0);
      assert.throws(() => act(member, { action: "open", type }));
      const input = {
        action: "request",
        type: "deposit",
        account: account.id,
        amount: 250,
        requestId: "request-" + type,
        channel: "counter",
      };
      act(member, input);
      assert.throws(() => act(member, input));
      const row = readDatabase().deposits.transactions.find(
        (t) => t.account === account.id,
      )!;
      assert.equal("reference" in row, false);
      assert.equal(row.channel, "counter");
      assert.equal(
        readDatabase().deposits.accounts.find((a) => a.id === account.id)!
          .balanceCents,
        0,
      );
      act(admin, { action: "confirm", id: row.id });
      assert.equal(
        readDatabase().deposits.accounts.find((a) => a.id === account.id)!
          .balanceCents,
        25000,
      );
      assert.throws(() =>
        act(
          { ...member, member: "66001240" },
          { ...input, requestId: "other-" + type },
        ),
      );
    }
    assert.equal(
      new Set(readDatabase().deposits.accounts.map((a) => a.id)).size,
      3,
    );
    assert.equal(readDeposits(readDatabase(), member).accounts.length, 3);
    assert.throws(() => act(member, { action: "open", type: "fixed" }));
  }));

test("online monthly shares require transfer; cash is recorded by staff", () =>
  fixture(() =>
    requestActor.run(member, () => {
      updateDatabase((db) => {
        db.shares.payments = [];
      });
      const act = (input: Record<string, unknown>) =>
        withShares((db) => changeShares(db, false, input), true);
      assert.throws(() =>
        act({ action: "notify", amount: 1000, method: "เงินสด" }),
      );
      act({ action: "notify", amount: 1000, method: "เงินโอน" });
      assert.equal(readDatabase().shares.payments[0].method, "เงินโอน");
      assert.equal(readDatabase().shares.payments[0].received, null);
    }),
  ));

test("staff records cash and transfer once, updates holdings and rejects pending conflicts or excess", () =>
  fixture(() =>
    requestActor.run(admin, () => {
      updateDatabase((db) => {
        db.shares.payments = [];
        db.shares.accounts.find(
          (row) => row.member === member.member,
        )!.monthly = 2000;
      });
      const act = (isAdmin: boolean, input: Record<string, unknown>) =>
        withShares((db) => changeShares(db, isAdmin, input), true);
      const before = withShares((db) => readShares(db, true)).accounts.find(
        (row) => row.member === member.member,
      )!.amount;
      const input = {
        action: "record-payment",
        member: member.member,
        amount: 1500,
        method: "เงินสด",
        requestId: "counter-cash-payment",
      };
      assert.throws(() => act(false, input));
      act(true, input);
      act(true, input);
      assert.equal(readDatabase().shares.payments.length, 1);
      assert.ok(readDatabase().shares.payments[0].received);
      assert.equal(readDatabase().shares.payments[0].method, "เงินสด");
      assert.equal(
        withShares((db) => readShares(db, true)).accounts.find(
          (row) => row.member === member.member,
        )!.amount,
        before + 1500,
      );
      assert.throws(() =>
        act(true, { ...input, amount: 600, requestId: "excess-payment" }),
      );
      act(true, {
        ...input,
        amount: 500,
        method: "เงินโอน",
        requestId: "counter-transfer-payment",
      });
      assert.equal(readDatabase().shares.payments[1].method, "เงินโอน");
      assert.equal(
        withShares((db) => readShares(db, true)).accounts.find(
          (row) => row.member === member.member,
        )!.amount,
        before + 2000,
      );
      updateDatabase((db) => {
        db.shares.payments[0].received = null;
      });
      assert.throws(() =>
        act(true, { ...input, amount: 500, requestId: "pending-conflict" }),
      );
    }),
  ));

test("home shows approved loan and scheduled payment before disbursement, then actual debt and repayments", () =>
  fixture(() => {
    const db = readDatabase();
    db.loans.contracts = [
      {
        id: "home-loan",
        member: member.member,
        status: "approved",
        amount: 10000,
        installment: "5010.00",
        firstDue: "2026-12-19",
        number: "LN-HOME",
      },
      {
        id: "private-loan",
        member: "66001240",
        status: "approved",
        amount: 999999,
        installment: 99999,
        firstDue: "2026-11-01",
        number: "PRIVATE",
      },
    ];
    db.loans.schedules = [
      {
        contract: "home-loan",
        number: 1,
        dueDate: "2026-12-19",
        principalCents: 500000,
        interestCents: 1000,
        paidPrincipal: 0,
        paidInterest: 0,
      },
      {
        contract: "home-loan",
        number: 2,
        dueDate: "2027-01-19",
        principalCents: 500000,
        interestCents: 1000,
        paidPrincipal: 0,
        paidInterest: 0,
      },
      {
        contract: "private-loan",
        number: 1,
        dueDate: "2026-11-01",
        principalCents: 99999900,
        interestCents: 0,
        paidPrincipal: 0,
        paidInterest: 0,
      },
    ];
    let d = dashboard(db, member.member, "2026-11");
    assert.equal(d.approvedLoanTotal, 10000);
    assert.equal(d.approvedLoanCount, 1);
    assert.equal(d.pendingLoan?.number, "LN-HOME");
    assert.equal(d.loanTotal, 0);
    assert.equal(d.nextPayment, null);
    assert.equal(d.pendingNextPayment?.amount, 5010);
    assert.equal(d.pendingNextPayment?.date, "2026-12-19");
    db.loans.contracts[0].status = "active";
    d = dashboard(db, member.member, "2026-11");
    assert.equal(d.approvedLoanTotal, 0);
    assert.equal(d.pendingLoan, null);
    assert.equal(d.loanTotal, 10000);
    assert.equal(d.nextPayment?.amount, 5010);
    db.loans.schedules[0].paidPrincipal = 500000;
    db.loans.schedules[0].paidInterest = 1000;
    d = dashboard(db, member.member, "2026-11");
    assert.equal(d.loanTotal, 5000);
    assert.equal(d.nextPayment?.date, "2027-01-19");
    assert.equal(d.loan?.paidPercent, 50);
    db.loans.contracts[0].status = "closed";
    d = dashboard(db, member.member, "2026-11");
    assert.equal(d.loanTotal, 0);
    assert.equal(d.nextPayment, null);
    assert.equal(d.pendingLoan, null);
  }));

test("pending shares can be edited by owner; stale confirmation, duplicate and received edits are rejected", () =>
  fixture(() =>
    requestActor.run(member, () => {
      updateDatabase((db) => {
        db.shares.payments = [];
      });
      const act = (isAdmin: boolean, input: Record<string, unknown>) =>
        withShares((db) => changeShares(db, isAdmin, input), true);
      const before = withShares((db) => readShares(db, false)).accounts[0]
        .amount;
      act(false, { action: "notify", amount: 1500, method: "เงินโอน" });
      const original = readDatabase().shares.payments[0];
      const edit = {
        action: "update-pending",
        id: original.id,
        amount: 2000,
        method: "เงินโอน",
        expectedAmount: 1500,
        expectedMethod: "เงินโอน",
        expectedPrice: original.price,
      };
      assert.throws(() =>
        requestActor.run({ ...member, member: "66001240" }, () =>
          act(false, edit),
        ),
      );
      assert.throws(() => act(true, edit));
      assert.throws(() => act(false, { ...edit, amount: 550 }));
      act(false, edit);
      assert.equal(readDatabase().shares.payments.length, 1);
      assert.equal(readDatabase().shares.payments[0].amount, 2000);
      assert.equal(readDatabase().shares.payments[0].method, "เงินโอน");
      assert.equal(
        withShares((db) => readShares(db, false)).accounts[0].amount,
        before,
      );
      assert.throws(() => act(false, edit));
      assert.throws(() =>
        act(false, { action: "notify", amount: 2000, method: "เงินโอน" }),
      );
      assert.throws(() =>
        act(true, {
          action: "receive",
          id: original.id,
          reference: "STALE",
          expectedAmount: 1500,
          expectedMethod: "เงินโอน",
          expectedPrice: original.price,
        }),
      );
      assert.equal(readDatabase().shares.payments[0].received, null);
      act(true, {
        action: "receive",
        id: original.id,
        reference: "EDIT-RECEIVED",
        expectedAmount: 2000,
        expectedMethod: "เงินโอน",
        expectedPrice: original.price,
      });
      assert.equal(
        withShares((db) => readShares(db, false)).accounts[0].amount,
        before + 2000,
      );
      assert.throws(() =>
        act(false, {
          ...edit,
          amount: 2500,
          expectedAmount: 2000,
          expectedMethod: "เงินโอน",
        }),
      );
      assert.equal(readDatabase().shares.payments[0].amount, 2000);
    }),
  ));

test("member cannot change citizen number; editable profile saves without submitting locked fields", () =>
  fixture(() =>
    requestActor.run(member, () => {
      updateDatabase((db) => {
        // แยกคำขอใน fixture ออกจากข้อมูลที่ผู้ใช้กำลังทดลองจริง
        db.members.profileChanges = [];
        const record = db.members.records.find(
          (row) => row.id === member.member,
        )!;
        record.profile = { ...record.profile, citizenNumber: "1234567890123" };
      });
      const act = (profile: Record<string, string>) =>
        withShares(
          (db) =>
            changeMembers(db, "members", false, {
              action: "profile",
              email: "profile@example.test",
              phone: "0891234567",
              profile,
            }),
          true,
        );
      const before = readDatabase().members.records.find(
        (row) => row.id === member.member,
      )!;
      assert.throws(() =>
        act({ citizenNumber: "9999999999999", company: "must not save" }),
      );
      assert.deepEqual(
        readDatabase().members.records.find((row) => row.id === member.member),
        before,
      );
      act({ company: "บริษัททดสอบ", occupation: "พนักงาน" });
      const after = readDatabase().members.records.find(
        (row) => row.id === member.member,
      )!;
      assert.equal(after.profile.citizenNumber, "1234567890123");
      assert.deepEqual(after, before);
      const request = readDatabase().members.profileChanges![0];
      assert.equal(request.proposed.profile.company, "บริษัททดสอบ");
      updateDatabase((db) =>
        changeMemberServices(db, admin, {
          action: "approve-profile-change",
          id: request.id,
        }),
      );
      const approved = readDatabase().members.records.find(
        (r) => r.id === member.member,
      )!;
      assert.equal(approved.profile.company, "บริษัททดสอบ");
      assert.equal(approved.phone, "0891234567");
    }),
  ));

test("initial shares gate remains locked until receipt, then updates monthly amount and unlocks member services", () =>
  fixture(() =>
    requestActor.run(member, () => {
      updateDatabase((db) => {
        db.shares.payments = db.shares.payments.filter(
          (row) => row.member !== member.member,
        );
        const account = db.shares.accounts.find(
          (row) => row.member === member.member,
        )!;
        Object.assign(account, {
          opening_amount: 0,
          opening_units: 0,
          monthly: 500,
        });
      });
      assert.equal(
        initialShareStatus(readDatabase(), member.member).state,
        "unpaid",
      );
      assert.throws(() => requireInitialShare(readDatabase(), member));
      assert.doesNotThrow(() => requireInitialShare(readDatabase(), admin));
      assert.throws(() =>
        updateDatabase((db) =>
          changeDeposits(db, member, { action: "open", type: "fixed" }),
        ),
      );
      assert.throws(() =>
        updateDatabase((db) =>
          changeLoans(db, member, {
            action: "create",
            product: "ordinary",
            amount: 1000,
            months: 3,
          }),
        ),
      );
      const act = (isAdmin: boolean, input: Record<string, unknown>) =>
        withShares((db) => changeShares(db, isAdmin, input), true);
      assert.throws(() =>
        act(false, { action: "request-change", amount: 1000 }),
      );
      act(false, { action: "notify-initial", amount: 1000, method: "เงินสด" });
      const pending = readDatabase().shares.payments.find(
        (row) => row.member === member.member,
      )!;
      assert.equal(pending.initial, true);
      assert.equal(
        initialShareStatus(readDatabase(), member.member).state,
        "pending",
      );
      assert.throws(() => requireInitialShare(readDatabase(), member));
      assert.equal(
        withShares((db) => readShares(db, false)).accounts[0].amount,
        0,
      );
      assert.throws(() =>
        act(false, {
          action: "notify-initial",
          amount: 1000,
          method: "เงินโอน",
        }),
      );
      assert.throws(() =>
        act(false, { action: "receive", id: pending.id, reference: "INITIAL" }),
      );
      act(true, {
        action: "receive",
        id: pending.id,
        reference: "INITIAL",
        expectedAmount: 1000,
        expectedMethod: "เงินสด",
        expectedPrice: pending.price,
      });
      assert.equal(
        initialShareStatus(readDatabase(), member.member).state,
        "active",
      );
      assert.doesNotThrow(() => requireInitialShare(readDatabase(), member));
      const account = withShares((db) => readShares(db, false)).accounts[0];
      assert.equal(account.amount, 1000);
      assert.equal(account.units, 1000 / pending.price);
      assert.equal(account.monthly, 1000);
      assert.throws(() =>
        act(false, {
          action: "notify-initial",
          amount: 1000,
          method: "เงินสด",
        }),
      );
    }),
  ));
test("existing opening shares remain active without another first payment", () =>
  fixture(() => {
    const db = readDatabase();
    db.shares.payments = [];
    const account = db.shares.accounts.find(
      (row) => row.member === member.member,
    )!;
    Object.assign(account, { opening_amount: 5000, opening_units: 50 });
    assert.equal(initialShareStatus(db, member.member).required, false);
  }));

test("monthly commitment and notified payment stay distinct until change approval", () =>
  fixture(() =>
    requestActor.run(member, () => {
      updateDatabase((db) => {
        db.shares.payments = db.shares.payments.filter(
          (row) => row.member !== member.member,
        );
        db.shares.changeRequests = [];
        db.shares.accounts.find(
          (row) => row.member === member.member,
        )!.monthly = 2000;
      });
      const act = (admin: boolean, input: Record<string, unknown>) =>
        withShares((db) => changeShares(db, admin, input), true);
      const read = () => withShares((db) => readShares(db, false));
      act(false, { action: "notify", amount: 1500, method: "เงินโอน" });
      act(false, { action: "request-change", amount: 1000 });
      let view = read();
      assert.equal(view.accounts[0].monthly, 2000);
      assert.equal(view.payments[0].amount, 1500);
      assert.equal(view.changes[0].amount, 1000);
      assert.equal(view.changes[0].status, "pending");
      const payment = view.payments[0];
      act(false, {
        action: "update-pending",
        id: payment.id,
        amount: 2500,
        method: "เงินโอน",
        expectedAmount: 1500,
        expectedMethod: "เงินโอน",
        expectedPrice: payment.price,
      });
      view = read();
      assert.equal(view.accounts[0].monthly, 2000);
      act(true, { action: "approve-change", id: view.changes[0].id });
      view = read();
      assert.equal(view.accounts[0].monthly, 1000);
      assert.equal(view.payments[0].amount, 2500);
      assert.equal(view.payments[0].received, null);
      assert.equal(view.changes[0].status, "approved");
    }),
  ));

test("admin confirms shares without typing a reference and retries never add shares twice", () =>
  fixture(() =>
    requestActor.run(member, () => {
      updateDatabase((db) => {
        db.shares.payments = [];
      });
      const before = withShares((db) => readShares(db, false)).accounts[0]
        .amount;
      const act = (isAdmin: boolean, input: Record<string, unknown>) =>
        withShares((db) => changeShares(db, isAdmin, input), true);
      act(false, { action: "notify", amount: 1000, method: "เงินโอน" });
      const payment = readDatabase().shares.payments[0];
      const input = {
        action: "receive",
        id: payment.id,
        expectedAmount: 1000,
        expectedMethod: "เงินโอน",
        expectedPrice: payment.price,
      };
      assert.throws(() => act(false, input));
      act(true, input);
      const reference = readDatabase().shares.payments[0].reference;
      assert.match(reference, /^SH-/);
      assert.equal(
        withShares((db) => readShares(db, false)).accounts[0].amount,
        before + 1000,
      );
      act(true, input);
      assert.equal(readDatabase().shares.payments[0].reference, reference);
      assert.equal(
        withShares((db) => readShares(db, false)).accounts[0].amount,
        before + 1000,
      );
    }),
  ));

test("member can top up 1500 with 500 in the same period without altering the first receipt", () =>
  fixture(() =>
    requestActor.run(member, () => {
      updateDatabase((db) => {
        db.shares.payments = [];
        db.shares.accounts.find(
          (row) => row.member === member.member,
        )!.monthly = 2000;
      });
      const act = (admin: boolean, input: Record<string, unknown>) =>
        withShares((db) => changeShares(db, admin, input), true);
      const view = () => withShares((db) => readShares(db, false));
      const receive = (payment: any) =>
        act(true, {
          action: "receive",
          id: payment.id,
          expectedAmount: payment.amount,
          expectedMethod: payment.method,
          expectedPrice: payment.price,
        });
      const before = view().accounts[0].amount;
      act(false, {
        action: "notify",
        amount: 1500,
        method: "เงินโอน",
        requestId: "first-month-payment",
      });
      receive(view().payments[0]);
      const firstReceipt = structuredClone(view().payments[0]);
      act(false, {
        action: "notify",
        amount: 500,
        method: "เงินโอน",
        requestId: "topup-month-payment",
      });
      assert.equal(view().accounts[0].amount, before + 1500);
      assert.equal(view().payments.length, 2);
      assert.deepEqual(
        view().payments.find((row) => row.id === firstReceipt.id),
        firstReceipt,
      );
      assert.throws(() =>
        act(false, {
          action: "notify",
          amount: 500,
          method: "เงินโอน",
          requestId: "topup-other-payment",
        }),
      );
      const topup = view().payments[0];
      receive(topup);
      receive(topup);
      assert.equal(view().accounts[0].amount, before + 2000);
      assert.notEqual(view().payments[0].reference, firstReceipt.reference);
      assert.throws(() =>
        act(false, { action: "notify", amount: 500, method: "เงินโอน" }),
      );
      updateDatabase((db) => {
        db.shares.accounts.find(
          (row) => row.member === member.member,
        )!.monthly = 2500;
      });
      assert.throws(() =>
        act(false, {
          action: "notify",
          amount: 500,
          method: "เงินโอน",
          requestId: "topup-month-payment",
        }),
      );
    }),
  ));

test("remaining shares below the monthly minimum can be paid to complete the period", () =>
  fixture(() =>
    requestActor.run(member, () => {
      updateDatabase((db) => {
        db.shares.payments = [];
        db.shares.accounts.find(
          (row) => row.member === member.member,
        )!.monthly = 2000;
      });
      const act = (admin: boolean, input: Record<string, unknown>) =>
        withShares((db) => changeShares(db, admin, input), true);
      act(false, { action: "notify", amount: 1900, method: "เงินโอน" });
      const first = withShares((db) => readShares(db, false)).payments[0];
      act(true, {
        action: "receive",
        id: first.id,
        expectedAmount: 1900,
        expectedMethod: "เงินโอน",
        expectedPrice: first.price,
      });
      assert.throws(() =>
        act(false, { action: "notify", amount: 50, method: "เงินโอน" }),
      );
      act(false, { action: "notify", amount: 100, method: "เงินโอน" });
      const pending = withShares((db) => readShares(db, false)).payments[0];
      act(false, {
        action: "update-pending",
        id: pending.id,
        amount: 100,
        method: "เงินโอน",
        expectedAmount: 100,
        expectedMethod: "เงินโอน",
        expectedPrice: pending.price,
      });
      assert.equal(
        withShares((db) => readShares(db, false)).payments[0].amount,
        100,
      );
    }),
  ));
