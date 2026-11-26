// ระบบ: เส้นทาง admin/loans | ไฟล์: page.jsx
import { staffPage } from "../../../lib/auth/staff-page";
import Page from "../../../components/loans/LoanPage";
// ฟังก์ชัน Route: เลือกหน้าและตรวจสิทธิ์ตามเส้นทาง
async function Route({ searchParams }) {
  const query = await searchParams;
  const contractId = typeof query.contract === "string" ? query.contract : "";
  return <Page key={contractId} admin initialContract={contractId} />;
}

export default staffPage("loans", Route);
