// ระบบ: เงินฝาก ถอนเงิน และดอกเบี้ย | ไฟล์: DepositRequest.jsx
"use client";
// ฟอร์มฝาก/ถอนแยกไฟล์: สมาชิกเลือกบัญชีและช่องทาง ไม่ต้องกรอกเลขอ้างอิง
import { useState } from "react";
import { Field, money } from "../shared/Finance";
import DemoSlipUpload from "./DemoSlipUpload";
import WithdrawalOtp from "./WithdrawalOtp";
// ฟังก์ชัน DepositRequest: ทำงานส่วน DepositRequest ของระบบนี้
export default function DepositRequest({ f, account, type, setType, onDone }) {
  const [review, setReview] = useState(null),
    [otpChallenge, setOtpChallenge] = useState(null),
    [otpVisible, setOtpVisible] = useState(false);
  const channel = "transfer";
  const product = f.data.types.find((t) => t.id === account.type);
  const blocked =
    account.status === "suspended" ||
    (type === "withdrawal" && account.status === "restricted");
  // ฟังก์ชัน requestOtp: ขอข้อมูลหรือรหัสยืนยันในส่วน requestOtp
  async function requestOtp() {
    const res = await f.act(
      {
        ...review,
        action: "request-otp",
        account: account.id,
        type: "withdrawal",
      },
      { preview: true, result: true },
    );
    if (res) {
      setOtpChallenge(res.result);
      setOtpVisible(true);
    }
  }
  // ฟังก์ชัน send: ส่งรายการไปยังระบบ
  async function send(otp) {
    if (!review) return;
    if (type === "withdrawal" && typeof otp !== "string") {
      if (otpChallenge && otpChallenge.expiresAt > Date.now())
        setOtpVisible(true);
      else await requestOtp();
      return;
    }
    const ok = await f.act({
      ...review,
      ...(type === "withdrawal"
        ? { challengeId: otpChallenge?.challengeId, otp }
        : {}),
      action: "request",
      account: account.id,
      type,
    });
    if (ok) {
      setReview(null);
      setOtpVisible(false);
      setOtpChallenge(null);
      onDone();
    }
  }
  return (
    <div className="deposit-columns">
      {otpVisible && otpChallenge && (
        <WithdrawalOtp
          challenge={otpChallenge}
          account={account}
          amount={review.amount}
          busy={f.busy}
          error={f.error}
          onCancel={() => setOtpVisible(false)}
          onResend={requestOtp}
          onVerify={send}
        />
      )}
      <section className="deposit-card">
        <h2>{type === "deposit" ? "รายการขอฝากเงิน" : "รายการขอถอนเงิน"}</h2>
        <p className="deposit-muted">
          เลือกช่องทางและตรวจสอบรายละเอียดก่อนส่งคำขอ
        </p>
        {type === "withdrawal" && product?.withdrawalGuidance && (
          <aside className="deposit-warning" aria-label="คำแนะนำการถอนเงิน">
            <strong>เงื่อนไขการถอนทั่วไป · {product.name}</strong>
            <p>{product.withdrawalGuidance.frequency}</p>
            <p>{product.withdrawalGuidance.conditions}</p>
          </aside>
        )}
        <form
          className="deposit-form"
          onSubmit={(e) => {
            e.preventDefault();
            setOtpChallenge(null);
            setReview({
              ...Object.fromEntries(new FormData(e.currentTarget)),
              requestId: crypto.randomUUID(),
            });
          }}
          onChange={() => {
            setReview(null);
            setOtpChallenge(null);
          }}
        >
          <label>
            บัญชี{type === "deposit" ? "รับฝาก" : "ต้นทาง"}
            <input
              value={`${product?.name} (${account.id})`}
              readOnly
              disabled
              className="deposit-locked-account"
              title="บัญชีที่เลือกไว้ ไม่สามารถแก้ไขในช่องนี้ได้"
            />
          </label>
          <label>
            ประเภทของรายการ
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={f.busy}
            >
              <option value="deposit">ฝากเงิน</option>
              <option value="withdrawal">ถอนเงิน</option>
            </select>
          </label>
          <Field
            label={
              type === "deposit"
                ? "จำนวนเงินที่ต้องการฝาก (บาท)"
                : "จำนวนเงินที่ต้องการถอน (บาท)"
            }
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            max={type === "withdrawal" ? account.balanceCents / 100 : undefined}
            placeholder="0.00"
            required
            disabled={f.busy}
          />
          <fieldset className="deposit-channels">
            <legend>เลือกช่องทางทำรายการ</legend>
            <label>
              <input
                type="radio"
                name="channel"
                value="transfer"
                checked={channel === "transfer"}
                readOnly
                disabled={f.busy}
              />
              <span>
                <strong>โอนเงิน</strong>
                <small>ทำรายการผ่านบัญชีสหกรณ์</small>
              </span>
            </label>
          </fieldset>
          {type === "deposit" && channel === "transfer" && (
            <DemoSlipUpload disabled={f.busy} />
          )}
          <Field
            label="หมายเหตุ (ถ้ามี)"
            name="description"
            maxLength={250}
            disabled={f.busy}
          />
          {blocked && (
            <p className="deposit-warning">
              สถานะบัญชีนี้ไม่อนุญาตให้ทำรายการที่เลือก กรุณาติดต่อเจ้าหน้าที่
            </p>
          )}
          {!review && (
            <button className="deposit-primary" disabled={f.busy || blocked}>
              ตรวจสอบรายการ
            </button>
          )}
        </form>
        {review && (
          <section className="deposit-review" aria-label="ยืนยันรายการเงินฝาก">
            <h3>ตรวจสอบก่อนส่งคำขอ</h3>
            <div className="deposit-rule">
              <span>ประเภท</span>
              <strong>{type === "deposit" ? "ฝากเงิน" : "ถอนเงิน"}</strong>
            </div>
            <div className="deposit-rule">
              <span>จำนวนเงิน</span>
              <strong>{money(review.amount)} บาท</strong>
            </div>
            <div className="deposit-rule">
              <span>ช่องทาง</span>
              <strong>โอนเงิน</strong>
            </div>
            <div className="deposit-actions">
              <button
                disabled={f.busy}
                onClick={() => {
                  setReview(null);
                  setOtpChallenge(null);
                }}
              >
                แก้ไขรายการ
              </button>
              <button
                className="deposit-primary"
                disabled={f.busy || blocked}
                onClick={() => send()}
              >
                {f.busy ? "กำลังส่ง…" : "ยืนยันส่งคำขอ"}
              </button>
            </div>
          </section>
        )}
      </section>
      <section className="deposit-card">
        <h2>ข้อมูลบัญชีที่เลือก</h2>
        <span className="deposit-account-badge">{product?.name}</span>
        <h3>{account.id}</h3>
        <p className="deposit-muted">{account.name}</p>
        <div className="deposit-rule">
          <span>ยอดคงเหลือ</span>
          <strong>{money(account.balanceCents / 100)} บาท</strong>
        </div>
        <div className="deposit-rule">
          <span>อัตราตัวอย่าง</span>
          <strong>
            {account?.rate == null ? "ยังไม่กำหนด" : `${account.rate}% ต่อปี`}
          </strong>
        </div>
        <p className="deposit-note">
          คำขอจะอยู่ในสถานะรอตรวจสอบ
          ยอดเงินจะเปลี่ยนเมื่อเจ้าหน้าที่ตรวจสอบและยืนยันรายการแล้ว
        </p>
      </section>
    </div>
  );
}
