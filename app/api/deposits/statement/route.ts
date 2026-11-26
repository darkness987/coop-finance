import { databaseRoute } from "../../../../database/remote";
// ระบบ: เส้นทาง api/deposits/statement | ไฟล์: route.ts
// ใบแจ้งยอดสมาชิก: ดึงจากบัญชีตนเองเท่านั้น ไม่รับ memberId จาก browser
import { actor } from "../../../../lib/auth/session";
import { readDatabase } from "../../../../database/store";
import { readDeposits } from "../../../../lib/deposits/deposits";
// ฟังก์ชัน GET: รับคำขออ่านข้อมูลจากหน้าเว็บ
async function handleGET(request: Request) {
  try {
    const user = await actor();
    if (user.role !== "member")
      return Response.json(
        { error: "ใช้ใบแจ้งยอดในหน้าสมาชิก" },
        { status: 403 },
      );
    const data = readDeposits(readDatabase(), user);
    const accountId = new URL(request.url).searchParams.get("account");
    if (accountId && !data.accounts.some((a) => a.id === accountId))
      return Response.json({ error: "ไม่พบบัญชี" }, { status: 404 });
    const transactions = accountId
      ? data.transactions.filter((t) => t.account === accountId)
      : data.transactions;
    const cell = (v: unknown) => {
      let s = String(v ?? "");
      if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replaceAll('"', '""') + '"';
    };
    const rows = [
      ["วันที่", "บัญชี", "รายการ", "จำนวนเงิน (บาท)", "สถานะ"],
      ...transactions.map((t) => [
        t.created.slice(0, 10),
        t.account,
        t.type,
        t.amountCents / 100,
        t.status,
      ]),
    ];
    return new Response(
      "\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n"),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="deposit-statement.csv"',
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: e.status || 400 });
  }
}

export const GET = databaseRoute(handleGET);
