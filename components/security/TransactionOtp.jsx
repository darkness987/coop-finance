// ระบบ: ยืนยัน OTP | ไฟล์: TransactionOtp.jsx
"use client";
// หน้าตา OTP เดิม 6 ช่อง: เลื่อนโฟกัสอัตโนมัติ รองรับวางรหัส และขอรหัสใหม่
import { useEffect, useRef, useState } from "react";
import { money } from "../shared/Finance";
import "./transaction-otp.css";
// ฟังก์ชัน TransactionOtp: แสดง OTP หกช่องและตรวจรหัสยืนยัน
export default function TransactionOtp({
  challenge,
  summaryLabel,
  title,
  note,
  amount,
  busy,
  error,
  onCancel,
  onResend,
  onVerify,
  confirmLabel = "ยืนยัน OTP และส่งคำขอ",
}) {
  const dialog = useRef(null),
    inputs = useRef([]);
  const [digits, setDigits] = useState(Array(6).fill("")),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    const previousFocus = document.activeElement;
    dialog.current.showModal();
    inputs.current[0]?.focus();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(timer);
      previousFocus?.focus();
    };
  }, []);
  useEffect(() => {
    setDigits(Array(6).fill(""));
    inputs.current[0]?.focus();
  }, [challenge.challengeId]);
  const resendSeconds = Math.max(
    0,
    Math.ceil((challenge.resendAt - now) / 1000),
  );
  const remainingSeconds = Math.max(
    0,
    Math.ceil((challenge.expiresAt - now) / 1000),
  );
  // ฟังก์ชัน changeDigit: ตรวจคำสั่งและบันทึกการเปลี่ยนแปลงในส่วน changeDigit
  function changeDigit(value, index) {
    const valueDigits = value.replace(/\D/g, "");
    setDigits((previous) => {
      const next = [...previous];
      next[index] = valueDigits.slice(-1);
      return next;
    });
    if (valueDigits && index < 5) inputs.current[index + 1]?.focus();
  }
  // ฟังก์ชัน pasteCode: ทำงานส่วน pasteCode ของระบบนี้
  function pasteCode(event) {
    event.preventDefault();
    const code = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!code) return;
    setDigits(Array.from({ length: 6 }, (_, index) => code[index] || ""));
    inputs.current[Math.min(code.length, 5)]?.focus();
  }
  return (
    <dialog
      ref={dialog}
      className="transaction-otp"
      aria-labelledby="transaction-otp-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <button
        type="button"
        className="transaction-otp-close"
        aria-label="ปิดหน้าต่าง OTP"
        disabled={busy}
        onClick={onCancel}
      >
        ×
      </button>
      <div className="transaction-otp-icon" aria-hidden="true">
        ✓
      </div>
      <h2 id="transaction-otp-title">{title}</h2>
      <p className="otp-muted">ตรวจสอบรายการและกรอกรหัส OTP 6 หลัก</p>
      <div className="transaction-otp-summary">
        <span>{summaryLabel}</span>
        <strong>{money(amount)} บาท</strong>
      </div>
      <p className="transaction-otp-demo">
        โหมดทดสอบ · ยังไม่ส่ง SMS
        <br />
        รหัสสำหรับทดสอบ: <b>{challenge.demoCode}</b>
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onVerify(digits.join(""));
        }}
      >
        <div className="transaction-otp-digits">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputs.current[index] = element;
              }}
              type="password"
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              aria-label={`OTP หลักที่ ${index + 1}`}
              value={digit}
              maxLength={1}
              pattern="[0-9]"
              required
              disabled={busy}
              onChange={(event) => changeDigit(event.target.value, index)}
              onPaste={pasteCode}
              onKeyDown={(event) => {
                if (event.key === "Backspace" && !digits[index] && index > 0)
                  inputs.current[index - 1]?.focus();
              }}
            />
          ))}
        </div>
        <p className="transaction-otp-timer">
          {remainingSeconds
            ? `รหัสหมดอายุใน ${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, "0")} นาที`
            : "รหัสหมดอายุ กรุณาขอรหัสใหม่"}
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          className="transaction-otp-resend"
          disabled={busy || resendSeconds > 0}
          onClick={onResend}
        >
          {resendSeconds
            ? `ขอรหัสใหม่ได้ใน ${resendSeconds} วินาที`
            : "ส่งรหัส OTP อีกครั้ง"}
        </button>
        <div className="otp-actions">
          <button type="button" disabled={busy} onClick={onCancel}>
            ยกเลิก
          </button>
          <button
            type="submit"
            className="otp-primary"
            disabled={
              busy || !remainingSeconds || digits.some((digit) => !digit)
            }
          >
            {busy ? "กำลังตรวจสอบ…" : confirmLabel}
          </button>
        </div>
      </form>
      <p className="otp-note">{note}</p>
    </dialog>
  );
}
