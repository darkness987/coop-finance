// สมัครสมาชิกสาธารณะ: เก็บใบสมัครและบัญชีที่ยังปิดไว้ รอเจ้าหน้าที่อนุมัติก่อนล็อกอิน
import { randomUUID } from "node:crypto";
import type { Database } from "../../database/store";
import { passwordHash } from "../auth/session";
import { today } from "../shared/date";
function check(ok: unknown, message: string, status = 400): asserts ok {
  if (!ok) throw Object.assign(new Error(message), { status });
}
// ตรวจใบสมัครและจองเลขสมาชิก บัญชีใหม่ยังเข้าสู่ระบบไม่ได้จนกว่าอนุมัติ
export function submitRegistration(db: Database, input: any) {
  check(
    input && typeof input === "object" && !Array.isArray(input),
    "ข้อมูลใบสมัครไม่ถูกต้อง",
  );
  const field = (key: string, max = 200) => {
    const v = input[key];
    check(
      typeof v === "string" && v.trim().length > 0 && v.trim().length <= max,
      "กรุณาตรวจข้อมูล " + key,
    );
    return v.trim();
  };
  const name = field("fullName", 120),
    email = field("email", 120).toLowerCase(),
    phone = field("phone", 10),
    citizen = field("idCardNumber", 13),
    birth = field("birthDate", 10);
  check(name.length >= 2, "กรุณากรอกชื่อ–นามสกุล");
  check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), "อีเมลไม่ถูกต้อง");
  check(/^\d{10}$/.test(phone), "เบอร์โทรต้องเป็นตัวเลข 10 หลัก");
  check(/^\d{13}$/.test(citizen), "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก");
  const date = new Date(birth + "T00:00:00Z");
  check(
    /^\d{4}-\d{2}-\d{2}$/.test(birth) &&
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === birth &&
      birth < today(),
    "วันเกิดไม่ถูกต้อง",
  );
  const address = field("address", 250),
    occupation = field("occupation", 120),
    income = Number(input.salary);
  check(
    Number.isFinite(income) && income >= 0 && income <= 100000000,
    "รายได้ไม่ถูกต้อง",
  );
  check(
    typeof input.password === "string" &&
      input.password.length >= 8 &&
      input.password.length <= 200,
    "รหัสผ่านต้องยาว 8–200 ตัว",
  );
  check(input.password === input.confirmPassword, "รหัสผ่านยืนยันไม่ตรงกัน");
  check(
    !db.members.records.some(
      (m) =>
        m.email?.toLowerCase() === email ||
        m.profile?.citizenNumber === citizen,
    ) &&
      !db.members.applications.some(
        (m) =>
          m.status !== "rejected" &&
          (m.email?.toLowerCase() === email ||
            m.profile?.citizenNumber === citizen),
      ) &&
      !db.auth.users.some((u) => u.email?.toLowerCase() === email),
    "อีเมลหรือเลขบัตรประชาชนนี้เคยลงทะเบียนแล้ว",
    409,
  );
  const prefix = String(Number(today().slice(0, 4)) + 543).slice(-2);
  let seq = 1,
    id = "";
  do {
    id = prefix + String(seq++).padStart(6, "0");
    check(seq < 1000000, "ไม่สามารถสร้างเลขสมาชิก");
  } while (
    db.members.records.some((m) => m.id === id) ||
    db.members.applications.some((m) => m.id === id) ||
    db.auth.users.some((u) => u.username === id)
  );
  db.members.applications.push({
    id,
    name,
    email,
    phone,
    status: "pending",
    submitted: new Date().toISOString(),
    profile: {
      citizenNumber: citizen,
      birthDate: birth,
      address,
      occupation,
      income: String(income),
    },
  });
  db.auth.users.push({
    id: randomUUID(),
    username: id,
    member: id,
    email,
    role: "member",
    active: false,
    passwordHash: passwordHash(input.password),
    sessions: [],
    registrationApplication: id,
    registrationStatus: "pending",
  });
  db.auth.auditLogs.push({
    actor: "public-registration",
    role: "applicant",
    module: "applications",
    action: "register",
    id,
    date: new Date().toISOString(),
  });
  return { memberId: id, status: "pending" };
}
