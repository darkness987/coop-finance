// ประเภทฝากประจำเลิกใช้แล้ว: ไม่แสดงหรือรวมวงเงิน แต่ไม่ลบรายการเก่าที่มีเงิน/ประวัติ
import type { Database, Row } from "../../database/store";
export const activeDepositAccount = (account: Row) => account.type !== "fixed";
export function activeDepositTransaction(db: Database, row: Row) {
  return !(db.deposits?.accounts || []).some(
    (a) => a.id === row.account && !activeDepositAccount(a),
  );
}
