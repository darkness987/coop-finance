// ระบบ: เครื่องมือและข้อมูลที่ใช้ร่วมกัน | ไฟล์: context.ts
// รหัสสมาชิกมาจาก session ของคำขอ ไม่รับรหัสสมาชิกจาก browser
import { AsyncLocalStorage } from "node:async_hooks";
import type { Actor } from "../auth/session";
export const requestActor = new AsyncLocalStorage<Actor>();
// ฟังก์ชัน currentMember: ทำงานส่วน currentMember ของระบบนี้
export function currentMember() {
  const a = requestActor.getStore();
  if (!a) throw new Error("ไม่พบ session");
  return a.member;
}
