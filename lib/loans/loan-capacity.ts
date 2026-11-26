// ระบบ: สินเชื่อ วงเงิน ผู้ค้ำ และชำระหนี้ | ไฟล์: loan-capacity.ts
import { readLoanPolicy } from "./loan-policy";
// สิทธิ์กู้ด้วยสินทรัพย์: ใช้เปอร์เซ็นต์จากนโยบายกลาง คืนวงเงินเฉพาะเงินต้นที่ชำระ
import type { Database, Row } from "../../database/store";
// ฟังก์ชัน borrowingMode: ทำงานส่วน borrowingMode ของระบบนี้
export function borrowingMode(row: Row): "asset" | "guaranteed" | "collateral" {
  const mode =
    row.loanMode ??
    (row.guarantor?.member ||
    row.guarantorMember ||
    row.guarantors?.length ||
    row.guarantorMembers?.some((id: unknown) => !!id)
      ? "guaranteed"
      : "asset");
  if (mode !== "asset" && mode !== "guaranteed" && mode !== "collateral")
    throw new Error("รูปแบบการกู้ไม่ถูกต้อง");
  return mode;
}
// ฟังก์ชัน assetBorrowingCapacity: ทำงานส่วน assetBorrowingCapacity ของระบบนี้
export function assetBorrowingCapacity(
  db: Database,
  member: string,
  assetCents: number,
  excludeApplication = "",
  productId = "",
) {
  const policy = readLoanPolicy(db, productId);
  const firstLimit = Math.floor((assetCents * policy.firstPercent) / 100),
    additionalLimit = Math.floor((assetCents * policy.additionalPercent) / 100),
    totalLimit = Math.floor((assetCents * policy.totalPercent) / 100);
  // รวมสัญญากู้ด้วยสินทรัพย์ของสมาชิกเท่านั้น สัญญาที่ปิดแล้วไม่มีเงินต้นค้าง
  const contracts = db.loans.contracts.filter(
    (c) => c.member === member && borrowingMode(c) === "asset",
  );
  let principalPaid = 0,
    outstanding = 0;
  contracts.forEach((c) => {
    const original = Math.round(Number(c.amount) * 100);
    const paid =
      c.status === "closed"
        ? original
        : Math.min(
            original,
            db.loans.schedules
              .filter((s) => s.contract === c.id)
              .reduce((sum, s) => sum + Number(s.paidPrincipal || 0), 0),
          );
    principalPaid += paid;
    outstanding += Math.max(0, original - paid);
  });
  const pending = db.loans.applications.filter(
    (r) =>
      r.member === member &&
      r.id !== excludeApplication &&
      borrowingMode(r) === "asset" &&
      ["submitted", "checking", "needs_documents", "forwarded"].includes(
        r.status,
      ) &&
      !db.loans.contracts.some((c) => c.application === r.id),
  );
  const reserved = pending.reduce(
    (sum, r) => sum + Math.round(Number(r.amount) * 100),
    0,
  );
  // ทุกครั้งใช้เพดานเดียว หักเงินต้นคงค้างและคำขออื่นที่จองไว้ เงินต้นที่ชำระจะคืนวงเงิน
  const available = Math.max(0, totalLimit - outstanding - reserved);
  return {
    firstPercent: policy.firstPercent,
    additionalPercent: policy.additionalPercent,
    totalPercent: policy.totalPercent,
    firstLoanLimit: firstLimit / 100,
    additionalLoanLimit: additionalLimit / 100,
    totalLoanLimit: totalLimit / 100,
    principalRepaid: principalPaid / 100,
    outstandingAmount: outstanding / 100,
    reservedAmount: reserved / 100,
    availableAmount: available / 100,
    hasPreviousLoan: contracts.length > 0,
    hasPendingApplication: pending.length > 0,
  };
}
