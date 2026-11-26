// ระบบ: ตั้งค่าและจัดการสิทธิ์ | ไฟล์: ChangePassword.jsx
"use client";
import { useState } from "react";
import { Field } from "../shared/Finance";
// ฟังก์ชัน ChangePassword: ตรวจคำสั่งและบันทึกการเปลี่ยนแปลงในส่วน ChangePassword
export default function ChangePassword() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div>
      <h2>เปลี่ยนรหัสผ่าน</h2>
      <form
        className="panel form"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          if (form.get("password") !== form.get("confirmation")) {
            setError("รหัสผ่านใหม่ไม่ตรงกัน");
            return;
          }
          setBusy(true);
          try {
            const r = await fetch("/api/finance/users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "password",
                previous: form.get("previous"),
                password: form.get("password"),
              }),
            });
            const result = await r.json();
            if (!r.ok) throw new Error(result.error);
            location.href = "/login";
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field
          label="รหัสผ่านเดิม"
          name="previous"
          type="password"
          autoComplete="current-password"
          required
        />
        <Field
          label="รหัสผ่านใหม่"
          name="password"
          type="password"
          minLength={8}
          autoComplete="new-password"
          required
        />
        <Field
          label="ยืนยันรหัสผ่านใหม่"
          name="confirmation"
          type="password"
          minLength={8}
          autoComplete="new-password"
          required
        />
        <button disabled={busy}>บันทึกและเข้าสู่ระบบใหม่</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </div>
  );
}
