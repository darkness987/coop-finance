// ระบบ: ตั้งค่าและจัดการสิทธิ์ | ไฟล์: UsersPage.jsx
"use client";
import { useState } from "react";
import { useFinance, Notices } from "../shared/Finance";
import { useDemo } from "../shared/demo";
import { roles, roleLabel } from "../../lib/auth/permissions";
import styles from "./UsersPage.module.css";
const modules = {
  users: "บัญชีผู้ใช้",
  members: "สมาชิก",
  applications: "ใบสมัครสมาชิก",
  shares: "หุ้น",
  returns: "ผลตอบแทน",
  deposits: "เงินฝาก",
  loans: "สินเชื่อ",
  benefits: "บัญชีรับผลตอบแทน",
};
const actions = {
  "monthly-plan": "ปรับแผนฝากรายเดือน",
  "save-settings": "ตั้งค่าเงื่อนไขเงินฝาก",

  create: "สร้างรายการ",
  role: "เปลี่ยนบทบาท",
  status: "เปลี่ยนสถานะ",
  password: "เปลี่ยนรหัสผ่าน",
  check: "ตรวจสอบคำขอ",
  forward: "ส่งต่ออนุมัติ",
  approve: "อนุมัติ",
  reject: "ไม่อนุมัติ",
  disburse: "ยืนยันจ่ายเงินกู้",
  repay: "รับชำระหนี้",
  confirm: "ยืนยันรายการ",
  receive: "ยืนยันรับค่าหุ้น",
  submit: "ส่งคำขอ",
  request: "แจ้งทำรายการ",
  open: "เปิดบัญชี",
  product: "แก้เงื่อนไขสินเชื่อ",
  "request-correction": "ส่งกลับแก้ไข",
  "request-otp": "ขอ OTP",
  "choose-disbursement": "เลือกช่องทางรับเงิน",
  "save-receiving-account": "แก้บัญชีรับผลตอบแทน",
  "confirm-repayment": "ยืนยันรับชำระ",
  "reject-repayment": "ปฏิเสธรายการชำระ",
};
// ฟังก์ชัน UsersPage: เชื่อมข้อมูลและสถานะของหน้าจอในส่วน UsersPage
export default function UsersPage({ showHeading = true }) {
  const f = useFinance("users");
  const { user } = useDemo();
  const [role, setRole] = useState("member");
  return (
    <div className={styles.page}>
      {showHeading && (
        <header className={styles.intro}>
          <h1>บัญชีผู้ใช้และสิทธิ์</h1>
          <p>กำหนดบทบาทตามหน้าที่ และผูกบัญชีกับข้อมูลสมาชิกที่มีอยู่</p>
        </header>
      )}
      <div className={styles.roleGrid}>
        {roles.map((r) => (
          <article key={r.id} className={styles.roleCard}>
            <strong>{r.label}</strong>
            <p>{r.description}</p>
          </article>
        ))}
      </div>
      <Notices f={f} />
      {f.data && (
        <>
          <form
            className={styles.card}
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              if (
                await f.act({
                  ...Object.fromEntries(new FormData(form)),
                  action: "create",
                })
              ) {
                form.reset();
                setRole("member");
              }
            }}
          >
            <h2>สร้างบัญชีผู้ใช้งาน</h2>
            <div className={styles.grid}>
              <label>
                ชื่อ–นามสกุล
                <input
                  name="name"
                  placeholder="กรอกชื่อ–นามสกุลตามข้อมูลสมาชิก"
                  maxLength={120}
                  autoComplete="off"
                  required
                />
              </label>
              <label>
                เลขสมาชิก
                <input
                  name="member"
                  placeholder="กรอกเลขสมาชิก"
                  inputMode="numeric"
                  pattern="[0-9]{4,16}"
                  minLength={4}
                  maxLength={16}
                  autoComplete="off"
                  required
                />
              </label>
              <label>
                บทบาท
                <select
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                รหัสผ่านเริ่มต้น (อย่างน้อย 8 ตัว)
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  maxLength={200}
                  autoComplete="new-password"
                  required
                />
              </label>
            </div>
            <p className={styles.note}>
              ใช้เลขสมาชิกเป็นชื่อเข้าสู่ระบบ
              โดยชื่อและเลขสมาชิกต้องตรงกับข้อมูลสมาชิกที่มีอยู่
            </p>
            <p className={styles.roleHint}>
              {roles.find((r) => r.id === role)?.description}
            </p>
            <div className={styles.actions}>
              <button disabled={f.busy}>สร้างบัญชี</button>
            </div>
          </form>
          <section className={styles.card}>
            <h2>บัญชีผู้ใช้งานในระบบ</h2>
            <p className={styles.note}>
              เปลี่ยนบทบาทแล้ว สิทธิ์มีผลทันทีและผู้ใช้ต้องเข้าสู่ระบบใหม่
              ไม่สามารถปิดบัญชีหรือเปลี่ยนสิทธิ์ของตนเองได้
            </p>
            <div className={styles.overflow}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {[
                      "ชื่อผู้ใช้",
                      "เลขสมาชิก",
                      "บทบาท",
                      "สถานะ",
                      "จัดการ",
                    ].map((t) => (
                      <th key={t}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {f.data.users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.username}</td>
                      <td>{u.member}</td>
                      <td>
                        <select
                          aria-label={"บทบาทของ " + u.username}
                          value={u.role}
                          disabled={f.busy || u.id === user?.id}
                          onChange={(e) =>
                            f.act({
                              action: "role",
                              id: u.id,
                              role: e.target.value,
                            })
                          }
                        >
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td
                        className={u.active ? styles.active : styles.inactive}
                      >
                        {u.active ? "ใช้งาน" : "ปิดบัญชี"}
                      </td>
                      <td>
                        <button
                          disabled={f.busy || u.id === user?.id}
                          onClick={() =>
                            f.act({
                              action: "status",
                              id: u.id,
                              active: !u.active,
                            })
                          }
                        >
                          {u.active ? "ปิดบัญชี" : "เปิดบัญชี"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className={styles.card}>
            <h2>บันทึกการใช้งาน (Audit Log)</h2>
            <div className={styles.overflow}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>วันเวลา</th>
                    <th>ผู้ทำรายการ</th>
                    <th>บทบาท</th>
                    <th>ระบบ</th>
                    <th>การทำรายการ</th>
                  </tr>
                </thead>
                <tbody>
                  {(f.data.auditLogs || []).map((log, i) => (
                    <tr key={i}>
                      <td>
                        {log.date
                          ? new Date(log.date).toLocaleString("th-TH", {
                              timeZone: "Asia/Bangkok",
                            })
                          : "—"}
                      </td>
                      <td>{log.username}</td>
                      <td>{roleLabel({ role: log.role })}</td>
                      <td>{modules[log.module] || log.module}</td>
                      <td>{actions[log.action] || log.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!f.data.auditLogs?.length && (
                <p className={styles.note}>ยังไม่มีบันทึกการใช้งาน</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
