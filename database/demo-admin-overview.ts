// ระบบ: ฐานข้อมูลกลางและข้อมูลตัวอย่าง | ไฟล์: demo-admin-overview.ts
// ข้อมูลจำลองสำหรับแสดงหน้าภาพรวมเท่านั้น ไม่บันทึกลงฐานข้อมูลธุรกรรม
// แก้ตัวเลขและรายการตัวอย่างในไฟล์นี้ได้โดยไม่กระทบข้อมูลสมาชิกจริง
const monthlyDeposits = [
  28000000, 29500000, 31000000, 32200000, 34000000, 36500000, 39000000,
  41500000, 44700000, 47200000, 48750000,
];
const monthlyLoans = [
  19500000, 20800000, 22400000, 24100000, 25800000, 28000000, 30200000,
  32400000, 34300000, 35700000, 36420000,
];
export const demoAdminOverview = {
  members: 1248,
  activeMembers: 1206,
  shareTotal: 25860000,
  depositTotal: 48750000,
  depositAccounts: 1864,
  loanTotal: 36420000,
  pending: { members: 8, shares: 24, changes: 6, deposits: 12, loans: 30 },
  recent: [
    {
      id: "demo-activity-1",
      member: "DEMO-0151",
      name: "กมล ใจดี",
      title: "อนุมัติเงินกู้สามัญ",
      amount: 200000,
      date: "2026-11-20T11:04:00",
      state: "approved",
      href: "/admin/loans",
    },
    {
      id: "demo-activity-2",
      member: "DEMO-0286",
      name: "สุภา รักออม",
      title: "ฝากเงินออมทรัพย์",
      amount: 50000,
      date: "2026-11-20T10:28:00",
      state: "confirmed",
      href: "/admin/deposits",
    },
    {
      id: "demo-activity-3",
      member: "DEMO-0412",
      name: "วรพล มั่นคง",
      title: "ส่งหุ้นสมาชิก",
      amount: 2000,
      date: "2026-11-20T09:45:00",
      state: "confirmed",
      href: "/admin/shares",
    },
  ],
  overview: {
    year: 2026,
    netProfit: 3860000,
    interestIncome: 5420000,
    trends: [
      {
        year: 2026,
        months: monthlyDeposits.map((deposits, i) => ({
          month: i + 1,
          deposits,
          loans: monthlyLoans[i],
        })),
      },
      {
        year: 2025,
        months: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          deposits: 18000000 + i * 850000,
          loans: 12000000 + i * 650000,
        })),
      },
    ],
    loanTypes: [
      {
        id: "ordinary",
        name: "สินเชื่อสามัญ",
        amount: 22871760,
        approvedAmount: 0,
        contractAmount: 22871760,
      },
      {
        id: "emergency",
        name: "สินเชื่อฉุกเฉิน",
        amount: 7793880,
        approvedAmount: 0,
        contractAmount: 7793880,
      },
      {
        id: "special",
        name: "สินเชื่อพิเศษ",
        amount: 5754360,
        approvedAmount: 0,
        contractAmount: 5754360,
      },
    ],
    contractTotals: {
      amount: 36420000,
      approvedAmount: 0,
      contractAmount: 36420000,
    },
    approval: { approved: 142, pending: 30, rejected: 6 },
    waitingLoans: [
      {
        id: "demo-loan-1",
        number: "LN-2569-0165",
        member: "DEMO-0165",
        name: "ธนากร แสงทอง",
        product: "สินเชื่อสามัญ",
        amount: 500000,
        date: "2026-11-20",
        status: "submitted",
      },
      {
        id: "demo-loan-2",
        number: "LN-2569-0164",
        member: "DEMO-0164",
        name: "นภา ยิ้มแย้ม",
        product: "สินเชื่อฉุกเฉิน",
        amount: 50000,
        date: "2026-11-20",
        status: "forwarded",
      },
      {
        id: "demo-loan-3",
        number: "LN-2569-0163",
        member: "DEMO-0163",
        name: "สมชาย พูนทรัพย์",
        product: "สินเชื่อสามัญ",
        amount: 300000,
        date: "2026-11-19",
        status: "checking",
      },
      {
        id: "demo-loan-4",
        number: "LN-2569-0162",
        member: "DEMO-0162",
        name: "พิมพ์ใจ สุขสบาย",
        product: "สินเชื่อพิเศษ",
        amount: 1500000,
        date: "2026-11-19",
        status: "forwarded",
      },
    ],
    notices: [
      {
        id: "demo-notice-1",
        title: "แจ้งกำหนดปันผลประจำปี 2569",
        detail: "กำหนดพิจารณาผลจัดสรรในการประชุมใหญ่ประจำปี",
        href: "/admin/returns",
      },
      {
        id: "demo-notice-2",
        title: "ปรับอัตราดอกเบี้ยเงินฝาก",
        detail: "ตัวอย่างประกาศเงื่อนไขออมทรัพย์และออมทรัพย์รายเดือน",
        href: "/admin/deposits",
      },
      {
        id: "demo-notice-3",
        title: "ตรวจสอบข้อมูลสมาชิกประจำปี",
        detail: "ตัวอย่างแจ้งเตือนให้เจ้าหน้าที่ทบทวนข้อมูลสมาชิก",
        href: "/admin/members",
      },
    ],
  },
};
