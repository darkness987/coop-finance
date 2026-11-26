// ระบบ: หุ้นสมาชิก การส่งหุ้น และยอดสะสม | ไฟล์: shares.ts
import { sharePeriodTotals } from "./share-period";
import { randomUUID } from "node:crypto";
import { initialShareFromRows } from "./initial-share";
// ระบบหุ้น | กฎหุ้น รายการรับเงิน ยอดสะสม และคำขอปรับยอดรายเดือน

import { currentMember } from "../shared/context";
import { today } from "../shared/date";
import { check, integer, RequestError } from "../shared/validation";
import { rulesFor } from "./share-accounts";
import { requireActiveMember } from "../members/members";
import type { CoopData } from "../shared/data-types";

// ฟังก์ชัน amountFor: ทำงานส่วน amountFor ของระบบนี้
function amountFor(data: CoopData, amount: unknown): asserts amount is number {
  const { min, price } = rulesFor(data);
  check(
    integer(amount, min, Number.MAX_SAFE_INTEGER) && amount % price === 0,
    "ยอดต้องไม่ต่ำกว่าขั้นต่ำและหารด้วยราคาหุ้นลงตัว",
  );
}

// ตรวจยอดส่งเพิ่ม โดยอนุญาตยอดปิดงวดที่ต่ำกว่าขั้นต่ำรายเดือน
// ฟังก์ชัน paymentAmountFor: ทำงานส่วน paymentAmountFor ของระบบนี้
function paymentAmountFor(
  data: CoopData,
  amount: unknown,
  member: string,
  period: string,
  price = rulesFor(data).price,
): asserts amount is number {
  const account = data.share_accounts.find((row) => row.member === member);
  check(account, "ไม่พบบัญชีหุ้น", 404);
  const totals = sharePeriodTotals(
    data.share_payments,
    member,
    period,
    account.monthly,
  );
  const minimum =
    totals.paidAmount > 0 && totals.remainingAmount > 0
      ? Math.min(rulesFor(data).min, totals.remainingAmount)
      : rulesFor(data).min;
  check(
    integer(amount, minimum, Number.MAX_SAFE_INTEGER) && amount % price === 0,
    "ยอดส่งหุ้นไม่ถูกต้อง ตรวจสอบยอดขั้นต่ำและมูลค่าหุ้น",
  );
}

// ฟังก์ชัน nextId: ทำงานส่วน nextId ของระบบนี้
function nextId(rows: { id: number }[]) {
  return rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
}

// ยอดสะสมรวมยอดยกมาและรายการที่ยืนยันรับเงินแล้ว
// ฟังก์ชัน readShares: อ่านข้อมูลในส่วน readShares
export function readShares(data: CoopData, admin: boolean) {
  const visible = (row: { member: string }) =>
    admin || row.member === currentMember();
  const payments = data.share_payments
    .filter(visible)
    .sort((a, b) => b.period.localeCompare(a.period) || b.id - a.id);
  const accounts = data.share_accounts
    .filter(visible)
    .sort((a, b) => a.member.localeCompare(b.member))
    .map((account) => {
      let amount = account.opening_amount;
      let units = account.opening_units;
      for (const payment of payments) {
        if (payment.member === account.member && payment.received !== null) {
          amount += payment.amount;
          units += payment.amount / payment.price;
        }
      }
      return {
        member: account.member,
        monthly: account.monthly,
        amount,
        units,
      };
    });

  return {
    activation: admin
      ? null
      : initialShareFromRows(
          data.share_accounts,
          data.share_payments,
          currentMember(),
        ),
    rules: rulesFor(data),
    accounts,
    payments,
    changes: data.share_change_requests
      .filter(visible)
      .sort((a, b) => b.id - a.id),
    period: today().slice(0, 7),
  };
}

