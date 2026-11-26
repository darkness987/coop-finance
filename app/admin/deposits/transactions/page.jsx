// ระบบ: เส้นทาง admin/deposits/transactions | ไฟล์: page.jsx
import { staffPage } from "../../../../lib/auth/staff-page";
import Page from "../../../../components/deposits/AdminDeposits";
// ฟังก์ชัน Route: เลือกหน้าและตรวจสิทธิ์ตามเส้นทาง
function Route() {
  return <Page section="transactions" />;
}

export default staffPage("deposits", Route);
