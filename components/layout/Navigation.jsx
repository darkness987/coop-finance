// ระบบ: โครงหน้า Sidebar และเมนู | ไฟล์: Navigation.jsx
"use client";
// Sidebar และแถบหัวเว็บส่วนกลาง ใช้ร่วมกันทุกหมวด ไม่มี sidebar ภายในหน้าอีกชุด
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useDemo } from "../shared/demo";
import { Icon } from "./shell";
import {
  canAccessPath,
  roleLabel,
  landingPage,
} from "../../lib/auth/permissions";
import styles from "./Navigation.module.css";
const memberMenu = [
  ["/home", "home", "หน้าหลัก"],
  ["/shares", "coins", "หุ้นสมาชิก"],
  ["/deposits", "refund", "บัญชีเงินฝาก"],
  ["/returns/shares", "percent", "เงินปันผลหุ้น"],
  ["/returns/deposits", "percent", "ผลตอบแทนเงินฝาก"],
  ["/loans", "file", "สินเชื่อและสัญญา"],
  ["/documents", "file", "ประวัติธุรกรรม"],
  ["/settings", "settings", "ตั้งค่า"],
];
const adminMenu = [
  ["/admin/home", "chart", "ภาพรวมสหกรณ์"],
  ["/admin/members", "users", "จัดการสมาชิก"],
  ["/admin/member-services", "users", "ดูแลและติดตามสมาชิก"],
  ["/admin/applications", "file", "ตรวจใบสมัครสมาชิก"],
  ["/admin/shares", "coins", "จัดการหุ้น"],
  ["/admin/returns", "percent", "เงินปันผล / เฉลี่ยคืน"],
  ["/admin/deposits", "refund", "ตรวจสอบเงินฝาก"],
  ["/admin/loans", "file", "จัดการสินเชื่อ"],
];
const aliases = {
  "/member/profile": "/settings",
  "/members": "/settings",
  "/member/shares": "/shares",
  "/member/documents": "/documents",
};
// ฟังก์ชัน Navigation: เลือกแสดงโครงหน้าและ Sidebar ตามเส้นทาง
export function Navigation({ children }) {
  const path = usePathname();
  return ["/", "/login", "/register", "/recover"].includes(path) ? (
    children
  ) : (
    <AppNavigation path={path}>{children}</AppNavigation>
  );
}
// ฟังก์ชัน AppNavigation: ประกอบเมนูตามสิทธิ์และข้อมูลบัญชีผู้ใช้
function AppNavigation({ path, children }) {
  const { data, user } = useDemo();
  const [open, setOpen] = useState(false),
    [help, setHelp] = useState(false),
    [error, setError] = useState("");
  useEffect(() => setOpen(false), [path]);
  const current =
    aliases[path] ||
    (path.startsWith("/admin/deposits/") ? "/admin/deposits" : path);
  const member = Array.isArray(data.members)
    ? data.members.find((m) => m.id === user?.member)
    : data.members;
  const title =
    [...memberMenu, ...adminMenu].find(([url]) => url === current)?.[2] ||
    "ระบบสหกรณ์";
  const initialShareRequired =
    user?.role !== "admin" && data.shares.activation?.required;
  // ฟังก์ชัน links: สร้างรายการเมนูและปิดเมนูที่ยังไม่มีสิทธิ์
  function links(items) {
    return items
      .filter(([url]) => canAccessPath(user || {}, url))
      .map(([url, icon, label]) =>
        initialShareRequired &&
        !["/home", "/shares", "/settings"].includes(url) ? (
          <span
            key={url}
            className={styles.lockedLink}
            aria-disabled="true"
            title="ส่งหุ้นครั้งแรกและรอยืนยันรับเงินก่อน"
          >
            <Icon name={icon} />
            <span>{label}</span>
            <small aria-label="ยังไม่เปิดใช้งาน">🔒</small>
          </span>
        ) : (
          <Link
            key={url}
            href={url}
            aria-current={current === url ? "page" : undefined}
          >
            <Icon name={icon} />
            <span>{label}</span>
          </Link>
        ),
      );
  }
  // ฟังก์ชัน logout: ยกเลิก session ของผู้ใช้
  async function logout() {
    try {
      const r = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
      if (!r.ok) throw Error();
      location.href = "/login";
    } catch {
      setError("ออกจากระบบไม่สำเร็จ กรุณาลองใหม่");
    }
  }
  return (
    <div className={styles.shell}>
      <aside
        id="app-sidebar"
        aria-label="แถบเมนูหลัก"
        className={`${styles.sidebar} ${open ? styles.open : ""}`}
      >
        <Link href={landingPage(user || {})} className={styles.brand}>
          <img
            src="/images/brand/coop-logo.png"
            width="66"
            height="66"
            alt="โลโก้สหกรณ์สินเชื่อ"
          />
          <span>
            สหกรณ์สินเชื่อ<small>COOP FINANCE</small>
          </span>
        </Link>
        <div className={styles.menu}>
          <p className={styles.label}>
            {user?.role === "admin" ? "ระบบเจ้าหน้าที่" : "เมนูหลัก"}
          </p>
          <nav
            aria-label={
              user?.role === "admin" ? "ระบบเจ้าหน้าที่" : "ระบบสมาชิก"
            }
          >
            {links(
              user?.role === "admin"
                ? [...adminMenu, ["/settings", "settings", "ตั้งค่า"]]
                : memberMenu,
            )}
          </nav>
        </div>
        <div className={styles.footer}>
          <div className={styles.help}>
            <button onClick={() => setHelp(!help)} aria-expanded={help}>
              <Icon name="info" />
              ศูนย์ช่วยเหลือ
            </button>
            {help && <p>หากมีข้อสงสัย กรุณาติดต่อเจ้าหน้าที่สหกรณ์</p>}
          </div>
          <div className={styles.identity}>
            <span className={styles.avatar}>
              {user?.role === "admin" ? "A" : member?.name?.charAt(0) || "U"}
            </span>
            <span>
              {user?.role === "admin" ? roleLabel(user) : "สมาชิกสหกรณ์"}
              <small>
                {user?.role === "admin" ? roleLabel(user) : user?.member}
              </small>
            </span>
          </div>
          <button className={styles.logout} onClick={logout}>
            ออกจากระบบ
          </button>
        </div>
      </aside>
      {open && (
        <button
          className={styles.scrim}
          aria-label="ปิดเมนู"
          onClick={() => setOpen(false)}
        />
      )}
      <div className={styles.body}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <button
              className={styles.toggle}
              aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
              aria-expanded={open}
              aria-controls="app-sidebar"
              onClick={() => setOpen(!open)}
            >
              ☰
            </button>
            <span>{title}</span>
          </div>
          <div className={styles.topUser}>
            <span className={styles.avatar}>
              {user?.role === "admin" ? "A" : member?.name?.charAt(0) || "U"}
            </span>
            <div>
              <strong>
                {user?.role === "admin"
                  ? roleLabel(user)
                  : member?.name || "สมาชิกสหกรณ์"}
              </strong>
              <small>
                {user?.role === "admin"
                  ? roleLabel(user) + " · ระบบเจ้าหน้าที่"
                  : "MEMBER · " + user?.member}
              </small>
            </div>
          </div>
        </header>
        <main className={`workspace ${styles.workspace}`}>
          {error && <p role="alert">{error}</p>}
          {children}
        </main>
      </div>
    </div>
  );
}
