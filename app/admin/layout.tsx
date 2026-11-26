// ระบบ: เส้นทาง admin | ไฟล์: layout.tsx
import { actor } from "../../lib/auth/session";
import { redirect } from "next/navigation";
// ฟังก์ชัน Layout: ประกอบโครงหน้าที่ใช้ร่วมกัน
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await actor();
  } catch {
    redirect("/login");
  }
  if (user.role !== "admin") redirect("/home");
  return children;
}
