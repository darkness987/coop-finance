import {
  activeDepositAccount,
  activeDepositTransaction,
} from "../deposits/deposit-scope";
// ระบบ: ภาพรวมและประวัติธุรกรรม | ไฟล์: admin-dashboard.ts
import { requireAccess } from "../auth/permissions";
import { adminOverview } from "./admin-overview";
// ภาพรวมเจ้าหน้าที่: รวมทั้งสหกรณ์ แยกจากยอดส่วนตัวของสมาชิก
import type { Database } from "../../database/store";
import { admin, type Actor } from "../auth/session";
// ฟังก์ชัน adminDashboard: ทำงานส่วน adminDashboard ของระบบนี้
export function adminDashboard(db: Database, user: Actor) {
  requireAccess(user, "dashboard");
  admin(user);
  const shares =
    db.shares.accounts.reduce((s, a) => s + a.opening_amount, 0) +
    db.shares.payments
      .filter((p) => p.received)
      .reduce((s, p) => s + p.amount, 0);
  const waiting = db.deposits.transactions.filter(
    (t) => t.status === "pending" && activeDepositTransaction(db, t),
  );
  const pending = {
    members: db.members.applications.filter((m) => m.status === "pending")
      .length,
    shares: db.shares.payments.filter((p) => !p.received).length,
    changes: db.shares.changeRequests.filter((r) => r.status === "pending")
      .length,
    deposits: waiting.length,
    loans: db.loans.applications.filter((a) =>
      ["submitted", "checking", "needs_documents", "forwarded"].includes(
        a.status,
      ),
    ).length,
  };
  const recent = [
    ...db.shares.payments.map((p) => ({
      id: "s" + p.id,
      member: p.member,
      title: "ส่งหุ้นสมาชิก",
      amount: p.amount,
      date: p.received || p.date,
      state: p.received ? "ยืนยันแล้ว" : "รอรับเงิน",
      href: "/admin/shares",
    })),
    ...db.deposits.transactions
      .filter((t) => activeDepositTransaction(db, t))
      .map((t) => ({
        id: "d" + t.id,
        member: t.member,
        title:
          t.type === "withdrawal"
            ? "ถอนเงิน"
            : t.type === "interest"
              ? "ดอกเบี้ยเงินฝาก"
              : "ฝากเงิน",
        amount: t.amountCents / 100,
        date: t.created,
        state:
          t.status === "pending"
            ? "รอตรวจสอบ"
            : t.status === "confirmed"
              ? "ยืนยันแล้ว"
              : "ไม่อนุมัติ",
        href: "/admin/deposits",
      })),
    ...db.loans.applications.map((a) => ({
      id: a.id,
      member: a.member,
      title: "คำขอสินเชื่อ",
      amount: a.amount,
      date: a.created,
      state: a.status,
      href: "/admin/loans",
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)
    .map((r) => ({
      ...r,
      name: db.members.records.find((m) => m.id === r.member)?.name || r.member,
    }));
  const contractIds = new Set(
    db.loans.contracts.filter((c) => c.status === "active").map((c) => c.id),
  );
  return {
    overview: adminOverview(db),
    members: db.members.records.length,
    activeMembers: db.members.records.filter((m) => m.active).length,
    shareTotal: shares,
    depositTotal: db.deposits.accounts
      .filter(activeDepositAccount)
      .reduce((s, a) => s + a.balanceCents / 100, 0),
    depositAccounts: db.deposits.accounts.filter(activeDepositAccount).length,
    loanTotal:
      db.loans.schedules
        .filter((s) => contractIds.has(s.contract))
        .reduce((sum, s) => sum + s.principalCents - s.paidPrincipal, 0) / 100,
    pending,
    recent,
  };
}
