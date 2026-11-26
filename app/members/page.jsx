// ระบบ: เส้นทาง members | ไฟล์: page.jsx
// หน้าเส้นทาง: ตรวจบทบาทก่อนเลือกหน้าสมาชิกหรือเจ้าหน้าที่
import { actor } from "../../lib/auth/session";
import { redirect } from "next/navigation";
// ฟังก์ชัน Route: เลือกหน้าและตรวจสิทธิ์ตามเส้นทาง
export default async function Route() {
  let user;
  try {
    user = await actor();
  } catch {
    redirect("/login");
  }
  if (user.role === "admin") redirect("/admin/members");
  redirect("/settings?tab=profile");
}
