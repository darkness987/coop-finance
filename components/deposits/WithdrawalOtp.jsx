// ระบบ: เงินฝาก ถอนเงิน และดอกเบี้ย | ไฟล์: WithdrawalOtp.jsx
"use client";
import TransactionOtp from "../security/TransactionOtp";
// ฟังก์ชัน WithdrawalOtp: ทำงานส่วน WithdrawalOtp ของระบบนี้
export default function WithdrawalOtp({ account, ...props }) {
  return (
    <TransactionOtp
      {...props}
      title="ยืนยันคำขอถอนเงิน"
      summaryLabel={account.id}
      note="ยืนยัน OTP แล้วจะส่งคำขอให้เจ้าหน้าที่ตรวจสอบ ยอดเงินยังไม่ถูกหักทันที"
    />
  );
}
