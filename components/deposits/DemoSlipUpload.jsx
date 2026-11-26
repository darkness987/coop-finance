"use client";
// สลิปตัวอย่าง: อ่านเฉพาะชื่อ/ชนิด/ขนาดจากไฟล์ที่เลือก ไม่อ่านเนื้อหา ไม่ส่ง API และไม่มี name ในฟอร์ม
import { useState } from "react";
import styles from "./demo-slip.module.css";
export default function DemoSlipUpload({ disabled = false }) {
  const [name, setName] = useState(""),
    [error, setError] = useState(""),
    [dragging, setDragging] = useState(false);
  function select(file) {
    setError("");
    setName("");
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "application/pdf"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("เลือก PNG, JPG หรือ PDF ขนาดไม่เกิน 5 MB");
      return;
    }
    setName(file.name);
  }
  return (
    <section className={styles.section} aria-label="แนบสลิปตัวอย่าง">
      <label htmlFor="demo-deposit-slip">อัปโหลดหลักฐานการโอนเงิน (สลิป)</label>
      <div
        className={styles.zone + (dragging ? " " + styles.dragging : "")}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (disabled) return;
          if (e.dataTransfer.files.length !== 1) {
            setError("กรุณาเลือกครั้งละ 1 ไฟล์");
            return;
          }
          select(e.dataTransfer.files[0]);
        }}
      >
        <input
          id="demo-deposit-slip"
          aria-label="เลือกสลิปตัวอย่าง"
          type="file"
          accept="image/png,image/jpeg,application/pdf"
          disabled={disabled}
          onChange={(e) => {
            select(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="36"
          height="36"
          fill="currentColor"
        >
          <path d="M19.4 10.1A7.5 7.5 0 0 0 5 8a6 6 0 0 0 1 12h12a5 5 0 0 0 1.4-9.9ZM13 13v4h-2v-4H8l4-4 4 4h-3Z" />
        </svg>
        <strong>
          {name || "คลิกเพื่ออัปโหลดไฟล์สลิป หรือลากไฟล์มาวางที่นี่"}
        </strong>
        <span>
          {name
            ? "เลือกไฟล์ตัวอย่างแล้ว · คลิกเพื่อเปลี่ยนไฟล์"
            : "PNG, JPG หรือ PDF (ขนาดไม่เกิน 5MB)"}
        </span>
      </div>
      <small>
        ตัวอย่างเท่านั้น ไม่อัปโหลดหรือบันทึกไฟล์จริง และไม่จำเป็นต้องแนบ
      </small>
      {name && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setName("");
            setError("");
          }}
        >
          ล้างไฟล์ตัวอย่าง
        </button>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
