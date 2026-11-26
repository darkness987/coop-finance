// ระบบ: เส้นทาง documents | ไฟล์: page.jsx
import { initialShareStatus } from "../../lib/shares/initial-share";
import { loadDatabase } from "../../database/remote";
// หน้าเส้นทาง: ตรวจบทบาทก่อนเลือกหน้าสมาชิกหรือเจ้าหน้าที่
import { actor } from "../../lib/auth/session";
import { redirect } from "next/navigation";
import Page from "../../components/documents/MemberDocuments";
// ฟังก์ชัน Route: เลือกหน้าและตรวจสิทธิ์ตามเส้นทาง
export default async function Route() {
  let user;
  try {
    user = await actor();
  } catch {
    redirect("/login");
  }
  if (user.role === "admin") redirect("/admin/applications");
  if (initialShareStatus(await loadDatabase(), user.member).required)
    redirect("/home");
  return <Page />;
}
