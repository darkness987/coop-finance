import { databaseRoute } from "../../../database/remote";
// ระบบ: เส้นทาง api/dashboard | ไฟล์: route.ts
import {
  initialShareStatus,
  requireInitialShare,
} from "../../../lib/shares/initial-share";
import { adminDashboard } from "../../../lib/reports/admin-dashboard";
// สรุปข้อมูลของผู้ใช้ที่ล็อกอิน ไม่รับรหัสสมาชิกจาก URL
import { actor } from "../../../lib/auth/session";
import { readDatabase } from "../../../database/store";
import { dashboard } from "../../../lib/reports/dashboard";
// ฟังก์ชัน GET: รับคำขออ่านข้อมูลจากหน้าเว็บ
async function handleGET() {
  try {
    const user = await actor();
    const period = new Date()
      .toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
      .slice(0, 7);
    const db = readDatabase();
    // แจ้งส่งครั้งแรกแล้วดูภาพรวมได้ แต่การทำธุรกรรมยังต้องรอรับเงินจริง
    if (initialShareStatus(db, user.member).state !== "pending")
      requireInitialShare(db, user);
    return Response.json(
      user.role === "admin"
        ? adminDashboard(db, user)
        : dashboard(db, user.member, period),
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error: any) {
    return Response.json(
      { error: error.message },
      { status: error.status || 500 },
    );
  }
}

export const GET = databaseRoute(handleGET);
