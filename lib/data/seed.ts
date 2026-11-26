// ระบบ: ตัวเชื่อมฐานข้อมูลและข้อมูลตั้งต้น | ไฟล์: seed.ts
import { memberId } from "../shared/shared";
import type { CoopData } from "../shared/data-types";

// ข้อมูลตัวอย่างสำหรับกรณีที่ยังไม่มีไฟล์ข้อมูล
// ฟังก์ชัน seed: ทำงานส่วน seed ของระบบนี้
export function seed(): CoopData {
  const joined = "2023-01-15";
  const members = [
    { id: memberId, name: "สรรชัย ใจยกาล", opening: 49500 },
    { id: "66001240", name: "อิศรา บุญมา", opening: 5000 },
    { id: "66001241", name: "บัญชา น้อยวิไล", opening: 10000 },
    { id: "66001242", name: "ภูมิพัฒน์ ศรีเวียงธวัช", opening: 12000 },
  ];
  const payments: [string, string, number, string, boolean][] = [
    [memberId, "2026-10", 1000, "หักเงินเดือน", true],
    ["66001240", "2026-10", 500, "โอนเงิน", true],
    ["66001241", "2026-10", 1500, "หักเงินเดือน", true],
    ["66001242", "2026-10", 1000, "โอนเงิน", false],
    [memberId, "2026-09", 1000, "หักเงินเดือน", true],
    [memberId, "2026-08", 500, "หักเงินเดือน", true],
  ];
  return {
    rules: [{ id: 1, price: 100, min: 500 }],
    members: members.map(({ id, name }) => ({
      id,
      name,
      active: 1,
      joined,
      email: id === memberId ? "member@example.test" : "",
      phone: "",
    })),
    share_accounts: members.map(({ id, opening }) => ({
      member: id,
      monthly: id === memberId ? 2000 : 500,
      opening_amount: opening,
      opening_units: opening / 100,
      opening_date: joined,
    })),
    share_payments: payments.map(
      ([member, period, amount, method, paid], index) => {
        const date = period + "-05";
        return {
          id: index + 1,
          member,
          period,
          amount,
          price: 100,
          method,
          date,
          received: paid ? date : null,
          reference: paid ? "DEMO-" + member + "-" + period : null,
        };
      },
    ),
    share_change_requests: [],
    member_applications: [
      {
        id: "66001243",
        name: "นภา ใจดี",
        email: "napa@example.test",
        phone: "",
        status: "pending",
      },
    ],
    allocations: [
      { year: 2025, dividend_rate: 400, rebate_rate: 500, approved: 1 },
    ],
    member_dividends: [
      { year: 2025, member: memberId, basis: 49500, cents: 198000 },
    ],
    member_rebates: [
      { year: 2025, member: memberId, basis: 2500000, cents: 125000 },
    ],
  };
}
