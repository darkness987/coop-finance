// ระบบ: ฐานข้อมูลกลางและข้อมูลตัวอย่าง | ไฟล์: shares.ts
import { requestActor } from "../lib/shared/context";
import { roleOf } from "../lib/auth/permissions";
// แปลงชื่อหมวดส่วนกลางให้ระบบหุ้นเดิมใช้ได้ โดยไม่ทำสำเนาฐานข้อมูลอีกชุด
import { readDatabase, updateDatabase, type Database } from "./store";
import type { CoopData } from "../lib/shared/data-types";
// ฟังก์ชัน view: ทำงานส่วน view ของระบบนี้
function view(db: Database): CoopData {
  return {
    members: db.members.records,
    profile_change_requests: db.members.profileChanges || [],
    member_applications: db.members.applications,
    rules: db.shares.rules,
    share_accounts: db.shares.accounts,
    share_payments: db.shares.payments,
    share_change_requests: db.shares.changeRequests,
    allocations: db.returns.allocations,
    member_dividends: db.returns.dividends,
    member_rebates: db.returns.rebates,
  } as CoopData;
}
// ฟังก์ชัน withShares: ทำงานส่วน withShares ของระบบนี้
export function withShares<T>(
  work: (data: CoopData) => T,
  write = false,
  audit?: { module: string; action: string; id?: unknown },
): T {
  if (!write) return work(view(readDatabase()));
  return updateDatabase((db) => {
    const data = view(db),
      result = work(data);
    // บางคำสั่งใช้ filter แล้วแทน array ต้องส่งค่ากลับทุกหมวดที่เกี่ยวข้อง
    db.members = {
      ...db.members,
      records: data.members,
      profileChanges: data.profile_change_requests || [],
      applications: data.member_applications,
    };
    // เปิดบัญชีผู้สมัครเพียงครั้งเดียวหลังอนุมัติ ไม่เปิดบัญชีที่ถูกปิดภายหลังซ้ำ
    for (const user of db.auth.users) {
      if (user.registrationStatus !== "pending") continue;
      const application = db.members.applications.find(
        (r) => r.id === user.registrationApplication,
      );
      if (application?.status === "approved") {
        user.active = true;
        user.registrationStatus = "approved";
      } else if (application?.status === "rejected") {
        user.active = false;
        user.registrationStatus = "rejected";
      }
    }
    db.shares = {
      rules: data.rules,
      accounts: data.share_accounts,
      payments: data.share_payments,
      changeRequests: data.share_change_requests,
    };
    db.returns = {
      ...db.returns,
      allocations: data.allocations,
      dividends: data.member_dividends,
      rebates: data.member_rebates,
    };
    if (audit) {
      const actor = requestActor.getStore();
      if (actor)
        db.auth.auditLogs.push({
          actor: actor.id,
          role: roleOf(actor),
          ...audit,
          date: new Date().toISOString(),
        });
    }
    return result;
  });
}
