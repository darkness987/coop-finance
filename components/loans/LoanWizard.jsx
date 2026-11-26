// ระบบ: สินเชื่อ วงเงิน ผู้ค้ำ และชำระหนี้ | ไฟล์: LoanWizard.jsx
"use client";
// ขั้นตอนเหมือนระบบเดิม: ประเภท → ข้อมูล → คำนวณ/ตรวจสิทธิ์ → ยืนยันและส่งตรวจ
import { useState } from "react";
import { Field, money } from "../shared/Finance";
import ApplicationDetail from "./ApplicationDetail";
import LoanCalculation from "./LoanCalculation";
import GuarantorFields from "./GuarantorFields";
// ฟังก์ชัน LoanWizard: จัดขั้นตอนยื่นกู้ คำนวณวงเงินและยืนยันคำขอ
export default function LoanWizard({ f, product, draft, onExit }) {
  const [step, setStep] = useState(1),
    [id, setId] = useState(draft?.id || ""),
    [form, setForm] = useState({
      product: draft?.product || product.id,
      amount: draft?.amount || product.minAmount,
      months: draft?.months || product.minMonths,
      reason: draft?.reason || "",
      guarantorMembers: draft?.guarantors?.map((g) => g.member) || [
        draft?.guarantor?.member || "",
        "",
      ],
      collateral: draft?.collateral || null,
      loanMode: draft?.loanMode || (draft?.guarantor ? "guaranteed" : "asset"),
    }),
    [result, setResult] = useState(null);
  const p = f.data.products.find((p) => p.id === form.product) || product;
  const row = f.data.applications.find((r) => r.id === id);
  const change = (key, value) => {
    setForm({ ...form, [key]: value });
    setResult(null);
  };
  // ฟังก์ชัน save: บันทึกข้อมูล
  async function save(next = false) {
    const res = await f.act(
      {
        ...form,
        action: id ? "save" : "create",
        ...(id ? { id, revision: row?.revision } : {}),
      },
      { result: true },
    );
    if (res) {
      setId(res.result.id);
      if (next) setStep(3);
    }
  }
  // ฟังก์ชัน calculate: คำนวณตามเงื่อนไข
  async function calculate() {
    const res = await f.act(
      { ...form, action: "estimate", ...(id ? { id } : {}) },
      { preview: true, result: true },
    );
    if (res) {
      setResult(res.result);
      setStep(2);
    }
  }
  return (
    <>
      <div className="loan-steps" aria-label="ขั้นตอนยื่นคำขอ">
        {[
          "เลือกประเภท",
          "ข้อมูลคำขอ",
          "คำนวณและตรวจสิทธิ์",
          "ยืนยันและส่งตรวจ",
        ].map((label, i) => (
          <span
            key={label}
            className={i <= step ? "done" : ""}
            aria-current={i === step ? "step" : undefined}
          >
            <b>{i + 1}</b>
            {label}
          </span>
        ))}
      </div>
      <div className="loan-columns">
        <section className="loan-card">
          <div className="loan-section-title">
            <div>
              <small>ขั้นตอน {step + 1} / 4</small>
              <h2>
                {step === 1
                  ? "กรอกข้อมูลคำขอสินเชื่อ"
                  : step === 2
                    ? "คำนวณเงินผ่อนและดอกเบี้ย"
                    : "ตรวจสอบและส่งคำขอ"}
              </h2>
            </div>
            <button disabled={f.busy} onClick={onExit}>
              กลับหน้ารายการ
            </button>
          </div>
          {step < 3 ? (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  calculate();
                }}
              >
                <div className="loan-form-grid">
                  <label>
                    ประเภทสินเชื่อ
                    <select
                      value={form.product}
                      onChange={(e) => change("product", e.target.value)}
                    >
                      {f.data.products
                        .filter((p) => p.active)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <Field
                    label="จำนวนเงินกู้ (บาท)"
                    type="number"
                    min={p.minAmount}
                    step=".01"
                    value={form.amount}
                    onChange={(e) => change("amount", e.target.value)}
                    required
                  />
                  <Field
                    label="ระยะเวลาผ่อน (เดือน)"
                    type="number"
                    min={p.minMonths}
                    max={p.maxMonths}
                    value={form.months}
                    onChange={(e) => change("months", e.target.value)}
                    required
                  />
                  <Field
                    label="วัตถุประสงค์"
                    value={form.reason}
                    onChange={(e) => change("reason", e.target.value)}
                    maxLength={1000}
                    required
                  />
                </div>
                <GuarantorFields
                  productId={form.product}
                  f={f}
                  applicationId={id}
                  loanMode={form.loanMode}
                  onModeChange={(value) => {
                    setForm({
                      ...form,
                      loanMode: value,
                      collateral:
                        value === "collateral"
                          ? {
                              type: "land",
                              owner: "",
                              documentNumber: "",
                              address: "",
                            }
                          : null,
                      guarantorMembers: ["", ""],
                    });
                    setResult(null);
                  }}
                  collateral={form.collateral}
                  onCollateralChange={(value) => change("collateral", value)}
                  amount={form.amount}
                  members={form.guarantorMembers}
                  initialGuarantors={
                    draft?.guarantors ||
                    (draft?.guarantor ? [draft.guarantor] : [])
                  }
                  onChange={(index, value) =>
                    change(
                      "guarantorMembers",
                      [0, 1].map((n) =>
                        n === index ? value : form.guarantorMembers[n] || "",
                      ),
                    )
                  }
                />
                <div className="loan-actions">
                  <button
                    type="button"
                    disabled={f.busy}
                    onClick={() => save()}
                  >
                    บันทึกร่าง
                  </button>
                  <button className="primary" disabled={f.busy}>
                    {step === 1 ? "ถัดไป: คำนวณ" : "คำนวณใหม่"}
                  </button>
                </div>
              </form>
              {result && (
                <>
                  <div className="loan-result-grid">
                    {[
                      ["ค่างวดประมาณ / เดือน", result.calculation.installment],
                      ["ดอกเบี้ยรวม", result.calculation.totalInterest],
                      ["ยอดชำระรวม", result.calculation.total],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <small>{label}</small>
                        <strong>{money(value)} ฿</strong>
                      </div>
                    ))}
                  </div>
                  <h3>ผลตรวจคุณสมบัติเบื้องต้น</h3>
                  <ul className="loan-checks">
                    {result.checks
                      .filter((c) => c.id !== "income-ratio")
                      .map((c) => (
                        <li
                          key={c.label}
                          className={c.passed ? "passed" : "failed"}
                        >
                          {c.passed ? "✓" : "!"} {c.label}
                        </li>
                      ))}
                  </ul>
                  {form.loanMode === "asset" && (
                    <p className="loan-contract-note">
                      วงเงินไม่ใช้ผู้ค้ำที่ใช้ได้{" "}
                      {money(result.security.availableAmount)} บาท ·
                      ยอดคำขออื่นที่จองไว้{" "}
                      {money(result.security.reservedAmount)} บาท ·
                      ยอดกู้ครั้งนี้ {money(form.amount)} บาท
                    </p>
                  )}
                  <p className="loan-muted">
                    ใช้รายได้ในข้อมูลสมาชิก {money(result.income)} บาท ·
                    ภาระผ่อนเดิม {money(result.existingDebt)} บาท
                    การผ่านตรวจเบื้องต้นยังไม่ใช่ผลอนุมัติ
                  </p>
                  <section className="loan-schedule-section">
                    <h3>ตารางผ่อนประมาณการแบบลดต้นลดดอก</h3>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>งวด</th>
                            <th>เงินต้นก่อนงวด</th>
                            <th>ตัดเงินต้น</th>
                            <th>ดอกเบี้ย</th>
                            <th>ค่างวด</th>
                            <th>คงเหลือ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.calculation.rows.map((r) => (
                            <tr key={r.number}>
                              <td>{r.number}</td>
                              <td>{money(r.openingBalance)}</td>
                              <td>{money(r.principal)}</td>
                              <td>{money(r.interest)}</td>
                              <td>{money(r.payment)}</td>
                              <td>{money(r.balance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <LoanCalculation
                    annualInterestPercent={p.annualRate}
                    openingPrincipal={result.calculation.rows[0].openingBalance}
                    interestAmount={result.calculation.rows[0].interest}
                  />
                  <div className="loan-actions">
                    <button disabled={f.busy} onClick={() => setStep(1)}>
                      แก้ไขข้อมูล
                    </button>
                    <button
                      className="primary"
                      disabled={
                        f.busy || !result.eligible || !form.reason.trim()
                      }
                      onClick={() => save(true)}
                    >
                      ถัดไป: ยืนยันคำขอ
                    </button>
                  </div>
                </>
              )}
            </>
          ) : row ? (
            <>
              <ApplicationDetail row={row} f={f} />
              {["draft", "needs_documents"].includes(row.status) && (
                <button disabled={f.busy} onClick={() => setStep(1)}>
                  กลับไปแก้ไขข้อมูลคำขอ
                </button>
              )}
            </>
          ) : (
            <p>กำลังโหลดร่างคำขอ…</p>
          )}
        </section>
        <aside className="loan-card loan-summary">
          <span className="loan-icon">฿</span>
          <h2>{p.name}</h2>
          <p>{p.description}</p>
          <dl>
            <div>
              <dt>อัตราดอกเบี้ยต่อปี</dt>
              <dd>{p.annualRate}%</dd>
            </div>
            <div>
              <dt>วงเงินกู้</dt>
              <dd>{money(form.amount)} บาท</dd>
            </div>
            <div>
              <dt>ระยะเวลาผ่อน</dt>
              <dd>{form.months} เดือน</dd>
            </div>
            <div>
              <dt>วงเงินขั้นต่ำ</dt>
              <dd>{money(p.minAmount)} บาท</dd>
            </div>
          </dl>
          <h3>ตรวจข้อมูลก่อนส่งคำขอ</h3>
          <p>ตรวจจำนวนเงิน ระยะเวลาผ่อน และวัตถุประสงค์ให้ถูกต้อง</p>
          <p className="loan-muted">
            บันทึกร่างไว้แล้วกลับมาแก้ไขและส่งคำขอภายหลังได้
          </p>
        </aside>
      </div>
    </>
  );
}
