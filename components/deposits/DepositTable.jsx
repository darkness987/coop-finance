// ระบบ: เงินฝาก ถอนเงิน และดอกเบี้ย | ไฟล์: DepositTable.jsx
"use client";
// ตารางกลางเฉพาะเงินฝาก: สมาชิกดูประวัติ / เจ้าหน้าที่ตรวจรับเงิน ไม่มีการเพิ่มยอดจาก UI โดยตรง
import { money, status } from "../shared/Finance";
// ฟังก์ชัน DepositTable: ทำงานส่วน DepositTable ของระบบนี้
export default function DepositTable({ rows, f, admin = false }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>วันที่</th>
            {admin && <th>สมาชิก / บัญชี</th>}
            <th>ประเภท</th>
            {admin && <th>ช่องทาง</th>}
            <th>จำนวนเงิน</th>
            <th>สถานะ</th>
            {admin && <th>ดำเนินการ</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td>{t.created.slice(0, 10)}</td>
              {admin && (
                <td>
                  {t.name}
                  <small>{t.account}</small>
                </td>
              )}
              <td>
                <span className={`deposit-type ${t.type}`}>
                  {t.type === "withdrawal"
                    ? "ถอนเงิน"
                    : t.type === "interest"
                      ? "ดอกเบี้ย"
                      : "ฝากเงิน"}
                </span>
                {t.description && <small>{t.description}</small>}
              </td>
              {admin && (
                <td>
                  {t.channel === "counter"
                    ? "เคาน์เตอร์สหกรณ์"
                    : t.channel === "transfer"
                      ? "โอนเงิน"
                      : "—"}
                </td>
              )}
              <td className="deposit-amount">{money(t.amountCents / 100)} ฿</td>
              <td>
                <span className={`deposit-status ${t.status}`}>
                  {status[t.status]}
                </span>
                {t.note && <small>{t.note}</small>}
              </td>
              {admin && (
                <td>
                  {t.status === "pending" ? (
                    <div className="deposit-actions">
                      <button
                        disabled={f.busy}
                        className="deposit-primary"
                        onClick={() => {
                          if (
                            confirm(
                              `ยืนยันรับรายการ${t.type === "withdrawal" ? "ถอน" : "ฝาก"} ${money(t.amountCents / 100)} บาท ของ ${t.name}?`,
                            )
                          )
                            f.act({ action: "confirm", id: t.id });
                        }}
                      >
                        ยืนยัน
                      </button>
                      <button
                        disabled={f.busy}
                        onClick={() => {
                          const note = prompt("เหตุผลที่ไม่อนุมัติ");
                          if (note?.trim())
                            f.act({ action: "reject", id: t.id, note });
                        }}
                      >
                        ไม่อนุมัติ
                      </button>
                    </div>
                  ) : (
                    <span className="deposit-muted">ตรวจสอบแล้ว</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <div className="deposit-empty">ไม่พบรายการตามเงื่อนไขที่เลือก</div>
      )}
    </div>
  );
}
