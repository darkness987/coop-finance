// ระบบ: เส้นทาง login | ไฟล์: page.jsx
"use client";

// หน้าเข้าสู่ระบบ: ใช้ภาพและโลโก้เดิม แต่ส่งฟอร์มไป API ฐานข้อมูลกลาง
import { useState } from "react";
import Link from "next/link";
import LoginBanner from "../../components/security/LoginBanner";
import styles from "./login.module.css";

// ฟังก์ชัน InputIcon: ทำงานส่วน InputIcon ของระบบนี้
function InputIcon({ lock = false }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      {lock ? (
        <>
          <rect x="5" y="10" width="14" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
        </>
      ) : (
        <>
          <circle cx="12" cy="6" r="4" />
          <path d="M4 22v-4a8 8 0 0 1 16 0v4M10 14l2 3 2-3m-2 3-1 5h2z" />
        </>
      )}
    </svg>
  );
}

// ฟังก์ชัน Login: ตรวจบัญชีและสร้าง sessionในส่วน Login
export default function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // ตรวจบัญชีผ่านระบบใหม่ สำเร็จแล้วไปหน้าหลักเว็บรวม
  // ฟังก์ชัน submit: ส่งข้อมูลจากฟอร์ม
  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.get("username"),
          password: form.get("password"),
          remember: form.get("remember") === "on",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      window.location.href = "/home";
    } catch (error) {
      setError(error.message || "เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <LoginBanner />
      <section className={styles.formSide} aria-labelledby="login-title">
        <div className={styles.content}>
          <h1 id="login-title">เข้าสู่ระบบ</h1>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <form onSubmit={submit}>
            <p className={styles.hint}>กรุณากรอกข้อมูลเพื่อเข้าสู่ระบบ</p>
            <label className={styles.inputRow}>
              <InputIcon />
              <input
                aria-label="ชื่อผู้ใช้หรือเลขสมาชิก"
                name="username"
                placeholder="ชื่อผู้ใช้ / เลขสมาชิก"
                autoComplete="username"
                required
              />
            </label>
            <label className={styles.inputRow}>
              <InputIcon lock />
              <input
                aria-label="รหัสผ่าน"
                name="password"
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                required
              />
            </label>
            <div className={styles.options}>
              <label>
                <input type="checkbox" name="remember" defaultChecked />
                จดจำการใช้งาน
              </label>
              <Link href="/recover">ลืมรหัสผ่าน?</Link>
            </div>
            <button className={styles.submit} disabled={busy}>
              {busy ? "กำลังตรวจสอบข้อมูล…" : "เข้าสู่ระบบ"}
            </button>
            <p className={styles.footer}>
              ยังไม่มีบัญชี? <Link href="/register">สมัครสมาชิก</Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