// แยกคำสั่งตามบทบาทและประเภทการทำรายการหุ้น
// ฟังก์ชัน changeShares: ตรวจคำสั่งและบันทึกการเปลี่ยนแปลงในส่วน changeShares
export function changeShares(
  data: CoopData,
  admin: boolean,
  input: Record<string, unknown>,
) {
  const { action, id, amount } = input;
  if (admin && action === "record-payment") {
    const member = typeof input.member === "string" ? input.member : "";
    const account = data.share_accounts.find((row) => row.member === member);
    check(account, "ไม่พบบัญชีหุ้น", 404);
    check(
      data.members.some((row) => row.id === member && row.active),
      "สมาชิกไม่ได้ใช้งาน",
    );
    check(
      input.method === "เงินสด" || input.method === "เงินโอน",
      "วิธีชำระไม่ถูกต้อง",
    );
    check(
      typeof input.requestId === "string" &&
        input.requestId.length >= 8 &&
        input.requestId.length <= 100,
      "ข้อมูลคำขอไม่ถูกต้อง",
    );
    const prior = data.share_payments.find(
      (row) => row.requestId === input.requestId,
    );
    if (prior) {
      check(
        prior.member === member &&
          prior.amount === amount &&
          prior.method === input.method,
        "คำขอนี้ถูกใช้แล้ว",
        409,
      );
      return;
    }
    const date = today(),
      period = date.slice(0, 7);
    check(
      !data.share_payments.some(
        (row) =>
          row.member === member && row.period === period && !row.received,
      ),
      "มีรายการรอตรวจสอบ กรุณายืนยันรายการเดิมก่อน",
      409,
    );
    paymentAmountFor(data, amount, member, period);
    const totals = sharePeriodTotals(
      data.share_payments,
      member,
      period,
      account.monthly,
    );
    check(
      amount <= totals.remainingAmount,
      "ยอดส่งหุ้นเกินยอดที่ยังต้องส่งของงวดนี้",
    );
    const initial = initialShareFromRows(
      data.share_accounts,
      data.share_payments,
      member,
    ).required;
    data.share_payments.push({
      id: nextId(data.share_payments),
      member,
      period,
      amount,
      price: rulesFor(data).price,
      method: input.method,
      date,
      received: date,
      reference: `SH-${randomUUID().toUpperCase()}`,
      requestId: input.requestId,
      ...(initial ? { initial: true } : {}),
    });
    if (initial) {
      account.initial_payment_required = false;
      account.initial_payment_completed = date;
    }
  } else if (!admin && (action === "notify" || action === "notify-initial")) {
    const activation = initialShareFromRows(
      data.share_accounts,
      data.share_payments,
      currentMember(),
    );
    if (action === "notify-initial")
      check(activation.required, "สมาชิกส่งหุ้นครั้งแรกแล้ว", 409);
    if (activation.required)
      check(
        !activation.pending,
        "มีรายการส่งหุ้นครั้งแรกรอยืนยันอยู่แล้ว",
        409,
      );
    requireActiveMember(data);
    check(
      data.share_accounts.some((account) => account.member === currentMember()),
      "ไม่พบบัญชีหุ้น",
      404,
    );
    const { method } = input;
    if (action === "notify")
      check(
        method === "เงินโอน",
        "ส่งหุ้นออนไลน์ได้เฉพาะเงินโอน เงินสดกรุณาติดต่อเจ้าหน้าที่",
      );
    check(method === "เงินสด" || method === "เงินโอน", "วิธีชำระไม่ถูกต้อง");
    const date = today();
    const period = date.slice(0, 7);
    paymentAmountFor(data, amount, currentMember(), period);
    const account = data.share_accounts.find(
      (account) => account.member === currentMember(),
    )!;
    const totals = sharePeriodTotals(
      data.share_payments,
      currentMember(),
      period,
      account.monthly,
    );
    check(
      !data.share_payments.some(
        (row) =>
          row.member === currentMember() &&
          row.period === period &&
          !row.received,
      ),
      "มีรายการส่งหุ้นรอตรวจสอบของงวดนี้แล้ว",
      409,
    );
    check(
      activation.required || !totals.complete,
      "งวดนี้ส่งหุ้นครบยอดที่กำหนดแล้ว",
      409,
    );
    if (input.requestId !== undefined) {
      check(
        typeof input.requestId === "string" &&
          input.requestId.length >= 8 &&
          input.requestId.length <= 100,
        "ข้อมูลคำขอไม่ถูกต้อง",
      );
      check(
        !data.share_payments.some(
          (row) =>
            row.member === currentMember() && row.requestId === input.requestId,
        ),
        "คำขอส่งหุ้นนี้บันทึกแล้ว กรุณาตรวจประวัติ",
        409,
      );
    }

    // รายการใหม่จะเพิ่มเข้ายอดสะสมเมื่อยืนยันรับเงิน
    data.share_payments.push({
      ...(activation.required ? { initial: true } : {}),
      ...(typeof input.requestId === "string"
        ? { requestId: input.requestId }
        : {}),
      id: nextId(data.share_payments),
      member: currentMember(),
      period,
      amount,
      price: rulesFor(data).price,
      method,
      date,
      received: null,
      reference: null,
    });
  } else if (!admin && action === "update-pending") {
    // แก้รายการเดิมได้เฉพาะเจ้าของและก่อนรับเงินจริง ไม่สร้างรายการซ้ำ
    requireActiveMember(data);
    const row = data.share_payments.find(
      (payment) => payment.id === id && payment.member === currentMember(),
    );
    check(row, "ไม่พบรายการส่งหุ้น", 404);
    check(
      !row.received,
      "รายการนี้ยืนยันรับเงินแล้ว แก้ไขไม่ได้ กรุณาตรวจประวัติ",
      409,
    );
    check(
      row.amount === input.expectedAmount &&
        row.method === input.expectedMethod &&
        row.price === input.expectedPrice,
      "รายการถูกเปลี่ยนแล้ว กรุณาเปิดแก้ไขใหม่",
      409,
    );
    paymentAmountFor(data, amount, currentMember(), row.period, row.price);
    check(amount % row.price === 0, "ยอดต้องหารด้วยราคาหุ้นของรายการเดิมลงตัว");
    check(
      input.method === "เงินโอน" ||
        (row.initial === true && input.method === "เงินสด"),
      "ส่งหุ้นออนไลน์ได้เฉพาะเงินโอน เงินสดกรุณาติดต่อเจ้าหน้าที่",
    );
    Object.assign(row, { amount, method: input.method });
  } else if (admin && action === "receive") {
    const suppliedReference =
      typeof input.reference === "string"
        ? input.reference.trim().toUpperCase()
        : "";
    check(suppliedReference.length <= 100, "เลขอ้างอิงการรับเงินยาวเกินกำหนด");
    const row = data.share_payments.find((item) => item.id === id);
    check(row, "ไม่พบรายการส่งหุ้น", 404);
    if (row.received) {
      check(
        !suppliedReference || row.reference === suppliedReference,
        "รายการนี้ยืนยันแล้ว",
        409,
      );
      return;
    }
    // ป้องกันเจ้าหน้าที่รับเงินจากหน้าจอเก่า หลังสมาชิกแก้ยอดหรือวิธีชำระ
    check(
      row.amount === input.expectedAmount &&
        row.method === input.expectedMethod &&
        row.price === input.expectedPrice,
      "สมาชิกแก้ไขรายการแล้ว กรุณาตรวจยอดล่าสุดก่อนยืนยันรับเงิน",
      409,
    );
    // สร้างเลขอ้างอิงเฉพาะครั้งแรก ไม่ให้แอดมินต้องพิมพ์เอง
    const reference =
      suppliedReference || `SH-${row.id}-${randomUUID().toUpperCase()}`;
    check(
      !data.share_payments.some(
        (item) => item.id !== id && item.reference === reference,
      ),
      "เลขอ้างอิงนี้ถูกใช้แล้ว",
      409,
    );
    const account = data.share_accounts.find(
      (account) => account.member === row.member,
    );
    const firstReceipt =
      initialShareFromRows(data.share_accounts, data.share_payments, row.member)
        .required &&
      (!account?.initial_payment_required || row.initial === true);
    Object.assign(row, { received: today(), reference });
    if (firstReceipt && account) {
      // สมาชิกเดิมที่เปิดขั้นตอนแรกใหม่เก็บยอดรายเดือนเดิมไว้
      if (!(account.opening_amount > 0 || account.opening_units > 0))
        account.monthly = row.amount;
      account.initial_payment_required = false;
      account.initial_payment_completed = today();
    }
  } else if (!admin && action === "request-change") {
    check(
      !initialShareFromRows(
        data.share_accounts,
        data.share_payments,
        currentMember(),
      ).required,
      "กรุณาส่งหุ้นครั้งแรกและรอยืนยันรับเงินก่อน",
      403,
    );
    requireActiveMember(data);
    amountFor(data, amount);
    const account = data.share_accounts.find(
      (row) => row.member === currentMember(),
    );
    check(account, "ไม่พบบัญชีหุ้น", 404);
    check(amount !== account.monthly, "ระบุยอดที่แตกต่างจากยอดปัจจุบัน");
    check(
      !data.share_change_requests.some(
        (row) => row.member === currentMember() && row.status === "pending",
      ),
      "มีคำขอเปลี่ยนยอดรอพิจารณาอยู่แล้ว",
      409,
    );

    // เก็บยอดเดิมและยอดใหม่เพื่อให้เจ้าหน้าที่พิจารณา
    data.share_change_requests.push({
      id: nextId(data.share_change_requests),
      member: currentMember(),
      amount,
      previous: account.monthly,
      date: today(),
      status: "pending",
    });
  } else if (
    admin &&
    (action === "approve-change" || action === "reject-change")
  ) {
    const row = data.share_change_requests.find(
      (item) => item.id === id && item.status === "pending",
    );
    check(row, "คำขอนี้ถูกตรวจสอบแล้วหรือไม่มีในระบบ", 409);
    if (action === "approve-change") {
      amountFor(data, row.amount);
      const account = data.share_accounts.find(
        (item) => item.member === row.member,
      );
      check(account, "ไม่พบบัญชีหุ้น", 404);
      account.monthly = row.amount;
    }
    row.status = action === "approve-change" ? "approved" : "rejected";
  } else if (admin && action === "monthly") {
    amountFor(data, amount);
    const account = data.share_accounts.find((row) => row.member === id);
    check(account, "ไม่พบบัญชีหุ้น", 404);
    account.monthly = amount;
    for (const row of data.share_change_requests) {
      if (row.member === id && row.status === "pending")
        row.status = "rejected";
    }
  } else if (admin && action === "rules") {
    const { price, min } = input;
    check(
      integer(price) && integer(min) && min % price === 0,
      "กฎการส่งหุ้นไม่ถูกต้อง",
    );
    Object.assign(data.rules[0], { price, min });
  } else {
    throw new RequestError("ไม่มีสิทธิ์ทำรายการนี้", 403);
  }
}
