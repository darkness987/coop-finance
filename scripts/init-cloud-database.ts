// อัปโหลดข้อมูลตั้งต้นครั้งเดียวเท่านั้น ไม่เขียนทับฐานข้อมูลออนไลน์ที่มีอยู่
// ใช้ environment ของโปรเจกต์ Vercel; ห้ามนำ token มาใส่ในไฟล์นี้
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { get, put } from "@vercel/blob";
import { decode } from "../database/store";
import { cloudDatabasePath } from "../database/cloud-transport";
async function main() {
  const pathname = cloudDatabasePath();
  const existing = await get(pathname, { access: "private", useCache: false });
  if (existing) {
    console.log("ฐานข้อมูลออนไลน์มีอยู่แล้ว เก็บข้อมูลเดิมไว้");
    return;
  }
  const text = readFileSync(join(process.cwd(), "database", "data.ts"), "utf8");
  const data = decode(text);
  // ไม่ย้าย session/OTP จากเครื่องไปให้ผู้ใช้ออนไลน์
  for (const user of data.auth.users) user.sessions = [];
  data.loans.submissionOtps = [];
  data.loans.repaymentOtps = [];
  data.deposits.withdrawalOtps = [];
  const seed =
    "export const database = " + JSON.stringify(data, null, 2) + ";\n";
  await put(pathname, seed, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType: "text/plain; charset=utf-8",
  });
  console.log("สร้างฐานข้อมูลถาวรแบบ private สำเร็จ");
}
main().catch((error) => {
  console.error("เริ่มต้นฐานข้อมูลออนไลน์ไม่สำเร็จ:", error.name);
  process.exitCode = 1;
});
