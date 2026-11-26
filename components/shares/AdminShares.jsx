// ระบบ: หุ้นสมาชิก การส่งหุ้น และยอดสะสม | ไฟล์: AdminShares.jsx
"use client";

// ฝั่งเจ้าหน้าที่ | ตรวจรับเงิน ตั้งกฎหุ้น และจัดการยอดส่งรายเดือน

import { useState } from "react";
import { Panel, Shell, Tabs } from "../layout/shell";
import { money, periodLabel, useDemo } from "../shared/demo";
import { Rules } from "./Rules";
import { Payments } from "./Payments";
import { Changes } from "./Changes";
import RecordSharePayment from "./RecordSharePayment";

const adminTabs = [
  ["payments", "send", "รายการส่งหุ้น"],
  ["rules", "coins", "กฎการส่งหุ้น"],
  ["changes", "file", "คำขอเปลี่ยนยอด"],
  ["accounts", "chart", "บัญชีหุ้นสมาชิก"],
];

// หน้าจัดการหุ้นรวมรายการส่งหุ้น กฎหุ้น คำขอ และบัญชีหุ้นสมาชิก
// ฟังก์ชัน AdminShares: แสดงรายการหุ้นและงานตรวจรับเงิน
export default function AdminShares() {
  const { data, mutate, busy } = useDemo();
  const [tab, setTab] = useState("payments");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [status, setStatus] = useState("all");
  const { rules, accounts, payments, changes, period } = data.shares;

  // ค้นหาด้วยรหัสหรือชื่อสมาชิก แล้วกรองรายการตามงวดและสถานะรับเงิน
  const memberMatches = (id) =>
    id.includes(query.trim()) ||
    data.members.find((item) => item.id === id)?.name.includes(query.trim());
  const rows = payments.filter(
    (row) =>
      memberMatches(row.member) &&
      (filter === "all" || filter === row.period) &&
      (status === "all" || Boolean(row.received) === (status === "paid")),
  );
  return (
    <Shell
      admin
      title="จัดการหุ้นสมาชิก"
      subtitle="จัดการทุนเรือนหุ้น ตรวจสอบการรับเงิน และปรับยอดส่งหุ้นรายเดือน"
    >
      <Tabs options={adminTabs} active={tab} onChange={setTab} />
      {tab === "payments" && (
        <>
          <RecordSharePayment />
          <div className="split equal">
            <Panel
              icon="coins"
              title="กฎการส่งหุ้น"
              action={
                <button className="outline" onClick={() => setTab("rules")}>
                  แก้ไข
                </button>
              }
            >
              <Rules rules={rules} />
            </Panel>
            <Panel icon="chart" title="สรุปทุนเรือนหุ้น">
              <dl className="details">
                <div>
                  <dt>ทุนเรือนหุ้นรวม</dt>
                  <dd>
                    {money(accounts.reduce((sum, row) => sum + row.amount, 0))}{" "}
                    บาท
                  </dd>
                </div>
                <div>
                  <dt>หุ้นรวม</dt>
                  <dd>
                    {money(accounts.reduce((sum, row) => sum + row.units, 0))}{" "}
                    หุ้น
                  </dd>
                </div>
                <div>
                  <dt>ยอดงวดปัจจุบันที่รับแล้ว</dt>
                  <dd>
                    {money(
                      payments
                        .filter((row) => row.period === period && row.received)
                        .reduce((sum, row) => sum + row.amount, 0),
                    )}{" "}
                    บาท
                  </dd>
                </div>
              </dl>
            </Panel>
          </div>
          <div className="filters">
            <input
              aria-label="ค้นหาสมาชิก"
              placeholder="ค้นหาชื่อ / รหัสสมาชิก"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              aria-label="งวด"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">ทุกงวด</option>
              {[...new Set([period, ...payments.map((row) => row.period)])].map(
                (value) => (
                  <option key={value} value={value}>
                    {periodLabel(value)}
                  </option>
                ),
              )}
            </select>
            <select
              aria-label="สถานะรับเงิน"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">ทุกสถานะ</option>
              <option value="paid">รับเงินแล้ว</option>
              <option value="pending">รอรับเงิน</option>
            </select>
          </div>
          <Panel icon="calendar" title="รายการส่งหุ้น">
            <Payments rows={rows} admin />
          </Panel>
        </>
      )}
      {tab === "rules" && (
        <Panel icon="coins" title="แก้กฎการส่งหุ้น">
          <form
            className="form"
            onSubmit={(event) => {
              event.preventDefault();

              // อ่านมูลค่าหุ้นและขอบเขตยอดส่งจากฟอร์ม แล้วส่งคำสั่งอัปเดตกฎ
              const form = new FormData(event.currentTarget);
              mutate("shares", {
                action: "rules",
                price: Number(form.get("price")),
                min: Number(form.get("min")),
              });
            }}
          >
            {[
              ["price", "มูลค่าหุ้นละ"],
              ["min", "ขั้นต่ำต่อเดือน"],
            ].map(([key, label]) => (
              <label key={key}>
                {label} (บาท)
                <input
                  name={key}
                  type="number"
                  min="1"
                  required
                  defaultValue={rules[key]}
                />
              </label>
            ))}
            <button className="primary" disabled={busy}>
              บันทึกกฎ
            </button>
          </form>
        </Panel>
      )}
      {tab === "changes" && (
        <Panel icon="file" title="ตรวจสอบคำขอเปลี่ยนยอด">
          <Changes rows={changes} admin />
        </Panel>
      )}
      {tab === "accounts" && (
        <Panel icon="chart" title="ยอดหุ้นรายสมาชิก">
          <div className="filters padded">
            <input
              aria-label="ค้นหาบัญชีหุ้น"
              placeholder="ค้นหาชื่อ / รหัสสมาชิก"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>สมาชิก</th>
                  <th>ทุนสะสม</th>
                  <th>หุ้นสะสม</th>
                  <th>ยอดส่งต่อเดือน (บาท)</th>
                </tr>
              </thead>
              <tbody>
                {accounts
                  .filter((row) => memberMatches(row.member))
                  .map((row) => (
                    <tr key={row.member}>
                      <td>
                        {
                          data.members.find((item) => item.id === row.member)
                            ?.name
                        }{" "}
                        ({row.member})
                      </td>
                      <td>{money(row.amount)} ฿</td>
                      <td>{money(row.units)}</td>
                      <td>
                        <form
                          className="inline-form"
                          onSubmit={(event) => {
                            event.preventDefault();

                            // บันทึกยอดส่งรายเดือนใหม่สำหรับสมาชิกในแถวนี้
                            mutate("shares", {
                              action: "monthly",
                              id: row.member,
                              amount: Number(
                                new FormData(event.currentTarget).get("amount"),
                              ),
                            });
                          }}
                        >
                          <input
                            name="amount"
                            aria-label={"ยอดส่งรายเดือนของ " + row.member}
                            type="number"
                            min={rules.min}
                            required
                            defaultValue={row.monthly}
                            key={row.monthly}
                          />
                          <button className="outline" disabled={busy}>
                            บันทึก
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </Shell>
  );
}
