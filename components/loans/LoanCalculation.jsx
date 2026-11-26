// ระบบ: สินเชื่อ วงเงิน ผู้ค้ำ และชำระหนี้ | ไฟล์: LoanCalculation.jsx
"use client";
// คำอธิบายสั้น ใช้ตัวเลขงวดแรกจากตารางจริง ไม่คำนวณยอดหนี้ใหม่
import { money } from "../shared/Finance";
// ฟังก์ชัน LoanCalculation: ทำงานส่วน LoanCalculation ของระบบนี้
export default function LoanCalculation({
  annualInterestPercent,
  openingPrincipal,
  interestAmount,
}) {
  return (
    <aside className="loan-calculation" aria-label="คำอธิบายการคิดดอกเบี้ย">
      <p>
        <strong>คิดดอกเบี้ยแบบลดต้นลดดอก</strong> — ดอกเบี้ยแต่ละเดือน =
        เงินต้นคงเหลือ × อัตราดอกเบี้ยต่อปี ÷ 100 ÷ 12
      </p>
      <p>
        งวดแรก: {money(openingPrincipal)} × {annualInterestPercent} ÷ 100 ÷ 12 ={" "}
        {money(interestAmount)} บาท เมื่อชำระเงินต้นแล้ว ดอกเบี้ยงวดถัดไปจะลดลง
      </p>
    </aside>
  );
}
