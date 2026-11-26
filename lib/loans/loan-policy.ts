// ระบบ: สินเชื่อ วงเงิน ผู้ค้ำ และชำระหนี้ | ไฟล์: loan-policy.ts
// ค่าเริ่มต้นของวงเงินกู้แบบใช้สินทรัพย์; ค่าที่ Admin บันทึกอยู่ใน database/data.ts หมวด loans.policy
import type { Database } from "../../database/store";
export const defaultLoanPolicy = { totalPercent: 60, firstPercent: 60 };
// ฟังก์ชัน validateLoanPolicy: ตรวจความถูกต้องของข้อมูลในส่วน validateLoanPolicy
export function validateLoanPolicy(input: {
  totalPercent: unknown;
  firstPercent?: unknown;
}) {
  const totalPercent = Number(input.totalPercent),
    firstPercent = totalPercent; // รองรับชื่อ field เก่า แต่ไม่มีการแยก 45% + 15% แล้ว
  for (const value of [totalPercent, firstPercent])
    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      value > 100 ||
      Math.abs(value * 100 - Math.round(value * 100)) > 0.000001
    )
      throw new Error(
        "เปอร์เซ็นต์ต้องมากกว่า 0 ถึง 100 และมีทศนิยมไม่เกิน 2 ตำแหน่ง",
      );
  return {
    totalPercent,
    firstPercent,
    additionalPercent: Math.round((totalPercent - firstPercent) * 100) / 100,
  };
}
// ฟังก์ชัน readLoanPolicy: อ่านข้อมูลในส่วน readLoanPolicy
export function readLoanPolicy(db: Database, productId = "") {
  const product = db.loans.products?.find((p) => p.id === productId);
  // สามัญเริ่มต้น 95%; ประเภทอื่นใช้ค่าเดิมจนกว่า Admin จะกำหนดแยก
  const totalPercent =
    product?.assetPercent ??
    (productId === "ordinary"
      ? 95
      : (db.loans.policy || defaultLoanPolicy).totalPercent);
  return validateLoanPolicy({ totalPercent });
}
