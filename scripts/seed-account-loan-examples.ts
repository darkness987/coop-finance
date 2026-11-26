// เพิ่มตัวอย่างในฐานข้อมูลกลางแบบรันซ้ำได้ ไม่เปลี่ยนยอดเงินหรือรายการเดิม
// เรียก: node_modules/.bin/tsx scripts/seed-account-loan-examples.ts
import { updateDatabase } from "../database/store";
import { changeLoans } from "../lib/loans/loans";
updateDatabase((db) => {
  const borrower = db.members.records.find((m) => m.id === "66001239");
  const guarantors = ["66001240", "66001241"].map((id) => {
    const member = db.members.records.find((m) => m.id === id && m.active);
    if (!member) throw Error("ไม่พบสมาชิกผู้ค้ำตัวอย่าง " + id);
    return { member: member.id, name: member.name };
  });
  if (!borrower) throw Error("ไม่พบสมาชิกผู้กู้ตัวอย่าง");
  // สถานะตัวอย่างเพิ่มบัญชียอด 0 เท่านั้น จึงไม่เปลี่ยนเงินฝากหรือสินทรัพย์เดิม
  for (const item of [
    {
      id: "SA-DEMO-66001241",
      member: "66001241",
      type: "savings",
      status: "restricted",
    },
    {
      id: "SP-DEMO-66001242",
      member: "66001242",
      type: "special",
      status: "suspended",
    },
  ]) {
    if (!db.members.records.some((m) => m.id === item.member))
      throw Error("ไม่พบเจ้าของบัญชีตัวอย่าง");
    if (!db.deposits.accounts.some((a) => a.id === item.id))
      db.deposits.accounts.push({
        ...item,
        balanceCents: 0,
        created: new Date().toISOString(),
        demo: true,
      });
  }
  // User เจ้าของคำขอและ Admin อ่านรายการเดียวกัน ไม่มีข้อมูลจำลองแยกในหน้าเว็บ
  const id = "DEMO-GUARANTORS-01";
  if (!db.loans.applications.some((a) => a.id === id)) {
    const product = db.loans.products.find((p) => p.id === "ordinary");
    if (!product) throw Error("ไม่พบประเภทสินเชื่อสามัญ");
    db.loans.applications.push({
      id,
      member: borrower.id,
      product: product.id,
      terms: structuredClone(product),
      amount: 120000,
      months: 60,
      reason:
        "ข้อมูลตัวอย่าง: กู้เพื่อปรับปรุงที่อยู่อาศัย โดยมีผู้ค้ำประกัน 2 คน",
      loanMode: "guaranteed",
      guarantors,
      guarantor: guarantors[0],
      collateral: null,
      disbursementMethod: "cash",
      status: "submitted",
      revision: 1,
      created: new Date().toLocaleDateString("sv-SE", {
        timeZone: "Asia/Bangkok",
      }),
      history: [],
      demo: true,
    });
  }
  // อีกกรณี: สมาชิกหลักเป็นผู้ค้ำให้ผู้กู้อื่น จึงปรากฏในแท็บรายการค้ำประกันของสมาชิกหลัก
  const guaranteeId = "DEMO-GUARANTEE-02";
  if (!db.loans.applications.some((a) => a.id === guaranteeId)) {
    const product = db.loans.products.find((p) => p.id === "ordinary")!;
    const otherBorrower = db.members.records.find(
      (m) => m.id === "66001240" && m.active,
    );
    if (!otherBorrower || !product)
      throw Error("ไม่พบข้อมูลสำหรับตัวอย่างการค้ำประกัน");
    const people = [
      borrower,
      db.members.records.find((m) => m.id === "66001241" && m.active)!,
    ];
    if (people.some((p) => !p)) throw Error("ไม่พบผู้ค้ำตัวอย่างครบ 2 คน");
    const row = {
      id: guaranteeId,
      member: otherBorrower.id,
      product: product.id,
      terms: structuredClone(product),
      amount: 30000,
      months: 24,
      reason:
        "ข้อมูลตัวอย่าง: กู้เพื่อประกอบอาชีพ โดยสมาชิก 66001239 เป็นผู้ค้ำประกัน",
      loanMode: "guaranteed",
      guarantors: people.map((p) => ({ member: p.id, name: p.name })),
      guarantor: { member: borrower.id, name: borrower.name },
      collateral: null,
      disbursementMethod: "cash",
      status: "submitted",
      revision: 1,
      created: new Date().toLocaleDateString("sv-SE", {
        timeZone: "Asia/Bangkok",
      }),
      history: [],
      demo: true,
    };
    db.loans.applications.push(row);
    // ใช้บริการอนุมัติเดียวกับ API เพื่อสร้างสัญญาและตารางผ่อนที่สัมพันธ์กันครบถ้วน
    changeLoans(
      db,
      { id: "demo-seed", role: "admin", member: "" },
      {
        action: "approve",
        id: row.id,
        revision: row.revision,
        note: "อนุมัติข้อมูลตัวอย่างสำหรับสาธิตการค้ำประกัน",
      },
    );
  }
  // เติมหลักทรัพย์ร่วมในสัญญาตัวอย่างที่มีบุคคลค้ำเท่านั้น ไม่เขียนทับรายการที่ผู้ใช้กรอก
  for (const [id, type] of [
    ["DEMO-GUARANTORS-01", "land"],
    ["DEMO-GUARANTEE-02", "house"],
  ]) {
    const row = db.loans.applications.find((a) => a.id === id && a.demo);
    if (!row) continue;
    if (!row.collateral) {
      row.collateral = {
        type,
        owner: db.members.records.find((m) => m.id === row.member)!.name,
        documentNumber:
          type === "house"
            ? "DEMO-GUARANTEE-HOUSE-002"
            : "DEMO-GUARANTEE-LAND-001",
        address:
          type === "house"
            ? "บ้านตัวอย่าง 88/8 แขวงทุ่งสองห้อง เขตหลักสี่ กรุงเทพมหานคร"
            : "ที่ดินตัวอย่าง ตำบลบางแก้ว อำเภอบางพลี จังหวัดสมุทรปราการ",
      };
      row.revision++;
    }
    const contract = db.loans.contracts.find(
      (c) => c.application === row.id && c.demo,
    );
    if (contract && !contract.collateral) {
      contract.collateral = structuredClone(row.collateral);
      contract.collateralReview = {
        approvedLimit: row.amount,
        note: "ข้อมูลประเมินสมมุติสำหรับสาธิตระบบ",
        actor: "demo-seed",
        date: row.created,
      };
    }
  }
});
console.log(
  "เพิ่มตัวอย่างสถานะบัญชีและคำขอสินเชื่อพร้อมผู้ค้ำในฐานข้อมูลกลางแล้ว",
);
