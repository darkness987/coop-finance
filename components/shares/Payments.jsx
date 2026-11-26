// ระบบ: หุ้นสมาชิก การส่งหุ้น และยอดสะสม | ไฟล์: Payments.jsx
"use client";

// ระบบหุ้น | ตารางรายการส่งหุ้น เจ้าหน้าที่ยืนยันรับเงินและสมาชิกดาวน์โหลดใบเสร็จได้

import { money, periodLabel, useDemo } from "../shared/demo";

// ใช้ตารางนี้ร่วมกันในหน้าส่งหุ้น หน้าจัดการหุ้น และหน้าเอกสาร
// ฟังก์ชัน Payments: ทำงานส่วน Payments ของระบบนี้
export function Payments({ rows, admin = false, documents = false }) {
  const { data, mutate, busy } = useDemo();
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {admin && <th>สมาชิก</th>}
            <th>งวด</th>
            <th>ยอดส่ง</th>
            <th>จำนวนหุ้น</th>
            <th>วิธีชำระ</th>
            <th>สถานะ</th>
            <th>{admin ? "ยืนยันการรับเงิน" : "ใบเสร็จ"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {admin && (
                <td>
                  {data.members.find((item) => item.id === row.member)?.name} (
                  {row.member})
                </td>
              )}
              <td>{periodLabel(row.period)}</td>
              <td>{money(row.amount)} ฿</td>
              <td>{money(row.amount / row.price)} หุ้น</td>
              <td>{row.method}</td>
              <td>
                <span
                  className={"status " + (row.received ? "done" : "pending")}
                >
                  {admin
                    ? row.received
                      ? "รับเงินแล้ว"
                      : "แจ้งส่ง · รอรับเงิน"
                    : row.received
                      ? "ส่งหุ้นแล้ว"
                      : "รอตรวจสอบ"}
                </span>
              </td>
              <td>
                {row.received ? (
                  admin ? (
                    "ยืนยันแล้ว"
                  ) : (
                    <a
                      className="outline"
                      href={"/api/shares?receipt=" + row.id}
                    >
                      ดาวน์โหลดใบเสร็จ
                    </a>
                  )
                ) : admin ? (
                  <form
                    className="inline-form"
                    onSubmit={(event) => {
                      // ส่งรายการและยอดที่แอดมินตรวจแล้ว ระบบสร้างเลขอ้างอิงภายในเอง
                      event.preventDefault();
                      mutate("shares", {
                        action: "receive",
                        id: row.id,
                        expectedAmount: row.amount,
                        expectedMethod: row.method,
                        expectedPrice: row.price,
                      });
                    }}
                  >
                    <button className="outline" disabled={busy}>
                      ยืนยันรับเงิน
                    </button>
                  </form>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="empty">
          {documents ? "ยังไม่มีใบเสร็จ" : "ไม่พบรายการส่งหุ้น"}
        </p>
      )}
    </div>
  );
}
