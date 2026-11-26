// ระบบ: สินเชื่อ วงเงิน ผู้ค้ำ และชำระหนี้ | ไฟล์: ProductSettings.jsx
"use client";
import AssetLoanPolicy from "./AssetLoanPolicy";
import { useState } from "react";
import { money, status, Field } from "../shared/Finance";
const kinds = {
  identity: "บัตรประชาชน",
  salary: "สลิปเงินเดือน",
  income: "หลักฐานรายได้",
};
// ฟังก์ชัน ProductSettings: ทำงานส่วน ProductSettings ของระบบนี้
export default function ProductSettings({ f, admin = false, row, c }) {
  const d = f.data;
  const [fileError, setFileError] = useState("");

  return (
    <>
      {fileError && <p role="alert">{fileError}</p>}
      {admin && <AssetLoanPolicy f={f} />}
      {d.products.map((p) => (
        <article className="panel" key={p.id}>
          <h2>{p.name}</h2>
          <p>{p.description}</p>
          <p>
            ดอกเบี้ย {p.annualRate ?? "—"}% ต่อปี · วงเงินเริ่มต้น{" "}
            {money(p.minAmount)} บาท · {p.minMonths}–{p.maxMonths} เดือน ·{" "}
            {p.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
          </p>
          {admin && (
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                f.act({
                  action: "product",
                  id: p.id,
                  annualRate: form.get("annualRate"),
                  maxMonths: form.get("maxMonths"),
                  active: form.get("active") === "on",
                });
              }}
            >
              <Field
                label="อัตราดอกเบี้ยต่อปี (%)"
                name="annualRate"
                type="number"
                min="0"
                max="30"
                step="0.01"
                defaultValue={p.annualRate || 0}
                required
              />
              <Field
                label="ระยะเวลาผ่อน (เดือน)"
                name="maxMonths"
                type="number"
                min="1"
                max="360"
                defaultValue={p.maxMonths}
                required
              />
              <label className="radio">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={p.active}
                />
                เปิดใช้งาน
              </label>
              <button disabled={f.busy}>บันทึกเงื่อนไข</button>
            </form>
          )}
        </article>
      ))}
    </>
  );
}
