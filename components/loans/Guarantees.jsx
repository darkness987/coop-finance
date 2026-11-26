// ระบบ: สินเชื่อ วงเงิน ผู้ค้ำ และชำระหนี้ | ไฟล์: Guarantees.jsx
"use client";
import { securityDescription } from "../../lib/loans/security-description";
import LoanSecuritySummary from "./LoanSecuritySummary";
import { useState } from "react";
import { money, status } from "../shared/Finance";
// แสดงเฉพาะคำขอที่ระบุสมาชิกคนนี้เป็นผู้ค้ำ ไม่รวมข้อมูลส่วนตัวหรือเอกสารของผู้กู้
// ฟังก์ชัน Guarantees: ทำงานส่วน Guarantees ของระบบนี้
export default function Guarantees({ rows }) {
  const [selected, setSelected] = useState(null);
  const row = rows.find((r) => r.application === selected);
  if (row)
    return (
      <section className="loan-card">
        <button onClick={() => setSelected(null)}>← กลับรายการค้ำประกัน</button>
        <h2>ตารางชำระสัญญาที่คุณค้ำ {row.contractNumber}</h2>
        <p>
          ผู้กู้ {row.borrowerName} · เลขสมาชิก {row.borrower}
        </p>
        <p>
          วงเงิน {money(row.amount)} บาท · ดอกเบี้ย {row.annualRate}% ต่อปี ·{" "}
          {row.months} เดือน
        </p>
        <p className="loan-muted">
          ข้อมูลตารางและยอดชำระเดียวกับสัญญาของผู้กู้และหน้าแอดมิน
        </p>
        <LoanSecuritySummary row={row} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>งวด</th>
                <th>ครบกำหนด</th>
                <th>เงินต้น</th>
                <th>ดอกเบี้ย</th>
                <th>ค่างวด</th>
                <th>ชำระแล้ว</th>
                <th>ค้างชำระ</th>
              </tr>
            </thead>
            <tbody>
              {row.schedules.map((s) => {
                const total = s.principalCents + s.interestCents;
                const paid = s.paidPrincipal + s.paidInterest;
                return (
                  <tr key={s.number}>
                    <td>{s.number}</td>
                    <td>{s.dueDate}</td>
                    <td>{money(s.principalCents / 100)}</td>
                    <td>{money(s.interestCents / 100)}</td>
                    <td>{money(total / 100)}</td>
                    <td>{money(paid / 100)}</td>
                    <td>{money(Math.max(0, total - paid) / 100)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    );
  return (
    <section className="loan-card">
      <h2>รายการที่ระบุคุณเป็นผู้ค้ำประกัน</h2>
      <p className="loan-muted">
        ตรวจสอบชื่อผู้กู้ เลขสัญญา และวงเงินของรายการที่เกี่ยวข้อง
      </p>
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ผู้กู้ / เลขสมาชิก</th>
                <th>เลขสัญญา</th>
                <th>จำนวนเงินกู้</th>
                <th>หลักประกัน</th>
                <th>ค่างวด</th>
                <th>สถานะ</th>
                <th>ตารางชำระ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.application}>
                  <td>
                    {r.borrowerName}
                    <small>{r.borrower}</small>
                    {r.demo && <small>ข้อมูลตัวอย่าง</small>}
                  </td>
                  <td>{r.contractNumber || "ยังไม่ออกสัญญา"}</td>
                  <td>{money(r.amount)} บาท</td>
                  <td>{securityDescription(r)}</td>
                  <td>
                    {r.installment == null
                      ? "รอออกสัญญา"
                      : money(r.installment) + " บาท"}
                  </td>
                  <td>{status[r.status] || r.status}</td>
                  <td>
                    {r.contractNumber && r.schedules?.length ? (
                      <button onClick={() => setSelected(r.application)}>
                        ดูตารางชำระ
                      </button>
                    ) : (
                      "รอออกสัญญา"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="loan-empty">ยังไม่มีรายการค้ำประกัน</p>
      )}
    </section>
  );
}
