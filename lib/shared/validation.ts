// ระบบ: เครื่องมือและข้อมูลที่ใช้ร่วมกัน | ไฟล์: validation.ts
// ตรวจข้อมูลฝั่งเซิร์ฟเวอร์ | แปลงเงื่อนไขที่ไม่ผ่านเป็นข้อผิดพลาดสำหรับ API

export class RequestError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
// ฟังก์ชัน check: ทำงานส่วน check ของระบบนี้
export function check(
  condition: unknown,
  message: string,
  status?: number,
): asserts condition {
  if (!condition) throw new RequestError(message, status);
}

export const integer = (
  value: unknown,
  min = 1,
  max = 100000000,
): value is number =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  value >= min &&
  value <= max;
