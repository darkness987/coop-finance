import { databaseRoute } from "../../../database/remote";
// API สมัครสมาชิกก่อนเข้าสู่ระบบ: ไม่รับบทบาทหรือสถานะจากผู้สมัคร
import { updateDatabase } from "../../../database/store";
import { submitRegistration } from "../../../lib/members/registration";
export const runtime = "nodejs";
async function handlePOST(req: Request) {
  try {
    if (
      req.headers.get("origin") &&
      new URL(req.headers.get("origin")!).host !== req.headers.get("host")
    )
      throw Object.assign(new Error("Origin ไม่ถูกต้อง"), { status: 403 });
    if (!req.headers.get("content-type")?.startsWith("application/json"))
      throw Object.assign(new Error("รองรับ JSON เท่านั้น"), { status: 415 });
    const body = await req.text();
    if (body.length > 16000)
      throw Object.assign(new Error("ข้อมูลยาวเกินไป"), { status: 413 });
    let input;
    try {
      input = JSON.parse(body);
    } catch {
      throw new Error("JSON ไม่ถูกต้อง");
    }
    return Response.json(
      updateDatabase((db) => submitRegistration(db, input)),
      { status: 201 },
    );
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: e.status || 400 });
  }
}

export const POST = databaseRoute(handlePOST);
