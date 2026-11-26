// ย้ายบัญชีตำแหน่งเดิมไปเจ้าหน้าที่สมาชิก ยกเลิก session เก่าเพื่อให้เข้าสู่ระบบด้วยสิทธิ์ใหม่
import { updateDatabase } from "../database/store";
const count = updateDatabase((db) => {
  let count = 0;
  for (const user of db.auth.users) {
    if (user.role !== "approver") continue;
    user.role = "member_officer";
    user.sessions = [];
    count++;
  }
  return count;
});
console.log(`ย้ายบัญชีเป็นเจ้าหน้าที่สมาชิก ${count} บัญชี`);
