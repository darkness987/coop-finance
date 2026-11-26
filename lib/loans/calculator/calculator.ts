// ระบบ: สินเชื่อ วงเงิน ผู้ค้ำ และชำระหนี้ | ไฟล์: calculator.ts
import Decimal from "decimal.js";
// สูตรลดต้นลดดอก: ชื่อเต็มแทน A/P/i/n เพื่อให้นักศึกษาอ่านตามได้
// ค่างวดรายเดือน = เงินต้นที่กู้ × อัตราดอกเบี้ยรายเดือน ÷ [1 − (1 + อัตราดอกเบี้ยรายเดือน)^(-จำนวนงวด)]
// ฟังก์ชัน calculateMonthlyInstallment: คำนวณตามเงื่อนไขในส่วน calculateMonthlyInstallment
export function calculateMonthlyInstallment(
  principalAmount: number,
  annualInterestPercent: number,
  installmentCount: number,
) {
  if (
    !Number.isFinite(principalAmount) ||
    principalAmount < 1000 ||
    !Number.isSafeInteger(Math.round(principalAmount * 100)) ||
    !Number.isFinite(annualInterestPercent) ||
    annualInterestPercent < 0 ||
    annualInterestPercent > 30 ||
    !Number.isInteger(installmentCount) ||
    installmentCount < 1 ||
    installmentCount > 360
  )
    throw Error("วงเงิน ดอกเบี้ย หรือจำนวนงวดไม่ถูกต้อง");
  const principal = new Decimal(principalAmount).toDecimalPlaces(2);
  const monthlyInterestRate = new Decimal(annualInterestPercent)
    .div(100)
    .div(12);
  if (monthlyInterestRate.isZero())
    return principal.div(installmentCount).toDecimalPlaces(2);
  const discountFactor = new Decimal(1).minus(
    new Decimal(1).plus(monthlyInterestRate).pow(-installmentCount),
  );
  return principal
    .mul(monthlyInterestRate)
    .div(discountFactor)
    .toDecimalPlaces(2);
}
// สูตรรายวันฐาน 365 สำหรับอธิบาย/ตรวจตัวอย่าง แยกจากตารางสัญญารายเดือน
// ดอกเบี้ย = เงินต้นคงเหลือ × อัตราดอกเบี้ยต่อปี ÷ 100 × จำนวนวัน ÷ 365
// ฟังก์ชัน calculateDailyInterest: คำนวณตามเงื่อนไขในส่วน calculateDailyInterest
export function calculateDailyInterest(
  outstandingPrincipal: number,
  annualInterestPercent: number,
  dayCount: number,
) {
  if (
    !Number.isFinite(outstandingPrincipal) ||
    outstandingPrincipal < 0 ||
    !Number.isFinite(annualInterestPercent) ||
    annualInterestPercent < 0 ||
    annualInterestPercent > 30 ||
    !Number.isInteger(dayCount) ||
    dayCount < 0
  )
    throw Error("ข้อมูลคำนวณดอกเบี้ยรายวันไม่ถูกต้อง");
  return new Decimal(outstandingPrincipal)
    .mul(annualInterestPercent)
    .div(100)
    .mul(dayCount)
    .div(365)
    .toDecimalPlaces(2)
    .toFixed(2);
}
// ตารางรายเดือน: เงินต้นลดทุกงวด จึงคิดดอกเบี้ยงวดถัดไปจากยอดที่ลดแล้ว
// ฟังก์ชัน estimate: ทำงานส่วน estimate ของระบบนี้
export function estimate(
  principalAmount: number,
  annualInterestPercent: number,
  installmentCount: number,
) {
  const monthlyInterestRate = new Decimal(annualInterestPercent)
    .div(100)
    .div(12);
  const monthlyInstallment = calculateMonthlyInstallment(
    principalAmount,
    annualInterestPercent,
    installmentCount,
  );
  let outstandingPrincipal = new Decimal(principalAmount).toDecimalPlaces(2);
  let totalInterest = new Decimal(0);
  const rows = [];
  for (
    let installmentNumber = 1;
    installmentNumber <= installmentCount;
    installmentNumber++
  ) {
    const openingPrincipal = outstandingPrincipal;
    const installmentInterest = openingPrincipal
      .mul(monthlyInterestRate)
      .toDecimalPlaces(2);
    // งวดสุดท้ายตัดต้นทั้งหมดที่เหลือ แก้เศษสตางค์จากการปัดค่างวด
    const principalPaid =
      installmentNumber === installmentCount
        ? openingPrincipal
        : Decimal.min(
            openingPrincipal,
            monthlyInstallment.minus(installmentInterest),
          );
    if (principalPaid.lte(0)) throw Error("วงเงินต่ำเกินไปสำหรับระยะเวลา");
    outstandingPrincipal = openingPrincipal.minus(principalPaid);
    totalInterest = totalInterest.plus(installmentInterest);
    rows.push({
      number: installmentNumber,
      openingBalance: openingPrincipal.toFixed(2),
      principal: principalPaid.toFixed(2),
      interest: installmentInterest.toFixed(2),
      payment: principalPaid.plus(installmentInterest).toFixed(2),
      balance: outstandingPrincipal.toFixed(2),
    });
  }
  return {
    payment: monthlyInstallment.toFixed(2),
    interest: totalInterest.toFixed(2),
    total: new Decimal(principalAmount).plus(totalInterest).toFixed(2),
    rows,
  };
}
