import { monthlyContractTerms } from "./monthly-terms";
import type { Database } from "../../database/store";
// ระบบ: เงินฝาก ถอนเงิน และดอกเบี้ย | ไฟล์: deposit-types.ts
// ประเภทเงินฝากสำหรับโครงงาน อัตราเดิมใช้จัดสรรดอกเบี้ย
// withdrawalGuidance เป็นคำอธิบายทั่วไป ยังไม่ใช่กฎนับครั้งหรือคิดค่าธรรมเนียม
export const depositTypes = [
  {
    id: "savings",
    name: "ออมทรัพย์ทั่วไป",
    rate: 1.25,
    withdrawalGuidance: {
      frequency: "ไม่จำกัดจำนวนครั้ง",
      conditions: "อาจมีวงเงินขั้นต่ำหรือเงื่อนไขการถอนตามระเบียบสหกรณ์",
    },
  },
  {
    id: "special",
    name: "ออมทรัพย์พิเศษ",
    rate: 2,
    withdrawalGuidance: {
      frequency: "โดยทั่วไปถอนฟรี 1–2 ครั้งต่อเดือน",
      conditions: "ถอนเกินจำนวนครั้งที่กำหนดอาจมีค่าธรรมเนียม ตามระเบียบสหกรณ์",
    },
  },
  {
    id: "monthly",
    name: "ออมทรัพย์รายเดือน",
    rate: null,
    withdrawalGuidance: {
      frequency: "ขึ้นอยู่กับระเบียบสหกรณ์",
      conditions: "อาจต้องฝากต่อเนื่องหรือครบระยะเวลาที่กำหนดก่อนถอน",
    },
  },
];

// ใช้อัตราที่แอดมินบันทึก ถ้ายังไม่เคยตั้งค่าให้ใช้อัตราเริ่มต้น
export function depositTypesFor(db: Database) {
  const rates = db.returns?.settings?.depositRates;
  return depositTypes.map((t) => ({
    ...t,
    rate: rates && Object.hasOwn(rates, t.id) ? rates[t.id] : t.rate,
  }));
}

// บัญชีรายเดือนใช้อัตราตามระยะเวลาที่เลือก บัญชีชนิดอื่นใช้อัตรากลาง
export function depositAccountRate(db: Database, account: Record<string, any>) {
  if (account.type === "monthly" && account.monthlyPlan)
    return monthlyContractTerms(account.monthlyPlan)[0].rate;
  return (
    depositTypesFor(db).find((t) => t.id === (account.type || "savings"))
      ?.rate ?? null
  );
}
