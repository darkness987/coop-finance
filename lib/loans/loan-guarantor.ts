import { activeDepositAccount } from "../deposits/deposit-scope";
// ระบบ: สินเชื่อ วงเงิน ผู้ค้ำ และชำระหนี้ | ไฟล์: loan-guarantor.ts
import { readLoanCollateral } from "./collateral";
import { assetBorrowingCapacity, borrowingMode } from "./loan-capacity";
// เงื่อนไขผู้ค้ำ: ใช้หุ้นที่รับเงินจริงและยอดเงินฝากในบัญชี ไม่รวมรายการแจ้งรอรับเงิน
import type { Database } from "../../database/store";
// ฟังก์ชัน loanSecurity: ทำงานส่วน loanSecurity ของระบบนี้
export function loanSecurity(
  db: Database,
  member: string,
  amount = 0,
  excludeApplication = "",
  productId = "",
) {
  const shareCents =
    db.shares.accounts
      .filter((r) => r.member === member)
      .reduce(
        (sum, r) => sum + Math.round(Number(r.opening_amount || 0) * 100),
        0,
      ) +
    db.shares.payments
      .filter((r) => r.member === member && r.received)
      .reduce((sum, r) => sum + Math.round(Number(r.amount) * 100), 0);
  const depositCents = (db.deposits?.accounts || [])
    .filter((r) => r.member === member && activeDepositAccount(r))
    .reduce((sum, r) => sum + Number(r.balanceCents || 0), 0);
  const totalCents = shareCents + depositCents;
  const capacity = assetBorrowingCapacity(
    db,
    member,
    totalCents,
    excludeApplication,
    productId,
  );
  return {
    ...capacity,
    shareAmount: shareCents / 100,
    depositAmount: depositCents / 100,
    totalAmount: totalCents / 100,
    requiresGuarantor:
      Math.round(amount * 100) > Math.round(capacity.availableAmount * 100),
  };
}
// รับเฉพาะเลขสมาชิกแล้วอ่านชื่อจริงจากฐานข้อมูล ห้ามเชื่อชื่อที่ส่งมาจาก browser
// ฟังก์ชัน findGuarantor: ทำงานส่วน findGuarantor ของระบบนี้
export function findGuarantor(db: Database, borrower: string, value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || value.length > 50)
    throw new Error("เลขสมาชิกผู้ค้ำประกันไม่ถูกต้อง");
  const member = value.trim();
  if (!member) return null;
  if (member === borrower) throw new Error("ไม่สามารถใช้ตนเองเป็นผู้ค้ำประกัน");
  const person = db.members.records.find((r) => r.id === member && r.active);
  if (!person) throw new Error("ไม่พบผู้ค้ำประกันที่มีสถานะสมาชิกใช้งาน");
  return { member: person.id, name: person.name };
}
// ฟังก์ชัน guarantorRows: ทำงานส่วน guarantorRows ของระบบนี้
export function guarantorRows(row: any) {
  return Array.isArray(row.guarantors)
    ? row.guarantors
    : row.guarantor
      ? [row.guarantor]
      : [];
}
// ฟังก์ชัน findGuarantors: ทำงานส่วน findGuarantors ของระบบนี้
export function findGuarantors(db: Database, member: string, input: any) {
  const ids =
    input.guarantorMembers ??
    (input.guarantors
      ? input.guarantors.map((r: any) => r.member)
      : input.guarantorMember
        ? [input.guarantorMember]
        : guarantorRows(input).map((r: any) => r.member));
  if (!Array.isArray(ids) || ids.length > 2)
    throw Error("ระบุผู้ค้ำประกัน 2 คน");
  const rows = ids
    .map((id) => findGuarantor(db, member, id))
    .filter(Boolean) as { member: string; name: string }[];
  if (new Set(rows.map((r) => r.member)).size !== rows.length)
    throw Error("เลขสมาชิกผู้ค้ำประกันต้องไม่ซ้ำกัน");
  return rows;
}
// ฟังก์ชัน requireGuarantor: ตรวจเงื่อนไขหรือสิทธิ์ก่อนทำงานในส่วน requireGuarantor
export function requireGuarantor(db: Database, row: any) {
  const security = loanSecurity(
    db,
    row.member,
    row.amount,
    row.id,
    row.product,
  );
  const loanMode = borrowingMode(row);
  const guarantors =
    loanMode === "guaranteed" ? findGuarantors(db, row.member, row) : [];
  const guarantor = guarantors[0] || null;
  if (loanMode === "guaranteed" && guarantors.length !== 2)
    throw Error("กรุณาระบุผู้ค้ำประกัน 2 คนที่ไม่ซ้ำกัน");
  if (loanMode === "asset" && security.requiresGuarantor)
    throw new Error(
      `วงเงินกู้ไม่ใช้ผู้ค้ำที่ใช้ได้ขณะนี้ ${security.availableAmount.toLocaleString("th-TH")} บาท กรุณาลดยอดกู้หรือเลือกกู้แบบมีผู้ค้ำประกัน`,
    );
  return {
    security,
    guarantor,
    guarantors,
    loanMode,
    collateral: readLoanCollateral(loanMode, row.collateral),
  };
}
// ให้ผู้ค้ำเห็นเฉพาะข้อมูลการค้ำของตน ไม่เปิดคำขอหรือข้อมูลส่วนตัวทั้งหมดของผู้กู้
// ฟังก์ชัน readGuarantees: อ่านข้อมูลในส่วน readGuarantees
export function readGuarantees(db: Database, member: string) {
  return db.loans.applications
    .filter((r) => guarantorRows(r).some((g: any) => g.member === member))
    .map((r) => {
      const contract = db.loans.contracts.find((c) => c.application === r.id);
      return {
        application: r.id,
        demo: !!r.demo,
        borrower: r.member,
        borrowerName:
          db.members.records.find((m) => m.id === r.member)?.name || r.member,
        guarantorMember: member,
        guarantorName: guarantorRows(r).find((g: any) => g.member === member)!
          .name,
        contractNumber: contract?.number || null,
        annualRate: contract?.annualRate ?? r.terms?.annualRate ?? null,
        months: contract?.months ?? r.months,
        installment: contract?.installment ?? null,
        loanMode: contract?.loanMode || r.loanMode,
        guarantorCount: guarantorRows(contract || r).length,
        collateral:
          contract?.collateral || r.collateral
            ? {
                type: (contract?.collateral || r.collateral).type,
                owner: (contract?.collateral || r.collateral).owner,
                documentNumber: (contract?.collateral || r.collateral)
                  .documentNumber,
                address: (contract?.collateral || r.collateral).address,
              }
            : null,
        // อ่านได้เฉพาะตารางของสัญญาที่ตนค้ำ ไม่ให้สิทธิ์ชำระแทนหรือเข้าข้อมูลส่วนตัวผู้กู้
        schedules: contract
          ? db.loans.schedules
              .filter((s) => s.contract === contract.id)
              .sort((a, b) => a.number - b.number)
              .map((s) => ({
                number: s.number,
                dueDate: s.dueDate,
                principalCents: s.principalCents,
                interestCents: s.interestCents,
                paidPrincipal: s.paidPrincipal,
                paidInterest: s.paidInterest,
              }))
          : [],
        amount: contract?.amount ?? r.amount,
        status: contract?.status || r.status,
      };
    });
}
