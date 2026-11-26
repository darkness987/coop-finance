// ระบบ: สินเชื่อ วงเงิน ผู้ค้ำ และชำระหนี้ | ไฟล์: repayment.ts
import Decimal from "decimal.js";
import { estimate } from "./calculator";
// คนที่ 5: ตารางผ่อนจริงใช้สูตรเดียวกับที่สมาชิกเห็นตอนยื่นกู้ (ลดต้นลดดอก งวดเท่ากัน ปัดเป็นสตางค์)

/** เลื่อนวันที่ YYYY-MM-DD ไป n เดือน ถ้าเดือนปลายทางไม่มีวันนั้นใช้วันสุดท้ายของเดือน */
// ฟังก์ชัน addMonths: ทำงานส่วน addMonths ของระบบนี้
export function addMonths(isoDate: string, n: number) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

// ฟังก์ชัน buildSchedule: สร้างผลคำนวณในส่วน buildSchedule
export function buildSchedule(
  principalAmount: number,
  annualInterestPercent: number,
  installmentCount: number,
  firstDueDate: string,
) {
  const calculation = estimate(
    principalAmount,
    annualInterestPercent,
    installmentCount,
  );
  return {
    installment: calculation.payment,
    totalInterest: calculation.interest,
    total: calculation.total,
    rows: calculation.rows.map((installment) => ({
      number: installment.number,
      dueDate: addMonths(firstDueDate, installment.number - 1),
      openingBalance: installment.openingBalance,
      principal: installment.principal,
      interest: installment.interest,
      payment: installment.payment,
      balance: installment.balance,
    })),
  };
}

export type Outstanding = {
  number: number;
  interestDue: string;
  principalDue: string;
};
export type Allocation = {
  number: number;
  interest: string;
  principal: string;
};

/**
 * ตัดชำระงวดเก่าสุดก่อน ในแต่ละงวดตัดดอกเบี้ยก่อนแล้วจึงตัดเงินต้น
 * ห้ามรับเกินยอดค้างทั้งสัญญา (ไม่มีเงินทอน/เครดิตล่วงหน้า)
 */
// ฟังก์ชัน allocatePayment: ทำงานส่วน allocatePayment ของระบบนี้
export function allocatePayment(outstanding: Outstanding[], amount: string) {
  let left = new Decimal(amount);
  if (!left.isFinite() || left.lte(0) || left.decimalPlaces() > 2)
    throw Error("ยอดชำระไม่ถูกต้อง");
  const total = outstanding.reduce(
    (s, o) => s.plus(o.interestDue).plus(o.principalDue),
    new Decimal(0),
  );
  if (left.gt(total))
    throw Error(`ยอดชำระเกินยอดค้างทั้งสัญญา (${total.toFixed(2)} บาท)`);
  const allocations: Allocation[] = [];
  let interestPart = new Decimal(0),
    principalPart = new Decimal(0);
  for (const o of [...outstanding].sort((a, b) => a.number - b.number)) {
    if (left.lte(0)) break;
    const interest = Decimal.min(left, o.interestDue);
    left = left.minus(interest);
    const principal = Decimal.min(left, o.principalDue);
    left = left.minus(principal);
    if (interest.plus(principal).gt(0)) {
      allocations.push({
        number: o.number,
        interest: interest.toFixed(2),
        principal: principal.toFixed(2),
      });
      interestPart = interestPart.plus(interest);
      principalPart = principalPart.plus(principal);
    }
  }
  return {
    allocations,
    interest: interestPart.toFixed(2),
    principal: principalPart.toFixed(2),
    remaining: total.minus(amount).toFixed(2),
  };
}
