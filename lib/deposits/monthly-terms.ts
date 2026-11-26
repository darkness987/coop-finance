// ตัวเลือกระยะเวลาและดอกเบี้ยต่อปีของแผนฝากรายเดือน ใช้ร่วมกันทั้งหน้าเว็บและ API
export const monthlyTerms = [
  { months: 12, rate: 2.25 },
  { months: 24, rate: 2.75 },
  { months: 36, rate: 3.0 },
];
export function monthlyRate(term: unknown, options = monthlyTerms) {
  return options.find((option) => option.months === Number(term))?.rate ?? null;
}

// อ่านอัตราที่บันทึกในสัญญา รองรับข้อมูลเดิมก่อนมี snapshot โดยใช้อัตราเริ่มต้นเดิม
export function monthlyContractTerms(plan: Record<string, any>) {
  const rate = plan.annualRate ?? monthlyRate(plan.termMonths);
  if (rate == null || !Number.isFinite(Number(rate)))
    throw Error("สัญญายังไม่ระบุอัตราดอกเบี้ย");
  return [{ months: Number(plan.termMonths), rate: Number(rate) }];
}
