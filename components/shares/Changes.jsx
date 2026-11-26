// ระบบ: หุ้นสมาชิก การส่งหุ้น และยอดสะสม | ไฟล์: Changes.jsx
"use client";

// ระบบหุ้น | ตารางคำขอเปลี่ยนยอดส่งหุ้นและปุ่มพิจารณาของเจ้าหน้าที่

import { money, useDemo } from "../shared/demo";

// แสดงยอดเดิม ยอดที่ขอ และสถานะ โดยให้เจ้าหน้าที่พิจารณาเฉพาะรายการรอตรวจสอบ
// ฟังก์ชัน Changes: ตรวจคำสั่งและบันทึกการเปลี่ยนแปลงในส่วน Changes
export function Changes({ rows, admin }) {
  const { mutate, busy } = useDemo();
  const labels = {
    pending: "รอตรวจสอบ",
    approved: "อนุมัติแล้ว",
    rejected: "ไม่อนุมัติ",
  };
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {admin && <th>รหัสสมาชิก</th>}
            <th>วันที่ขอ</th>
            <th>ยอดเดิม</th>
            <th>ยอดใหม่</th>
            <th>สถานะ</th>
            {admin && <th>ผลตรวจเจ้าหน้าที่สมาชิก</th>}
            {admin && <th>จัดการ</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {admin && <td>{row.member}</td>}
              <td>{row.date}</td>
              <td>{money(row.previous)} ฿</td>
              <td>{money(row.amount)} ฿</td>
              <td>{labels[row.status]}</td>
              {admin && (
                <td>
                  {row.reviewStatus === "reviewed"
                    ? row.reviewNote
                    : "ยังไม่ตรวจเบื้องต้น"}
                </td>
              )}
              {admin && (
                <td>
                  {row.status === "pending" && (
                    <div className="inline-form">
                      {[
                        ["approve-change", "อนุมัติ"],
                        ["reject-change", "ไม่อนุมัติ"],
                      ].map(([action, label]) => (
                        <button
                          key={action}
                          className="outline"
                          disabled={busy}
                          onClick={() =>
                            mutate("shares", { action, id: row.id })
                          }
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="empty">ยังไม่มีคำขอเปลี่ยนยอด</p>}
    </div>
  );
}
