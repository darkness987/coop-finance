import { activeDepositAccount } from "../deposits/deposit-scope";
import { applicationReview } from "./application-review";
import { readCollateral, readLoanCollateral } from "./collateral";
import { membershipMonths, membershipEligible } from "./membership";
// ระบบ: สินเชื่อ วงเงิน ผู้ค้ำ และชำระหนี้ | ไฟล์: loans.ts
import { readLoanPolicy, validateLoanPolicy } from "./loan-policy";
import { requireAccess, roles, roleOf } from "../auth/permissions";
import { loanDisbursement } from "./loan-disbursement";
import {
  changeRepayment,
  applyLoanRepayment,
  linkedAccount,
} from "./loan-repayment";
import { borrowingMode } from "./loan-capacity";
import {
  loanSecurity,
  findGuarantor,
  findGuarantors,
  requireGuarantor,
  readGuarantees,
} from "./loan-guarantor";
import { issueOtp, verifyOtp } from "../auth/otp";
import { requireInitialShare } from "../shares/initial-share";
// ระบบสินเชื่อ: ร่าง → ส่งตรวจ → ตรวจข้อมูล → ส่งอนุมัติ → สัญญา → จ่ายเงิน → รับชำระ
import { randomUUID } from "node:crypto";
import type { Database } from "../../database/store";
import { admin, type Actor } from "../auth/session";
import { cents, text, requireMember } from "../deposits/deposits";
import { buildSchedule, addMonths } from "./calculator/repayment";
const today = () =>
  new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
