// ระบบ: หุ้นสมาชิก การส่งหุ้น และยอดสะสม | ไฟล์: InitialShareOnboarding.jsx
"use client";
// ขั้นตอนส่งหุ้นครั้งแรกจากระบบเดิม: เลือกยอด → ตรวจข้อมูล → แจ้งชำระ → รอรับเงิน
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDemo, money } from "../shared/demo";
import styles from "./initial-share.module.css";
import DemoSlipUpload from "../deposits/DemoSlipUpload";
// ฟังก์ชัน InitialShareOnboarding: จัดขั้นตอนส่งหุ้นครั้งแรกและการทดลองตัวอย่าง
export default function InitialShareOnboarding({ demo = false }) {
  const router = useRouter();
  const { data, mutate, busy, refresh } = useDemo();
  const { rules, activation, accounts } = data.shares;
  const [demoPending, setDemoPending] = useState(null);
  const pending = demo ? demoPending : activation.pending;
  const [step, setStep] = useState(1),
    [amount, setAmount] = useState(null),
    [method, setMethod] = useState("เงินสด"),
    [editing, setEditing] = useState(null),
    [notice, setNotice] = useState(""),
    [checking, setChecking] = useState(false);
  const value = amount ?? accounts[0]?.monthly ?? rules.min;
  const valid =
    Number.isSafeInteger(Number(value)) &&
    Number(value) >= rules.min &&
    Number(value) % rules.price === 0;
  // รับเงินแล้วเท่านั้นจึงปลดล็อกเมนู การแจ้งชำระไม่ได้เปลี่ยนยอดหุ้น
  // ฟังก์ชัน send: ส่งรายการไปยังระบบ
  async function send() {
    if (demo) {
      setDemoPending({ amount: Number(value), price: rules.price, method });
      setEditing(null);
      setStep(1);
      return;
    }
    const ok = await mutate("shares", {
      action: editing ? "update-pending" : "notify-initial",
      ...(editing
        ? {
            id: editing.id,
            expectedAmount: editing.amount,
            expectedMethod: editing.method,
            expectedPrice: editing.price,
          }
        : {}),
      amount: Number(value),
      method,
    });
    if (ok) {
      setEditing(null);
      setStep(1);
      router.push("/home");
    }
  }
  // ฟังก์ชัน checkStatus: ทำงานส่วน checkStatus ของระบบนี้
  async function checkStatus() {
    if (demo) {
      setNotice("ตัวอย่างเท่านั้น ไม่มีการบันทึกรายการจริง");
      return;
    }
    setChecking(true);
    setNotice("");
    try {
      await refresh();
      setNotice(
        "ตรวจสอบสถานะล่าสุดแล้ว หากยังรอรับเงิน กรุณาติดต่อเจ้าหน้าที่",
      );
    } catch (error) {
      setNotice(error.message);
    } finally {
      setChecking(false);
    }
  }
  // ฟังก์ชัน editPending: เตรียมข้อมูลให้แก้ไขในส่วน editPending
  function editPending() {
    setAmount(pending.amount);
    setMethod(
      ["เงินสด", "เงินโอน"].includes(pending.method)
        ? pending.method
        : "เงินสด",
    );
    setEditing({ ...pending });
    setStep(1);
    setNotice("");
  }
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <p>
          {demo ? "ตัวอย่างขั้นตอนสำหรับสมาชิกใหม่" : "เริ่มต้นใช้งานสมาชิก"}
        </p>
        <h1>ส่งหุ้นครั้งแรก</h1>
        <span>
          {demo
            ? "ทดลองขั้นตอนส่งหุ้น โดยยังใช้งานระบบเดิมได้ตามปกติ"
            : "ดำเนินการส่งหุ้นเพื่อเปิดใช้บริการของสหกรณ์"}
        </span>
        {demo && <Link href="/home">กลับหน้าหลัก</Link>}
      </header>
      <div className={styles.notice} role="note">
        <strong>
          {demo
            ? "โหมดตัวอย่าง · ไม่บันทึกรายการจริง"
            : "กรุณาดำเนินการส่งหุ้นครั้งแรก"}
        </strong>
        <p>
          {demo
            ? "ทุกเมนูของบัญชีเดิมยังใช้งานได้ การทดลองนี้ไม่เปลี่ยนยอดหุ้น เงินฝาก หรือประวัติเดิม"
            : "เมนูเงินฝาก สินเชื่อ และเอกสารจะเปิดใช้งานเมื่อเจ้าหน้าที่ยืนยันรับเงินแล้ว"}
        </p>
      </div>
      <ol className={styles.steps}>
        {["กำหนดยอดส่งหุ้น", "ยืนยันข้อมูล", "ชำระเงิน"].map((label, index) => (
          <li
            key={label}
            aria-current={
              (pending && !editing ? 3 : step) === index + 1
                ? "step"
                : undefined
            }
            className={
              (pending && !editing ? 3 : step) >= index + 1
                ? styles.current
                : ""
            }
          >
            <b>{index + 1}</b>
            {label}
          </li>
        ))}
      </ol>
      {pending && !editing ? (
        <section className={styles.card}>
          <span className={styles.badge}>รอยืนยันรับเงิน</span>
          <h2>แจ้งส่งหุ้นครั้งแรกแล้ว</h2>
          <p>
            {demo
              ? "ตัวอย่างสถานะหลังแจ้งส่งหุ้นสำเร็จ"
              : "สหกรณ์กำลังรอตรวจสอบและยืนยันการรับเงิน"}
          </p>
          <dl className={styles.summary}>
            <div>
              <dt>สมาชิก</dt>
              <dd>{data.members.name}</dd>
            </div>
            <div>
              <dt>จำนวนเงิน</dt>
              <dd>{money(pending.amount)} บาท</dd>
            </div>
            <div>
              <dt>จำนวนหุ้น</dt>
              <dd>{money(pending.amount / pending.price)} หุ้น</dd>
            </div>
            <div>
              <dt>วิธีชำระ</dt>
              <dd>{pending.method}</dd>
            </div>
          </dl>
          <p className={styles.help}>
            {demo
              ? "รายการตัวอย่าง ทุกเมนูยังใช้งานได้ ยอดหุ้นจริงไม่เปลี่ยน"
              : "ยอดหุ้นยังไม่เพิ่มและเมนูยังไม่ปลดล็อก ระบบจะตรวจสอบสถานะให้อัตโนมัติ"}
          </p>
          {notice && <p role="status">{notice}</p>}
          <div className={styles.actions}>
            <Link href="/home" className={styles.primary}>
              กลับหน้าหลัก
            </Link>
            <button
              type="button"
              disabled={busy || checking}
              onClick={editPending}
            >
              แก้ไขรายการ
            </button>
            <button
              type="button"
              className={styles.primary}
              disabled={busy || checking}
              onClick={checkStatus}
            >
              {checking ? "กำลังตรวจสอบ…" : "ตรวจสอบสถานะล่าสุด"}
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className={styles.card}>
            {step === 1 && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (valid) setStep(2);
                }}
              >
                <h2>กำหนดยอดส่งหุ้นของคุณ</h2>
                <p>
                  {demo
                    ? "เลือกยอดเพื่อทดลองเท่านั้น ยอดส่งหุ้นรายเดือนจริงจะไม่เปลี่ยน"
                    : accounts[0]?.opening_amount > 0 ||
                        accounts[0]?.opening_units > 0
                      ? "ยอดนี้ใช้สำหรับขั้นตอนส่งหุ้นครั้งแรก โดยคงยอดส่งรายเดือนเดิมไว้"
                      : "ยอดนี้ใช้สำหรับส่งหุ้นครั้งแรกและตั้งเป็นยอดส่งรายเดือนหลังรับเงินแล้ว"}
                </p>
                <label className={styles.amountLabel}>
                  จำนวนเงินส่งหุ้น (บาท)
                  <input
                    type="number"
                    value={value}
                    min={rules.min}
                    step={rules.price}
                    required
                    disabled={busy}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </label>
                <div className={styles.presets}>
                  {[500, 1000, 2000, 5000, 10000]
                    .filter(
                      (preset) =>
                        preset >= rules.min && preset % rules.price === 0,
                    )
                    .map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        aria-pressed={Number(value) === preset}
                        onClick={() => setAmount(preset)}
                      >
                        {money(preset)}
                      </button>
                    ))}
                </div>
                <p className={styles.help}>
                  ขั้นต่ำ {money(rules.min)} บาท · มูลค่าหุ้นละ{" "}
                  {money(rules.price)} บาท
                </p>
                <p>
                  {valid
                    ? `เท่ากับ ${money(Number(value) / rules.price)} หุ้น`
                    : "ยอดต้องไม่ต่ำกว่าขั้นต่ำและหารด้วยมูลค่าหุ้นลงตัว"}
                </p>
                <div className={styles.actions}>
                  {editing && (
                    <button type="button" onClick={() => setEditing(null)}>
                      ยกเลิกการแก้ไข
                    </button>
                  )}
                  <button
                    type="submit"
                    className={styles.primary}
                    disabled={busy || !valid || !data.members.active}
                  >
                    ถัดไป: ยืนยันข้อมูล
                  </button>
                </div>
              </form>
            )}
            {step === 2 && (
              <>
                <h2>ตรวจสอบข้อมูลการส่งหุ้นครั้งแรก</h2>
                <dl className={styles.summary}>
                  <div>
                    <dt>ชื่อสมาชิก</dt>
                    <dd>{data.members.name}</dd>
                  </div>
                  <div>
                    <dt>เลขสมาชิก</dt>
                    <dd>{data.members.id}</dd>
                  </div>
                  <div>
                    <dt>ยอดส่งหุ้นครั้งแรก</dt>
                    <dd>{money(value)} บาท</dd>
                  </div>
                  <div>
                    <dt>จำนวนหุ้น</dt>
                    <dd>{money(Number(value) / rules.price)} หุ้น</dd>
                  </div>
                </dl>
                <div className={styles.actions}>
                  <button type="button" onClick={() => setStep(1)}>
                    กลับไปแก้ไข
                  </button>
                  <button
                    type="button"
                    className={styles.primary}
                    onClick={() => setStep(3)}
                  >
                    ถัดไป: เลือกวิธีชำระ
                  </button>
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <h2>ชำระค่าหุ้นครั้งแรก</h2>
                <p className={styles.total}>
                  {money(value)}{" "}
                  <small>บาท · {money(Number(value) / rules.price)} หุ้น</small>
                </p>
                <fieldset className={styles.methods}>
                  <legend>เลือกวิธีชำระ</legend>
                  {[
                    ["เงินสด", "ชำระกับเจ้าหน้าที่สหกรณ์"],
                    ["เงินโอน", "ชำระผ่านบัญชีที่สหกรณ์แจ้งให้ทราบ"],
                  ].map(([label, description]) => (
                    <label key={label}>
                      <input
                        type="radio"
                        name="initial-method"
                        value={label}
                        checked={method === label}
                        onChange={(event) => setMethod(event.target.value)}
                      />
                      <span>
                        <strong>{label}</strong>
                        <small>{description}</small>
                      </span>
                    </label>
                  ))}
                </fieldset>
                {/* เงินโอนใช้ส่วนสลิปตัวอย่างเดียวกับเงินฝาก ไม่ส่งไฟล์เข้าฐานข้อมูล */}
                {method === "เงินโอน" && <DemoSlipUpload disabled={busy} />}
                <p className={styles.help}>
                  แจ้งเมื่อชำระแล้ว
                  เจ้าหน้าที่จะตรวจสอบและยืนยันรับเงินก่อนเปิดบริการอื่น
                </p>
                <div className={styles.actions}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setStep(2)}
                  >
                    กลับไปตรวจสอบ
                  </button>
                  <button
                    type="button"
                    className={styles.primary}
                    disabled={busy || !valid || !data.members.active}
                    onClick={send}
                  >
                    {busy
                      ? "กำลังบันทึก…"
                      : demo
                        ? "ทดลองแจ้งส่งหุ้นครั้งแรก"
                        : "แจ้งชำระหุ้นครั้งแรก"}
                  </button>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
