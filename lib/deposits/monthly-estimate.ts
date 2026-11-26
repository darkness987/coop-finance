// ประมาณการสัญญาฝากรายเดือน: ฝากต้นเดือนทุกงวด คิดดอกเบี้ยแบบไม่ทบต้นตามวันจริง
import { monthlyTerms } from "./monthly-terms";
import { createMonthlyPlan } from "./monthly-plan";
export function estimateMonthlyPlan(
  term: unknown,
  amount: unknown,
  period: string,
  options = monthlyTerms,
) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))
    throw Error("งวดเริ่มต้นไม่ถูกต้อง");
  const plan = createMonthlyPlan(term, amount, period, options);
  const [year, month] = period.split("-").map(Number);
  const maturity = Date.UTC(year, month - 1 + plan.termMonths, 1);
  let interest = 0;
  for (let installment = 0; installment < plan.termMonths; installment++) {
    let cursor = Date.UTC(year, month - 1 + installment, 1);
    while (cursor < maturity) {
      const interestYear = new Date(cursor).getUTCFullYear();
      const yearStart = Date.UTC(interestYear, 0, 1),
        yearEnd = Date.UTC(interestYear + 1, 0, 1);
      const end = Math.min(yearEnd, maturity);
      interest +=
        (((plan.monthlyCents * plan.annualRate) / 100) * (end - cursor)) /
        (yearEnd - yearStart);
      cursor = end;
    }
  }
  const principalCents = plan.monthlyCents * plan.termMonths,
    interestCents = Math.round(interest);
  if (
    !Number.isSafeInteger(principalCents) ||
    !Number.isSafeInteger(principalCents + interestCents)
  )
    throw Error("ยอดเงินเกินช่วงที่คำนวณได้");
  return {
    ...plan,
    principalCents,
    interestCents,
    totalCents: principalCents + interestCents,
    maturityDate: new Date(maturity).toISOString().slice(0, 10),
  };
}
