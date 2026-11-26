// ระบบ: เงินฝาก ถอนเงิน และดอกเบี้ย | ไฟล์: DepositInterest.jsx
"use client";
// ส่วนดอกเบี้ยแยกจากทะเบียนบัญชีและคิวอนุมัติ ให้ตรวจอัตราและปีก่อนจัดสรร
import { useState } from "react";
import { Field } from "../shared/Finance";
// ฟังก์ชัน DepositInterest: ทำงานส่วน DepositInterest ของระบบนี้
export default function DepositInterest({ f }) {
  const [accountId, setAccount] = useState(f.data.accounts[0]?.id || "");
  const account =
    f.data.accounts.find((a) => a.id === accountId) || f.data.accounts[0];
  return (
    <div className="deposit-columns">
      <section className="deposit-card">
        <h2>จัดสรรดอกเบี้ยประจำปี</h2>
        <p className="deposit-muted">
          คำนวณจากยอดปิดสิ้นวัน และจัดสรรได้บัญชีละหนึ่งครั้งต่อปี
        </p>
        {!f.data.accounts.length ? (
          <p>ยังไม่มีบัญชีเงินฝาก</p>
        ) : (
          <form
            className="deposit-form"
            onSubmit={(e) => {
              e.preventDefault();
              const input = Object.fromEntries(new FormData(e.currentTarget));
              if (
                confirm(
                  `ยืนยันจัดสรรดอกเบี้ยปี ${input.year} อัตรา ${account?.rate}% ให้บัญชี ${input.account}?`,
                )
              )
                f.act({ ...input, action: "interest" });
            }}
          >
            <label>
              บัญชีเงินฝาก
              <select
                name="account"
                value={account?.id || ""}
                onChange={(e) => setAccount(e.target.value)}
              >
                {f.data.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {f.data.types.find((t) => t.id === a.type)?.name} · {a.id} ·{" "}
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="deposit-form-grid">
              <Field
                label="ปี ค.ศ. ที่ปิดรอบแล้ว"
                name="year"
                type="number"
                min="2000"
                max={new Date().getFullYear() - 1}
                required
              />
              <label>
                อัตราดอกเบี้ยต่อปี (%)
                <input
                  aria-label="อัตราดอกเบี้ยที่ระบบกำหนด"
                  value={account?.rate ?? "ยังไม่กำหนด"}
                  readOnly
                  style={{ background: "#edf1f7", color: "#536b8b" }}
                />
              </label>
            </div>
            <button
              className="deposit-primary"
              disabled={f.busy || account?.rate == null}
            >
              ตรวจสอบและจัดสรรดอกเบี้ย
            </button>
          </form>
        )}
      </section>
      <section className="deposit-card">
        <h2>อัตราปัจจุบันตามประเภทบัญชี</h2>
        {f.data.types
          .filter((t) => t.id !== "monthly")
          .map((t) => (
            <div className="deposit-rule" key={t.id}>
              <span>{t.name}</span>
              <strong>
                {t.rate == null ? "ยังไม่กำหนด" : `${t.rate.toFixed(2)}% ต่อปี`}
              </strong>
            </div>
          ))}
        {f.data.monthlyTerms.map((term) => (
          <div className="deposit-rule" key={term.id}>
            <span>ออมทรัพย์รายเดือน {term.months} เดือน</span>
            <strong>{Number(term.rate).toFixed(2)}% ต่อปี</strong>
          </div>
        ))}
        <p className="deposit-note">
          ออมทรัพย์ทั่วไปและพิเศษใช้อัตรากลางตามประเภทบัญชี
          ออมทรัพย์รายเดือนใช้อัตราตามสัญญาที่บันทึกไว้ เมื่อจัดสรรสำเร็จ
          ระบบบันทึกรายการและเพิ่มยอดเงินฝากพร้อมกัน
        </p>
      </section>
    </div>
  );
}
