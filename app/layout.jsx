// ระบบ: เส้นทาง app | ไฟล์: layout.jsx
import "./shares.css";
import "./styles.css";
import { DemoProvider } from "../components/shared/demo";
import { Navigation } from "../components/layout/Navigation";
export const metadata = { title: "Coop Finance | ระบบสหกรณ์" };
// ฟังก์ชัน Layout: ประกอบโครงหน้าที่ใช้ร่วมกัน
export default function Layout({ children }) {
  return (
    <html lang="th">
      <body>
        <DemoProvider>
          <Navigation>{children}</Navigation>
        </DemoProvider>
      </body>
    </html>
  );
}
