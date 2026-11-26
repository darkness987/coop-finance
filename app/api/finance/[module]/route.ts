import { databaseRoute } from "../../../../database/remote";
import {
  readReturnRates,
  changeReturnRates,
} from "../../../../lib/returns/return-rates";
import {
  readMemberServices,
  changeMemberServices,
} from "../../../../lib/members/member-services";
// ระบบ: เส้นทาง api/finance/[module] | ไฟล์: route.ts
import { requireAccess, roleOf } from "../../../../lib/auth/permissions";
import { readBenefits, changeBenefits } from "../../../../lib/returns/benefits";
import { readTransactions } from "../../../../lib/reports/transactions";
import { readUsers, changeUsers } from "../../../../lib/auth/users";
// API กลางเรียก service แยกหมวด ทั้งหมดใช้ transaction ของ database/store.ts
import { actor } from "../../../../lib/auth/session";
import { readDatabase, updateDatabase } from "../../../../database/store";
import {
  readDeposits,
  changeDeposits,
} from "../../../../lib/deposits/deposits";
import { readLoans, changeLoans } from "../../../../lib/loans/loans";
export const runtime = "nodejs";
// ฟังก์ชัน GET: รับคำขออ่านข้อมูลจากหน้าเว็บ
async function handleGET(req: Request, { params }: any) {
  try {
    const a = await actor(),
      { module } = await params,
      db = readDatabase();
    if (
      ![
        "deposits",
        "loans",
        "users",
        "benefits",
        "transactions",
        "member-services",
        "return-rates",
      ].includes(module)
    )
      return Response.json({ error: "ไม่พบหมวด" }, { status: 404 });
    requireAccess(a, module);
    return Response.json(
      module === "return-rates"
        ? readReturnRates(db, a)
        : module === "member-services"
          ? readMemberServices(db, a)
          : module === "transactions"
            ? readTransactions(db, a)
            : module === "benefits"
              ? readBenefits(db, a)
              : module === "users"
                ? readUsers(db, a)
                : module === "deposits"
                  ? readDeposits(db, a)
                  : readLoans(db, a),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: e.status || 400 });
  }
}
// ฟังก์ชัน POST: รับคำขอบันทึกหรือทำรายการ
async function handlePOST(req: Request, { params }: any) {
  try {
    const a = await actor(),
      { module } = await params;
    if (
      req.headers.get("origin") &&
      new URL(req.headers.get("origin")!).host !== req.headers.get("host")
    )
      throw new Error("Origin ไม่ถูกต้อง");
    if (
      ![
        "deposits",
        "loans",
        "users",
        "benefits",
        "member-services",
        "return-rates",
      ].includes(module)
    )
      throw new Error("ไม่พบหมวด");
    const i = await req.json();
    if (!i || typeof i !== "object" || Array.isArray(i))
      throw new Error("ข้อมูลไม่ถูกต้อง");
    requireAccess(a, module, i.action);
    // คำนวณเป็น read-only ไม่เขียนไฟล์หรือสร้าง audit รายการธุรกรรม
    if (
      module === "loans" &&
      ["estimate", "lookup-guarantor"].includes(i.action)
    ) {
      return Response.json({
        ok: true,
        result: changeLoans(readDatabase(), a, i),
      });
    }
    const result = updateDatabase((db) => {
      const result =
        module === "return-rates"
          ? changeReturnRates(db, a, i)
          : module === "member-services"
            ? changeMemberServices(db, a, i)
            : module === "benefits"
              ? changeBenefits(db, a, i)
              : module === "users"
                ? changeUsers(db, a, i)
                : module === "deposits"
                  ? changeDeposits(db, a, i)
                  : changeLoans(db, a, i);
      if (i.action === "estimate") return result;
      db.auth.auditLogs.push({
        actor: a.id,
        role: roleOf(a),
        module,
        action: i.action,
        id: i.id || null,
        date: new Date().toISOString(),
      });
      return result;
    });
    // กรอก OTP ผิดต้องบันทึกจำนวนครั้งก่อนตอบ error จึงตรวจหลังจบ transaction
    if (
      ["deposits", "loans"].includes(module) &&
      result &&
      typeof result === "object" &&
      "error" in result
    )
      return Response.json({ error: result.error }, { status: 400 });
    return Response.json({ ok: true, result });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: e.status || 400 });
  }
}

export const GET = databaseRoute(handleGET);

export const POST = databaseRoute(handlePOST);
