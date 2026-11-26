// ระบบ: หุ้นสมาชิก การส่งหุ้น และยอดสะสม | ไฟล์: share-accounts.ts
// ระบบหุ้น | กฎปัจจุบันและบัญชีหุ้นของสมาชิก

import type { CoopData, ShareRules } from "../shared/data-types";
import { check } from "../shared/validation";

// ฟังก์ชัน rulesFor: ทำงานส่วน rulesFor ของระบบนี้
export function rulesFor(data: CoopData): ShareRules {
  const { price, min } = data.rules[0];
  return { price, min };
}

// ฟังก์ชัน openShareAccount: ทำงานส่วน openShareAccount ของระบบนี้
export function openShareAccount(data: CoopData, member: string, date: string) {
  check(
    !data.share_accounts.some((account) => account.member === member),
    "มีบัญชีหุ้นสำหรับสมาชิกนี้แล้ว",
    409,
  );
  data.share_accounts.push({
    member,
    monthly: rulesFor(data).min,
    opening_amount: 0,
    opening_units: 0,
    opening_date: date,
  });
}
