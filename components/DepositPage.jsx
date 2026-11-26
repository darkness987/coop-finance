// ระบบ: หน้าจอระบบ | ไฟล์: DepositPage.jsx
import AdminDeposits from "./deposits/AdminDeposits";
import MemberDeposits from "./deposits/MemberDeposits";
// ฟังก์ชัน DepositPage: ทำงานส่วน DepositPage ของระบบนี้
export default function DepositPage({ admin = false }) {
  return admin ? <AdminDeposits /> : <MemberDeposits />;
}
