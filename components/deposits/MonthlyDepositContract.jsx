"use client";
// สัญญาฝากรายเดือนตัวอย่าง: อ่านแผนที่บันทึกในบัญชี ไม่ใช้ค่าที่กำลังแก้ในฟอร์ม
import { money } from "../shared/Finance";
import { estimateMonthlyPlan } from "../../lib/deposits/monthly-estimate";
import { monthlyContractTerms } from "../../lib/deposits/monthly-terms";
export default function MonthlyDepositContract({ account }) {
  const plan = account.monthlyPlan;
  if (!plan) return null;
  const estimate = estimateMonthlyPlan(
    plan.termMonths,
    plan.monthlyCents / 100,
    plan.startPeriod,
    monthlyContractTerms(plan),
  );
  return (
    <details className="deposit-monthly-contract">
      <summary>ดูสัญญาเงินฝาก</summary>
      <h4>สัญญาฝากออมทรัพย์รายเดือน (ตัวอย่าง)</h4>
      <dl className="deposit-product-terms">
        {[
          ["เลขสัญญา", "MD-" + account.id],
          ["ชื่อสมาชิก", account.name],
          ["เลขสมาชิก", account.member],
          ["เลขบัญชี", account.id],
          ["ระยะเวลาฝาก", plan.termMonths + " เดือน"],
          ["งวดเริ่มต้น", plan.startPeriod],
          ["งวดสุดท้าย", plan.endPeriod],
          ["ยอดฝากต่อเดือน", money(plan.monthlyCents / 100) + " บาท"],
          [
            "อัตราดอกเบี้ย",
            monthlyContractTerms(plan)[0].rate.toFixed(2) + "% ต่อปี",
          ],
          [
            "เงินต้นตามแผนครบกำหนด",
            money((plan.monthlyCents * plan.termMonths) / 100) + " บาท",
          ],
          [
            "ดอกเบี้ยประมาณการครบสัญญา",
            money(estimate.interestCents / 100) + " บาท",
          ],
          [
            "ยอดรวมประมาณการครบสัญญา",
            money(estimate.totalCents / 100) + " บาท",
          ],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="deposit-muted">
        รายละเอียดตามแผนที่บันทึกไว้ เงินต้นตามแผนยังไม่ใช่ยอดฝากจริง
        ประมาณการสมมุติฝากวันที่ 1 ทุกเดือน ไม่ทบต้น
        ดอกเบี้ยจริงคิดจากยอดเงินและระยะเวลาที่ฝากจริง
      </p>
    </details>
  );
}
