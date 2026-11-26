// ระบบแผนฝากรายเดือนตัวอย่าง: 12/24/36 เดือน แยกจากธุรกรรมรับเงินจริง
import { monthlyRate, monthlyTerms } from "./monthly-terms";
import type { Database } from "../../database/store";
export function createMonthlyPlan(
  term: unknown,
  amount: unknown,
  period: string,
  options = monthlyTerms,
) {
  const annualRate = monthlyRate(term, options);
  if (annualRate === null) throw Error("เลือกระยะเวลาฝากที่สหกรณ์เปิดรับ");
  const value = Number(amount),
    monthlyCents = Math.round(value * 100);
  if (
    !Number.isFinite(value) ||
    value <= 0 ||
    !Number.isSafeInteger(monthlyCents) ||
    Math.abs(value * 100 - monthlyCents) > 0.000001
  )
    throw Error("ยอดฝากรายเดือนต้องมากกว่า 0 และมีทศนิยมไม่เกิน 2 ตำแหน่ง");
  const [year, month] = period.split("-").map(Number);
  return {
    termMonths: Number(term),
    annualRate,
    monthlyCents,
    startPeriod: period,
    endPeriod: new Date(Date.UTC(year, month - 1 + Number(term) - 1, 1))
      .toISOString()
      .slice(0, 7),
  };
}
// รวมยอดที่ต้องฝากในเดือนนี้เท่านั้น รายการรอตรวจและดอกเบี้ยไม่ถือเป็นยอดฝากสำเร็จ
function transactionPeriod(row: Record<string, any>) {
  if (row.effectiveDate) return String(row.effectiveDate).slice(0, 7);
  const value = row.confirmed || row.created;
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Bangkok" })
        .format(date)
        .slice(0, 7)
    : "";
}
export function monthlySavingsDue(
  db: Database,
  member: string,
  period: string,
  options = monthlyTerms,
) {
  const rows = db.deposits.accounts
    .filter(
      (a) =>
        a.member === member &&
        a.type === "monthly" &&
        a.status !== "suspended" &&
        a.monthlyPlan &&
        a.monthlyPlan.startPeriod <= period &&
        a.monthlyPlan.endPeriod >= period,
    )
    .map((a) => {
      const paid = db.deposits.transactions
        .filter(
          (t) =>
            t.account === a.id &&
            t.member === member &&
            t.type === "deposit" &&
            t.status === "confirmed" &&
            transactionPeriod(t) === period,
        )
        .reduce((s, t) => s + Number(t.amountCents), 0);
      return {
        account: a.id,
        plannedCents: a.monthlyPlan.monthlyCents,
        paidCents: paid,
        dueCents: Math.max(0, a.monthlyPlan.monthlyCents - paid),
      };
    });
  return {
    period,
    accounts: rows,
    amount: rows.reduce((s, r) => s + r.dueCents, 0) / 100,
  };
}
