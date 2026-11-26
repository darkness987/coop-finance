// ระบบ: สินเชื่อ วงเงิน ผู้ค้ำ และชำระหนี้ | ไฟล์: ApplicationDetail.jsx
"use client";
import { useDemo } from "../shared/demo";
import { canAccess, roleOf } from "../../lib/auth/permissions";
import { useEffect, useState } from "react";
import { money, status } from "../shared/Finance";
import TransactionOtp from "../security/TransactionOtp";
import DisbursementChoice from "./DisbursementChoice";
import ApplicationReview from "./ApplicationReview";
import LoanSecuritySummary from "./LoanSecuritySummary";
// ฟังก์ชัน ApplicationDetail: ทำงานส่วน ApplicationDetail ของระบบนี้
export default function ApplicationDetail({ f, admin = false, row, c }) {
  const { user } = useDemo();
  const can = (action) => canAccess(user || {}, "loans", action);
  // คำขอเก่าที่ยังค้างอยู่ทุกขั้นสามารถตัดสินได้จากหน้าตรวจเดียวกัน
  const reviewable = [
    "submitted",
    "checking",
    "needs_documents",
    "forwarded",
  ].includes(row.status);
  const [collateralLimit, setCollateralLimit] = useState(""),
    [collateralNote, setCollateralNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [showOtp, setShowOtp] = useState(false);
  useEffect(() => {
    setChallenge(null);
    setShowOtp(false);
    setConfirmed(false);
  }, [row.id, row.revision]);
  // ขอ OTP ยังไม่ส่งคำขอ เมื่อปิดหน้าต่างเปิดใช้รหัสเดิมที่ยังไม่หมดอายุได้
  // ฟังก์ชัน requestOtp: ขอข้อมูลหรือรหัสยืนยันในส่วน requestOtp
  async function requestOtp(resend = false) {
    if (!resend && challenge && challenge.expiresAt > Date.now()) {
      setShowOtp(true);
      return;
    }
    const response = await f.act(
      { action: "request-otp", id: row.id, revision: row.revision },
      { preview: true, result: true },
    );
    if (response) {
      setChallenge(response.result);
      setShowOtp(true);
    }
  }
  // ฟังก์ชัน verifyOtp: ตรวจรหัสหรือหลักฐานยืนยันในส่วน verifyOtp
  async function verifyOtp(otp) {
    const success = await f.act({
      action: "submit",
      id: row.id,
      revision: row.revision,
      challengeId: challenge.challengeId,
      otp,
    });
    if (success) {
      setShowOtp(false);
      setChallenge(null);
    }
  }
  return (
    <>
      {showOtp && challenge && (
        <TransactionOtp
          challenge={challenge}
          title="ยืนยันคำขอสินเชื่อ"
          summaryLabel={row.terms.name}
          amount={row.amount}
          note="เมื่อยืนยัน OTP สำเร็จ ระบบจึงส่งคำขอให้เจ้าหน้าที่ตรวจสอบ"
          busy={f.busy}
          error={f.error}
          onCancel={() => setShowOtp(false)}
          onResend={() => requestOtp(true)}
          onVerify={verifyOtp}
        />
      )}
      {[row].map((row) => (
        <article className="panel" key={row.id}>
          <h2>
            {row.terms.name} · {money(row.amount)} บาท
          </h2>
          <p>
            สมาชิก {row.member} · {row.months} เดือน · ดอกเบี้ย{" "}
            {row.terms.annualRate}% ต่อปี
          </p>
          {row.demo && (
            <p className="loan-contract-note">ข้อมูลตัวอย่างสำหรับสาธิตระบบ</p>
          )}
          <p>วัตถุประสงค์: {row.reason}</p>
          {!admin && <LoanSecuritySummary row={row} />}
          {admin && <ApplicationReview row={row} />}
          {admin && !!row.collateral && reviewable && can("approve") && (
            <div className="loan-form-grid">
              <label>
                วงเงินที่อนุมัติจากการประเมินหลักประกัน (บาท)
                <input
                  type="number"
                  min={row.amount}
                  step="0.01"
                  value={collateralLimit}
                  onChange={(e) => setCollateralLimit(e.target.value)}
                />
              </label>
              <label>
                ผลตรวจเอกสารสิทธิ์และประเมิน
                <input
                  maxLength={1000}
                  value={collateralNote}
                  onChange={(e) => setCollateralNote(e.target.value)}
                />
              </label>
            </div>
          )}
          {!row.guarantor &&
            row.loanMode === "asset" &&
            row.borrowingCapacity &&
            ["draft", "needs_documents"].includes(row.status) && (
              <p className="loan-muted">
                สินทรัพย์รวม {money(row.borrowingCapacity.totalAmount)} บาท ·
                วงเงินไม่ใช้ผู้ค้ำที่ใช้ได้{" "}
                {money(row.borrowingCapacity.availableAmount)} บาท
              </p>
            )}
          {!admin && <DisbursementChoice f={f} row={row} />}
          {admin && (
            <p>
              วิธีรับเงิน:{" "}
              {row.disbursementMethod === "cash"
                ? "เงินสด"
                : row.disbursementMethod === "account"
                  ? "เข้าบัญชี · " +
                    row.disbursementAccount?.bank +
                    " · " +
                    row.disbursementAccount?.last4
                  : "ยังไม่ระบุ"}
            </p>
          )}
          <strong className="status">{status[row.status]}</strong>
          {row.note && <p>{row.note}</p>}
          {!admin && ["draft", "needs_documents"].includes(row.status) && (
            <>
              <label className="radio">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                ข้าพเจ้าตรวจสอบข้อมูลแล้ว ยืนยันส่งคำขอให้สหกรณ์ตรวจสอบ
              </label>
              <button
                className="primary"
                disabled={f.busy || !confirmed || !row.disbursementMethod}
                onClick={() => requestOtp()}
              >
                ยืนยัน OTP เพื่อส่งคำขอ
              </button>
            </>
          )}
          {admin && reviewable && (
            <div className="actions">
              {can("approve") && (
                <button
                  className="primary"
                  disabled={f.busy}
                  onClick={() =>
                    f.act({
                      action: "approve",
                      collateralLimit,
                      note: collateralNote,
                      id: row.id,
                      revision: row.revision,
                    })
                  }
                >
                  อนุมัติ
                </button>
              )}
              {can("reject") && (
                <button
                  disabled={f.busy}
                  onClick={() => {
                    const note = prompt("เหตุผลที่ไม่อนุมัติ");
                    if (note?.trim())
                      f.act({
                        action: "reject",
                        id: row.id,
                        revision: row.revision,
                        note,
                      });
                  }}
                >
                  ไม่อนุมัติ
                </button>
              )}
            </div>
          )}
        </article>
      ))}
    </>
  );
}
