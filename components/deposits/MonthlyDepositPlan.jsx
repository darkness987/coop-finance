"use client";
// หน้าภายในบัญชีรายเดือน: ปรับแผน ดูประมาณการทันที และบันทึกในบัญชีเดิม
import { useState, useEffect } from "react";
import {
  monthlyTerms as defaultTerms,
  monthlyContractTerms,
} from "../../lib/deposits/monthly-terms";
import { estimateMonthlyPlan } from "../../lib/deposits/monthly-estimate";
import { money } from "../shared/Finance";
import MonthlyDepositContract from "./MonthlyDepositContract";
export default function MonthlyDepositPlan({ f, account, onSaved }) {
  const saved = account?.monthlyPlan;
  const options = f.data.monthlyTerms || defaultTerms;
  const monthlyTerms = [...options];
  if (saved && !options.some((t) => t.months === saved.termMonths))
    monthlyTerms.push({ ...monthlyContractTerms(saved)[0], legacy: true });
  const minimum = f.data.settings?.minimumMonthlyCents / 100 || 0.01;
  const [months, setMonths] = useState(
    String(saved?.termMonths || monthlyTerms[0]?.months || ""),
  );
  const [amount, setAmount] = useState(
    String(saved ? saved.monthlyCents / 100 : 1000),
  );
  useEffect(() => {
    if (!saved && !monthlyTerms.some((t) => String(t.months) === months))
      setMonths(String(monthlyTerms[0]?.months || ""));
  }, [f.data.settings?.revision]);
  const period =
    saved?.startPeriod ||
    new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Bangkok" })
      .format(new Date())
      .slice(0, 7);
  let estimate = null;
  try {
    estimate = estimateMonthlyPlan(months, amount, period, monthlyTerms);
  } catch {}
  async function save(e) {
    e.preventDefault();
    const result = await f.act(
      {
        action: account ? "monthly-plan" : "open",
        ...(account ? { account: account.id } : { type: "monthly" }),
        termMonths: Number(months),
        monthlyAmount: amount,
      },
      { result: true },
    );
    if (result?.result?.id) onSaved(result.result.id);
  }
  return (
    <section className="deposit-card deposit-plan-editor">
      <div className="deposit-section-heading">
        <div>
          <h2>วางแผนฝากออมทรัพย์รายเดือน</h2>
          <p className="deposit-muted">
            เลือกยอดฝากและระยะเวลา เพื่อดูผลตอบแทนตามแผนก่อนบันทึก
          </p>
        </div>
      </div>
      <form className="deposit-form" onSubmit={save}>
        <div className="deposit-form-grid">
          <label>
            ยอดฝากต่อเดือน (บาท)
            <input
              required
              type="number"
              min={minimum}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label>
            ระยะเวลาตามสัญญา
            <select value={months} onChange={(e) => setMonths(e.target.value)}>
              {monthlyTerms.map((t) => (
                <option key={t.months} value={t.months}>
                  {t.months} เดือน · ดอกเบี้ย {t.rate.toFixed(2)}% ต่อปี
                  {t.legacy ? " (แผนเดิม)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
        {estimate && (
          <>
            <div className="deposit-plan-results" aria-live="polite">
              {[
                ["เงินต้นสะสม", estimate.principalCents],
                ["ดอกเบี้ยประมาณการ", estimate.interestCents],
                ["ยอดรวมเมื่อครบสัญญา", estimate.totalCents],
              ].map(([label, cents]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>
                    {money(cents / 100)} <small>บาท</small>
                  </strong>
                </div>
              ))}
            </div>
            <p className="deposit-note">
              ฝากเดือนละ {money(estimate.monthlyCents / 100)} บาท เป็นเวลา{" "}
              {estimate.termMonths} เดือน อัตรา {estimate.annualRate.toFixed(2)}
              % ต่อปี คาดว่าจะได้ดอกเบี้ย {money(estimate.interestCents / 100)}{" "}
              บาท เมื่อครบวันที่ {estimate.maturityDate}
            </p>
            <p className="deposit-muted">
              สมมุติฝากวันที่ 1 ของทุกเดือน
              คิดดอกเบี้ยจากเงินแต่ละงวดตามวันจริงในปี 365/366 วัน ไม่ทบต้น
              ยอดจริงขึ้นอยู่กับวันที่และจำนวนเงินที่ฝาก
              ไม่ใช่นำเงินต้นทั้งหมดคูณอัตราดอกเบี้ยตลอดสัญญา
            </p>
          </>
        )}
        <div className="deposit-plan-actions">
          <button
            className="deposit-primary"
            disabled={f.busy || !estimate || Number(amount) < minimum}
          >
            {f.busy
              ? "กำลังบันทึก…"
              : account
                ? "บันทึกแผนฝากรายเดือน"
                : "เปิดบัญชีพร้อมแผนฝาก"}
          </button>
        </div>
        <p className="deposit-muted">
          แผนตัวอย่าง เปลี่ยนยอดและจำนวนเดือนได้เรื่อย ๆ
          หลังบันทึกยอดฝากรายเดือนจะปรับบนหน้าหลัก
        </p>
      </form>
      {account?.monthlyPlan && <MonthlyDepositContract account={account} />}
    </section>
  );
}
