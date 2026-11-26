// ระบบ: เส้นทาง home | ไฟล์: page.jsx
import { landingPage } from "../../lib/auth/permissions";
// หน้าเส้นทาง: ตรวจบทบาทก่อนเลือกหน้าสมาชิกหรือเจ้าหน้าที่
import { actor } from "../../lib/auth/session";
import { redirect } from "next/navigation";
import Page from "../../components/home/Home";
// ฟังก์ชัน Route: เลือกหน้าและตรวจสิทธิ์ตามเส้นทาง
export default async function Route() {
  let user;
  try {
    user = await actor();
  } catch {
    redirect("/login");
  }
  if (user.role === "admin") redirect(landingPage(user));
  return <Page />;
}