// ฟังก์ชัน readLoans: อ่านข้อมูลในส่วน readLoans
export function readLoans(db: Database, a: Actor) {
  requireAccess(a, "loans");
  requireInitialShare(db, a);
  const own = (r: any) => a.role === "admin" || r.member === a.member;
  const apps = db.loans.applications.filter(own),
    contracts = db.loans.contracts.filter(own);
  return {
    assetPolicy: readLoanPolicy(db),
    repaymentRequests: (db.loans.repaymentRequests || []).filter(own),
    depositAccounts: (db.deposits?.accounts || [])
      .filter(
        (r) =>
          a.role === "member" &&
          r.member === a.member &&
          activeDepositAccount(r),
      )
      .map((r) => ({
        id: r.id,
        type: r.type,
        balanceCents: r.balanceCents,
        status: r.status,
      })),
    linkedAccount: a.role === "member" ? linkedAccount(db, a.member) : null,
    security: a.role === "member" ? loanSecurity(db, a.member) : null,
    guarantees: a.role === "member" ? readGuarantees(db, a.member) : [],
    products: db.loans.products.map((p) => ({
      ...p,
      assetPercent: readLoanPolicy(db, p.id).totalPercent,
    })),
    securityByProduct:
      a.role === "member"
        ? Object.fromEntries(
            db.loans.products.map((p) => [
              p.id,
              loanSecurity(db, a.member, 0, "", p.id),
            ]),
          )
        : {},
    applications: apps.toReversed().map((r) => ({
      ...r,
      borrowingCapacity: loanSecurity(db, r.member, r.amount, r.id, r.product),
      ...(a.role === "admin" ? { review: applicationReview(db, r) } : {}),
    })),
    contracts,
    schedules: db.loans.schedules.filter((s) =>
      contracts.some((c) => c.id === s.contract),
    ),
    payments: db.loans.payments.filter(own),
  };
}
// ฟังก์ชัน application: ทำงานส่วน application ของระบบนี้
function application(db: Database, a: Actor, id: string) {
  const row = db.loans.applications.find(
    (r) => r.id === id && (a.role === "admin" || r.member === a.member),
  );
  if (!row) throw new Error("ไม่พบคำขอ");
  return row;
}
// ฟังก์ชัน loanEstimate: ทำงานส่วน loanEstimate ของระบบนี้
export function loanEstimate(db: Database, a: Actor, i: any) {
  const member = db.members.records.find((m) => m.id === a.member);
  if (!member) throw new Error("ไม่พบสมาชิก");
  const p = db.loans.products.find((p) => p.id === i.product && p.active);
  if (!p || p.annualRate == null) throw new Error("ประเภทนี้ยังไม่เปิดรับคำขอ");
  const amount = cents(i.amount) / 100,
    months = Number(i.months);
  const calculation = buildSchedule(
    amount,
    p.annualRate,
    months,
    addMonths(today(), 1),
  );
  const existingDebt = db.loans.contracts
    .filter((c) => c.member === a.member && c.status !== "closed")
    .reduce((sum, c) => sum + Number(c.installment), 0);
  const income = Number(member.profile?.income || 0);
  const security = loanSecurity(
    db,
    a.member,
    amount,
    typeof i.id === "string" &&
      db.loans.applications.some((r) => r.id === i.id && r.member === a.member)
      ? i.id
      : "",
    p.id,
  );
  const loanMode = borrowingMode(i);
  readLoanCollateral(loanMode, i.collateral);
  const guarantors =
    loanMode === "guaranteed" ? findGuarantors(db, a.member, i) : [];
  const guarantor = guarantors[0] || null;
  const checks = [
    { label: "สถานะสมาชิกใช้งาน", passed: !!member.active },
    {
      label:
        loanMode === "asset"
          ? `ยอดกู้ไม่เกินสิทธิ์กู้ด้วยสินทรัพย์ ${security.totalPercent}%`
          : loanMode === "collateral"
            ? "ระบุหลักประกันที่ดินหรือบ้านเพื่อให้เจ้าหน้าที่ตรวจประเมิน"
            : "ระบุผู้ค้ำประกัน 2 คนที่ใช้งานได้และไม่ซ้ำกัน",
      passed:
        loanMode === "asset"
          ? !security.requiresGuarantor
          : loanMode === "collateral"
            ? !!readCollateral(i.collateral)
            : guarantors.length === 2,
    },
    {
      label: "อายุสมาชิกอย่างน้อย " + membershipMonths(p.id) + " เดือน",
      passed: membershipEligible(member.joined, p.id, today()),
    },
    {
      label: "วงเงินและระยะเวลาตามเงื่อนไข",
      passed:
        amount >= p.minAmount && months >= p.minMonths && months <= p.maxMonths,
    },
    {
      id: "income-ratio",
      label: "ภาระผ่อนรวมไม่เกิน 40% ของรายได้",
      passed:
        income > 0 &&
        Number(calculation.installment) + existingDebt <= income * 0.4,
    },
  ];
  return {
    eligible: checks.every((c) => c.passed),
    checks,
    calculation,
    income,
    existingDebt,
    security,
    guarantor,
  };
}
// ฟังก์ชัน changeLoans: ตรวจคำสั่งและบันทึกการเปลี่ยนแปลงในส่วน changeLoans
export function changeLoans(db: Database, a: Actor, i: any) {
  requireAccess(a, "loans", i.action);
  requireInitialShare(db, a);
  if (
    [
      "repayment-otp",
      "request-repayment",
      "confirm-repayment",
      "reject-repayment",
    ].includes(i.action)
  )
    return changeRepayment(db, a, i);
  if (i.action === "lookup-guarantor") {
    if (a.role !== "member") throw new Error("เฉพาะสมาชิกผู้ยื่นคำขอ");
    const guarantor = findGuarantor(db, a.member, i.guarantorMember);
    if (!guarantor) throw new Error("กรุณากรอกเลขสมาชิกผู้ค้ำประกัน");
    return guarantor;
  }
  if (i.action === "estimate") return loanEstimate(db, a, i);
  if (i.action === "choose-disbursement") {
    const row = application(db, a, i.id);
    if (
      a.role !== "member" ||
      !["draft", "needs_documents"].includes(row.status)
    )
      throw Error("เลือกวิธีรับเงินได้ก่อนส่งคำขอเท่านั้น");
    if (row.revision !== i.revision)
      throw Error("ข้อมูลเปลี่ยนแล้ว กรุณารีเฟรช");
    Object.assign(row, loanDisbursement(db, row.member, i.disbursementMethod));
    row.revision++;
    row.history.push({
      action: "choose-disbursement",
      date: today(),
      actor: a.id,
    });
    return { id: row.id };
  }
  if (i.action === "save") {
    const row = application(db, a, i.id);
    if (
      a.role !== "member" ||
      !["draft", "needs_documents"].includes(row.status)
    )
      throw new Error("แก้ไขได้เฉพาะร่างหรือคำขอที่ส่งกลับ");
    if (i.revision !== row.revision)
      throw new Error("ข้อมูลเปลี่ยนแล้ว กรุณารีเฟรช");
    const p = db.loans.products.find((p) => p.id === i.product && p.active);
    if (!p) throw new Error("ผลิตภัณฑ์ไม่เปิดใช้งาน");
    const amount = cents(i.amount) / 100,
      months = Number(i.months);
    if (
      amount < p.minAmount ||
      !Number.isInteger(months) ||
      months < p.minMonths ||
      months > p.maxMonths
    )
      throw new Error("วงเงินหรือระยะเวลาไม่ผ่านเงื่อนไข");
    const guarantors =
      borrowingMode(i) === "guaranteed"
        ? findGuarantors(db, row.member, i)
        : [];
    Object.assign(row, {
      product: p.id,
      terms: structuredClone(p),
      amount,
      months,
      reason: text(i.reason, "วัตถุประสงค์"),
      loanMode: borrowingMode(i),
      collateral: readLoanCollateral(borrowingMode(i), i.collateral),
      guarantors,
      guarantor: guarantors[0] || null,
      revision: row.revision + 1,
    });
    row.history.push({
      action: "save",
      date: today(),
      actor: a.id,
      note: "แก้ไขร่างคำขอ",
    });
    return { id: row.id };
  }
  if (i.action === "asset-policy") {
    admin(a);
    const policy = validateLoanPolicy(i);
    if (i.product !== undefined) {
      const product = db.loans.products.find((p) => p.id === i.product);
      if (!product) throw Error("ไม่พบประเภทสินเชื่อ");
      product.assetPercent = policy.totalPercent;
      product.policyUpdated = new Date().toISOString();
      product.policyUpdatedBy = a.id;
      return;
    }
    db.loans.policy = {
      totalPercent: policy.totalPercent,
      firstPercent: policy.firstPercent,
      updated: new Date().toISOString(),
      updatedBy: a.id,
    };
    return;
  }
  if (i.action === "product") {
    admin(a);
    const p = db.loans.products.find((p) => p.id === i.id);
    if (!p) throw new Error("ไม่พบผลิตภัณฑ์");
    const rate = Number(i.annualRate),
      months = Number(i.maxMonths);
    if (
      !Number.isFinite(rate) ||
      rate < 0 ||
      rate > 30 ||
      !Number.isInteger(months) ||
      months < 1 ||
      months > 360
    )
      throw new Error("เงื่อนไขไม่ถูกต้อง");
    Object.assign(p, {
      annualRate: rate,
      maxMonths: months,
      active: i.active === true,
    });
    return;
  }
  if (i.action === "create") {
    requireMember(db, a.member);
    const p = db.loans.products.find((p) => p.id === i.product && p.active);
    if (!p) throw new Error("สินเชื่อนี้ไม่เปิดใช้งาน");
    const amount = cents(i.amount) / 100,
      months = Number(i.months);
    if (
      amount < p.minAmount ||
      !Number.isInteger(months) ||
      months < p.minMonths ||
      months > p.maxMonths
    )
      throw new Error("วงเงินหรือระยะเวลาไม่ผ่านเงื่อนไข");
    const id = randomUUID();
    const guarantors =
      borrowingMode(i) === "guaranteed" ? findGuarantors(db, a.member, i) : [];
    db.loans.applications.push({
      id,
      member: a.member,
      product: p.id,
      terms: structuredClone(p),
      amount,
      months,
      reason: text(i.reason, "วัตถุประสงค์"),
      loanMode: borrowingMode(i),
      collateral: readLoanCollateral(borrowingMode(i), i.collateral),
      guarantors,
      guarantor: guarantors[0] || null,
      disbursementMethod: i.disbursementMethod || null,
      status: "draft",
      revision: 1,
      created: today(),
      history: [],
    });
    return { id };
  }
  if (["disburse", "repay"].includes(i.action)) {
    admin(a);
    const c = db.loans.contracts.find((c) => c.id === i.id);
    if (!c) throw new Error("ไม่พบสัญญา");
    const reference = text(i.reference, "เลขอ้างอิง");
    if (
      db.loans.payments.some((p) => p.reference === reference) ||
      db.loans.contracts.some((c) => c.disbursementReference === reference)
    )
      throw new Error("เลขอ้างอิงถูกใช้แล้ว");
    if (i.action === "disburse") {
      if (c.status !== "approved") throw new Error("สัญญานี้จ่ายเงินแล้ว");
      Object.assign(
        c,
        loanDisbursement(
          db,
          c.member,
          i.disbursementMethod || c.disbursementMethod,
        ),
      );
      c.status = "active";
      c.disbursementReference = reference;
      c.disbursed = today();
      return;
    }
    if (c.status !== "active")
      throw new Error("สัญญายังไม่จ่ายเงินหรือปิดแล้ว");
    const amount = cents(i.amount);
    const reserved = (db.loans.repaymentRequests || [])
      .filter((r) => r.contract === c.id && r.status === "pending")
      .reduce((s, r) => s + r.amountCents, 0);
    const outstanding = db.loans.schedules
      .filter((s) => s.contract === c.id)
      .reduce(
        (sum, s) =>
          sum +
          s.principalCents +
          s.interestCents -
          s.paidPrincipal -
          s.paidInterest,
        0,
      );
    if (amount > outstanding - reserved)
      throw Error(
        "ยอดบางส่วนมีรายการแจ้งชำระรอตรวจสอบ กรุณายืนยันรายการนั้นก่อน",
      );
    applyLoanRepayment(db, c, amount, reference);
    return;
  }
  const row = application(db, a, i.id);
  if (i.revision !== row.revision)
    throw new Error("ข้อมูลเปลี่ยนแล้ว กรุณารีเฟรช");
  if (["request-otp", "submit"].includes(i.action)) {
    if (
      a.role !== "member" ||
      !["draft", "needs_documents"].includes(row.status)
    )
      throw new Error("ยังส่งคำขอไม่ได้");
    const m = requireMember(db, row.member);
    const income = Number(m.profile?.income || 0);
    const schedule = buildSchedule(
      row.amount,
      row.terms.annualRate,
      row.months,
      addMonths(today(), 1),
    );
    const existingDebt = db.loans.contracts
      .filter((c) => c.member === row.member && c.status !== "closed")
      .reduce((sum, c) => sum + Number(c.installment), 0);
    if (!membershipEligible(m.joined, row.product, today()))
      throw new Error(
        "ต้องเป็นสมาชิกอย่างน้อย " + membershipMonths(row.product) + " เดือน",
      );
    if (
      income <= 0 ||
      Number(schedule.installment) + existingDebt > income * 0.4
    )
      throw new Error(
        "รายได้ที่บันทึกไว้ไม่เพียงพอต่อค่างวด (ไม่เกิน 40% ของรายได้)",
      );
    const { security, guarantor, guarantors, loanMode, collateral } =
      requireGuarantor(db, row);
    const receiving = loanDisbursement(db, row.member, row.disbursementMethod);
    // ผูก OTP กับเจ้าของคำขอและข้อมูลฉบับที่ตรวจแล้ว แก้ข้อมูลต้องขอรหัสใหม่
    const binding = {
      user: a.id,
      purpose: "loan-submission",
      member: row.member,
      application: row.id,
      revision: row.revision,
      amount: row.amount,
      months: row.months,
      reason: row.reason,
      terms: row.terms,
      guarantor,
      guarantors,
      collateral,
      ...receiving,
      loanMode,
    };
    const challenges = (db.loans.submissionOtps ||= []);
    if (i.action === "request-otp") return issueOtp(challenges, binding);
    const otpError = verifyOtp(challenges, binding, i.challengeId, i.otp);
    // คืน error เพื่อให้ transaction บันทึกจำนวนครั้งที่กรอกผิด
    if (otpError) return { error: otpError };
    row.collateral = collateral;
    row.securityAtSubmission = security;
    row.loanMode = loanMode;
    row.guarantor = guarantor;
    row.guarantors = guarantors;
    Object.assign(row, receiving);
    const review = applicationReview(db, row);
    row.reviewAtSubmission = {
      member: review.member,
      income: review.income,
      existingMonthly: review.existingMonthly,
      outstandingPrincipal: review.outstandingPrincipal,
      installment: review.calculation?.installment || null,
      checkedAt: review.checkedAt,
    };
    row.otpVerifiedAt = new Date().toISOString();
    row.status = "submitted";
  } else {
    admin(a);
    if (i.action === "check" && row.status === "submitted")
      row.status = "checking";
    else if (i.action === "request-correction" && row.status === "checking") {
      row.status = "needs_documents";
      row.note = text(i.note, "ข้อมูลที่ต้องแก้ไข");
    } else if (i.action === "forward" && row.status === "checking") {
      row.status = "forwarded";
      db.loans.handoffs.push({
        id: randomUUID(),
        application: row.id,
        date: today(),
      });
    } else if (
      ["approve", "reject"].includes(i.action) &&
      ["submitted", "checking", "needs_documents", "forwarded"].includes(
        row.status,
      )
    ) {
      if (i.action === "approve") {
        const member = requireMember(db, row.member);
        if (!membershipEligible(member.joined, row.product, today()))
          throw new Error(
            "ต้องเป็นสมาชิกอย่างน้อย " +
              membershipMonths(row.product) +
              " เดือน",
          );
        requireGuarantor(db, row);
        if (!applicationReview(db, row).incomeEligible)
          throw Error(
            "รายได้หรือภาระผ่อนล่าสุดไม่ผ่านเกณฑ์ 40% กรุณาตรวจข้อมูลสมาชิกก่อนอนุมัติ",
          );
        if (row.collateral) {
          const approvedLimit = cents(i.collateralLimit) / 100;
          if (approvedLimit < row.amount)
            throw Error("วงเงินประเมินหลักประกันต้องครอบคลุมยอดกู้");
          row.collateralReview = {
            approvedLimit,
            note: text(i.note, "ผลตรวจประเมินหลักประกัน"),
            actor: a.id,
            date: today(),
          };
        }
      }
      row.status = i.action === "approve" ? "approved" : "rejected";
      db.loans.decisions.push({
        id: randomUUID(),
        application: row.id,
        status: row.status,
        note:
          i.action === "reject" ? text(i.note, "เหตุผล") : String(i.note || ""),
        actor: a.id,
        date: today(),
      });
      if (i.action === "approve") {
        const id = randomUUID(),
          firstDue = addMonths(today(), 1),
          schedule = buildSchedule(
            row.amount,
            row.terms.annualRate,
            row.months,
            firstDue,
          );
        db.loans.contracts.push({
          id,
          // ใช้เลขสูงสุดที่ยังอยู่ ป้องกันเลขสัญญาซ้ำเมื่อมีการลบรายการกลางชุด
          number:
            "LN-" +
            (
              db.loans.contracts.reduce((max, c) => {
                const match = /^LN-(\d+)$/.exec(String(c.number || ""));
                return Math.max(max, match ? Number(match[1]) : 0);
              }, 0) + 1
            )
              .toString()
              .padStart(5, "0"),
          application: row.id,
          member: row.member,
          ...(row.demo ? { demo: true } : {}),
          disbursementMethod: row.disbursementMethod,
          disbursementAccount: row.disbursementAccount,
          guarantors: structuredClone(row.guarantors || []),
          loanMode: borrowingMode(row),
          collateral: row.collateral ? structuredClone(row.collateral) : null,
          collateralReview: row.collateralReview
            ? structuredClone(row.collateralReview)
            : null,
          securityAtApproval: loanSecurity(
            db,
            row.member,
            row.amount,
            row.id,
            row.product,
          ),
          guarantor: row.guarantor ? structuredClone(row.guarantor) : null,
          amount: row.amount,
          annualRate: row.terms.annualRate,
          months: row.months,
          status: "approved",
          approved: today(),
          installment: schedule.installment,
          firstDue,
        });
        for (const s of schedule.rows)
          db.loans.schedules.push({
            contract: id,
            number: s.number,
            dueDate: s.dueDate,
            principalCents: Math.round(Number(s.principal) * 100),
            interestCents: Math.round(Number(s.interest) * 100),
            paidPrincipal: 0,
            paidInterest: 0,
          });
      }
    } else throw new Error("ไม่สามารถทำรายการในสถานะนี้");
  }
  row.revision++;
  row.history.push({
    action: i.action,
    date: today(),
    actor: a.id,
    note: String(i.note || ""),
  });
}
