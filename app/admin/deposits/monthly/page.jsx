// หน้าแอดมินเงินฝาก: monthly
import { staffPage } from "../../../../lib/auth/staff-page";
import AdminDeposits from "../../../../components/deposits/AdminDeposits";
function Page() {
  return <AdminDeposits section="monthly" />;
}
export default staffPage("deposits", Page);
