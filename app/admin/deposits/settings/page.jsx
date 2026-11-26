// เส้นทางเดิมส่งต่อไปยังส่วนตั้งค่าภายในหน้าจัดสรรดอกเบี้ย
import { redirect } from "next/navigation";
import { staffPage } from "../../../../lib/auth/staff-page";
function Page() {
  redirect("/admin/deposits/interest#deposit-settings");
}
export default staffPage("deposits", Page);
