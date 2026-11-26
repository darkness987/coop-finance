// ระบบ: สินเชื่อ วงเงิน ผู้ค้ำ และชำระหนี้ | ไฟล์: loan-disbursement.ts
// วิธีรับเงินกู้ต้องเลือกก่อนส่ง OTP และบันทึกไปพร้อมสัญญา
import type { Database } from "../../database/store";
import { linkedAccount } from "./loan-repayment";
// ฟังก์ชัน loanDisbursement: ทำงานส่วน loanDisbursement ของระบบนี้
export function loanDisbursement(
  db: Database,
  member: string,
  method: unknown,
) {
  if (method !== "cash" && method !== "account")
    throw Error("กรุณาเลือกวิธีรับเงินกู้: เงินสดหรือบัญชี");
  const account = method === "account" ? linkedAccount(db, member) : null;
  if (method === "account" && !account)
    throw Error("กรุณาบันทึกบัญชีรับเงินในหน้าผลตอบแทนก่อน");
  return { disbursementMethod: method, disbursementAccount: account };
}
