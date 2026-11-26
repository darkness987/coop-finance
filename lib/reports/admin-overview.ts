import {
  activeDepositAccount,
  activeDepositTransaction,
} from "../deposits/deposit-scope";
// ระบบ: ภาพรวมและประวัติธุรกรรม | ไฟล์: admin-overview.ts
// ข้อมูลกราฟและคิวสินเชื่อของหน้าภาพรวม ใช้เฉพาะรายการจริงที่ยืนยันแล้ว
import type { Database } from "../../database/store";
// ฟังก์ชัน adminOverview: ทำงานส่วน adminOverview ของระบบนี้
export function adminOverview(db: Database, now = new Date()) {
  const date = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
  const year = Number(date.slice(0, 4));
  const confirmed = db.deposits.transactions.filter(
    (t) => t.status === "confirmed" && activeDepositTransaction(db, t),
  );
  const transactionDate = (t: any) =>
    String(t.confirmed || t.created).slice(0, 10);
  const signed = (t: any) => (t.type === "withdrawal" ? -1 : 1) * t.amountCents;
  const funded = db.loans.contracts.filter(
    (c) => ["active", "closed"].includes(c.status) && c.disbursed,
  );
  const principalAt = (c: any, end: string) =>
    Math.max(
      0,
      Math.round(c.amount * 100) -
        db.loans.payments
          .filter((p) => p.contract === c.id && p.date.slice(0, 10) <= end)
          .reduce((sum, p) => sum + p.principalCents, 0),
    );
  const years = Array.from(
    new Set([
      year,
      ...confirmed.map((t) => Number(transactionDate(t).slice(0, 4))),
      ...funded.map((c) => Number(c.disbursed.slice(0, 4))),
    ]),
  )
    .filter((y) => Number.isInteger(y) && y <= year)
    .sort((a, b) => b - a);
  const trends = years.map((y) => ({
    year: y,
    months: Array.from(
      { length: y === year ? Number(date.slice(5, 7)) : 12 },
      (_, i) => {
        const end = y + "-" + String(i + 1).padStart(2, "0") + "-31";
        // ย้อนจากยอดปัจจุบันด้วยรายการยืนยันหลังวันสิ้นเดือน ไม่รวมรายการที่รอตรวจ
        const deposits =
          db.deposits.accounts
            .filter(
              (a) =>
                activeDepositAccount(a) &&
                (!a.created || a.created.slice(0, 10) <= end),
            )
            .reduce(
              (sum, a) =>
                sum +
                a.balanceCents -
                confirmed
                  .filter((t) => t.account === a.id && transactionDate(t) > end)
                  .reduce((s, t) => s + signed(t), 0),
              0,
            ) / 100;
        const loans =
          funded
            .filter((c) => c.disbursed <= end)
            .reduce((sum, c) => sum + principalAt(c, end), 0) / 100;
        return { month: i + 1, deposits, loans };
      },
    ),
  }));
  // สัดส่วนประเภทเงินกู้รวมสัญญาอนุมัติรอจ่ายด้วย แยกจากหนี้ที่จ่ายเงินจริง
  const openContracts = db.loans.contracts.filter((c) =>
    ["approved", "active"].includes(c.status),
  );
  const productOf = (c: any) =>
    db.loans.applications.find((a) => a.id === c.application)?.product;
  const totalsFor = (contracts: typeof openContracts) => {
    const amount =
      contracts
        .filter((c) => c.status === "active")
        .reduce((sum, c) => sum + principalAt(c, date), 0) / 100;
    const approvedAmount =
      contracts
        .filter((c) => c.status === "approved")
        .reduce((sum, c) => sum + principalAt(c, date), 0) / 100;
    return {
      amount,
      approvedAmount,
      contractAmount: Math.round((amount + approvedAmount) * 100) / 100,
    };
  };
  const loanTypes = db.loans.products.map((p) => ({
    id: p.id,
    name: p.name,
    ...totalsFor(openContracts.filter((c) => productOf(c) === p.id)),
  }));
  const other = totalsFor(
    openContracts.filter(
      (c) => !db.loans.products.some((p) => p.id === productOf(c)),
    ),
  );
  if (other.contractAmount > 0)
    loanTypes.push({ id: "other", name: "สินเชื่ออื่น", ...other });
  const contractTotals = totalsFor(openContracts);
  const submitted = db.loans.applications.filter((a) => a.status !== "draft");
  const approval = {
    approved: submitted.filter((a) => a.status === "approved").length,
    rejected: submitted.filter((a) => a.status === "rejected").length,
    pending: submitted.filter(
      (a) => !["approved", "rejected"].includes(a.status),
    ).length,
  };
  const waitingLoans = submitted
    .filter((a) => !["approved", "rejected"].includes(a.status))
    .sort((a, b) => a.created.localeCompare(b.created))
    .map((a) => ({
      id: a.id,
      number: a.number || a.id.slice(0, 8).toUpperCase(),
      member: a.member,
      name: db.members.records.find((m) => m.id === a.member)?.name || a.member,
      product:
        db.loans.products.find((p) => p.id === a.product)?.name || a.product,
      amount: a.amount,
      date: a.created.slice(0, 10),
      status: a.status,
    }));
  const notices = [
    ...db.returns.allocations
      .filter((a) => a.approved)
      .map((a) => ({
        id: "allocation-" + a.year,
        title: "ประกาศผลจัดสรรประจำปี " + (a.year + 543),
        detail: "อนุมัติผลจัดสรรแล้ว",
        href: "/admin/returns",
      })),
    ...db.loans.products
      .filter((p) => p.active)
      .map((p) => ({
        id: "product-" + p.id,
        title: p.name,
        detail: "อัตราดอกเบี้ย " + p.annualRate + "% ต่อปี",
        href: "/admin/loans",
      })),
  ];
  return {
    year,
    trends,
    loanTypes,
    contractTotals,
    approval,
    waitingLoans,
    notices,
    netProfit: null,
    interestIncome:
      db.loans.payments
        .filter((p) => p.date.startsWith(String(year)))
        .reduce((s, p) => s + (p.interestCents || 0), 0) / 100,
  };
}
