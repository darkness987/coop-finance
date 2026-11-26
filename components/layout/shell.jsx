// ระบบ: โครงหน้า Sidebar และเมนู | ไฟล์: shell.jsx
"use client";

// หน้าตาร่วม | เมนู หัวหน้าเว็บ แท็บ และกรอบเนื้อหา

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDemo } from "../shared/demo";

const paths = {
  settings:
    "M9 3h6l.4 2.5 1.8 1 2.4-.8 3 5.2-2 1.6v2l2 1.6-3 5.2-2.4-.8-1.8 1L15 23H9l-.4-2.5-1.8-1-2.4.8-3-5.2 2-1.6v-2l-2-1.6 3-5.2 2.4.8 1.8-1L9 3M15.5 13a3.5 3.5 0 1 0-7 0 3.5 3.5 0 0 0 7 0Z",
  home: "M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9",
  coins:
    "M21 6c0 2-4 4-9 4S3 8 3 6s4-4 9-4 9 2 9 4ZM3 6v12c0 2 4 4 9 4s9-2 9-4V6M3 12c0 2 4 4 9 4s9-2 9-4",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm9-8a4 4 0 0 1 0 8",
  calendar: "M4 5h16v16H4zM4 10h16M8 3v4m8-4v4M8 14h2m4 0h2m-8 3h2m4 0h2",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0",
  send: "m22 2-7 20-4-9-9-4 20-7ZM11 13 22 2",
  file: "M6 3h9l4 4v14H6zM14 3v5h5M9 12h7m-7 4h7",
  info: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 11v6m0-10v.1",
  chart: "M4 20v-6h3v6zm7 0V9h3v11zm7 0V4h3v16z",
  search: "M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6",
  percent:
    "M5 19 19 5M9 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm10 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z",
  refund: "M3 12a9 9 0 1 0 4-7M3 4v6h6m3-3v5l4 2",
};

// ฟังก์ชัน Icon: ทำงานส่วน Icon ของระบบนี้
export function Icon({ name }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name] || paths.file} />
    </svg>
  );
}

// ฟังก์ชัน Shell: ทำงานส่วน Shell ของระบบนี้
export function Shell({ title, subtitle, children }) {
  return (
    <div className="module-content">
      <header>
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </header>
      {children}
    </div>
  );
}

// ฟังก์ชัน Tabs: ทำงานส่วน Tabs ของระบบนี้
export function Tabs({ options, active, onChange }) {
  return (
    <div className="tabs" aria-label="มุมมอง">
      {options.map(([key, icon, label]) => (
        <button
          key={key}
          type="button"
          aria-pressed={active === key}
          onClick={() => onChange(key)}
        >
          <Icon name={icon} />
          {label}
        </button>
      ))}
    </div>
  );
}

// ฟังก์ชัน Panel: ทำงานส่วน Panel ของระบบนี้
export function Panel({ icon, title, action, children }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>
          <Icon name={icon} />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
