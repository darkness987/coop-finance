// ระบบ: ประสานคำขอกับแต่ละระบบ | ไฟล์: service.js
// ชั้นประสานงาน | เลือกฟังก์ชันตามหมวดและบันทึกเมื่อคำสั่งสำเร็จ

import { withDatabase } from "../data/database";
import {
  changeMembers,
  readApplications,
  readMembers,
} from "../members/members";
import { changeShares, readShares } from "../shares/shares";
import { changeReturns, readReturns } from "../returns/returns";
import { check, RequestError } from "../shared/validation";

const resources = new Map([
  [
    "directory",
    {
      read: (data) =>
        data.members.map(({ id, name, active }) => ({ id, name, active })),
      write: () => {
        throw new RequestError("ไม่มีสิทธิ์แก้ข้อมูลผ่านรายชื่อสมาชิก", 403);
      },
    },
  ],
  [
    "members",
    {
      read: readMembers,
      write: (data, admin, input) =>
        changeMembers(data, "members", admin, input),
    },
  ],
  [
    "applications",
    {
      read: readApplications,
      write: (data, admin, input) =>
        changeMembers(data, "applications", admin, input),
    },
  ],
  ["shares", { read: readShares, write: changeShares }],
  [
    "returns",
    {
      read: readReturns,
      write: (data, admin, input) => {
        check(admin, "ไม่มีสิทธิ์ทำรายการนี้", 403);
        return changeReturns(data, input);
      },
    },
  ],
]);

// ฟังก์ชัน readResource: อ่านข้อมูลในส่วน readResource
export function readResource(resource, admin) {
  const handler = resources.get(resource);
  check(handler, "ไม่พบข้อมูล", 404);
  return withDatabase((data) => handler.read(data, admin));
}

// ฟังก์ชัน writeResource: ทำงานส่วน writeResource ของระบบนี้
export function writeResource(resource, admin, input) {
  check(
    input && typeof input === "object" && !Array.isArray(input),
    "ข้อมูลไม่ถูกต้อง",
  );
  return withDatabase(
    (data) => {
      const handler = resources.get(resource);
      if (!handler) throw new RequestError("ไม่มีสิทธิ์ทำรายการนี้", 403);
      return handler.write(data, admin, input);
    },
    true,
    { module: resource, action: input.action, id: input.id || null },
  );
}
