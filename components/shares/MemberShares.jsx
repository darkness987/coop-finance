// ระบบ: หุ้นสมาชิก การส่งหุ้น และยอดสะสม | ไฟล์: MemberShares.jsx
"use client";

// ฝั่งสมาชิก | แจ้งส่งหุ้น ดูประวัติ ขอเปลี่ยนยอด และดูผลตอบแทน

import { useState } from "react";
import SuccessDialog from "../shared/SuccessDialog";
import DemoSlipUpload from "../deposits/DemoSlipUpload";
import { sharePeriodTotals } from "../../lib/shares/share-period";
import { Icon, Panel, Shell, Tabs } from "../layout/shell";
import styles from "./original-shares.module.css";
import { money, periodLabel, useDemo } from "../shared/demo";
import { Rules } from "./Rules";
import { Payments } from "./Payments";
import { Changes } from "./Changes";
import MonthlyShareSummary from "./MonthlyShareSummary";
import { ReturnTable } from "../returns/ReturnTable";

const memberTabs = [
  ["send", "send", "ส่งหุ้น"],
  ["history", "calendar", "ประวัติส่งหุ้น"],
  ["change", "file", "ขอเปลี่ยนยอด"],
  ["dividend", "percent", "เงินปันผล"],
  ["rebate", "refund", "เงินเฉลี่ยคืน"],
];

