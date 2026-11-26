"use client";
// คืนฟอร์มลืมรหัสผ่านจากระบบเดิม: เป็นตัวอย่าง ไม่ส่งข้อมูลและไม่เปลี่ยนรหัสผ่านจริง
import { useState } from "react";
import Link from "next/link";
import LoginBanner from "../../components/security/LoginBanner";
import styles from "../login/login.module.css";
export default function Recover() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <main className={styles.page}>
      <LoginBanner />
      <section className={styles.formSide}>
        <div className={styles.content}>
          <h1>ลืมรหัสผ่าน</h1>
          {!submitted && (
            <p className={styles.hint}>
              กรอกข้อมูลสมาชิกเพื่อรับข้อมูลการกู้คืนรหัสผ่านทางอีเมล
            </p>
          )}
          {submitted ? (
            <p role="status" className={styles.help}>
              ส่งข้อมูลการกู้คืนรหัสผ่านไปยังอีเมลแล้ว
              กรุณาตรวจสอบกล่องจดหมายและจดหมายขยะ
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
            >
              {[
                ["เลขสมาชิก", "memberCode", "text", "[0-9]{4,16}", 16],
                [
                  "เลขประจำตัวประชาชน (13 หลัก)",
                  "idCardNumber",
                  "text",
                  "[0-9]{13}",
                  13,
                ],
                ["เบอร์โทรศัพท์ (10 หลัก)", "phone", "tel", "[0-9]{10}", 10],
                ["อีเมล", "email", "email", undefined, 120],
              ].map(([label, name, type, pattern, max]) => (
                <label
                  key={name}
                  style={{ display: "block", fontSize: 13, marginBottom: 16 }}
                >
                  {label}
                  <span
                    className={styles.inputRow}
                    style={{ marginTop: 8, marginBottom: 0 }}
                  >
                    <input
                      name={name}
                      type={type}
                      pattern={pattern}
                      maxLength={max}
                      inputMode={name === "email" ? "email" : "numeric"}
                      required
                    />
                  </span>
                </label>
              ))}
              <button className={styles.submit}>ยืนยัน</button>
            </form>
          )}
          <p style={{ fontSize: 11, color: "#8291a5", marginTop: 14 }}>
            โหมดสาธิต · ยังไม่มีการส่งอีเมลจริง
          </p>
          <p className={styles.footer}>
            <Link href="/login">กลับเข้าสู่ระบบ</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
