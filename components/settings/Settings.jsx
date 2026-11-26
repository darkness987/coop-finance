// ระบบ: ตั้งค่าและจัดการสิทธิ์ | ไฟล์: Settings.jsx
"use client";
// เมนูตั้งค่าเดียวกัน แต่แยกไฟล์ฟอร์มข้อมูลสมาชิกและรหัสผ่านให้อ่านง่าย
import Link from "next/link";
import MemberServices from "../members/MemberServices";
import MemberProfile from "../members/MemberProfile";
import UsersPage from "./UsersPage";
import ChangePassword from "./ChangePassword";
import styles from "./settings.module.css";
// ฟังก์ชัน Settings: กำหนดค่าที่ใช้ในขั้นตอนถัดไปในส่วน Settings
export default function Settings({ admin, tab, manageUsers = false }) {
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <h1>ตั้งค่า</h1>
        <p>
          จัดการ
          {manageUsers
            ? "บัญชีผู้ใช้ สิทธิ์ และความปลอดภัย"
            : admin
              ? "ความปลอดภัยของบัญชี"
              : "ข้อมูลสมาชิกและความปลอดภัยของบัญชี"}
        </p>
      </header>
      <nav className={styles.tabs} aria-label="หมวดการตั้งค่า">
        {manageUsers && (
          <Link
            href="/settings?tab=users"
            aria-current={tab === "users" ? "page" : undefined}
          >
            บัญชีผู้ใช้และสิทธิ์
          </Link>
        )}
        {!admin && (
          <Link
            href="/settings?tab=profile"
            aria-current={tab === "profile" ? "page" : undefined}
          >
            ข้อมูลสมาชิก
          </Link>
        )}
        <Link
          href="/settings?tab=password"
          aria-current={tab === "password" ? "page" : undefined}
        >
          เปลี่ยนรหัสผ่าน
        </Link>
      </nav>
      {tab === "users" && manageUsers ? (
        <UsersPage showHeading={false} />
      ) : tab === "profile" && !admin ? (
        <>
          <MemberProfile showHeading={false} />
          <MemberServices />
        </>
      ) : (
        <section className={styles.password}>
          <ChangePassword />
        </section>
      )}
    </div>
  );
}
