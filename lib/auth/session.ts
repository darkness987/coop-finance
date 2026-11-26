import { loadDatabase } from "../../database/remote";
import { findLoginAccount } from "./login-identity";
// ระบบ: เข้าสู่ระบบ บัญชีผู้ใช้ สิทธิ์และ OTP | ไฟล์: session.ts
import { isStaff, roles } from "./permissions";
// ระบบเข้าสู่ระบบ: เก็บเฉพาะ hash รหัสผ่าน และ hash session token ในฐานข้อมูลกลาง
import { cookies } from "next/headers";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { readDatabase, updateDatabase } from "../../database/store";
export type Actor = {
  id: string;
  role: string;
  member: string;
  accessRole?: string;
};
// ฟังก์ชัน passwordHash: ทำงานส่วน passwordHash ของระบบนี้
export function passwordHash(
  password: string,
  salt = randomBytes(16).toString("hex"),
) {
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
// ฟังก์ชัน verify: ตรวจรหัสหรือหลักฐานยืนยัน
export function verify(password: string, stored: string) {
  const [salt, hex] = stored.split(":");
  if (!salt || !hex) return false;
  const a = Buffer.from(hex, "hex"),
    b = scryptSync(password, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}
const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
// ฟังก์ชัน actor: ทำงานส่วน actor ของระบบนี้
export async function actor(): Promise<Actor> {
  const token = (await cookies()).get("coop-session")?.value;
  const user =
    token &&
    (await loadDatabase()).auth.users.find((u) =>
      u.sessions?.some(
        (s: any) => s.hash === hash(token) && s.expires > Date.now(),
      ),
    );
  if (!user || !user.active)
    throw Object.assign(new Error("กรุณาเข้าสู่ระบบ"), { status: 401 });
  if (!roles.some((r) => r.id === user.role))
    throw Object.assign(new Error("บทบาทบัญชีไม่ถูกต้อง"), { status: 403 });
  // role ใช้เลือกหน้าจอเจ้าหน้าที่ของระบบเดิม; accessRole คือบทบาทจริงที่ใช้ตรวจสิทธิ์ทุกคำขอ
  return {
    id: user.id,
    role: isStaff(user) ? "admin" : user.role,
    accessRole: user.role,
    member: user.member,
  };
}
// ฟังก์ชัน login: ตรวจบัญชีและสร้าง session
export async function login(
  username: string,
  password: string,
  remember = true,
) {
  const token = randomBytes(32).toString("hex");
  const result = updateDatabase((db) => {
    const u = findLoginAccount(db, username);
    if (!u || !verify(password, u.passwordHash))
      throw new Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    u.sessions = (u.sessions || [])
      .filter((s: any) => s.expires > Date.now())
      .slice(-4);
    u.sessions.push({ hash: hash(token), expires: Date.now() + 8 * 3600000 });
    return { role: u.role };
  });
  (await cookies()).set("coop-session", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(remember ? { maxAge: 8 * 3600 } : {}),
  });
  return result;
}
// ฟังก์ชัน logout: ยกเลิก session ของผู้ใช้
export async function logout() {
  const jar = await cookies(),
    token = jar.get("coop-session")?.value;
  if (token)
    updateDatabase((db) => {
      for (const u of db.auth.users)
        u.sessions = (u.sessions || []).filter(
          (s: any) => s.hash !== hash(token),
        );
    });
  jar.delete("coop-session");
}
// ฟังก์ชัน admin: ทำงานส่วน admin ของระบบนี้
export function admin(a: Actor) {
  if (a.role !== "admin")
    throw Object.assign(new Error("เฉพาะเจ้าหน้าที่"), { status: 403 });
}
