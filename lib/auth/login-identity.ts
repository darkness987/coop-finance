// ระบบเข้าสู่ระบบ: ค้นบัญชีจากชื่อผู้ใช้หรือเลขสมาชิก โดยไม่เปลี่ยนรหัสผ่านหรือสิทธิ์
import type { Database } from "../../database/store";
// ถ้าเลขสมาชิกมีหลายบัญชี ให้เลือกบัญชีสมาชิกก่อน ห้ามเลือกสิทธิ์เจ้าหน้าที่แบบสุ่ม
export function findLoginAccount(db: Database, input: string) {
  const identity = input.trim();
  if (!identity || identity.length > 120) return undefined;
  const active = db.auth.users.filter((user) => user.active);
  const exact = active.find((user) => user.username === identity);
  if (exact) return exact;
  if (!/^\d{4,16}$/.test(identity)) return undefined;
  const matches = active.filter((user) => user.member === identity);
  const members = matches.filter((user) => user.role === "member");
  if (members.length === 1) return members[0];
  if (members.length > 1) return undefined;
  return undefined;
}
