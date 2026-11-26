// ระบบ: เงินฝาก ถอนเงิน และดอกเบี้ย | ไฟล์: deposit-otp.ts
// OTP ถอนเงิน ใช้ตัวตรวจสอบกลาง แต่เก็บรหัสแยกจากระบบสินเชื่อ
import type { Database } from "../../database/store";
import { issueOtp, verifyOtp } from "../auth/otp";
export type WithdrawalBinding = {
  user: string;
  member: string;
  account: string;
  amountCents: number;
  requestId: string;
  channel: string;
  description: string;
};
// ฟังก์ชัน issueWithdrawalOtp: สร้างรหัสยืนยันที่ผูกกับรายการในส่วน issueWithdrawalOtp
export function issueWithdrawalOtp(
  db: Database,
  binding: WithdrawalBinding,
  now = Date.now(),
) {
  return issueOtp((db.deposits.withdrawalOtps ||= []), binding, now);
}
// ฟังก์ชัน verifyWithdrawalOtp: ตรวจรหัสหรือหลักฐานยืนยันในส่วน verifyWithdrawalOtp
export function verifyWithdrawalOtp(
  db: Database,
  binding: WithdrawalBinding,
  challengeId: unknown,
  code: unknown,
  now = Date.now(),
) {
  return verifyOtp(
    db.deposits.withdrawalOtps || [],
    binding,
    challengeId,
    code,
    now,
  );
}
