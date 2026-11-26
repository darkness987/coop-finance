// ระบบหลักประกัน: สมาชิกระบุที่ดินหรือบ้าน เจ้าหน้าที่สมาชิกหรือ Admin ตรวจเอกสารและกำหนดวงเงินประเมินก่อนอนุมัติ
export function readCollateral(input: any) {
  if (!input || !["land", "house"].includes(input.type))
    throw Error("เลือกหลักประกันที่ดินหรือบ้าน");
  const result: Record<string, string> = { type: input.type };
  for (const [key, label] of [
    ["owner", "ชื่อเจ้าของหลักประกัน"],
    ["documentNumber", "เลขโฉนด / เอกสารสิทธิ์"],
    ["address", "ที่ตั้งหลักประกัน"],
  ]) {
    const value = input[key];
    if (typeof value !== "string" || !value.trim() || value.length > 500)
      throw Error("กรุณาระบุ" + label + " (ไม่เกิน 500 ตัวอักษร)");
    result[key] = value.trim();
  }
  return result;
}

// อนุญาตให้บุคคลค้ำประกันร่วมกับบ้าน/ที่ดินได้ โดยตรวจรายละเอียดหลักทรัพย์ทุกช่อง
export function readLoanCollateral(mode: string, input: any) {
  return mode === "collateral" || (mode === "guaranteed" && input != null)
    ? readCollateral(input)
    : null;
}
