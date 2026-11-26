// ระบบ: ปันผล เฉลี่ยคืน และบัญชีรับผลตอบแทน | ไฟล์: ReturnTable.jsx
// ระบบผลตอบแทน | ตารางเงินปันผลและเงินเฉลี่ยคืนประจำปีของสมาชิก

import { money } from "../shared/demo";

// เลือกฐานคำนวณ อัตรา และยอดจัดสรรตามประเภท แล้วแปลงสตางค์เป็นบาทสำหรับแสดงผล
// ฟังก์ชัน ReturnTable: ทำงานส่วน ReturnTable ของระบบนี้
export function ReturnTable({ rows, type }) {
  const rebate = type === "rebate";
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ปี พ.ศ.</th>
            <th>ฐานคำนวณ (บาท)</th>
            <th>อัตรา</th>
            <th>ยอดจัดสรร (บาท)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.year}>
              <td>{row.year + 543}</td>
              <td>{money(rebate ? row.rebateBasis / 100 : row.basis)}</td>
              <td>
                {money((rebate ? row.rebate_rate : row.dividend_rate) / 100)}%
              </td>
              <td>{money((rebate ? row.rebateCents : row.cents) / 100)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="empty">ยังไม่มีผลจัดสรรที่อนุมัติแล้ว</p>}
    </div>
  );
}
