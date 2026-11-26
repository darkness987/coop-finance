// ระบบ: หุ้นสมาชิก การส่งหุ้น และยอดสะสม | ไฟล์: MonthlyShareSummary.jsx
"use client";
// แสดงเฉพาะยอดรายเดือนที่มีผลใช้อยู่ รายละเอียดคำขออยู่ในตารางประวัติ
import { money } from "../shared/demo";
import styles from "./original-shares.module.css";
// ฟังก์ชัน MonthlyShareSummary: ทำงานส่วน MonthlyShareSummary ของระบบนี้
export default function MonthlyShareSummary({ monthly }) {
  return (
    <div className={styles.monthlySummary} aria-label="ยอดปัจจุบันที่ต้องส่ง">
      <dl>
        <div>
          <dt>ยอดปัจจุบันที่ต้องส่ง</dt>
          <dd>{money(monthly)} บาท</dd>
        </div>
      </dl>
    </div>
  );
}
