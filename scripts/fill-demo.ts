// เติมข้อมูลสมมติสำหรับโครงงานเฉพาะช่องว่าง ไม่เปลี่ยนรหัสผ่านหรือเขียนทับข้อมูลที่ผู้ใช้แก้ไว้
import { updateDatabase } from "../database/store";
updateDatabase((db) => {
  for (const [index, m] of db.members.records.entries()) {
    const [firstName, ...lastName] = m.name.split(/\s+/);
    const example = {
      prefix: "นาย",
      firstName,
      lastName: lastName.join(" "),
      citizenNumber: "199999000" + String(index + 1).padStart(4, "0"),
      birthDate: "1993-03-15",
      company: "บริษัท ตัวอย่างสหกรณ์ จำกัด",
      occupation: "พนักงานประจำ",
      income: "28500",
      address: `${99 + index}/9 หมู่ 4 แขวงทุ่งสองห้อง เขตหลักสี่`,
      provincePostal: "กรุงเทพมหานคร / 10210",
      bank: "ธนาคารกรุงไทย",
      bankLast4: String(1234 + index),
    };
    m.profile = m.profile || {};
    for (const [key, value] of Object.entries(example))
      if (m.profile[key] === undefined || m.profile[key] === "")
        m.profile[key] = value;
    if (!m.email) m.email = `student${index + 1}@example.test`;
    if (!m.phone) m.phone = "089" + String(1000000 + index).padStart(7, "0");
    m.demoProfile = true;
    // สมาชิกเก่าบางรายมีข้อมูลสมาชิกแต่ยังไม่มีบัญชีหุ้น สร้างยอดเริ่มต้น 0 โดยไม่เพิ่มทุนสมมติ
    if (!db.shares.accounts.some((a) => a.member === m.id))
      db.shares.accounts.push({
        member: m.id,
        monthly: db.shares.rules[0].min,
        opening_amount: 0,
        opening_units: 0,
        opening_date: m.joined,
      });
  }
  // เงินฝากเดิมเป็นข้อมูลจำลองในหน้า UI จึงสร้างตัวอย่างในฐานกลางเฉพาะเมื่อหมวดนี้ยังว่างทั้งสองตาราง
  if (!db.deposits.accounts.length && !db.deposits.transactions.length) {
    for (const [index, amountCents] of [35000000, 5000000].entries()) {
      const m = db.members.records[index];
      if (!m) continue;
      const account = "SA-" + m.id;
      db.deposits.accounts.push({
        id: account,
        member: m.id,
        balanceCents: amountCents,
        type: index ? "special" : "savings",
        status: "active",
        created: "2026-01-01T09:00:00+07:00",
        demo: true,
      });
      db.deposits.transactions.push({
        id: "demo-opening-" + m.id,
        member: m.id,
        account,
        type: "deposit",
        amountCents,
        reference: "DEMO-OPENING-" + m.id,
        status: "confirmed",
        created: "2026-01-01T09:00:00+07:00",
        confirmed: "2026-01-01T09:00:00+07:00",
        effectiveDate: "2026-01-01",
        description: "ยอดเปิดบัญชีตัวอย่างสำหรับโครงงาน",
        demo: true,
      });
      db.deposits.transactions.push({
        id: "demo-pending-" + m.id,
        member: m.id,
        account,
        type: index ? "withdrawal" : "deposit",
        amountCents: index ? 100000 : 250000,
        reference: "DEMO-PENDING-" + m.id,
        status: "pending",
        created: "2026-11-19T09:00:00+07:00",
        description: "รายการตัวอย่างรอตรวจสอบ",
        channel: "transfer",
        demo: true,
      });
    }
  }
});
console.log(
  "Filled empty demo fields and initial deposit examples. Existing values and passwords preserved.",
);
