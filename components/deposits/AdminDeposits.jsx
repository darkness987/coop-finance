// ระบบ: เงินฝาก ถอนเงิน และดอกเบี้ย | ไฟล์: AdminDeposits.jsx
"use client";
// เงินฝากเจ้าหน้าที่: ทะเบียนบัญชี / อนุมัติรายการ / ประวัติ / ดอกเบี้ย แยกจากหน้าสมาชิก
import { useState } from "react";
import Link from "next/link";
import { useFinance, Notices, money } from "../shared/Finance";
import DepositTable from "./DepositTable";
import DepositSettings from "./DepositSettings";
import MonthlyDepositTracking from "./MonthlyDepositTracking";
import MonthlyDepositContract from "./MonthlyDepositContract";
import "./deposits.css";
import "./admin-deposits.css";
// ฟังก์ชัน AdminDeposits: ทำงานส่วน AdminDeposits ของระบบนี้
export default function AdminDeposits({ section = "accounts" }) {
  const f = useFinance("deposits"),
    d = f.data,
    [search, setSearch] = useState(""),
    [type, setType] = useState("all"),
    [status, setStatus] = useState("all"),
    [accountId, setAccountId] = useState("");
  const accounts =
    d?.accounts.filter(
      (a) =>
        (type === "all" || a.type === type) &&
        (status === "all" || a.status === status) &&
        `${a.id} ${a.name} ${a.member}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    ) || [];
  const rows =
    d?.transactions.filter(
      (t) =>
        (section !== "approve" || t.status === "pending") &&
        (!accountId || t.account === accountId) &&
        `${t.account} ${t.name} ${t.member}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    ) || [];
  const pending = d?.transactions.filter((t) => t.status === "pending") || [];
  return (
    <div className="deposit-page deposit-admin">
      <div className="deposit-heading">
        <div>
          <p className="deposit-breadcrumb">เงินฝาก / สำหรับเจ้าหน้าที่</p>
          <h1>ตรวจสอบและจัดการเงินฝาก</h1>
          <p className="deposit-muted">
            ทะเบียนบัญชีสมาชิก ตรวจสอบรายการ และจัดสรรดอกเบี้ย
          </p>
        </div>
      </div>
      <Notices f={f} />
      {!d ? (
        <p role="status">กำลังโหลด…</p>
      ) : (
        <>
          <nav className="deposit-tabs" aria-label="เมนูเงินฝากเจ้าหน้าที่">
            {[
              ["accounts", "ทะเบียนบัญชี", "/admin/deposits"],
              ["approve", "อนุมัติฝาก / ถอน", "/admin/deposits/approve"],
              [
                "transactions",
                "ประวัติธุรกรรม",
                "/admin/deposits/transactions",
              ],
              ["interest", "จัดสรรดอกเบี้ย", "/admin/deposits/interest"],
              ["monthly", "ติดตามฝากรายเดือน", "/admin/deposits/monthly"],
            ].map(([key, label, href]) => (
              <Link
                key={key}
                href={href}
                aria-current={section === key ? "page" : undefined}
              >
                {label}
                {key === "approve" && pending.length > 0 && (
                  <b>{pending.length}</b>
                )}
              </Link>
            ))}
          </nav>
          {!["settings", "interest"].includes(section) && (
            <div className="deposit-kpis">
              {[
                [
                  "เงินฝากรวม",
                  money(
                    d.accounts.reduce((s, a) => s + a.balanceCents / 100, 0),
                  ),
                  "บาท",
                ],
                [
                  "บัญชีเปิดใช้งาน",
                  d.accounts.filter((a) => a.status === "active").length,
                  "บัญชี",
                ],
                ["รายการรอตรวจสอบ", pending.length, "รายการ"],
                [
                  "ยอดรอตรวจสอบ",
                  money(pending.reduce((s, t) => s + t.amountCents / 100, 0)),
                  "บาท",
                ],
              ].map(([label, n, unit]) => (
                <article className="deposit-card" key={label}>
                  <small>{label}</small>
                  <strong>
                    {n}
                    <small>{unit}</small>
                  </strong>
                </article>
              ))}
            </div>
          )}
          {section === "accounts" && (
            <section className="deposit-card">
              <div className="deposit-section-heading">
                <h2>ทะเบียนบัญชีเงินฝากทั้งหมด</h2>
                <span>{accounts.length} บัญชี</span>
              </div>
              <div className="deposit-filters">
                <input
                  aria-label="ค้นหาบัญชี"
                  placeholder="ค้นหาชื่อ / รหัสสมาชิก / เลขบัญชี"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  aria-label="ประเภทบัญชี"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="all">ทุกประเภทบัญชี</option>
                  {d.types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="สถานะบัญชี"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="all">ทุกสถานะ</option>
                  <option value="active">ใช้งาน</option>
                  <option value="restricted">จำกัดรายการ</option>
                  <option value="suspended">ระงับ</option>
                </select>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>เลขบัญชี / วันที่เปิด</th>
                      <th>ชื่อสมาชิก</th>
                      <th>ประเภทบัญชี</th>
                      <th>ยอดคงเหลือ</th>
                      <th>สถานะ / ปรับสถานะ</th>
                      <th>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((a) => (
                      <tr key={a.id}>
                        <td>
                          {a.id}
                          <small>{a.created.slice(0, 10)}</small>
                          {a.demo && <small>ข้อมูลตัวอย่าง</small>}
                        </td>
                        <td>
                          {a.name}
                          <small>{a.member}</small>
                        </td>
                        <td>{d.types.find((t) => t.id === a.type)?.name}</td>
                        <td className="deposit-amount">
                          {money(a.balanceCents / 100)}
                        </td>
                        <td>
                          <select
                            aria-label={"สถานะบัญชี " + a.id}
                            value={a.status}
                            disabled={f.busy}
                            onChange={(e) => {
                              if (
                                confirm("ยืนยันเปลี่ยนสถานะบัญชี " + a.id + "?")
                              )
                                f.act({
                                  action: "account-status",
                                  id: a.id,
                                  status: e.target.value,
                                });
                            }}
                          >
                            <option value="active">ใช้งาน</option>
                            <option value="restricted">จำกัดรายการ</option>
                            <option value="suspended">ระงับชั่วคราว</option>
                          </select>
                        </td>
                        <td>
                          <button
                            onClick={() => {
                              setAccountId(a.id);
                              setSearch("");
                            }}
                          >
                            ดูรายการ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!accounts.length && (
                  <p className="deposit-empty">ไม่พบบัญชี</p>
                )}
              </div>
              {accountId && (
                <div className="deposit-account-detail">
                  <div className="deposit-section-heading">
                    <h2>รายการของ {accountId}</h2>
                    <button onClick={() => setAccountId("")}>
                      ปิดรายละเอียด
                    </button>
                  </div>
                  {d.accounts.find((a) => a.id === accountId)?.monthlyPlan && (
                    <MonthlyDepositContract
                      account={d.accounts.find((a) => a.id === accountId)}
                    />
                  )}
                  <DepositTable
                    rows={d.transactions.filter((t) => t.account === accountId)}
                    f={f}
                    admin
                  />
                </div>
              )}
            </section>
          )}
          {["approve", "transactions"].includes(section) && (
            <section className="deposit-card">
              <h2>
                {section === "approve"
                  ? "รายการรออนุมัติฝาก / ถอน"
                  : "ประวัติธุรกรรมเงินฝากทั้งหมด"}
              </h2>
              <div className="deposit-filters">
                <input
                  aria-label="ค้นหารายการเงินฝาก"
                  placeholder="ค้นหาชื่อ / รหัสสมาชิก / เลขบัญชี"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  aria-label="กรองบัญชี"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                >
                  <option value="">ทุกบัญชี</option>
                  {d.accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.id} · {a.name}
                    </option>
                  ))}
                </select>
                {section === "transactions" && (
                  <select
                    aria-label="กรองสถานะรายการ"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="all">ทุกสถานะ</option>
                    <option value="confirmed">ยืนยันแล้ว</option>
                    <option value="pending">รอตรวจสอบ</option>
                    <option value="rejected">ไม่อนุมัติ</option>
                  </select>
                )}
              </div>
              <DepositTable
                rows={rows.filter(
                  (t) =>
                    section === "approve" ||
                    status === "all" ||
                    t.status === status,
                )}
                f={f}
                admin
              />
            </section>
          )}
          {section === "interest" && d.canConfigure && (
            <div id="deposit-settings" className="deposit-interest-settings">
              <DepositSettings f={f} />
            </div>
          )}
          {section === "monthly" && <MonthlyDepositTracking f={f} />}
        </>
      )}
    </div>
  );
}
