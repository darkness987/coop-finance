// ระบบ: เส้นทาง shares/first | ไฟล์: page.jsx
import { actor } from "../../../lib/auth/session";
import { redirect } from "next/navigation";
import InitialShareOnboarding from "../../../components/shares/InitialShareOnboarding";
// ฟังก์ชัน Route: เลือกหน้าและตรวจสิทธิ์ตามเส้นทาง
export default async function Route() {
  let user;
  try {
    user = await actor();
  } catch {
    redirect("/login");
  }
  if (user.role === "admin") redirect("/admin/shares");
  return <InitialShareOnboarding demo />;
}
