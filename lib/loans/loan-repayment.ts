import { activeDepositAccount } from "../deposits/deposit-scope";
// ระบบ: สินเชื่อ วงเงิน ผู้ค้ำ และชำระหนี้ | ไฟล์: loan-repayment.ts
// ชำระจากเงินฝาก: OTP สำเร็จแล้วตัดต้น/ดอกและเงินฝากทันที; ช่องทางภายนอกรอเจ้าหน้าที่ตรวจสอบ
import { randomUUID } from "node:crypto";
import type { Database, Row } from "../../database/store";
import { admin, type Actor } from "../auth/session";
import { cents, requireMember } from "../deposits/deposits";
import { issueOtp, verifyOtp } from "../auth/otp";
import { allocatePayment } from "./calculator/repayment";
// ฟังก์ชัน loanOutstanding: ทำงานส่วน loanOutstanding ของระบบนี้
export function loanOutstanding(db: Database, contract: string) {
  return db.loans.schedules
    .filter((s) => s.contract === contract)
    .reduce(
      (sum, s) =>
        sum +
        s.principalCents +
        s.interestCents -
        s.paidPrincipal -
        s.paidInterest,
      0,
    );
}
// ฟังก์ชัน applyLoanRepayment: คำนวณและบันทึกผลรายการในส่วน applyLoanRepayment
export function applyLoanRepayment(
  db: Database,
  c: Row,
  amount: number,
  reference: string,
  extra: Row = {},
) {
  if (!["approved", "active"].includes(c.status))
    throw Error("สัญญายังไม่อนุมัติหรือปิดแล้ว");
  if (
    db.loans.payments.some((p) => p.reference === reference) ||
    db.loans.contracts.some((c) => c.disbursementReference === reference)
  )
    throw Error("เลขอ้างอิงถูกใช้แล้ว");
  const rows = db.loans.schedules.filter((s) => s.contract === c.id);
  const result = allocatePayment(
    rows.map((s) => ({
      number: s.number,
      interestDue: ((s.interestCents - s.paidInterest) / 100).toFixed(2),
      principalDue: ((s.principalCents - s.paidPrincipal) / 100).toFixed(2),
    })),
    (amount / 100).toFixed(2),
  );
  for (const part of result.allocations) {
    const s = rows.find((s) => s.number === part.number)!;
    s.paidInterest += Math.round(Number(part.interest) * 100);
    s.paidPrincipal += Math.round(Number(part.principal) * 100);
  }
  const payment = {
    id: randomUUID(),
    contract: c.id,
    member: c.member,
    amountCents: amount,
    reference,
    date: new Date().toISOString(),
    interestCents: Math.round(Number(result.interest) * 100),
    principalCents: Math.round(Number(result.principal) * 100),
    ...extra,
  };
  db.loans.payments.push(payment);
  if (Number(result.remaining) === 0) c.status = "closed";
  return payment;
}
// ฟังก์ชัน linkedAccount: ทำงานส่วน linkedAccount ของระบบนี้
export function linkedAccount(db: Database, member: string) {
  const person = db.members.records.find((m) => m.id === member);
  const saved = person?.receivingAccount;
  if (saved?.bank && saved.accountNumber)
    return {
      bank: saved.bank,
      last4: saved.accountNumber.slice(-4),
      holder: saved.holder,
      version: saved.updated,
    };
  if (person?.profile?.bank && /^\d{4}$/.test(person.profile.bankLast4 || ""))
    return {
      bank: person.profile.bank,
      last4: person.profile.bankLast4,
      holder: person.name,
    };
  return null;
}
// ฟังก์ชัน validateDeposit: ตรวจความถูกต้องของข้อมูลในส่วน validateDeposit
function validateDeposit(
  db: Database,
  member: string,
  id: unknown,
  amount: number,
  exclude = "",
) {
  const account = db.deposits.accounts.find(
    (a) =>
      a.id === id &&
      a.member === member &&
      a.status === "active" &&
      activeDepositAccount(a),
  );
  if (!account) throw Error("เลือกบัญชีเงินฝากของคุณที่ใช้งานปกติ");
  const withdrawals = db.deposits.transactions
    .filter(
      (t) =>
        t.account === id && t.type === "withdrawal" && t.status === "pending",
    )
    .reduce((s, t) => s + t.amountCents, 0);
  const repayments = (db.loans.repaymentRequests || [])
    .filter(
      (r) => r.id !== exclude && r.account === id && r.status === "pending",
    )
    .reduce((s, r) => s + r.amountCents, 0);
  if (amount > account.balanceCents - withdrawals - repayments)
    throw Error("เงินฝากที่ใช้ได้ไม่พอ ยอดบางส่วนอาจอยู่ระหว่างรอทำรายการ");
  return account;
}
// หักเงินฝากและตัดต้น/ดอกพร้อมกัน ภายใน transaction เดียวของ store
// ฟังก์ชัน settleRepayment: กำหนดค่าที่ใช้ในขั้นตอนถัดไปในส่วน settleRepayment
function settleRepayment(db: Database, a: Actor, row: Row) {
  const c = db.loans.contracts.find(
    (c) => c.id === row.contract && c.member === row.member,
  );
  if (!c) throw Error("ไม่พบสัญญา");
  const account =
    row.method === "deposit"
      ? validateDeposit(db, row.member, row.account, row.amountCents, row.id)
      : null;
  const reference = "LR-" + row.id;
  const payment = applyLoanRepayment(db, c, row.amountCents, reference, {
    requestId: row.id,
    method: row.method,
  });
  if (account) {
    account.balanceCents -= row.amountCents;
    db.deposits.transactions.push({
      id: randomUUID(),
      member: row.member,
      account: account.id,
      type: "withdrawal",
      amountCents: row.amountCents,
      status: "confirmed",
      created: payment.date,
      confirmed: payment.date,
      confirmedBy: a.id,
      description: "ชำระสินเชื่อ " + c.number,
      loanPayment: payment.id,
    });
  }
  row.status = "confirmed";
  row.confirmed = payment.date;
  row.confirmedBy = a.id;
  return { id: row.id };
}
// ฟังก์ชัน changeRepayment: ตรวจคำสั่งและบันทึกการเปลี่ยนแปลงในส่วน changeRepayment
export function changeRepayment(db: Database, a: Actor, i: any) {
  const requests = (db.loans.repaymentRequests ||= []);
  if (["confirm-repayment", "reject-repayment"].includes(i.action)) {
    admin(a);
    const row = requests.find((r) => r.id === i.id);
    if (!row) throw Error("ไม่พบรายการแจ้งชำระ");
    if (row.status === "confirmed" && i.action === "confirm-repayment")
      return { id: row.id };
    if (row.status !== "pending") throw Error("รายการนี้ตรวจสอบแล้ว");
    if (i.action === "reject-repayment") {
      row.status = "rejected";
      row.note =
        typeof i.note === "string" && i.note.trim()
          ? i.note.trim()
          : "เจ้าหน้าที่ไม่ยืนยันรายการ";
      return { id: row.id };
    }
    return settleRepayment(db, a, row);
  }
  if (a.role !== "member") throw Error("เฉพาะสมาชิกแจ้งชำระของตนเอง");
  requireMember(db, a.member);
  const c = db.loans.contracts.find(
    (c) => c.id === i.contract && c.member === a.member,
  );
  if (!c || !["approved", "active"].includes(c.status))
    throw Error("ชำระได้เมื่อสัญญาอนุมัติแล้วและยังไม่ปิดเท่านั้น");
  const amount = cents(i.amount),
    method = i.method;
  if (!["qr", "deposit", "linked-account"].includes(method))
    throw Error("ช่องทางชำระไม่ถูกต้อง");
  if (
    typeof i.requestId !== "string" ||
    i.requestId.length < 8 ||
    i.requestId.length > 100
  )
    throw Error("ข้อมูลรายการไม่ถูกต้อง");
  if (
    requests.some((r) => r.member === a.member && r.requestId === i.requestId)
  )
    throw Error("ส่งคำขอชำระรายการนี้แล้ว กรุณาตรวจประวัติ");
  const reserved = requests
    .filter((r) => r.contract === c.id && r.status === "pending")
    .reduce((s, r) => s + r.amountCents, 0);
  if (amount > loanOutstanding(db, c.id) - reserved)
    throw Error("ยอดแจ้งชำระเกินหนี้คงเหลือหลังหักรายการที่รอตรวจสอบ");
  const account =
    method === "deposit"
      ? validateDeposit(db, a.member, i.account, amount)
      : null;
  const bank = method === "linked-account" ? linkedAccount(db, a.member) : null;
  if (method === "linked-account" && !bank)
    throw Error("กรุณาบันทึกบัญชีรับเงินในหน้าผลตอบแทนก่อน");
  const binding = {
    user: a.id,
    purpose: "loan-repayment",
    member: a.member,
    contract: c.id,
    amountCents: amount,
    method,
    account: account?.id || "",
    bank,
    requestId: i.requestId,
  };
  const challenges = (db.loans.repaymentOtps ||= []);
  if (i.action === "repayment-otp") return issueOtp(challenges, binding);
  const error = verifyOtp(challenges, binding, i.challengeId, i.otp);
  if (error) return { error };
  const row = {
    id: randomUUID(),
    member: a.member,
    contract: c.id,
    amountCents: amount,
    method,
    account: account?.id || null,
    linkedAccount: bank,
    requestId: i.requestId,
    status: "pending",
    created: new Date().toISOString(),
  };
  requests.push(row);
  if (method === "deposit") {
    Object.assign(row, { confirmationMode: "automatic-deposit" });
    return { ...settleRepayment(db, a, row), status: "confirmed" };
  }
  return { id: row.id, status: "pending" };
}
