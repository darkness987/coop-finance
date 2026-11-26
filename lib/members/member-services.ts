import { activeDepositAccount } from "../deposits/deposit-scope";
// ระบบดูแลสมาชิก: อ่านภาพรวม ติดตามหุ้น ขอแก้ข้อมูล และส่งคำขอสถานะให้ Admin
import { randomUUID } from "node:crypto";
import type { Database, Row } from "../../database/store";
import type { Actor } from "../auth/session";
import { requireAccess, roleOf } from "../auth/permissions";
import { guarantorRows } from "../loans/loan-guarantor";
import { today } from "../shared/date";
function check(ok: unknown, message: string, status = 400): asserts ok {
  if (!ok) throw Object.assign(new Error(message), { status });
}
// รวมยอดรายสมาชิกแบบอ่านอย่างเดียว ไม่เปิดสิทธิ์รับจ่ายเงิน
export function memberOverview(db: Database, id: string) {
  const m = db.members.records.find((m) => m.id === id);
  check(m, "ไม่พบสมาชิก", 404);
  const period = today().slice(0, 7),
    account = db.shares.accounts.find((a) => a.member === id);
  const principal = (c: Row) =>
    Math.max(
      0,
      Math.round(c.amount * 100) -
        db.loans.payments
          .filter((p) => p.contract === c.id)
          .reduce((s, p) => s + (p.principalCents || 0), 0),
    ) / 100;
  const open = db.loans.contracts.filter((c) =>
    ["approved", "active"].includes(c.status),
  );
  const debt = open
    .filter((c) => c.member === id)
    .reduce((s, c) => s + principal(c), 0);
  const guarantees = open.filter(
    (c) => guarantorRows(c).some((g) => g.member === id) && principal(c) > 0,
  );
  const pending = db.loans.applications.filter(
    (a) =>
      ["submitted", "checking", "needs_documents", "forwarded"].includes(
        a.status,
      ) && !db.loans.contracts.some((c) => c.application === a.id),
  );
  const pendingLoans = pending.filter(
    (a) => a.member === id && activeDepositAccount(a),
  ).length;
  const pendingGuarantees = pending.filter((a) =>
    guarantorRows(a).some((g) => g.member === id),
  ).length;
  const paid = db.shares.payments
    .filter((p) => p.member === id && p.period === period && p.received)
    .reduce((s, p) => s + p.amount, 0);
  const notified = db.shares.payments
    .filter((p) => p.member === id && p.period === period && !p.received)
    .reduce((s, p) => s + p.amount, 0);
  const deposit =
    db.deposits.accounts
      .filter((a) => a.member === id && activeDepositAccount(a))
      .reduce((s, a) => s + a.balanceCents, 0) / 100;
  return {
    id: m.id,
    name: m.name,
    active: m.active,
    joined: m.joined,
    email: m.email || "",
    phone: m.phone || "",
    company: m.profile?.company || "",
    occupation: m.profile?.occupation || "",
    bank: m.receivingAccount?.bank || m.profile?.bank || "",
    bankLast4:
      m.receivingAccount?.accountNumber?.slice(-4) ||
      m.profile?.bankLast4 ||
      "",
    shares:
      (account?.opening_amount || 0) +
      db.shares.payments
        .filter((p) => p.member === id && p.received)
        .reduce((s, p) => s + p.amount, 0),
    deposits: deposit,
    debt,
    guaranteeCount: guarantees.length,
    pendingGuarantees,
    pendingLoans,
    period,
    monthly: account?.monthly || 0,
    paid,
    notified,
    shortfall: Math.max(0, (account?.monthly || 0) - paid),
    blockers: [
      ...(debt > 0 ? ["มีหนี้คงเหลือ"] : []),
      ...(guarantees.length || pendingGuarantees ? ["ยังมีภาระค้ำประกัน"] : []),
      ...(pendingLoans ? ["มีคำขอกู้รอดำเนินการ"] : []),
    ],
  };
}
export function readMemberServices(db: Database, a: Actor) {
  requireAccess(a, "member-services");
  const staff = roleOf(a) !== "member";
  const members = (
    staff
      ? db.members.records
      : db.members.records.filter((m) => m.id === a.member)
  ).map((m) => memberOverview(db, m.id));
  return {
    staff,
    canApprove: roleOf(a) === "admin",
    profileChanges:
      roleOf(a) === "admin"
        ? (db.members.profileChanges || []).toReversed()
        : [],
    members,
    requests: (db.members.serviceRequests || [])
      .filter((r) => staff || r.member === a.member)
      .toReversed(),
    shareChanges: staff
      ? db.shares.changeRequests.filter((r) => r.status === "pending")
      : [],
  };
}
// ทุกการตัดสินตรวจข้อมูลล่าสุดซ้ำ ไม่เชื่อยอดหรือสถานะที่ส่งจากหน้าเว็บ
export function changeMemberServices(db: Database, a: Actor, i: any) {
  requireAccess(a, "member-services", i.action);
  // อนุมัติข้อมูลส่วนตัวได้เฉพาะ Admin และตรวจว่าข้อมูลต้นฉบับยังไม่ถูกแก้ระหว่างรอ
  if (["approve-profile-change", "reject-profile-change"].includes(i.action)) {
    check(roleOf(a) === "admin", "เฉพาะแอดมินอนุมัติข้อมูลสมาชิก", 403);
    const r = (db.members.profileChanges || []).find((r) => r.id === i.id);
    check(r?.status === "pending", "คำขอนี้ถูกตรวจแล้วหรือไม่มีในระบบ", 409);
    const member = db.members.records.find((m) => m.id === r.member);
    check(member, "ไม่พบสมาชิก", 404);
    if (i.action === "approve-profile-change") {
      const current = {
        name: member.name,
        email: member.email,
        phone: member.phone,
        profile: member.profile || {},
      };
      check(
        JSON.stringify(current) === JSON.stringify(r.before),
        "ข้อมูลสมาชิกเปลี่ยนระหว่างรอ กรุณาไม่อนุมัติแล้วให้สมาชิกส่งใหม่",
        409,
      );
      Object.assign(member, {
        name: r.proposed.name,
        email: r.proposed.email,
        phone: r.proposed.phone,
        profile: structuredClone(r.proposed.profile),
      });
    } else
      check(
        typeof i.note === "string" &&
          i.note.trim().length >= 3 &&
          i.note.length <= 1000,
        "กรุณาระบุเหตุผลไม่อนุมัติ 3–1,000 ตัวอักษร",
      );
    Object.assign(r, {
      status: i.action === "approve-profile-change" ? "approved" : "rejected",
      note: String(i.note || "").trim(),
      reviewedBy: a.id,
      reviewedAt: new Date().toISOString(),
    });
    return { id: r.id };
  }
  const requests = (db.members.serviceRequests ||= []),
    date = new Date().toISOString();
  const note = typeof i.note === "string" ? i.note.trim() : "";
  if (["request-correction", "create-status-request"].includes(i.action)) {
    memberOverview(db, i.member);
    check(
      note.length >= 3 && note.length <= 1000,
      "กรุณาระบุรายละเอียด 3–1,000 ตัวอักษร",
    );
    const kind = i.action === "request-correction" ? "correction" : i.kind;
    check(
      ["correction", "resign", "suspend"].includes(kind),
      "ประเภทคำขอไม่ถูกต้อง",
    );
    check(
      !requests.some(
        (r) =>
          r.member === i.member &&
          r.kind === kind &&
          ["pending", "answered", "forwarded"].includes(r.status),
      ),
      "มีคำขอประเภทนี้รอดำเนินการแล้ว",
      409,
    );
    const row = {
      id: randomUUID(),
      member: i.member,
      kind,
      note,
      status: "pending",
      created: date,
      createdBy: a.id,
      history: [{ action: i.action, actor: a.id, date, note }],
    };
    requests.push(row);
    return { id: row.id };
  }
  if (i.action === "review-share-change") {
    const r = db.shares.changeRequests.find(
      (r) => r.id === i.id && r.status === "pending",
    );
    check(r, "คำขอปรับยอดนี้ตรวจสอบแล้วหรือไม่มีในระบบ", 409);
    check(r.reviewStatus !== "reviewed", "ส่งต่อคำขอนี้แล้ว", 409);
    check(note.length >= 3 && note.length <= 1000, "กรุณาระบุผลตรวจสอบ");
    r.reviewStatus = "reviewed";
    r.reviewNote = note;
    r.reviewedBy = a.id;
    r.reviewedAt = date;
    return { id: r.id };
  }
  const r = requests.find((r) => r.id === i.id);
  check(r, "ไม่พบคำขอ", 404);
  if (i.action === "respond-correction") {
    check(
      r.member === a.member &&
        r.kind === "correction" &&
        r.status === "pending",
      "ไม่มีสิทธิ์ตอบคำขอนี้",
      403,
    );
    check(
      note.length >= 3 && note.length <= 1000,
      "กรุณาระบุข้อมูลที่แก้ไขแล้ว",
    );
    r.response = note;
    r.status = "answered";
  } else if (i.action === "complete-correction") {
    check(
      r.kind === "correction" && ["pending", "answered"].includes(r.status),
      "คำขอไม่อยู่ระหว่างตรวจสอบ",
      409,
    );
    r.status = "completed";
  } else if (i.action === "forward-status-request") {
    check(
      ["resign", "suspend"].includes(r.kind) && r.status === "pending",
      "ส่งต่อคำขอนี้ไม่ได้",
      409,
    );
    const snapshot = memberOverview(db, r.member);
    check(
      r.kind !== "resign" || snapshot.blockers.length === 0,
      "ยังส่งอนุมัติลาออกไม่ได้: " + snapshot.blockers.join(", "),
    );
    r.reviewSnapshot = {
      debt: snapshot.debt,
      guaranteeCount: snapshot.guaranteeCount,
      pendingLoans: snapshot.pendingLoans,
      pendingGuarantees: snapshot.pendingGuarantees,
      checkedAt: date,
    };
    r.status = "forwarded";
  } else if (
    ["approve-status-request", "reject-status-request"].includes(i.action)
  ) {
    check(r.status === "forwarded", "ต้องตรวจและส่งต่อก่อนอนุมัติ", 409);
    if (i.action === "approve-status-request") {
      const snapshot = memberOverview(db, r.member);
      check(
        r.kind !== "resign" || snapshot.blockers.length === 0,
        "ยังลาออกไม่ได้: " + snapshot.blockers.join(", "),
      );
      const m = db.members.records.find((m) => m.id === r.member)!;
      m.active = 0;
      m.membershipStatus = r.kind === "resign" ? "resigned" : "suspended";
      r.status = "approved";
    } else {
      check(
        note.length >= 3 && note.length <= 1000,
        "กรุณาระบุเหตุผลไม่อนุมัติ",
      );
      r.status = "rejected";
    }
  } else throw Object.assign(new Error("คำสั่งไม่ถูกต้อง"), { status: 400 });
  r.history.push({ action: i.action, actor: a.id, date, note });
  r.updated = date;
  return { id: r.id };
}
