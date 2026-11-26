// ระบบ: ปันผล เฉลี่ยคืน และบัญชีรับผลตอบแทน | ไฟล์: AdminReturns.jsx
"use client";

// ฝั่งเจ้าหน้าที่ | จัดทำร่างผลตอบแทน ตรวจยอดรายสมาชิก และอนุมัติ

import ReturnRates from "./ReturnRates";
import { useState } from "react";
import { money, useDemo } from "../shared/demo";
import { Panel, Shell } from "../layout/shell";

// หน้าปันผลและเงินเฉลี่ยคืนให้เจ้าหน้าที่คำนวณร่าง ตรวจยอด และอนุมัติผล
// ฟังก์ชัน Returns: ทำงานส่วน Returns ของระบบนี้
export default function Returns() {
  const { data, mutate, busy } = useDemo();
  const [settings, setSettings] = useState(null);
  const defaultYear = Number(data.shares.period.slice(0, 4)) - 1;
  const [year, setYear] = useState(defaultYear);
  const [editing, setEditing] = useState(false);
  const [preparedYear, setPreparedYear] = useState(defaultYear - 1);
  // เลือกผลตามปีที่กำลังดู และแยกข้อมูลร่างตามปีที่กำลังกรอก
  const rows = data.returns.filter((row) => row.year === year);
  const allocation = rows[0];
  const draft = data.returns.filter((row) => row.year === preparedYear);
  return (
    <Shell
      admin
      title="จัดสรรเงินปันผลและเงินเฉลี่ยคืน"
      subtitle="คำนวณร่าง ตรวจยอดรายสมาชิก และอนุมัติผลประจำปี"
    >
      <ReturnRates onLoaded={setSettings} />
      <Panel
        icon="chart"
        title="เตรียมร่างผลตอบแทน"
        action={
          <button className="outline" onClick={() => setEditing(!editing)}>
            {editing ? "ปิดแบบฟอร์ม" : "เปิดแบบฟอร์ม"}
          </button>
        }
      >
        {editing && (
          <form
            className="form"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);

              // แปลงฐานดอกเบี้ยจากบาทเป็นสตางค์ และอัตราร้อยละเป็นหน่วยละ 0.01% ก่อนส่งคำนวณ
              const interest = Object.fromEntries(
                data.members.map((member) => [
                  member.id,
                  Math.round(Number(form.get(member.id)) * 100),
                ]),
              );
              if (
                await mutate("returns", {
                  action: "prepare",
                  year: preparedYear,
                  dividendRate: Math.round(
                    Number(form.get("dividendRate")) * 100,
                  ),
                  rebateRate: Math.round(Number(form.get("rebateRate")) * 100),
                  interest,
                })
              ) {
                setYear(preparedYear);
                setEditing(false);
              }
            }}
          >
            <label>
              ปี ค.ศ.
              <input
                type="number"
                min="2000"
                max={defaultYear}
                value={preparedYear}
                required
                onChange={(event) =>
                  setPreparedYear(Number(event.target.value))
                }
              />
            </label>
            <label>
              อัตราเงินปันผล (%)
              <input
                key={preparedYear + "-dividend-" + settings?.dividendPercent}
                name="dividendRate"
                type="number"
                min="0"
                max="100"
                step=".01"
                defaultValue={
                  draft[0]
                    ? draft[0].dividend_rate / 100
                    : (settings?.dividendPercent ?? 4)
                }
                required
              />
            </label>
            <label>
              อัตราเงินเฉลี่ยคืน (%)
              <input
                key={preparedYear + "-rebate-" + settings?.rebatePercent}
                name="rebateRate"
                type="number"
                min="0"
                max="100"
                step=".01"
                defaultValue={
                  draft[0]
                    ? draft[0].rebate_rate / 100
                    : (settings?.rebatePercent ?? 5)
                }
                required
              />
            </label>
            <p>
              ฐานปันผลใช้ทุนหุ้นที่รับเงินจริงถึงสิ้นปี
              ระบุยอดดอกเบี้ยที่เข้าเกณฑ์จากระบบสินเชื่อเป็นฐานเงินเฉลี่ยคืน
            </p>
            {data.members.map((member) => (
              <label key={preparedYear + "-" + member.id}>
                ฐานดอกเบี้ย (บาท) · {member.name}
                <input
                  name={member.id}
                  type="number"
                  min="0"
                  max="100000000"
                  step=".01"
                  defaultValue={
                    (draft.find((row) => row.member === member.id)
                      ?.rebateBasis ?? 0) / 100
                  }
                  required
                />
              </label>
            ))}
            <button className="primary" disabled={busy || !!draft[0]?.approved}>
              คำนวณและบันทึกร่าง
            </button>
          </form>
        )}
      </Panel>
      <div className="filters">
        <select
          aria-label="ปีผลตอบแทน"
          value={year}
          onChange={(event) => setYear(Number(event.target.value))}
        >
          {[...new Set(data.returns.map((row) => row.year))].map((value) => (
            <option key={value} value={value}>
              ปี {value + 543}
            </option>
          ))}
        </select>
      </div>

      {/* ปุ่มอนุมัติส่งคำสั่ง publish เพื่อให้สมาชิกเห็นผลของปีนี้ */}
      <Panel
        icon="file"
        title={"ผลจัดสรรรายสมาชิก · ปี " + (year + 543)}
        action={
          allocation?.approved ? (
            <span className="status done">อนุมัติแล้ว</span>
          ) : (
            allocation && (
              <button
                className="primary"
                disabled={busy}
                onClick={() => mutate("returns", { action: "publish", year })}
              >
                อนุมัติและเผยผลให้สมาชิก
              </button>
            )
          )
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>สมาชิก</th>
                <th>ทุนหุ้นสิ้นปี</th>
                <th>
                  เงินปันผล ({money((allocation?.dividend_rate ?? 0) / 100)}%)
                </th>
                <th>ฐานดอกเบี้ย</th>
                <th>
                  เงินเฉลี่ยคืน ({money((allocation?.rebate_rate ?? 0) / 100)}%)
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.member}>
                  <td>
                    {
                      data.members.find((member) => member.id === row.member)
                        ?.name
                    }{" "}
                    ({row.member})
                  </td>
                  <td>{money(row.basis)} ฿</td>
                  <td>{money(row.cents / 100)} ฿</td>
                  <td>{money(row.rebateBasis / 100)} ฿</td>
                  <td>{money(row.rebateCents / 100)} ฿</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="empty">ยังไม่มีผลจัดสรรในปีนี้</p>}
        </div>
      </Panel>
    </Shell>
  );
}
