"use client";
// หน้าสมัครจากแบบเดิม: ข้อมูลส่วนตัว การติดต่อ อาชีพ และรหัสผ่าน ไม่มีอัปโหลดเอกสาร
import { useState } from "react";
import Link from "next/link";
import styles from "./register.module.css";
export default function RegisterPage() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState(null);
  return (
    <main className={styles.page}>
      <aside>
        <Link href="/login">
          <img
            src="/images/brand/coop-logo.png"
            alt="สหกรณ์สินเชื่อ"
            width="88"
            height="88"
          />
        </Link>
        <h2>สหกรณ์สินเชื่อ</h2>
        <p>COOP FINANCE</p>
        <img
          className={styles.banner}
          src="/images/auth/auth-left-banner.png"
          alt="สหกรณ์ออมทรัพย์"
        />
      </aside>
      <section>
        <Link href="/login">← กลับเข้าสู่ระบบ</Link>
        <h1>สมัครสมาชิกสหกรณ์</h1>
        <p>กรอกข้อมูลเพื่อให้เจ้าหน้าที่ตรวจสอบและอนุมัติใบสมัคร</p>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {result ? (
          <div className={styles.success} role="status">
            <h2>ส่งใบสมัครแล้ว</h2>
            <p>
              เลขสมาชิกของคุณ: <strong>{result.memberId}</strong>
            </p>
            <p>
              รอเจ้าหน้าที่อนุมัติ
              แล้วใช้เลขสมาชิกและรหัสผ่านที่ตั้งไว้เข้าสู่ระบบ
            </p>
            <p>หลังเข้าใช้ครั้งแรก ระบบจะนำไปขั้นตอนส่งหุ้นครั้งแรก</p>
            <Link href="/login">ไปหน้าเข้าสู่ระบบ</Link>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              const values = Object.fromEntries(new FormData(e.currentTarget));
              if (values.password !== values.confirmPassword) {
                setError("รหัสผ่านยืนยันไม่ตรงกัน");
                return;
              }
              setBusy(true);
              try {
                const r = await fetch("/api/register", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(values),
                });
                const d = await r.json();
                if (!r.ok) throw Error(d.error);
                setResult(d);
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className={styles.grid}>
              <label>
                ชื่อ–นามสกุล
                <input
                  name="fullName"
                  autoComplete="name"
                  maxLength={120}
                  minLength={2}
                  required
                />
              </label>
              <label>
                วันเดือนปีเกิด
                <input name="birthDate" type="date" required />
              </label>
              <label>
                เลขบัตรประชาชน (13 หลัก)
                <input
                  name="idCardNumber"
                  inputMode="numeric"
                  pattern="[0-9]{13}"
                  maxLength={13}
                  required
                />
              </label>
              <label>
                ที่อยู่
                <input
                  name="address"
                  autoComplete="street-address"
                  maxLength={250}
                  required
                />
              </label>
              <label>
                อีเมล
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={120}
                  required
                />
              </label>
              <label>
                อาชีพ
                <input name="occupation" maxLength={120} required />
              </label>
              <label>
                เบอร์โทรศัพท์ (10 หลัก)
                <input
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  autoComplete="tel"
                  required
                />
              </label>
              <label>
                รายได้ต่อเดือน (บาท)
                <input
                  name="salary"
                  type="number"
                  min="0"
                  max="100000000"
                  step="0.01"
                  required
                />
              </label>
              <label>
                รหัสผ่าน (อย่างน้อย 8 ตัว)
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  maxLength={200}
                  autoComplete="new-password"
                  required
                />
              </label>
              <label>
                ยืนยันรหัสผ่าน
                <input
                  name="confirmPassword"
                  type="password"
                  minLength={8}
                  maxLength={200}
                  autoComplete="new-password"
                  required
                />
              </label>
            </div>
            <p>
              ระบบจะสร้างเลขสมาชิกให้หลังส่งใบสมัคร
              บัญชียังไม่เปิดใช้งานจนกว่าเจ้าหน้าที่อนุมัติ
            </p>
            <button disabled={busy}>
              {busy ? "กำลังส่งใบสมัคร…" : "ส่งใบสมัครสมาชิก"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
