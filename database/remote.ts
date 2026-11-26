// ครอบคำขอ API ด้วย transaction ออนไลน์ ส่วน service เดิมยังอ่าน/ตรวจ/คำนวณแบบเดิม
import { databaseRequest, usesCloudDatabase } from "./request-context";
import { blobTransport, type DatabaseTransport } from "./cloud-transport";
import { decode, encode, readDatabase } from "./store";
export async function runDatabaseRequest<T>(
  work: () => T | Promise<T>,
  transport: DatabaseTransport,
): Promise<T> {
  const current = await transport.load();
  const state = {
    data: decode(current.text),
    etag: current.etag,
    dirty: false,
  };
  return databaseRequest.run(state, async () => {
    const result = await work();
    if (state.dirty) await transport.save(encode(state.data), state.etag);
    return result;
  });
}
export async function withDatabase<T>(work: () => T | Promise<T>): Promise<T> {
  if (databaseRequest.getStore() || !usesCloudDatabase()) return await work();
  return runDatabaseRequest(work, blobTransport);
}
// ใช้กับ server component ที่ต้องอ่านข้อมูลก่อนแสดงหน้า
export async function loadDatabase() {
  return withDatabase(() => readDatabase());
}
// ต้องบันทึกสำเร็จก่อนส่ง response กลับ รวมถึง OTP ที่คืน error เพื่อบันทึกจำนวนครั้งที่กรอกผิด
export function databaseRoute(handler: (...args: any[]) => Promise<Response>) {
  return async (...args: any[]) => {
    try {
      return await withDatabase(() => handler(...args));
    } catch (error: any) {
      console.error("Database request failed:", error?.name || "DatabaseError");
      return Response.json(
        {
          error:
            error?.status === 409
              ? error.message
              : "เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง",
        },
        {
          status: error?.status === 409 ? 409 : 503,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }
  };
}
