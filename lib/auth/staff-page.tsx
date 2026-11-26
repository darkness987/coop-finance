// ระบบ: เข้าสู่ระบบ บัญชีผู้ใช้ สิทธิ์และ OTP | ไฟล์: staff-page.tsx
// ตรวจสิทธิ์ฝั่งเซิร์ฟเวอร์ก่อนเรนเดอร์ทุกหน้าเจ้าหน้าที่
import { actor } from "./session";
import { canAccess, landingPage } from "./permissions";
import { redirect } from "next/navigation";
// ฟังก์ชัน staffPage: ตรวจสิทธิ์ก่อนเปิดหน้าเจ้าหน้าที่
export function staffPage(module: string, Page: any) {
  return async function SecuredPage(props: any) {
    let user;
    try {
      user = await actor();
    } catch {
      redirect("/login");
    }
    if (!canAccess(user, module)) redirect(landingPage(user));
    return <Page {...props} />;
  };
}
