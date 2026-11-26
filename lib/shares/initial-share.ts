// ระบบ: หุ้นสมาชิก การส่งหุ้น และยอดสะสม | ไฟล์: initial-share.ts
// สถานะส่งหุ้นครั้งแรกอิงข้อมูลเงินจริงในฐานข้อมูลกลาง ไม่เก็บสิทธิ์ใน localStorage
import type { Database, Row } from "../../database/store";
import type { Actor } from "../auth/session";
// ฟังก์ชัน initialShareFromRows: ทำงานส่วน initialShareFromRows ของระบบนี้
export function initialShareFromRows(
  accounts: Row[],
  payments: Row[],
  member: string,
) {
  const account = accounts.find((row) => row.member === member);
  // ยอดยกมาคือหุ้นของสมาชิกเดิม จึงไม่บังคับให้จ่ายใหม่
  const paid =
    !account?.initial_payment_required &&
    (Boolean(
      account && (account.opening_amount > 0 || account.opening_units > 0),
    ) ||
      payments.some(
        (row) => row.member === member && row.received && row.amount > 0,
      ));
  const pending = paid
    ? null
    : payments.find(
        (row) =>
          row.member === member &&
          !row.received &&
          (!account?.initial_payment_required || row.initial === true),
      ) || null;
  return {
    required: !paid,
    state: paid ? "active" : pending ? "pending" : "unpaid",
    pending,
  };
}
// ฟังก์ชัน initialShareStatus: ทำงานส่วน initialShareStatus ของระบบนี้
export function initialShareStatus(db: Database, member: string) {
  return initialShareFromRows(db.shares.accounts, db.shares.payments, member);
}
// ฟังก์ชัน requireInitialShare: ตรวจเงื่อนไขหรือสิทธิ์ก่อนทำงานในส่วน requireInitialShare
export function requireInitialShare(db: Database, actor: Actor) {
  if (actor.role !== "admin" && initialShareStatus(db, actor.member).required)
    throw Object.assign(
      new Error(
        "กรุณาส่งหุ้นครั้งแรกและรอเจ้าหน้าที่ยืนยันรับเงินก่อนใช้บริการนี้",
      ),
      { status: 403 },
    );
}
