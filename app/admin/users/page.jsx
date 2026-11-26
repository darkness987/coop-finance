// ระบบ: เส้นทาง admin/users | ไฟล์: page.jsx
import { staffPage } from "../../../lib/auth/staff-page";
import { redirect } from "next/navigation";
// ลิงก์เก่าเปิดแท็บบัญชีผู้ใช้ในหน้าตั้งค่า โดยคงสิทธิ์เฉพาะ Admin
// ฟังก์ชัน LegacyUsersPage: ทำงานส่วน LegacyUsersPage ของระบบนี้
function LegacyUsersPage() {
  redirect("/settings?tab=users");
}
export default staffPage("users", LegacyUsersPage);