// หน้าหุ้นสมาชิกเลือกแสดงฟอร์มส่งหุ้น ประวัติ คำขอเปลี่ยนยอด หรือผลตอบแทนตามแท็บ
// ฟังก์ชัน MemberShares: เลือกแท็บส่งหุ้น ประวัติ คำขอปรับยอด และผลตอบแทน
export default function MemberShares() {
  const { data, mutate, busy } = useDemo();
  const [tab, setTab] = useState("send");
  const [amount, setAmount] = useState(null);
  const [notice, setNotice] = useState("");

  const [requestId, setRequestId] = useState(null);
  const {
    rules,
    payments,
    changes,
    period,
    accounts: [account],
  } = data.shares;

  if (!account)
    return (
      <Shell title="หุ้นสมาชิก">
        <p>ยังไม่พบบัญชีหุ้น กรุณาติดต่อเจ้าหน้าที่</p>
      </Shell>
    );

  // ใช้ยอดรายเดือนที่ตั้งไว้เป็นค่าเริ่มต้น แล้วตรวจยอดก่อนเปิดให้กดแจ้งส่ง
  const totals = sharePeriodTotals(
    payments,
    account.member,
    period,
    account.monthly,
  );
  const current = payments.find(
    (row) => row.period === period && !row.received,
  );
  const value = totals.complete
    ? totals.paidAmount
    : (amount ??
      current?.amount ??
      (totals.paidAmount > 0 ? totals.remainingAmount : account.monthly));
  const minimumPayment =
    totals.paidAmount > 0 && totals.remainingAmount > 0
      ? Math.min(rules.min, totals.remainingAmount)
      : rules.min;
  const displayedMethod = "เงินโอน";
  // ส่งหุ้นจากฟอร์มเดียว: ถ้ายังรอรับเงินให้แทนยอดในรายการเดิม ไม่สร้างซ้ำ
  // ฟังก์ชัน submitPayment: ส่งข้อมูลจากฟอร์มในส่วน submitPayment
  async function submitPayment(event) {
    event.preventDefault();
    if (totals.complete) return;
    const token = requestId || crypto.randomUUID();
    if (!requestId) setRequestId(token);
    const saved = await mutate("shares", {
      action: current ? "update-pending" : "notify",
      ...(!current ? { requestId: token } : {}),
      ...(current
        ? {
            id: current.id,
            expectedAmount: current.amount,
            expectedMethod: current.method,
            expectedPrice: current.price,
          }
        : {}),
      amount: Number(value),
      method: displayedMethod,
    });
    if (saved) {
      setNotice(
        `ส่งหุ้น ${money(Number(value))} บาทแล้ว${current ? " โดยแทนยอดรายการรอรับเงินเดิม" : ""} ยอดหุ้นสะสมจะเพิ่มเมื่อเจ้าหน้าที่ยืนยันรับเงิน`,
      );
      setAmount(null);
      setRequestId(null);
    }
  }
  const valid =
    Number.isSafeInteger(Number(value)) &&
    Number(value) >= minimumPayment &&
    Number(value) % rules.price === 0;

  // ใช้ผลจัดสรรปีล่าสุดจาก API สำหรับการ์ดเงินปันผลและเงินเฉลี่ยคืน
  const latest = data.returns[0];
  const stats = [
    [
      "coins",
      "หุ้นสะสมทั้งหมด",
      account.units,
      "มูลค่า " + money(account.amount) + " บาท",
    ],
    [
      "calendar",
      "ยอดส่งหุ้นรายเดือน",
      account.monthly,
      "ยอดรายเดือนที่ใช้อยู่",
    ],
    [
      "percent",
      "เงินปันผลล่าสุด",
      latest ? latest.cents / 100 : 0,
      latest ? "ปี " + (latest.year + 543) : "ยังไม่มีผลจัดสรร",
    ],
    [
      "refund",
      "เงินเฉลี่ยคืนล่าสุด",
      latest ? latest.rebateCents / 100 : 0,
      latest ? "ปี " + (latest.year + 543) : "ยังไม่มีผลจัดสรร",
    ],
  ];
  return (
    <div className={styles.page}>
      <Shell
        title="หุ้นสมาชิก"
        subtitle="ข้อมูลหุ้น การส่งหุ้น และผลตอบแทนของคุณ"
      >
        <div className="stats">
          {stats.map(([icon, label, total, detail]) => (
            <div className={"stat " + icon} key={label}>
              <Icon name={icon} />
              <div>
                {label}
                <strong>
                  {money(total)} {icon === "coins" ? "หุ้น" : "฿"}
                </strong>
                <small>{detail}</small>
              </div>
            </div>
          ))}
        </div>
        <Tabs
          options={memberTabs}
          active={tab}
          onChange={(value) => {
            if (value === "dividend") {
              window.location.href = "/returns/shares";
              return;
            }
            setTab(value);
            setNotice("");
            setAmount(null);
          }}
        />
        <SuccessDialog message={notice} onDismiss={() => setNotice("")} />
        {tab === "send" && (
          <>
            <div className={`split ${styles.sendLayout}`}>
              <Panel
                icon="coins"
                title={"แจ้งส่งหุ้น · " + periodLabel(period)}
              >
                <form className="form" onSubmit={submitPayment}>
                  <div
                    className={styles.sendPeriod}
                    aria-label="งวดและยอดส่งหุ้น"
                  >
                    <span>งวดส่งหุ้น {periodLabel(period)}</span>
                    <p>
                      ยอดส่งหุ้นที่กำหนด{" "}
                      <strong>{money(account.monthly)} บาท</strong>
                    </p>
                    {totals.paidAmount > 0 && (
                      <>
                        <p>
                          ส่งหุ้นแล้ว{" "}
                          <strong>{money(totals.paidAmount)} บาท</strong>
                        </p>
                        <p
                          className={
                            totals.complete
                              ? styles.fullyPaid
                              : styles.remainingDue
                          }
                        >
                          {totals.complete
                            ? "ส่งหุ้นครบงวดแล้ว"
                            : "ยังต้องส่งอีก"}
                          <strong>
                            {totals.complete
                              ? ""
                              : `${money(totals.remainingAmount)} บาท`}
                          </strong>
                        </p>
                      </>
                    )}
                  </div>
                  <label>
                    {totals.paidAmount > 0 && !totals.complete
                      ? "ยอดส่งหุ้นเพิ่มเติม (บาท)"
                      : "ยอดที่จะส่งงวดนี้ (บาท)"}
                    <input
                      type="number"
                      min={minimumPayment}
                      step={rules.price}
                      value={value}
                      disabled={totals.complete}
                      required
                      onChange={(event) => {
                        setAmount(event.target.value);
                        setRequestId(null);
                      }}
                    />
                  </label>
                  <p className={valid ? "ok" : "muted"}>
                    {valid
                      ? "เท่ากับ " +
                        money(Number(value) / rules.price) +
                        " หุ้น"
                      : "ตรวจสอบยอดขั้นต่ำและมูลค่าต่อหุ้น"}
                  </p>
                  <fieldset disabled={totals.complete}>
                    <legend>วิธีชำระ</legend>
                    {["เงินโอน"].map((paymentMethod) => (
                      <label className="radio" key={paymentMethod}>
                        <input
                          type="radio"
                          name="method"
                          value={paymentMethod}
                          checked={displayedMethod === paymentMethod}
                          onChange={(event) => {
                            setRequestId(null);
                          }}
                        />
                        {paymentMethod}
                      </label>
                    ))}
                  </fieldset>
                  {!totals.complete && <DemoSlipUpload disabled={busy} />}
                  {totals.complete ? (
                    <button
                      key="history"
                      type="button"
                      className={`primary ${styles.sendButton}`}
                      onClick={() => setTab("history")}
                    >
                      ดูประวัติและใบเสร็จ
                    </button>
                  ) : (
                    <button
                      key="send"
                      type="submit"
                      className={`primary ${styles.sendButton}`}
                      disabled={busy || !valid || !data.members.active}
                    >
                      {busy
                        ? "กำลังส่ง…"
                        : totals.paidAmount > 0
                          ? "ส่งหุ้นเพิ่ม"
                          : "ส่งหุ้น"}
                    </button>
                  )}
                  <small className="muted">
                    ดูสถานะรายการได้ที่ประวัติส่งหุ้น
                  </small>
                  {!data.members.active && <p>สถานะสมาชิกถูกระงับ</p>}
                </form>
              </Panel>
              <Panel icon="info" title="กฎการส่งหุ้น">
                <Rules rules={rules} member />
              </Panel>
            </div>
            <Panel
              icon="file"
              title="ประวัติล่าสุด"
              action={
                <button className="outline" onClick={() => setTab("history")}>
                  ดูทั้งหมด
                </button>
              }
            >
              <Payments rows={payments.slice(0, 3)} />
            </Panel>
          </>
        )}
        {tab === "history" && (
          <Panel icon="calendar" title="ประวัติการส่งหุ้น">
            <Payments rows={payments} />
          </Panel>
        )}
        {tab === "change" && (
          <>
            <Panel icon="file" title="ขอเพิ่มหรือลดยอดส่งหุ้นรายเดือน">
              <form
                className="form"
                onSubmit={async (event) => {
                  // ส่งคำขอปรับยอดรายเดือน แล้วล้างฟอร์มเมื่อบันทึกสำเร็จ
                  event.preventDefault();
                  const form = event.currentTarget;
                  if (
                    await mutate("shares", {
                      action: "request-change",
                      amount: Number(new FormData(form).get("amount")),
                    })
                  )
                    form.reset();
                }}
              >
                <MonthlyShareSummary monthly={account.monthly} />
                <label>
                  ยอดส่งรายเดือนใหม่ที่ต้องการ (บาท)
                  <input
                    name="amount"
                    type="number"
                    min={rules.min}
                    step={rules.price}
                    required
                  />
                </label>
                <button
                  className={`primary ${styles.requestButton}`}
                  disabled={
                    busy ||
                    !data.members.active ||
                    changes.some((row) => row.status === "pending")
                  }
                >
                  ส่งคำขอ
                </button>
              </form>
            </Panel>
            <Panel icon="calendar" title="ประวัติคำขอ">
              <Changes rows={changes} />
            </Panel>
          </>
        )}
        {/* แท็บผลตอบแทนใช้ตารางเดียวกัน โดยเลือกคอลัมน์ตามประเภทผลจัดสรร */}
        {["dividend", "rebate"].includes(tab) && (
          <Panel
            icon={tab === "dividend" ? "percent" : "refund"}
            title={
              tab === "dividend" ? "เงินปันผลประจำปี" : "เงินเฉลี่ยคืนประจำปี"
            }
          >
            <ReturnTable rows={data.returns} type={tab} />
          </Panel>
        )}
      </Shell>
    </div>
  );
}
