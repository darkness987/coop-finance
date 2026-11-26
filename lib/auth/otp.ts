// ระบบ: เข้าสู่ระบบ บัญชีผู้ใช้ สิทธิ์และ OTP | ไฟล์: otp.ts
// OTP กลาง: เก็บเฉพาะ hash ผูกกับรายละเอียดรายการ ใช้ได้ครั้งเดียว อายุ 5 นาที
import {
  createHash,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import type { Row } from "../../database/store";
type OtpBinding = { user: string; [key: string]: unknown };
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
// ฟังก์ชัน issueOtp: สร้างรหัสยืนยันที่ผูกกับรายการในส่วน issueOtp
export function issueOtp(
  challenges: Row[],
  binding: OtpBinding,
  now = Date.now(),
) {
  const previous = challenges.filter((row) => row.user === binding.user).at(-1);
  if (previous && now < previous.resendAt)
    throw Error("กรุณารอ 30 วินาทีก่อนขอรหัสใหม่");
  // ล้างรหัสเก่าและยกเลิกรหัสก่อนหน้าของผู้ใช้เมื่อขอรหัสใหม่
  challenges.splice(
    0,
    challenges.length,
    ...challenges.filter(
      (row) => row.expiresAt > now && row.user !== binding.user,
    ),
  );
  const id = randomUUID(),
    code = String(randomInt(0, 1000000)).padStart(6, "0");
  const challenge = {
    id,
    user: binding.user,
    bindingHash: hash(JSON.stringify(binding)),
    codeHash: hash(id + ":" + code),
    attempts: 0,
    used: false,
    expiresAt: now + 300000,
    resendAt: now + 30000,
  };
  challenges.push(challenge);
  return {
    challengeId: id,
    expiresAt: challenge.expiresAt,
    resendAt: challenge.resendAt,
    delivery: "demo",
    demoCode: code,
  };
}
// คืนข้อความแทน throw เพื่อให้จำนวนครั้งที่กรอกผิดถูกบันทึกแม้ยืนยันไม่ผ่าน
// ฟังก์ชัน verifyOtp: ตรวจรหัสหรือหลักฐานยืนยันในส่วน verifyOtp
export function verifyOtp(
  challenges: Row[],
  binding: OtpBinding,
  challengeId: unknown,
  code: unknown,
  now = Date.now(),
) {
  const challenge = challenges.find(
    (row) => row.id === challengeId && row.user === binding.user,
  );
  if (!challenge) return "กรุณาขอรหัส OTP สำหรับรายการนี้";
  if (challenge.used) return "รหัส OTP นี้ใช้แล้ว กรุณาตรวจประวัติรายการ";
  if (now >= challenge.expiresAt) return "รหัส OTP หมดอายุ กรุณาขอรหัสใหม่";
  if (challenge.attempts >= 5) return "กรอกรหัสผิดครบ 5 ครั้ง กรุณาขอรหัสใหม่";
  if (challenge.bindingHash !== hash(JSON.stringify(binding)))
    return "รายละเอียดรายการเปลี่ยนแล้ว กรุณาขอรหัสใหม่";
  challenge.attempts += 1;
  if (
    typeof code !== "string" ||
    !/^\d{6}$/.test(code) ||
    !timingSafeEqual(
      Buffer.from(challenge.codeHash, "hex"),
      Buffer.from(hash(challenge.id + ":" + code), "hex"),
    )
  )
    return "รหัส OTP ไม่ถูกต้อง";
  challenge.used = true;
  return null;
}
