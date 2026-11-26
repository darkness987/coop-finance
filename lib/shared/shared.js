// ระบบ: เครื่องมือและข้อมูลที่ใช้ร่วมกัน | ไฟล์: shared.js
// ค่าร่วม | รหัสสมาชิกทดลองและรูปแบบแสดงเงินกับงวด

export const memberId = "66001239";
export const money = (value) => new Intl.NumberFormat("th-TH").format(value);
export const periodLabel = (period) =>
  new Intl.DateTimeFormat("th-TH", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(period + "-01T00:00:00Z"));
