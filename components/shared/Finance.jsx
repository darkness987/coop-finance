// ระบบ: เครื่องมือและข้อมูลที่ใช้ร่วมกัน | ไฟล์: Finance.jsx
"use client";
import { useEffect, useState } from "react";
export const money = (v) =>
  Number(v).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export const status = {
  pending: "รอตรวจสอบ",
  confirmed: "ยืนยันแล้ว",
  rejected: "ไม่อนุมัติ",
  draft: "ร่าง",
  submitted: "ส่งตรวจแล้ว",
  checking: "กำลังตรวจ",
  needs_documents: "รอแก้ไขข้อมูล",
  forwarded: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  active: "อยู่ระหว่างผ่อน",
  closed: "ปิดสัญญา",
  accepted: "เอกสารผ่าน",
};
// ฟังก์ชัน useFinance: เชื่อมข้อมูลและสถานะของหน้าจอในส่วน useFinance
export function useFinance(module) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  // ฟังก์ชัน load: โหลดข้อมูลสำหรับหน้าจอ
  async function load() {
    const r = await fetch("/api/finance/" + module, { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setData(d);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [module]);
  // ฟังก์ชัน act: ทำงานส่วน act ของระบบนี้
  async function act(input, options = {}) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/finance/" + module, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
        d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (!options.preview) {
        await load();
        window.dispatchEvent(new Event("coop:finance-updated"));
        try {
          localStorage.setItem(
            "coop:finance-updated",
            JSON.stringify({ module, time: Date.now() }),
          );
        } catch {}
      }
      if (!options.preview) setNotice("บันทึกเรียบร้อยแล้ว");
      return options.result ? d : true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { data, act, busy, load, error, notice };
}
// ฟังก์ชัน Notices: ทำงานส่วน Notices ของระบบนี้
export function Notices({ f }) {
  return (
    <>
      {f.error && (
        <p role="alert" className="error">
          {f.error}
        </p>
      )}
      {f.notice && (
        <p role="status" className="ok">
          {f.notice}
        </p>
      )}
    </>
  );
}
// ฟังก์ชัน Field: ทำงานส่วน Field ของระบบนี้
export function Field({ label, ...props }) {
  return (
    <label>
      {label}
      <input {...props} />
    </label>
  );
}
