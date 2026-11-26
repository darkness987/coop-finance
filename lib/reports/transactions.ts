import { activeDepositTransaction } from "../deposits/deposit-scope";
// ระบบ: ภาพรวมและประวัติธุรกรรม | ไฟล์: transactions.ts
// ประวัติกลางอ่านเฉพาะสมาชิกเจ้าของรายการ รวมทุกหมวด โดยไม่เปิด audit log หรือข้อมูลบัญชีเต็ม
import type { Database, Row } from "../../database/store";
import type { Actor } from "../auth/session";
import { requireInitialShare } from "../shares/initial-share";
// ฟังก์ชัน readTransactions: อ่านข้อมูลในส่วน readTransactions
export function readTransactions(db: Database, a: Actor) {
  requireInitialShare(db, a);
  if (a.role !== "member") throw Error("เฉพาะสมาชิก");
  const own = (r: Row) => r.member === a.member;
  const rows: Row[] = [];
  for (const r of db.shares.payments.filter(own))
    rows.push({
      id: "share-" + r.id,
      category: "shares",
      title: "ส่งหุ้นสมาชิก",
      date: r.received || r.date,
      amount: r.amount,
      status: r.received ? "confirmed" : "pending",
      detail: r.period + " · " + r.method,
      document: r.received
        ? "/api/shares?receipt=" + encodeURIComponent(r.id)
        : null,
    });
  for (const r of db.deposits.transactions.filter(
    (r) => own(r) && activeDepositTransaction(db, r),
  ))
    rows.push({
      id: "deposit-" + r.id,
      category: "deposits",
      title:
        r.type === "withdrawal"
          ? "ถอนเงิน"
          : r.type === "interest"
            ? "ดอกเบี้ยเงินฝาก"
            : "ฝากเงิน",
      date: r.confirmed || r.created,
      amount: r.amountCents / 100,
      status: r.status,
      detail: (r.account || "") + (r.description ? " · " + r.description : ""),
      document: null,
    });
  for (const c of db.loans.contracts.filter(own))
    if (c.disbursed)
      rows.push({
        id: "loan-disburse-" + c.id,
        category: "loans",
        title: "รับเงินกู้",
        date: c.disbursed,
        amount: c.amount,
        status: "confirmed",
        detail: c.number,
        document: null,
      });
  for (const r of db.loans.payments.filter(own))
    rows.push({
      id: "repay-" + r.id,
      category: "loans",
      title: "ชำระเงินกู้",
      date: r.date,
      amount: r.amountCents / 100,
      status: "confirmed",
      detail:
        db.loans.contracts.find((c) => c.id === r.contract)?.number ||
        r.contract,
      document: null,
    });
  for (const r of (db.loans.repaymentRequests || []).filter(own))
    if (!db.loans.payments.some((p) => p.requestId === r.id))
      rows.push({
        id: "repay-request-" + r.id,
        category: "loans",
        title: "แจ้งชำระเงินกู้",
        date: r.confirmed || r.created,
        amount: r.amountCents / 100,
        status: r.status,
        detail:
          db.loans.contracts.find((c) => c.id === r.contract)?.number ||
          r.contract,
        document: null,
      });
  for (const [table, title] of [
    [db.returns.dividends, "เงินปันผลหุ้น"],
    [db.returns.rebates, "เงินเฉลี่ยคืน"],
  ] as const)
    for (const r of table.filter(own))
      if (
        db.returns.allocations.some(
          (p) => p.year === r.year && p.approved === 1,
        )
      )
        rows.push({
          id: title + "-" + r.year,
          category: "returns",
          title,
          date: r.paidAt || r.year + "-12-31",
          amount: r.cents / 100,
          status: r.paidAt ? "confirmed" : "approved",
          detail: "ปี " + (r.year + 543),
          document: "/api/returns?statement=" + r.year,
        });
  return {
    rows: rows.sort(
      (a, b) =>
        String(b.date).localeCompare(String(a.date)) ||
        a.id.localeCompare(b.id),
    ),
  };
}
