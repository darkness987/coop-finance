// ระบบ: ประวัติธุรกรรมและเอกสาร | ไฟล์: MemberDocuments.jsx
"use client";
// ประวัติทุกหมวดแยกประเภท/สถานะ และดาวน์โหลดเอกสารของรายการที่ยืนยันแล้ว
import { useState } from "react";
import { useFinance, Notices, money, status } from "../shared/Finance";
import "./transactions.css";
// ฟังก์ชัน MemberTransactions: ทำงานส่วน MemberTransactions ของระบบนี้
export default function MemberTransactions() {
  const f = useFinance("transactions");
  const [category, setCategory] = useState(""),
    [state, setState] = useState(""),
    [search, setSearch] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const rows = (f.data?.rows || []).filter(
    (r) =>
      (!category || r.category === category) &&
      (!state || r.status === state) &&
      (!from || r.date?.slice(0, 10) >= from) &&
      (!to || r.date?.slice(0, 10) <= to) &&
      `${r.title} ${r.detail}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="transaction-page">
      <h1>ประวัติธุรกรรมทั้งหมด</h1>
      <p className="loan-muted">
        หุ้น เงินฝาก สินเชื่อ เงินปันผล และเงินเฉลี่ยคืนของคุณ
      </p>
      <Notices f={f} />
      <section className="panel">
        <div className="transaction-filters">
          <label>
            ค้นหารายการ
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ประเภทรายการ / บัญชี / สัญญา"
            />
          </label>
          <label>
            ประเภท
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">ทุกประเภท</option>
              <option value="shares">หุ้นสมาชิก</option>
              <option value="deposits">เงินฝาก</option>
              <option value="loans">สินเชื่อ</option>
              <option value="returns">ปันผล / เฉลี่ยคืน</option>
            </select>
          </label>
          <label>
            สถานะ
            <select value={state} onChange={(e) => setState(e.target.value)}>
              <option value="">ทุกสถานะ</option>
              <option value="confirmed">ยืนยันแล้ว</option>
              <option value="pending">รอตรวจสอบ</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="rejected">ไม่อนุมัติ</option>
            </select>
          </label>
          <label>
            ตั้งแต่
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            ถึง
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
        <p>{rows.length} รายการ</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>วันที่</th>
                <th>รายการ / รายละเอียด</th>
                <th>จำนวนเงิน</th>
                <th>สถานะ</th>
                <th>เอกสาร</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.date?.slice(0, 10) || "—"}</td>
                  <td>
                    {r.title}
                    <small>{r.detail}</small>
                  </td>
                  <td>{money(r.amount)} บาท</td>
                  <td>{status[r.status] || r.status}</td>
                  <td>
                    {r.document ? <a href={r.document}>ดาวน์โหลด</a> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!f.data && !f.error ? (
          <p>กำลังโหลด…</p>
        ) : (
          !rows.length && <p>ไม่พบรายการตามเงื่อนไข</p>
        )}
      </section>
    </div>
  );
}
