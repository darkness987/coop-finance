// ระบบ: หุ้นสมาชิก การส่งหุ้น และยอดสะสม | ไฟล์: share-period.ts
// ยอดส่งหุ้นรายงวด: นับส่งแล้วเฉพาะรายการที่เจ้าหน้าที่ยืนยันรับเงิน
// ใช้สูตรเดียวกันทั้งหน้าเว็บและ API รองรับหลายรายการในเดือนเดียวกัน
// ฟังก์ชัน sharePeriodTotals: ทำงานส่วน sharePeriodTotals ของระบบนี้
export function sharePeriodTotals(
  payments: {
    member: string;
    period: string;
    amount: number;
    received: string | null;
  }[],
  member: string,
  period: string,
  monthlyAmount: number,
) {
  const rows = payments.filter(
    (row) => row.member === member && row.period === period,
  );
  const paidAmount = rows
    .filter((row) => Boolean(row.received))
    .reduce((sum, row) => sum + row.amount, 0);
  const pendingAmount = rows
    .filter((row) => !row.received)
    .reduce((sum, row) => sum + row.amount, 0);
  const remainingAmount = Math.max(0, monthlyAmount - paidAmount);
  return {
    paidAmount,
    pendingAmount,
    remainingAmount,
    complete: paidAmount >= monthlyAmount,
  };
}
