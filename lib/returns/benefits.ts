import { monthlyContractTerms } from "../deposits/monthly-terms";
import { estimateMonthlyPlan } from "../deposits/monthly-estimate";
import { currentReturnRates } from "./return-rates";
// ระบบ: ปันผล เฉลี่ยคืน และบัญชีรับผลตอบแทน | ไฟล์: benefits.ts
// ประมาณการเปลี่ยนตามยอดปัจจุบัน ส่วนผลจัดสรรที่อนุมัติแล้วเป็นประวัติเดิม
import type { Database } from "../../database/store";
import type { Actor } from "../auth/session";
import { depositTypesFor, depositAccountRate } from "../deposits/deposit-types";
import { requireInitialShare } from "../shares/initial-share";
import { requireMember } from "../deposits/deposits";
// ฟังก์ชัน readBenefits: อ่านข้อมูลในส่วน readBenefits
export function readBenefits(db: Database, a: Actor) {
  requireInitialShare(db, a);
  if (a.role !== "member") throw Error("เฉพาะสมาชิก");
  const member = requireMember(db, a.member);
  const shareAmount =
    db.shares.accounts
      .filter((r) => r.member === a.member)
      .reduce((s, r) => s + Number(r.opening_amount || 0), 0) +
    db.shares.payments
      .filter((r) => r.member === a.member && r.received)
      .reduce((s, r) => s + r.amount, 0);
  const allocation = db.returns.allocations
    .filter((r) => r.approved === 1)
    .sort((a, b) => b.year - a.year)[0];
  const shareRate = db.returns.settings
    ? currentReturnRates(db).dividendPercent
    : allocation
      ? allocation.dividend_rate / 100
      : null;
  const shareHistory = db.returns.dividends
    .filter(
      (r) =>
        r.member === a.member &&
        db.returns.allocations.some(
          (p) => p.year === r.year && p.approved === 1,
        ),
    )
    .map((r) => ({
      ...r,
      rate:
        db.returns.allocations.find((p) => p.year === r.year)!.dividend_rate /
        100,
      status: r.paidAt ? "confirmed" : "approved",
    }));
  const depositEstimates = db.deposits.accounts
    .filter((r) => r.member === a.member && r.type !== "fixed")
    .map((r) => {
      const type = depositTypesFor(db).find(
        (t) => t.id === (r.type || "savings"),
      );
      const rate = depositAccountRate(db, r);
      return {
        account: r.id,
        name: type?.name || r.type,
        type: r.type || "savings",
        monthlyPlan:
          r.type === "monthly" && r.monthlyPlan
            ? estimateMonthlyPlan(
                r.monthlyPlan.termMonths,
                r.monthlyPlan.monthlyCents / 100,
                r.monthlyPlan.startPeriod,
                monthlyContractTerms(r.monthlyPlan),
              )
            : null,
        balance: r.balanceCents / 100,
        rate,
        estimatedCents:
          rate == null ? null : Math.round((r.balanceCents * rate) / 100),
      };
    });
  const depositHistory = db.deposits.transactions
    .filter(
      (r) =>
        r.member === a.member &&
        r.type === "interest" &&
        r.status === "confirmed",
    )
    .map((r) => ({
      id: r.id,
      year: r.year,
      account: r.account,
      cents: r.amountCents,
      rate: r.rate,
      status: "confirmed",
      date: r.confirmed,
    }));
  return {
    memberName: member.name,
    receivingAccount: member.receivingAccount || null,
    profileBank: member.profile?.bank || "",
    profileBankLast4: member.profile?.bankLast4 || "",
    shares: {
      amount: shareAmount,
      rate: shareRate,
      estimatedCents:
        shareRate == null ? null : Math.round(shareAmount * shareRate),
      history: shareHistory,
    },
    deposits: {
      accounts: depositEstimates,
      estimatedCents: depositEstimates.reduce(
        (s, r) => s + (r.estimatedCents || 0),
        0,
      ),
      history: depositHistory,
    },
  };
}
// ฟังก์ชัน changeBenefits: ตรวจคำสั่งและบันทึกการเปลี่ยนแปลงในส่วน changeBenefits
export function changeBenefits(db: Database, a: Actor, i: any) {
  requireInitialShare(db, a);
  if (a.role !== "member" || i.action !== "save-receiving-account")
    throw Error("คำสั่งไม่ถูกต้อง");
  const m = requireMember(db, a.member);
  if (
    typeof i.bank !== "string" ||
    !i.bank.trim() ||
    i.bank.length > 120 ||
    typeof i.holder !== "string" ||
    !i.holder.trim() ||
    i.holder.length > 120 ||
    typeof i.accountNumber !== "string" ||
    !/^\d{8,20}$/.test(i.accountNumber)
  )
    throw Error("กรอกธนาคาร ชื่อบัญชี และเลขบัญชี 8–20 หลัก");
  m.receivingAccount = {
    bank: i.bank.trim(),
    holder: i.holder.trim(),
    accountNumber: i.accountNumber,
    updated: new Date().toISOString(),
  };
  return { ok: true };
}
