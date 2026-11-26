// ชื่อหลักประกันชุดเดียวกันในตารางสมาชิกและเจ้าหน้าที่
export function securityDescription(row: Record<string, any>) {
  const property =
    row.collateral?.type === "house"
      ? "บ้าน"
      : row.collateral?.type === "land"
        ? "ที่ดิน"
        : "";
  const count =
    row.guarantorCount ?? (row.guarantors?.length || (row.guarantor ? 1 : 0));
  if (row.loanMode === "guaranteed" || count > 0)
    return (
      `ผู้ค้ำ ${count} คน` +
      (property ? " + " + property : " · ยังไม่ระบุหลักทรัพย์")
    );
  return (
    property ||
    (row.loanMode === "collateral" ? "ยังไม่ระบุหลักทรัพย์" : "หุ้นและเงินฝาก")
  );
}
