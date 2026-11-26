// ระบบ: เส้นทาง returns/shares | ไฟล์: page.jsx
import { actor } from "../../../lib/auth/session";
import { loadDatabase } from "../../../database/remote";
import { initialShareStatus } from "../../../lib/shares/initial-share";
import { redirect } from "next/navigation";
import MemberBenefits from "../../../components/returns/MemberBenefits";
// ฟังก์ชัน Page: ทำงานส่วน Page ของระบบนี้
export default async function Page() {
  let user;
  try {
    user = await actor();
  } catch {
    redirect("/login");
  }
  if (user.role === "admin") redirect("/admin/returns");
  if (initialShareStatus(await loadDatabase(), user.member).required)
    redirect("/home");
  return <MemberBenefits kind="shares" />;
}
