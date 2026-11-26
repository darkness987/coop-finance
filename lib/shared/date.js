// ระบบ: เครื่องมือและข้อมูลที่ใช้ร่วมกัน | ไฟล์: date.js
// วันที่กลางของระบบ | ใช้เวลาไทยกำหนดวันที่และงวดส่งหุ้น

export const today = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Bangkok" }).format(
    new Date(),
  );
