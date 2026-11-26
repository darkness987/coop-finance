// อัตราผลตอบแทนกลาง: ใช้กับประมาณการและค่าเริ่มต้นของร่างใหม่ ไม่แก้ผลย้อนหลัง
import type { Database } from "../../database/store";
import type { Actor } from "../auth/session";
import { requireAccess } from "../auth/permissions";
import { depositTypesFor } from "../deposits/deposit-types";
export function currentReturnRates(db: Database) {
  const latest = [...db.returns.allocations]
    .filter((r) => r.approved === 1)
    .sort((a, b) => b.year - a.year)[0];
  return {
    dividendPercent:
      db.returns.settings?.dividendPercent ??
      (latest ? latest.dividend_rate / 100 : 4),
    rebatePercent:
      db.returns.settings?.rebatePercent ??
      (latest ? latest.rebate_rate / 100 : 5),
  };
}
// อ่านอัตราที่มีผลกับหน้าปัจจุบัน โดยรองรับข้อมูลเก่าที่ยังไม่มี settings
export function readReturnRates(db: Database, a: Actor) {
  requireAccess(a, "return-rates");
  return {
    ...currentReturnRates(db),
    depositRates: depositTypesFor(db).map((t) => ({
      id: t.id,
      name: t.name,
      rate: t.rate,
    })),
    updated: db.returns.settings?.updated || null,
  };
}
// ตรวจทุกช่องให้ผ่านก่อนบันทึก ป้องกันการเปลี่ยนข้อมูลเพียงบางส่วน
export function changeReturnRates(db: Database, a: Actor, i: any) {
  requireAccess(a, "return-rates", "save");
  if (i.action !== "save") throw new Error("คำสั่งไม่ถูกต้อง");
  const percent = (v: unknown, max: number) =>
    typeof v === "number" &&
    Number.isFinite(v) &&
    v >= 0 &&
    v <= max &&
    Math.abs(v * 100 - Math.round(v * 100)) < 1e-7;
  if (!percent(i.dividendPercent, 100) || !percent(i.rebatePercent, 100))
    throw new Error(
      "อัตราปันผลและเฉลี่ยคืนต้องอยู่ระหว่าง 0–100% ทศนิยมไม่เกิน 2 ตำแหน่ง",
    );
  const values = i.depositRates;
  if (!values || typeof values !== "object" || Array.isArray(values))
    throw new Error("อัตราเงินฝากไม่ถูกต้อง");
  const depositRates: Record<string, number | null> = {};
  for (const t of depositTypesFor(db)) {
    const value = values[t.id];
    if (value !== null && !percent(value, 30))
      throw new Error(
        "อัตราเงินฝากต้องอยู่ระหว่าง 0–30% ทศนิยมไม่เกิน 2 ตำแหน่ง หรือยังไม่กำหนด",
      );
    depositRates[t.id] = value;
  }
  db.returns.settings = {
    dividendPercent: i.dividendPercent,
    rebatePercent: i.rebatePercent,
    depositRates,
    updated: new Date().toISOString(),
    updatedBy: a.id,
  };
  return { ok: true };
}
