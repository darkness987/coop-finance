"use client";
// รายงานติดตามยอดออม: แยกยอดรับจริง ยอดแจ้งรอตรวจ และยอดที่ยังต้องฝากของเดือนปัจจุบัน
import { useState } from "react";
import { money } from "../shared/Finance";
import MonthlyDepositContract from "./MonthlyDepositContract";
export default function MonthlyDepositTracking({ f }) {
  const [query, setQuery] = useState(""),
    [onlyDue, setOnlyDue] = useState(false);
  const rows = (f.data.monthlyTracking || []).filter(
    (r) =>
      (r.name + " " + r.member + " " + r.account)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!onlyDue || r.dueCents > 0),
  );
  return (
    <section className="deposit-card">
      <h2>ติดตามการฝากออมทรัพย์รายเดือน</h2>
      <div className="deposit-filters">
        <input
          aria-label="ค้นหาแผนฝากรายเดือน"
          placeholder="ค้นหาชื่อ / เลขสมาชิก / บัญชี"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={onlyDue}
            onChange={(e) => setOnlyDue(e.target.checked)}
          />
          เฉพาะยอดฝากยังไม่ครบ
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>สมาชิก / บัญชี</th>
              <th>แผนสัญญา</th>
              <th>ฝากต่อเดือน</th>
              <th>รับแล้วงวดนี้</th>
              <th>แจ้งรอตรวจ</th>
              <th>ยังต้องฝากงวดนี้</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.account}>
                <td>
                  {r.name}
                  <small>
                    {r.member} · {r.account}
                  </small>
                </td>
                <td>
                  {r.plan
                    ? `${r.plan.termMonths} เดือน · ${r.rate}%`
                    : "ยังไม่กำหนด"}
                </td>
                <td>{money((r.plan?.monthlyCents || 0) / 100)}</td>
                <td>{money(r.paidCents / 100)}</td>
                <td>{money(r.pendingCents / 100)}</td>
                <td>{money(r.dueCents / 100)}</td>
                <td>{r.state}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <p className="deposit-muted">ไม่พบแผนตามเงื่อนไข</p>}
      <p className="deposit-muted">
        ยอดงวดปัจจุบัน {f.data.monthlyTracking?.[0]?.period || ""}{" "}
        รายการรอตรวจยังไม่ถือว่าฝากครบ ด้านล่างเป็นสัญญาของบัญชีที่แสดงในรายงาน
      </p>
      {rows
        .filter((r) => r.plan)
        .map((r) => {
          const account = f.data.accounts.find((a) => a.id === r.account);
          return account ? (
            <div key={r.account}>
              <strong>
                {r.name} · {r.account}
              </strong>
              <MonthlyDepositContract account={account} />
            </div>
          ) : null;
        })}
    </section>
  );
}
