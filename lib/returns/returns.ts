// ระบบ: ปันผล เฉลี่ยคืน และบัญชีรับผลตอบแทน | ไฟล์: returns.ts
// ระบบผลตอบแทน | คำนวณ จัดเก็บ และเผยผลจัดสรรประจำปี

import { currentMember } from "../shared/context";
import { today } from "../shared/date";
import { check, integer } from "../shared/validation";
import type { CoopData } from "../shared/data-types";

// สมาชิกเห็นเฉพาะผลของตนเองในปีที่อนุมัติแล้ว
// ฟังก์ชัน readReturns: อ่านข้อมูลในส่วน readReturns
export function readReturns(data: CoopData, admin: boolean) {
  return data.member_dividends
    .flatMap((dividend) => {
      const { year, member } = dividend;
      const allocation = data.allocations.find((row) => row.year === year);
      if (
        !allocation ||
        (!admin && (member !== currentMember() || allocation.approved !== 1))
      )
        return [];
      const rebate = data.member_rebates.find(
        (row) => row.year === year && row.member === member,
      );
      if (!rebate) return [];
      return [
        {
          ...dividend,
          ...allocation,
          rebateBasis: rebate.basis,
          rebateCents: rebate.cents,
        },
      ];
    })
    .sort((a, b) => b.year - a.year || a.member.localeCompare(b.member));
}

// ฟังก์ชัน changeReturns: ตรวจคำสั่งและบันทึกการเปลี่ยนแปลงในส่วน changeReturns
export function changeReturns(data: CoopData, input: Record<string, unknown>) {
  const { action, year, dividendRate, rebateRate, interest } = input;
  check(
    integer(year, 2000, Number(today().slice(0, 4)) - 1),
    "เลือกปี ค.ศ. ที่ปิดรอบแล้ว",
  );
  const existing = data.allocations.find((row) => row.year === year);
  check(!existing?.approved, "ปีนี้อนุมัติแล้ว", 409);

  if (action === "publish") {
    check(existing, "กรุณาเตรียมร่างก่อนอนุมัติ");
    existing.approved = 1;
    return;
  }

  check(
    action === "prepare" &&
      integer(dividendRate, 0, 10000) &&
      integer(rebateRate, 0, 10000) &&
      interest &&
      typeof interest === "object",
    "อัตราผลตอบแทนหรือฐานดอกเบี้ยไม่ถูกต้อง",
  );

  // ใช้ทุนหุ้นที่รับเงินจริงถึงสิ้นปีเป็นฐานปันผล
  const end = year + "-12-31";
  const accounts = data.share_accounts.filter((row) => row.opening_date <= end);
  check(accounts.length, "ไม่พบสมาชิกในรอบปีนี้");

  // แทนที่เฉพาะร่างของปีที่คำนวณใหม่
  data.allocations = data.allocations.filter((row) => row.year !== year);
  data.member_dividends = data.member_dividends.filter(
    (row) => row.year !== year,
  );
  data.member_rebates = data.member_rebates.filter((row) => row.year !== year);
  data.allocations.push({
    year,
    dividend_rate: dividendRate,
    rebate_rate: rebateRate,
    approved: 0,
  });
  for (const { member, opening_amount } of accounts) {
    const basis = data.share_payments
      .filter(
        (row) =>
          row.member === member && row.received !== null && row.received <= end,
      )
      .reduce((sum, row) => sum + row.amount, opening_amount);
    const rebateBasis = (interest as Record<string, unknown>)[member] ?? 0;
    check(integer(rebateBasis, 0, 10000000000), "ฐานดอกเบี้ยไม่ถูกต้อง");

    // เก็บผลทั้งสองประเภทเป็นสตางค์และปัดเศษต่อสมาชิก
    data.member_dividends.push({
      year,
      member,
      basis,
      cents: Math.round((basis * dividendRate) / 100),
    });
    data.member_rebates.push({
      year,
      member,
      basis: rebateBasis,
      cents: Math.round((rebateBasis * rebateRate) / 10000),
    });
  }
}
