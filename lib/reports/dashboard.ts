import {
  activeDepositAccount,
  activeDepositTransaction,
} from "../deposits/deposit-scope";
// ระบบ: ภาพรวมและประวัติธุรกรรม | ไฟล์: dashboard.ts
// หน้าหลัก: รวมข้อมูลจริงของสมาชิกจากทุกหมวด โดยไม่นำยอดจำลองเดิมมาปน
import { monthlySavingsDue } from "../deposits/monthly-plan";
import type { Database } from "../../database/store";
// ฟังก์ชัน dashboard: ทำงานส่วน dashboard ของระบบนี้
export function dashboard(db: Database, memberId: string, period: string) {
  const shareAccounts = db.shares.accounts.filter((a) => a.member === memberId);
  const shares = db.shares.payments.filter(
    (p) => p.member === memberId && p.received,
  );
  const accounts = db.deposits.accounts.filter(
    (a) => a.member === memberId && activeDepositAccount(a),
  );
  const deposits = db.deposits.transactions.filter(
    (t) =>
      t.member === memberId &&
      t.status === "confirmed" &&
      activeDepositTransaction(db, t),
  );
  const contracts = db.loans.contracts.filter(
    (c) => c.member === memberId && c.status === "active",
  );
  // สัญญาที่อนุมัติแล้วแต่ยังไม่จ่ายเงินแสดงแยก ไม่รวมเป็นหนี้ที่รับเงินจริง
  const approvedContracts = db.loans.contracts.filter(
    (c) => c.member === memberId && c.status === "approved",
  );
  const approvedSchedules = db.loans.schedules.filter((s) =>
    approvedContracts.some((c) => c.id === s.contract),
  );
  const upcomingApproved = approvedSchedules
    .filter(
      (s) =>
        s.principalCents + s.interestCents - s.paidPrincipal - s.paidInterest >
        0,
    )
    .sort(
      (a, b) => a.dueDate.localeCompare(b.dueDate) || a.number - b.number,
    )[0];
  const pendingContract =
    approvedContracts.find((c) => c.id === upcomingApproved?.contract) ||
    approvedContracts[0];
  const schedules = db.loans.schedules.filter((s) =>
    contracts.some((c) => c.id === s.contract),
  );
  const remaining = (s: any) =>
    s.principalCents + s.interestCents - s.paidPrincipal - s.paidInterest;
  const unpaid = schedules
    .filter((s) => remaining(s) > 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.number - b.number);
  const next = unpaid[0];
  // รวมงวดค้างถัดไปหนึ่งงวดต่อสัญญา ไม่จำกัดว่าต้องครบกำหนดวันเดียวกัน
  const nextByContract = [...contracts, ...approvedContracts].flatMap((c) => {
    const row = db.loans.schedules
      .filter((s) => s.contract === c.id && remaining(s) > 0)
      .sort(
        (a, b) => a.dueDate.localeCompare(b.dueDate) || a.number - b.number,
      )[0];
    return row ? [row] : [];
  });
  const dueDates = nextByContract.map((s) => s.dueDate).sort();
  const installmentSummary = nextByContract.length
    ? {
        amount: nextByContract.reduce((sum, s) => sum + remaining(s), 0) / 100,
        count: nextByContract.length,
        firstDue: dueDates[0],
        lastDue: dueDates[dueDates.length - 1],
      }
    : null;
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const [year, month] = period.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 6 + i, 1));
    const key = date.toISOString().slice(0, 7);
    const end = key + "-31";
    return {
      period: key,
      label: new Intl.DateTimeFormat("th-TH", {
        month: "short",
        timeZone: "UTC",
      }).format(date),
      shares:
        shareAccounts
          .filter((a) => a.opening_date <= end)
          .reduce((sum, a) => sum + a.opening_amount, 0) +
        shares
          .filter((p) => p.received <= end)
          .reduce((sum, p) => sum + p.amount, 0),
      deposits: deposits
        .filter(
          (t) =>
            (t.effectiveDate || t.confirmed || t.created).slice(0, 10) <= end,
        )
        .reduce(
          (sum, t) =>
            sum + ((t.type === "withdrawal" ? -1 : 1) * t.amountCents) / 100,
          0,
        ),
    };
  });
  const shareUnits =
    shareAccounts.reduce((sum, a) => sum + (a.opening_units || 0), 0) +
    shares.reduce((sum, p) => sum + p.amount / p.price, 0);
  const shareTotal =
    shareAccounts.reduce((sum, a) => sum + a.opening_amount, 0) +
    shares.reduce((sum, p) => sum + p.amount, 0);
  const depositTotal = accounts.reduce(
    (sum, a) => sum + a.balanceCents / 100,
    0,
  );
  const recent = [
    ...shares.map((p) => ({
      id: "share-" + p.id,
      title: "ส่งหุ้นสมาชิก",
      date: p.received,
      amount: p.amount,
      href: "/shares",
    })),
    ...deposits.map((t) => ({
      id: "deposit-" + t.id,
      title:
        t.type === "withdrawal"
          ? "ถอนเงิน"
          : t.type === "interest"
            ? "รับดอกเบี้ยเงินฝาก"
            : "ฝากเงิน",
      date: t.confirmed || t.created,
      amount: ((t.type === "withdrawal" ? -1 : 1) * t.amountCents) / 100,
      href: "/deposits",
    })),
    ...db.loans.payments
      .filter((p) => p.member === memberId)
      .map((p) => ({
        id: "loan-" + p.id,
        title: "ชำระสินเชื่อ",
        date: p.date,
        amount: -p.amountCents / 100,
        href: "/loans",
      })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  const contract = contracts[0];
  const rows = contract
    ? schedules.filter((s) => s.contract === contract.id)
    : [];
  const principal = rows.reduce((sum, s) => sum + s.principalCents, 0),
    paid = rows.reduce((sum, s) => sum + s.paidPrincipal, 0);
  const savingsDue = monthlySavingsDue(db, memberId, period);
  return {
    monthlySavings: savingsDue,
    monthlyObligation:
      Math.round(
        ((installmentSummary?.amount || 0) + savingsDue.amount) * 100,
      ) / 100,
    installmentSummary,
    shareTotal,
    shareUnits,
    depositTotal,
    approvedLoanTotal:
      approvedSchedules.reduce(
        (sum, s) => sum + s.principalCents - s.paidPrincipal,
        0,
      ) / 100,
    approvedLoanCount: approvedContracts.length,
    pendingLoan: pendingContract
      ? {
          id: pendingContract.id,
          number: pendingContract.number,
          amount: Number(pendingContract.amount),
          installment: Number(pendingContract.installment),
          firstDue: pendingContract.firstDue,
        }
      : null,
    pendingNextPayment: upcomingApproved
      ? {
          date: upcomingApproved.dueDate,
          amount:
            approvedSchedules
              .filter((s) => s.dueDate === upcomingApproved.dueDate)
              .reduce(
                (sum, s) =>
                  sum +
                  s.principalCents +
                  s.interestCents -
                  s.paidPrincipal -
                  s.paidInterest,
                0,
              ) / 100,
        }
      : null,
    loanTotal:
      schedules.reduce(
        (sum, s) => sum + s.principalCents - s.paidPrincipal,
        0,
      ) / 100,
    nextPayment: next
      ? {
          amount:
            unpaid
              .filter((s) => s.dueDate === next.dueDate)
              .reduce((sum, s) => sum + remaining(s), 0) / 100,
          date: next.dueDate,
        }
      : null,
    monthly,
    recent,
    loan: contract
      ? {
          id: contract.id,
          number: contract.number,
          remaining: rows.reduce((sum, s) => sum + remaining(s), 0) / 100,
          paidPercent: principal ? Math.round((paid / principal) * 100) : 0,
        }
      : null,
  };
}
