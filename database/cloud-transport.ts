// เก็บไฟล์ข้อมูลกลางใน Vercel Blob แบบ private: อ่านล่าสุดและใช้ ETag กันเขียนทับกัน
import { get, put, BlobPreconditionFailedError } from "@vercel/blob";
export interface DatabaseTransport {
  load(): Promise<{ text: string; etag: string }>;
  save(text: string, etag: string): Promise<void>;
}
export const cloudDatabasePath = () =>
  process.env.COOP_DATABASE_BLOB_PATH || "coop-finance/data.ts";
export const blobTransport: DatabaseTransport = {
  async load() {
    const result = await get(cloudDatabasePath(), {
      access: "private",
      useCache: false,
      // Compression turns the ETag into a weak validator, which conditional writes reject.
      headers: { "accept-encoding": "identity" },
    });
    if (!result || !result.stream)
      throw Object.assign(
        Error("ยังไม่พบฐานข้อมูลออนไลน์ กรุณาติดต่อผู้ดูแล"),
        { status: 503 },
      );
    return {
      text: await new Response(result.stream).text(),
      etag: result.blob.etag,
    };
  },
  async save(text, etag) {
    try {
      await put(cloudDatabasePath(), text, {
        access: "private",
        contentType: "text/plain; charset=utf-8",
        addRandomSuffix: false,
        allowOverwrite: true,
        ifMatch: etag,
      });
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError)
        throw Object.assign(
          Error("มีการบันทึกข้อมูลพร้อมกัน กรุณารีเฟรชแล้วลองอีกครั้ง"),
          { status: 409 },
        );
      throw error;
    }
  },
};
