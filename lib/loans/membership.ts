// อายุสมาชิกขั้นต่ำตามประเภทสินเชื่อ ใช้ชุดเดียวกันทั้งการ์ด ประเมินสิทธิ์ และส่งคำขอ
export function membershipMonths(product: string) {
  return product === "emergency" ? 3 : 6;
}
// นับเดือนปฏิทินเต็ม โดยวันสิ้นเดือนใช้วันสุดท้ายของเดือนปลายทาง
export function membershipEligible(
  joined: unknown,
  product: string,
  date: string,
) {
  if (typeof joined !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(joined))
    return false;
  const parsed = new Date(joined + "T00:00:00Z");
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== joined
  )
    return false;
  const [y, m, d] = joined.split("-").map(Number),
    n = membershipMonths(product);
  const end = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0),
  ).getUTCDate();
  end.setUTCDate(Math.min(d, last));
  return end.toISOString().slice(0, 10) <= date;
}
