// ระบบตั้งค่าเงินฝาก: ตารางเดือน/ดอกเบี้ยกลาง ใช้กับใบเสนอแผนใหม่ สัญญาเก่าเก็บ snapshot เดิม
import type { Database } from "../../database/store";
import type { Actor } from "../auth/session";
import { roleOf } from "../auth/permissions";
import { monthlyTerms, monthlyContractTerms } from "./monthly-terms";
import { createMonthlyPlan } from "./monthly-plan";
import { depositTypesFor } from "./deposit-types";
import { currentReturnRates, changeReturnRates } from "../returns/return-rates";
export function depositSettings(db: Database) {
  const stored = db.deposits.settings;
  return {
    revision: stored?.revision || 0,
    monthlyTerms:
      stored?.monthlyTerms ||
      monthlyTerms.map((t) => ({ ...t, id: "term-" + t.months, active: true })),
    openingEnabled: stored?.openingEnabled || {
      savings: true,
      special: true,
      monthly: true,
    },
    minimumMonthlyCents: stored?.minimumMonthlyCents ?? 1,
    updated: stored?.updated || null,
    rates: Object.fromEntries(depositTypesFor(db).map((t) => [t.id, t.rate])),
  };
}
// ตรวจเงื่อนไขเปิดบัญชีก่อนเขียนจริง ไม่ใช้ค่าการเปิดรับหรือดอกเบี้ยที่ browser ส่งมา
export function requireDepositOpening(db: Database, type: string) {
  if (
    !["savings", "special", "monthly"].includes(type) ||
    depositSettings(db).openingEnabled[type] !== true
  )
    throw Error("บัญชีประเภทนี้ปิดรับเปิดบัญชีใหม่");
}
export function configuredMonthlyPlan(
  db: Database,
  input: any,
  existing?: Record<string, any>,
) {
  const settings = depositSettings(db);
  const options = settings.monthlyTerms.filter((t) => t.active);
  // สมาชิกเดิมยังปรับยอดของสัญญาเดิมได้ แม้ Admin ปิดรับจำนวนเดือนนั้นแล้ว
  if (
    existing &&
    !options.some((t) => t.months === Number(input.termMonths)) &&
    Number(existing.termMonths) === Number(input.termMonths)
  )
    options.push({
      ...monthlyContractTerms(existing)[0],
      id: "existing",
      active: false,
    });
  const plan = createMonthlyPlan(
    input.termMonths,
    input.monthlyAmount,
    existing?.startPeriod || input.startPeriod,
    options,
  );
  if (plan.monthlyCents < settings.minimumMonthlyCents)
    throw Error(
      "ยอดฝากต่อเดือนต้องไม่น้อยกว่า " +
        (settings.minimumMonthlyCents / 100).toLocaleString("th-TH") +
        " บาท",
    );
  return plan;
}
// ตรวจทุกช่องก่อนบันทึก และกันการบันทึกทับค่าที่ Admin คนอื่นเพิ่งเปลี่ยน
export function changeDepositSettings(db: Database, a: Actor, i: any) {
  if (roleOf(a) !== "admin")
    throw Object.assign(Error("เฉพาะ Admin ตั้งค่าเงินฝาก"), { status: 403 });
  const old = depositSettings(db);
  if (i.revision !== old.revision)
    throw Object.assign(Error("ค่าตั้งเปลี่ยนแล้ว กรุณาโหลดใหม่ก่อนบันทึก"), {
      status: 409,
    });
  const validRate = (value: any) =>
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 30 &&
    Math.abs(value * 100 - Math.round(value * 100)) < 1e-7;
  if (!validRate(i.savingsRate) || !validRate(i.specialRate))
    throw Error("ดอกเบี้ยต้องอยู่ระหว่าง 0–30% ทศนิยมไม่เกิน 2 ตำแหน่ง");
  if (
    !Array.isArray(i.monthlyTerms) ||
    i.monthlyTerms.length < 1 ||
    i.monthlyTerms.length > 20
  )
    throw Error("กำหนดแผนฝาก 1–20 แผน");
  const terms = i.monthlyTerms.map((t: any) => {
    if (
      !t ||
      typeof t.id !== "string" ||
      !/^[a-zA-Z0-9-]{1,60}$/.test(t.id) ||
      !Number.isInteger(t.months) ||
      t.months < 1 ||
      t.months > 120 ||
      !validRate(t.rate) ||
      typeof t.active !== "boolean"
    )
      throw Error("แต่ละแผนต้องมีระยะเวลา 1–120 เดือน และดอกเบี้ย 0–30%");
    return { id: t.id, months: t.months, rate: t.rate, active: t.active };
  });
  if (
    new Set(terms.map((t) => t.id)).size !== terms.length ||
    new Set(terms.map((t) => t.months)).size !== terms.length
  )
    throw Error("รหัสแผนและจำนวนเดือนต้องไม่ซ้ำกัน");
  if (
    !i.openingEnabled ||
    ["savings", "special", "monthly"].some(
      (k) => typeof i.openingEnabled[k] !== "boolean",
    )
  )
    throw Error("สถานะเปิดรับบัญชีไม่ถูกต้อง");
  if (i.openingEnabled.monthly && !terms.some((t) => t.active))
    throw Error("ต้องมีแผนที่เปิดรับอย่างน้อย 1 แผน หรือปิดรับบัญชีรายเดือน");
  const amount = i.minimumMonthlyAmount,
    minimumMonthlyCents = Math.round(amount * 100);
  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !Number.isSafeInteger(minimumMonthlyCents) ||
    Math.abs(amount * 100 - minimumMonthlyCents) > 1e-7
  )
    throw Error("ยอดขั้นต่ำต่อเดือนต้องมากกว่า 0 และมีทศนิยมไม่เกิน 2 ตำแหน่ง");
  changeReturnRates(db, a, {
    action: "save",
    ...currentReturnRates(db),
    depositRates: {
      ...old.rates,
      savings: i.savingsRate,
      special: i.specialRate,
    },
  });
  db.deposits.settings = {
    revision: old.revision + 1,
    monthlyTerms: terms,
    openingEnabled: Object.fromEntries(
      ["savings", "special", "monthly"].map((k) => [k, i.openingEnabled[k]]),
    ),
    minimumMonthlyCents,
    updated: new Date().toISOString(),
    updatedBy: a.id,
  };
  return { ok: true };
}
