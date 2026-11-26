"use client";

import { useRef, useState } from "react";
import { Panel } from "../layout/shell";
import { money, useDemo } from "../shared/demo";
import { sharePeriodTotals } from "../../lib/shares/share-period";

export default function RecordSharePayment() {
  const { data, mutate, busy } = useDemo();
  const [member, setMember] = useState("");
  const [notice, setNotice] = useState("");
  const requestId = useRef(null);
  const { accounts, payments, period, rules } = data.shares;
  const account = accounts.find((row) => row.member === member);
  const totals =
    account && sharePeriodTotals(payments, member, period, account.monthly);
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    requestId.current ||= crypto.randomUUID();
    const saved = await mutate("shares", {
      action: "record-payment",
      member,
      amount: Number(fields.get("amount")),
      method: fields.get("method"),
      requestId: requestId.current,
    });
    if (saved) {
      setNotice(
        "บันทึกรับเงินและเพิ่มหุ้นสมาชิกแล้ว ตรวจสอบได้ที่ประวัติส่งหุ้น",
      );
      requestId.current = null;
      form.reset();
      setMember("");
    }
  }
  return (
    <Panel icon="send" title="บันทึกส่งหุ้นให้สมาชิก">
      <p className="muted">
        สำหรับสมาชิกชำระที่สหกรณ์
        บันทึกแล้วถือว่ายืนยันรับเงินและเพิ่มหุ้นสะสมทันที
      </p>
      <form
        className="form"
        onSubmit={submit}
        onChange={() => {
          requestId.current = null;
          setNotice("");
        }}
      >
        <label>
          สมาชิก
          <select
            required
            value={member}
            onChange={(e) => setMember(e.target.value)}
          >
            <option value="">เลือกสมาชิก</option>
            {accounts.map((row) => (
              <option key={row.member} value={row.member}>
                {data.members.find((m) => m.id === row.member)?.name} ·{" "}
                {row.member}
              </option>
            ))}
          </select>
        </label>
        {totals && <p>ยังต้องส่งงวดนี้ {money(totals.remainingAmount)} บาท</p>}
        <label>
          ยอดส่งหุ้น (บาท)
          <input
            key={member}
            name="amount"
            type="number"
            required
            min={rules.price}
            max={totals?.remainingAmount}
            step={rules.price}
          />
        </label>
        <label>
          วิธีชำระ
          <select name="method">
            <option>เงินสด</option>
            <option>เงินโอน</option>
          </select>
        </label>
        <button
          className="primary"
          disabled={busy || !account || !totals?.remainingAmount}
        >
          บันทึกและยืนยันรับเงิน
        </button>
      </form>
      {notice && (
        <p role="status" className="ok">
          {notice}
        </p>
      )}
    </Panel>
  );
}
