import {
  activeDepositAccount,
  activeDepositTransaction,
} from "./deposit-scope";
// ระบบ: เงินฝาก ถอนเงิน และดอกเบี้ย | ไฟล์: deposits.ts
import {
  depositSettings,
  requireDepositOpening,
  configuredMonthlyPlan,
  changeDepositSettings,
} from "./deposit-settings";
import { monthlySavingsDue } from "./monthly-plan";
import { today } from "../shared/date";
import { requireAccess, roles, roleOf } from "../auth/permissions";
import { requireInitialShare } from "../shares/initial-share";
import { issueWithdrawalOtp, verifyWithdrawalOtp } from "./deposit-otp";
import {
  depositTypes,
  depositTypesFor,
  depositAccountRate,
} from "./deposit-types";
import { annualInterest } from "./deposit-interest";
// ระบบเงินฝาก: แจ้งฝาก/ถอนก่อน เจ้าหน้าที่ยืนยันจึงเปลี่ยนยอด เก็บเงินเป็นสตางค์
import { randomUUID } from "node:crypto";
import type { Database, Row } from "../../database/store";
import { admin, type Actor } from "../auth/session";
// ฟังก์ชัน requireMember: ตรวจเงื่อนไขหรือสิทธิ์ก่อนทำงานในส่วน requireMember
export function requireMember(db: Database, id: string) {
  const m = db.members.records.find((m) => m.id === id && m.active);
  if (!m) throw new Error("ไม่พบสมาชิกที่ใช้งานได้");
  return m;
}
// ฟังก์ชัน cents: ทำงานส่วน cents ของระบบนี้
export function cents(value: unknown) {
  const n = Number(value);
  if (
    !Number.isFinite(n) ||
    n <= 0 ||
    Math.abs(n * 100 - Math.round(n * 100)) > 0.000001 ||
    !Number.isSafeInteger(Math.round(n * 100))
  )
    throw new Error("จำนวนเงินต้องมากกว่า 0 และมีทศนิยมไม่เกิน 2 ตำแหน่ง");
  return Math.round(n * 100);
}
// ฟังก์ชัน text: ทำงานส่วน text ของระบบนี้
export function text(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim() || value.length > 1000)
    throw new Error("กรุณาระบุ" + label);
  return value.trim();
}
// ฟังก์ชัน readDeposits: อ่านข้อมูลในส่วน readDeposits
export function readDeposits(db: Database, a: Actor) {
  requireAccess(a, "deposits");
  requireInitialShare(db, a);
  const own = (r: any) => a.role === "admin" || r.member === a.member;
  return {
    types: depositTypesFor(db),
    settings: depositSettings(db),
    monthlyTerms: depositSettings(db).monthlyTerms.filter((t) => t.active),
    canConfigure: roleOf(a) === "admin",
    monthlyTracking: db.deposits.accounts
      .filter((r) => own(r) && r.type === "monthly")
      .map((account) => {
        const period = today().slice(0, 7),
          plan = account.monthlyPlan;
        const due = monthlySavingsDue(db, account.member, period).accounts.find(
          (r) => r.account === account.id,
        );
        const pending = db.deposits.transactions
          .filter(
            (t) =>
              t.account === account.id &&
              t.type === "deposit" &&
              t.status === "pending",
          )
          .reduce((s, t) => s + t.amountCents, 0);
        return {
          account: account.id,
          member: account.member,
          name:
            db.members.records.find((m) => m.id === account.member)?.name ||
            account.member,
          period,
          plan,
          rate: depositAccountRate(db, account),
          paidCents: due?.paidCents || 0,
          dueCents: due?.dueCents || 0,
          pendingCents: pending,
          state: !plan
            ? "ยังไม่กำหนดแผน"
            : plan.endPeriod < period
              ? "ครบกำหนด"
              : account.status === "suspended"
                ? "ระงับบัญชี"
                : "อยู่ระหว่างออม",
        };
      }),
    accounts: db.deposits.accounts
      .filter((r) => own(r) && activeDepositAccount(r))
      .map((account): Row => ({
        ...account,
        rate: depositAccountRate(db, account),
        type: account.type || "savings",
        status: account.status || "active",
        name:
          db.members.records.find((m) => m.id === account.member)?.name ||
          account.member,
      })),
    transactions: db.deposits.transactions
      .filter((r) => own(r) && activeDepositTransaction(db, r))
      .toReversed()
      .map((t): Row => ({
        ...t,
        name:
          db.members.records.find((m) => m.id === t.member)?.name || t.member,
      })),
  };
}
// ฟังก์ชัน changeDeposits: ตรวจคำสั่งและบันทึกการเปลี่ยนแปลงในส่วน changeDeposits
export function changeDeposits(db: Database, a: Actor, i: any) {
  requireAccess(a, "deposits", i.action);
  requireInitialShare(db, a);
  if (i.action === "save-settings") return changeDepositSettings(db, a, i);
  if (i.action === "account-status") {
    admin(a);
    const account = db.deposits.accounts.find((r) => r.id === i.id);
    if (!account || !activeDepositAccount(account))
      throw new Error("ไม่พบบัญชีที่เปิดให้บริการ");
    if (!["active", "restricted", "suspended"].includes(i.status))
      throw new Error("สถานะไม่ถูกต้อง");
    account.status = i.status;
    return;
  }
  // โครงงานตัวอย่าง: ปรับแผนซ้ำได้ในบัญชีเดิม เก็บยอดเงินและประวัติรับเงินจริงไว้
  if (i.action === "monthly-plan") {
    if (a.role !== "member") throw Error("เฉพาะเจ้าของบัญชีกำหนดแผนฝาก");
    requireMember(db, a.member);
    const account = db.deposits.accounts.find(
      (r) =>
        r.id === i.account && r.member === a.member && r.type === "monthly",
    );
    if (!account || account.status === "suspended")
      throw Error("ไม่พบบัญชีรายเดือนที่ใช้งานได้");
    account.monthlyPlan = configuredMonthlyPlan(
      db,
      { ...i, startPeriod: today().slice(0, 7) },
      account.monthlyPlan,
    );
    return { id: account.id };
  }
  if (i.action === "open") {
    if (a.role !== "member") throw new Error("เฉพาะสมาชิกเปิดบัญชีของตนเอง");
    const type = depositTypes.find((t) => t.id === (i.type || "savings"));
    if (!type) throw new Error("ประเภทบัญชีนี้ไม่เปิดให้เปิดบัญชีใหม่");
    requireMember(db, a.member);
    requireDepositOpening(db, type.id);
    if (
      db.deposits.accounts.some(
        (r) => r.member === a.member && (r.type || "savings") === type.id,
      )
    )
      throw new Error("มีบัญชีเงินฝากประเภทนี้แล้ว");
    const id =
      { special: "SP-", monthly: "MO-", savings: "SA-" }[type.id] + a.member;
    db.deposits.accounts.push({
      id,
      member: a.member,
      balanceCents: 0,
      ...(type.id === "monthly"
        ? {
            monthlyPlan: configuredMonthlyPlan(db, {
              ...i,
              startPeriod: today().slice(0, 7),
            }),
          }
        : {}),
      type: type.id,
      status: "active",
      created: new Date().toISOString(),
    });
    return { id };
  }
  if (i.action === "request" || i.action === "request-otp") {
    if (a.role !== "member") throw new Error("เฉพาะสมาชิกแจ้งรายการของตนเอง");
    requireMember(db, a.member);
    const account = db.deposits.accounts.find(
      (r) =>
        r.id === i.account && r.member === a.member && activeDepositAccount(r),
    );
    if (!account || !activeDepositAccount(account))
      throw new Error("ไม่พบบัญชีที่เปิดให้บริการ");
    if (
      account.status === "suspended" ||
      (account.status === "restricted" && i.type === "withdrawal")
    )
      throw new Error("สถานะบัญชีไม่อนุญาตให้ทำรายการนี้");
    if (!["deposit", "withdrawal"].includes(i.type))
      throw new Error("ประเภทไม่ถูกต้อง");
    const amount = cents(i.amount);
    // token ส่งจากฟอร์มโดยอัตโนมัติ ใช้กัน double click / retry ไม่ให้สมาชิกต้องกรอกเลขอ้างอิง
    const requestId = text(i.requestId, "ข้อมูลคำขอ");
    if (requestId.length < 8 || requestId.length > 100)
      throw new Error("ข้อมูลคำขอไม่ถูกต้อง กรุณารีเฟรชหน้า");
    if (
      db.deposits.transactions.some(
        (r) => r.member === a.member && r.requestId === requestId,
      )
    )
      throw new Error("คำขอนี้ถูกบันทึกแล้ว กรุณาตรวจประวัติรายการ");
    if (i.channel !== undefined && !["counter", "transfer"].includes(i.channel))
      throw new Error("ช่องทางไม่ถูกต้อง");
    const loanReserved = (db.loans?.repaymentRequests || [])
      .filter((r) => r.account === account.id && r.status === "pending")
      .reduce((s, r) => s + r.amountCents, 0);
    if (i.type === "withdrawal" && amount > account.balanceCents - loanReserved)
      throw new Error("ยอดเงินไม่เพียงพอ");
    const description =
      typeof i.description === "string"
        ? i.description.trim().slice(0, 250)
        : "";
    const channel = i.channel === "counter" ? "counter" : "transfer";
    const binding = {
      user: a.id,
      member: a.member,
      account: account.id,
      amountCents: amount,
      requestId,
      channel,
      description,
    };
    if (i.action === "request-otp") {
      if (i.type !== "withdrawal") throw Error("OTP ใช้สำหรับรายการถอนเงิน");
      return issueWithdrawalOtp(db, binding);
    }
    if (i.type === "withdrawal") {
      const error = verifyWithdrawalOtp(db, binding, i.challengeId, i.otp);
      if (error) return { error };
    }
    db.deposits.transactions.push({
      id: randomUUID(),
      member: a.member,
      account: account.id,
      type: i.type,
      amountCents: amount,
      requestId,
      status: "pending",
      description,
      channel,
      ...(i.type === "withdrawal"
        ? { otpVerifiedAt: new Date().toISOString() }
        : {}),
      created: new Date().toISOString(),
    });
    return;
  }
  admin(a);
  if (i.action === "interest") {
    const account = db.deposits.accounts.find((r) => r.id === i.account);
    if (!account || !activeDepositAccount(account))
      throw new Error("ไม่พบบัญชีเงินฝากที่ใช้งานได้");
    // ใช้อัตรากลางหรืออัตราตามสัญญารายเดือนเท่านั้น ไม่รับการเปลี่ยนอัตราจากหน้าเว็บ
    const rate = depositAccountRate(db, account);
    if (rate == null) throw new Error("ยังไม่กำหนดอัตราดอกเบี้ยสำหรับบัญชีนี้");
    const result = annualInterest(db, i.account, Number(i.year), rate);
    const balance = account.balanceCents + result.interestCents;
    if (!Number.isSafeInteger(balance)) throw new Error("ยอดเกินช่วงตัวเลข");
    account.balanceCents = balance;
    db.deposits.transactions.push({
      id: randomUUID(),
      member: account.member,
      account: account.id,
      type: "interest",
      amountCents: result.interestCents,
      year: result.year,
      rate: result.rate,
      reference: "INT-" + account.id + "-" + result.year,
      status: "confirmed",
      created: new Date().toISOString(),
      confirmed: new Date().toISOString(),
      effectiveDate: result.year + "-12-31",
      confirmedBy: a.id,
    });
    return;
  }
  const row = db.deposits.transactions.find((r) => r.id === i.id);
  if (!row || row.status !== "pending")
    throw new Error("รายการนี้ตรวจสอบแล้วหรือไม่พบ");
  if (i.action === "reject") {
    row.status = "rejected";
    row.note = text(i.note, "เหตุผล");
    return;
  }
  if (i.action !== "confirm") throw new Error("คำสั่งไม่ถูกต้อง");
  const account = db.deposits.accounts.find((r) => r.id === row.account);
  if (!account || !activeDepositAccount(account))
    throw new Error("ไม่พบบัญชีที่เปิดให้บริการ");
  requireMember(db, row.member);
  if (
    account.status === "suspended" ||
    (account.status === "restricted" && row.type === "withdrawal")
  )
    throw new Error("สถานะบัญชีไม่อนุญาตให้ยืนยันรายการนี้");
  const balance =
    account.balanceCents +
    (row.type === "withdrawal" ? -row.amountCents : row.amountCents);
  const reservedForLoans = (db.loans?.repaymentRequests || [])
    .filter((r) => r.account === account.id && r.status === "pending")
    .reduce((s, r) => s + r.amountCents, 0);
  if (
    !Number.isSafeInteger(balance) ||
    balance < 0 ||
    (row.type === "withdrawal" && balance < reservedForLoans)
  )
    throw new Error("ยอดเงินไม่เพียงพอหรือเกินช่วงตัวเลข");
  account.balanceCents = balance;
  row.status = "confirmed";
  row.confirmed = new Date().toISOString();
  row.confirmedBy = a.id;
}
