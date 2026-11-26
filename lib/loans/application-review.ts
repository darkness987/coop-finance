import { activeDepositAccount } from "../deposits/deposit-scope";
// ข้อมูลประกอบการพิจารณาคำขอ: คำนวณจากฐานข้อมูลล่าสุด ไม่เชื่อตัวเลขจาก browser
import type { Database, Row } from "../../database/store";
import {
  loanSecurity,
  guarantorRows,
  requireGuarantor,
} from "./loan-guarantor";
import { membershipMonths, membershipEligible } from "./membership";
import { buildSchedule, addMonths } from "./calculator/repayment";
import { depositTypes } from "../deposits/deposit-types";
import { today } from "../shared/date";
export function applicationReview(db: Database, row: Row) {
  const checkedAt = new Date().toISOString(),
    date = today();
  const member = db.members.records.find((m) => m.id === row.member);
  const security = loanSecurity(
    db,
    row.member,
    Number(row.amount),
    row.id,
    row.product,
  );
  const otherContracts = db.loans.contracts.filter(
    (c) =>
      c.member === row.member &&
      c.status !== "closed" &&
      c.application !== row.id,
  );
  const existingMonthly = otherContracts.reduce(
    (sum, c) => sum + Number(c.installment || 0),
    0,
  );
  const outstandingPrincipal =
    otherContracts.reduce(
      (sum, c) =>
        sum +
        Math.max(
          0,
          Math.round(Number(c.amount) * 100) -
            db.loans.schedules
              .filter((s) => s.contract === c.id)
              .reduce((paid, s) => paid + Number(s.paidPrincipal || 0), 0),
        ),
      0,
    ) / 100;
  const income = Number(member?.profile?.income || 0);
  let calculation: ReturnType<typeof buildSchedule> | null = null,
    calculationError = "";
  try {
    calculation = buildSchedule(
      Number(row.amount),
      Number(row.terms?.annualRate),
      Number(row.months),
      addMonths(date, 1),
    );
  } catch (e) {
    calculationError =
      "คำนวณไม่ได้ กรุณาตรวจยอดกู้ อัตราดอกเบี้ย และจำนวนเดือน";
  }
  const installment = calculation ? Number(calculation.installment) : 0;
  const totalMonthly = Math.round((existingMonthly + installment) * 100) / 100;
  const incomeEligible =
    !!calculation && income > 0 && totalMonthly <= income * 0.4;
  let securityError = "";
  try {
    requireGuarantor(db, row);
  } catch (e) {
    securityError = (e as Error).message;
  }
  const shareUnits =
    db.shares.accounts
      .filter((a) => a.member === row.member && activeDepositAccount(a))
      .reduce((sum, a) => sum + Number(a.opening_units || 0), 0) +
    db.shares.payments
      .filter((r) => r.member === row.member && r.received)
      .reduce(
        (sum, r) =>
          sum +
          Number(r.amount) /
            Number(r.price || db.shares.rules?.[0]?.price || 100),
        0,
      );
  const deposits = (db.deposits?.accounts || [])
    .filter((a) => a.member === row.member && activeDepositAccount(a))
    .map((a) => ({
      id: a.id,
      type:
        depositTypes.find((t) => t.id === (a.type || "savings"))?.name ||
        a.type,
      balance: Number(a.balanceCents) / 100,
      status: a.status || "active",
    }));
  const guarantors = guarantorRows(row).map((g) => {
    const person = db.members.records.find((m) => m.id === g.member);
    return {
      member: g.member,
      submittedName: g.name,
      name: person?.name || g.name,
      active: !!person?.active,
    };
  });
  return {
    checkedAt,
    member: {
      id: row.member,
      name: member?.name || row.member,
      active: !!member?.active,
      joined: member?.joined || "",
      email: member?.email || "",
      phone: member?.phone || "",
      company: member?.profile?.company || "",
      occupation: member?.profile?.occupation || "",
    },
    income,
    existingMonthly,
    outstandingPrincipal,
    totalMonthly,
    incomeRatio:
      income > 0 ? Math.round((totalMonthly / income) * 10000) / 100 : null,
    incomeEligible,
    security,
    shareUnits,
    deposits,
    guarantors,
    calculation,
    calculationError,
    checks: [
      { label: "สถานะสมาชิกใช้งาน", passed: !!member?.active },
      {
        label: `อายุสมาชิกอย่างน้อย ${membershipMonths(row.product)} เดือน`,
        passed: membershipEligible(member?.joined, row.product, date),
      },
      {
        label:
          row.loanMode === "collateral"
            ? "ระบุรายละเอียดที่ดินหรือบ้านครบ (ยังต้องตรวจเอกสารและประเมิน)"
            : row.loanMode === "guaranteed"
              ? "ผู้ค้ำประกัน 2 คน ใช้งานได้และไม่ซ้ำกัน"
              : `ยอดกู้ไม่เกินวงเงินสินทรัพย์ ${security.totalPercent}%`,
        passed: !securityError,
        detail: securityError,
      },
      {
        label: "ภาระผ่อนรวมไม่เกิน 40% ของรายได้ที่อนุมัติไว้",
        passed: incomeEligible,
      },
    ],
  };
}
