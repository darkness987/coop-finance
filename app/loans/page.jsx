// ระบบ: เส้นทาง loans | ไฟล์: page.jsx
import { initialShareStatus } from "../../lib/shares/initial-share";
import { loadDatabase } from "../../database/remote";
// หน้าเส้นทาง: ตรวจบทบาทก่อนเลือกหน้าสมาชิกหรือเจ้าหน้าที่
import { actor } from "../../lib/auth/session";
import { redirect } from "next/navigation";
import Page from "../../components/loans/LoanPage";
// ฟังก์ชัน Route: เลือกหน้าและตรวจสิทธิ์ตามเส้นทาง
export default async function Route({ searchParams }) {
  let user;
  try {
    user = await actor();
  } catch {
    redirect("/login");
  }
  const query = await searchParams;
  const contractId = typeof query.contract === "string" ? query.contract : "";
  if (user.role === "admin")
    redirect(
      contractId
        ? `/admin/loans?contract=${encodeURIComponent(contractId)}`
        : "/admin/loans",
    );
  if (initialShareStatus(await loadDatabase(), user.member).required)
    redirect("/home");
  return <Page key={contractId} initialContract={contractId} />;
}
