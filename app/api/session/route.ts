import { databaseRoute } from "../../../database/remote";
// ระบบ: เส้นทาง api/session | ไฟล์: route.ts
import { actor, login, logout } from "../../../lib/auth/session";
export const runtime = "nodejs";
// ฟังก์ชัน GET: รับคำขออ่านข้อมูลจากหน้าเว็บ
async function handleGET() {
  try {
    return Response.json(await actor());
  } catch {
    return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }
}
// ฟังก์ชัน POST: รับคำขอบันทึกหรือทำรายการ
async function handlePOST(req: Request) {
  try {
    if (
      req.headers.get("origin") &&
      new URL(req.headers.get("origin")!).host !== req.headers.get("host")
    )
      throw new Error("Origin ไม่ถูกต้อง");
    const i = await req.json();
    if (i.action === "logout") {
      await logout();
      return Response.json({ ok: true });
    }
    if (
      typeof i.username !== "string" ||
      typeof i.password !== "string" ||
      i.password.length > 200
    )
      throw new Error("ข้อมูลไม่ถูกต้อง");
    return Response.json(
      await login(i.username, i.password, i.remember !== false),
    );
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

export const GET = databaseRoute(handleGET);

export const POST = databaseRoute(handlePOST);
