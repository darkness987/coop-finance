import { activeDepositAccount } from "./deposit-scope";
// ระบบ: เงินฝาก ถอนเงิน และดอกเบี้ย | ไฟล์: deposit-interest.ts
// ดอกเบี้ยเงินฝาก: ยอดปิดสิ้นวัน × อัตราต่อปี ÷ จำนวนวันในปี รวมแล้วปัดเป็นสตางค์ครั้งเดียว
import type { Database } from "../../database/store";
// ฟังก์ชัน annualInterest: ทำงานส่วน annualInterest ของระบบนี้
export function annualInterest(
  db: Database,
  accountId: string,
  year: number,
  rate: number,
) {
  const currentYear = Number(
    new Date()
      .toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
      .slice(0, 4),
  );
  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year >= currentYear ||
    !Number.isFinite(rate) ||
    rate < 0 ||
    rate > 30
  )
    throw new Error("เลือกปีที่ปิดรอบแล้วและอัตรา 0–30%");
  const account = db.deposits.accounts.find((a) => a.id === accountId);
  if (!account || !activeDepositAccount(account))
    throw new Error("ไม่พบบัญชีที่เปิดให้บริการ");
  if (
    db.deposits.transactions.some(
      (t) =>
        t.account === accountId && t.type === "interest" && t.year === year,
    )
  )
    throw new Error("บัญชีนี้จัดสรรดอกเบี้ยปีนี้แล้ว");
  const start = Date.UTC(year, 0, 1),
    end = Date.UTC(year + 1, 0, 1),
    days = (end - start) / 86400000;
  const ledger = db.deposits.transactions.filter(
    (t) => t.account === accountId && t.status === "confirmed",
  );
  const dateOf = (t: any) =>
    t.effectiveDate ||
    new Date(t.confirmed).toLocaleDateString("sv-SE", {
      timeZone: "Asia/Bangkok",
    });
  let total = 0;
  for (let day = start; day < end; day += 86400000) {
    const date = new Date(day).toISOString().slice(0, 10);
    let balance = 0;
    for (const t of ledger) {
      if (dateOf(t) <= date && !(t.type === "interest" && t.year >= year))
        balance += (t.type === "withdrawal" ? -1 : 1) * t.amountCents;
    }
    if (balance < 0)
      throw new Error("ประวัติเงินฝากมียอดติดลบ กรุณาตรวจข้อมูล");
    total += balance;
  }
  const interestCents = Math.round((total * rate) / 100 / days);
  if (!Number.isSafeInteger(interestCents) || interestCents <= 0)
    throw new Error("ไม่มีดอกเบี้ยที่จัดสรรได้ในปีนี้");
  return { interestCents, year, rate };
}
