// ระบบ: เส้นทาง admin | ไฟล์: page.jsx
import { actor } from "../../lib/auth/session";
import { landingPage } from "../../lib/auth/permissions";
import { redirect } from "next/navigation";
// ฟังก์ชัน AdminIndex: ทำงานส่วน AdminIndex ของระบบนี้
export default async function AdminIndex() {
  redirect(landingPage(await actor()));
}
