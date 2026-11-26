// ระบบ: ปันผล เฉลี่ยคืน และบัญชีรับผลตอบแทน | ไฟล์: ReceivingAccount.jsx
"use client";
// การ์ดบัญชีรับผลตอบแทนตามตัวอย่าง ใช้ข้อมูลจริงชุดเดียวกันทั้งหุ้นและเงินฝาก
import { useState } from "react";
// ฟังก์ชัน ReceivingAccount: ทำงานส่วน ReceivingAccount ของระบบนี้
export default function ReceivingAccount({ f, isShares }) {
  const d = f.data,
    receiving = d.receivingAccount;
  const [editing, setEditing] = useState(false),
    [bank, setBank] = useState(""),
    [holder, setHolder] = useState(""),
    [accountNumber, setAccountNumber] = useState("");
  // ฟังก์ชัน editAccount: เตรียมข้อมูลให้แก้ไขในส่วน editAccount
  function editAccount() {
    setBank(receiving?.bank || d.profileBank || "");
    setHolder(receiving?.holder || d.memberName);
    setAccountNumber(receiving?.accountNumber || "");
    setEditing(true);
  }
  return (
    <section
      className="benefits-card benefits-account-card"
      aria-labelledby="receiving-account-title"
    >
      <h2 id="receiving-account-title">
        {isShares
          ? "รายละเอียดบัญชีรับเงินปันผล"
          : "รายละเอียดบัญชีรับผลตอบแทนเงินฝาก"}
      </h2>
      <p className="benefits-muted benefits-account-subtitle">
        บัญชีสำหรับรับเงินปันผลและผลตอบแทนของคุณ
      </p>
      <div className="benefits-bank">
        <span className="benefits-bank-label">บัญชีรับผลตอบแทน</span>
        {receiving ? (
          <div className="benefits-bank-summary">
            <span className="benefits-bank-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m3 9 9-5 9 5H3Zm2 0v10m5-10v10m4-10v10m5-10v10M3 20h18" />
              </svg>
            </span>
            <div className="benefits-bank-details">
              <strong>{receiving.bank}</strong>
              <span
                className="benefits-bank-number"
                aria-label={`เลขบัญชีลงท้าย ${receiving.accountNumber.slice(-4)}`}
              >
                x-xxxx-{receiving.accountNumber.slice(-4)}
              </span>
              <small>{receiving.holder}</small>
            </div>
          </div>
        ) : (
          <p className="benefits-bank-empty">ยังไม่ได้บันทึกบัญชีรับผลตอบแทน</p>
        )}
        {!editing && (
          <button
            type="button"
            className="benefits-bank-edit"
            onClick={editAccount}
          >
            {receiving ? "แก้ไขบัญชี" : "เพิ่มบัญชีรับเงิน"}
          </button>
        )}
        {editing && (
          <form
            className="benefits-bank-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await f.act({
                  action: "save-receiving-account",
                  bank,
                  holder,
                  accountNumber,
                })
              )
                setEditing(false);
            }}
          >
            <label>
              ธนาคาร
              <input
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                maxLength={120}
                required
                disabled={f.busy}
              />
            </label>
            <label>
              ชื่อบัญชี
              <input
                value={holder}
                onChange={(e) => setHolder(e.target.value)}
                maxLength={120}
                required
                disabled={f.busy}
              />
            </label>
            <label>
              เลขบัญชี
              <input
                inputMode="numeric"
                pattern="[0-9]{8,20}"
                minLength={8}
                maxLength={20}
                value={accountNumber}
                onChange={(e) =>
                  setAccountNumber(e.target.value.replace(/\D/g, ""))
                }
                required
                disabled={f.busy}
              />
            </label>
            {f.error && (
              <p role="alert" className="error">
                {f.error}
              </p>
            )}
            <div className="benefits-actions">
              <button
                type="button"
                disabled={f.busy}
                onClick={() => setEditing(false)}
              >
                ยกเลิก
              </button>
              <button className="primary" disabled={f.busy}>
                บันทึกบัญชี
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
