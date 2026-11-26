// ระบบ: เส้นทาง settings | ไฟล์: page.jsx
import { canAccess } from "../../lib/auth/permissions";
// ตั้งค่ากลาง: ข้อมูลสมาชิกและรหัสผ่านอยู่ในเมนูเดียวกัน
import { actor } from "../../lib/auth/session";
import { redirect } from "next/navigation";
import Settings from "../../components/settings/Settings";
// ฟังก์ชัน Route: เลือกหน้าและตรวจสิทธิ์ตามเส้นทาง
export default async function Route({ searchParams }) {
  let user;
  try {
    user = await actor();
  } catch {
    redirect("/login");
  }
  const query = await searchParams;
  const manageUsers = canAccess(user, "users");
  if (query.tab === "users" && !manageUsers) redirect("/settings?tab=password");
  const tab =
    query.tab === "users"
      ? "users"
      : query.tab === "password"
        ? "password"
        : user.role === "admin"
          ? manageUsers
            ? "users"
            : "password"
          : "profile";
  return (
    <Settings
      admin={user.role === "admin"}
      manageUsers={manageUsers}
      tab={tab}
    />
  );
}
