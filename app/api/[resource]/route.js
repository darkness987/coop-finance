import { databaseRoute } from "../../../database/remote";
// ระบบ: เส้นทาง api/[resource] | ไฟล์: route.js
import { requireAccess } from "../../../lib/auth/permissions";
import { actor } from "../../../lib/auth/session";
import { requestActor } from "../../../lib/shared/context";
// API | รับคำขอจากหน้าเว็บ ส่งต่อให้ระบบแต่ละหมวด และตอบกลับหรือส่งไฟล์ดาวน์โหลด

import { readResource, writeResource } from "../../../lib/api/service";
import { RequestError } from "../../../lib/shared/validation";

export const runtime = "nodejs";

// ฟังก์ชัน failure: ทำงานส่วน failure ของระบบนี้
function failure(error) {
  if (error.status === 401 || error.status === 403)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof RequestError)
    return Response.json({ error: error.message }, { status: error.status });
  console.error(error);
  return Response.json(
    { error: "เกิดข้อผิดพลาดในการบันทึกหรืออ่านข้อมูล" },
    { status: 500 },
  );
}

// ฟังก์ชัน download: ทำงานส่วน download ของระบบนี้
function download(content, filename) {
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="' + filename + '.txt"',
      "Cache-Control": "no-store",
    },
  });
}

// อ่านข้อมูล และดาวน์โหลดใบเสร็จหรือใบแจ้งผลตอบแทนตามพารามิเตอร์
// ฟังก์ชัน GET: รับคำขออ่านข้อมูลจากหน้าเว็บ
async function handleGET(request, { params }) {
  try {
    const { resource } = await params;
    const query = new URL(request.url).searchParams;
    const user = await actor();
    requireAccess(user, resource);
    const isAdmin = query.get("view") === "admin" && user.role === "admin";
    const data = requestActor.run(user, () => readResource(resource, isAdmin));
    if (resource === "shares" && query.has("receipt")) {
      const row = data.payments.find(
        (item) => String(item.id) === query.get("receipt") && item.received,
      );
      if (!row)
        throw new RequestError("ออกใบเสร็จได้เมื่อยืนยันรับเงินแล้ว", 404);
      const content = [
        "Coop Finance · ใบเสร็จค่าหุ้น (ทดลอง)",
        "เลขที่ SH-" + row.id,
        "รหัสสมาชิก " + row.member,
        "งวด " + row.period,
        "ยอด " + row.amount + " บาท",
        "จำนวน " + row.amount / row.price + " หุ้น",
        "วันที่รับเงิน " + row.received,
        "อ้างอิง " + row.reference,
      ].join("\n");
      return download(content, "receipt-" + row.id);
    }
    if (resource === "returns" && query.has("statement")) {
      const memberRows = requestActor.run(user, () =>
        readResource(resource, false),
      );
      const row = memberRows.find(
        (item) => String(item.year) === query.get("statement"),
      );
      if (!row)
        throw new RequestError("ไม่พบเอกสารผลตอบแทนที่อนุมัติแล้ว", 404);
      const content = [
        "Coop Finance · ใบแจ้งผลตอบแทน (ทดลอง)",
        "ปี พ.ศ. " + (row.year + 543),
        "รหัสสมาชิก " + row.member,
        "เงินปันผล " + (row.cents / 100).toFixed(2) + " บาท",
        "เงินเฉลี่ยคืน " + (row.rebateCents / 100).toFixed(2) + " บาท",
      ].join("\n");
      return download(content, "statement-" + row.year);
    }
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}

// รับคำสั่งจากฟอร์มและส่งไปยังฟังก์ชันของหมวดนั้น
// ฟังก์ชัน POST: รับคำขอบันทึกหรือทำรายการ
async function handlePOST(request, { params }) {
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      throw new RequestError("รองรับข้อมูล JSON เท่านั้น", 415);
    }
    const { resource } = await params;
    let input;
    try {
      input = await request.json();
    } catch {
      throw new RequestError("JSON ไม่ถูกต้อง");
    }
    const user = await actor();
    if (
      request.headers.get("origin") &&
      new URL(request.headers.get("origin")).host !==
        request.headers.get("host")
    )
      throw new RequestError("Origin ไม่ถูกต้อง", 403);
    requireAccess(user, resource, input.action);
    requestActor.run(user, () =>
      writeResource(
        resource,
        new URL(request.url).searchParams.get("view") === "admin" &&
          user.role === "admin",
        input,
      ),
    );
    return Response.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}

export const GET = databaseRoute(handleGET);

export const POST = databaseRoute(handlePOST);
