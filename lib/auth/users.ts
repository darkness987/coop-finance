// ระบบ: เข้าสู่ระบบ บัญชีผู้ใช้ สิทธิ์และ OTP | ไฟล์: users.ts
import { requireAccess, roles, roleOf } from "./permissions";
// ผู้ใช้ระบบเชื่อมกับรหัสสมาชิกกลาง แยกจากข้อมูลส่วนตัวและไม่ส่ง hash กลับไป browser
import type { Database } from "../../database/store";
import { passwordHash, verify, admin, type Actor } from "./session";
import { text } from "../deposits/deposits";
import { randomUUID } from "node:crypto";
// ฟังก์ชัน readUsers: อ่านข้อมูลในส่วน readUsers
export function readUsers(db: Database, a: Actor) {
  requireAccess(a, "users");
  admin(a);
  return {
    users: db.auth.users.map(({ passwordHash, sessions, ...user }) => user),
    members: db.members.records.map(({ id, name }) => ({ id, name })),
    roles,
    auditLogs: db.auth.auditLogs
      .slice(-50)
      .reverse()
      .map((log) => ({
        date: log.date,
        module: log.module,
        action: log.action,
        role: log.role || db.auth.users.find((u) => u.id === log.actor)?.role,
        username:
          db.auth.users.find((u) => u.id === log.actor)?.username || log.actor,
      })),
  };
}
// ฟังก์ชัน changeUsers: ตรวจคำสั่งและบันทึกการเปลี่ยนแปลงในส่วน changeUsers
export function changeUsers(db: Database, a: Actor, i: any) {
  requireAccess(a, "users", i.action);
  if (i.action === "password") {
    const user = db.auth.users.find((u) => u.id === a.id);
    if (
      !user ||
      typeof i.previous !== "string" ||
      !verify(i.previous, user.passwordHash)
    )
      throw new Error("รหัสผ่านเดิมไม่ถูกต้อง");
    const password = text(i.password, "รหัสผ่านใหม่");
    if (password.length < 8 || password.length > 200)
      throw new Error("รหัสผ่านต้องยาว 8–200 ตัวอักษร");
    user.passwordHash = passwordHash(password);
    user.sessions = [];
    return;
  }
  admin(a);
  if (i.action === "create") {
    const username = text(i.username || i.member, "ชื่อผู้ใช้ / เลขสมาชิก");
    if (!/^[A-Za-z0-9_.@-]{3,120}$/.test(username))
      throw new Error(
        "ชื่อผู้ใช้ต้องยาว 3–120 ตัว ใช้ภาษาอังกฤษ ตัวเลข _ . @ -",
      );
    if (db.auth.users.some((u) => u.username === username))
      throw new Error("ชื่อผู้ใช้ซ้ำ");
    const member = db.members.records.find((m) => m.id === i.member);
    if (!member)
      throw new Error("ไม่พบเลขสมาชิกนี้ กรุณาสร้างข้อมูลสมาชิกก่อน");
    if (i.name !== undefined) {
      const normalizeName = (value: string) =>
        value.normalize("NFC").trim().replace(/\s+/g, " ");
      const name = text(i.name, "ชื่อ–นามสกุล");
      if (normalizeName(name) !== normalizeName(member.name))
        throw new Error("ชื่อ–นามสกุลไม่ตรงกับเลขสมาชิก กรุณาตรวจสอบอีกครั้ง");
    }
    if (!roles.some((r) => r.id === i.role)) throw new Error("บทบาทไม่ถูกต้อง");
    const password = text(i.password, "รหัสผ่าน");
    if (password.length < 8 || password.length > 200)
      throw new Error("รหัสผ่านต้องยาว 8–200 ตัวอักษร");
    db.auth.users.push({
      id: randomUUID(),
      username,
      member: i.member,
      role: i.role,
      active: true,
      passwordHash: passwordHash(password),
      sessions: [],
    });
    return;
  }
  if (i.action === "role") {
    if (!roles.some((r) => r.id === i.role)) throw new Error("บทบาทไม่ถูกต้อง");
    const user = db.auth.users.find((u) => u.id === i.id);
    if (!user) throw new Error("ไม่พบผู้ใช้");
    if (user.id === a.id) throw new Error("ไม่สามารถเปลี่ยนบทบาทของตนเอง");
    if (
      user.role === "admin" &&
      i.role !== "admin" &&
      db.auth.users.filter((u) => u.role === "admin" && u.active).length <= 1
    )
      throw new Error("ต้องมี Admin ที่ใช้งานอย่างน้อยหนึ่งบัญชี");
    user.role = i.role;
    user.sessions = [];
    return;
  }
  if (i.action === "status") {
    const user = db.auth.users.find((u) => u.id === i.id);
    if (!user) throw new Error("ไม่พบผู้ใช้");
    if (user.id === a.id) throw new Error("ไม่สามารถปิดบัญชีตัวเอง");
    if (typeof i.active !== "boolean") throw new Error("สถานะไม่ถูกต้อง");
    user.active = i.active;
    user.sessions = [];
    return;
  }
  throw new Error("คำสั่งไม่ถูกต้อง");
}
