// ระบบ: สินเชื่อ วงเงิน ผู้ค้ำ และชำระหนี้ | ไฟล์: LoanRepayment.jsx
"use client";
import { useDemo } from "../shared/demo";
import { canAccess, roleOf } from "../../lib/auth/permissions";
// สมาชิกยืนยัน OTP แล้วหักเงินฝากทันที; QR และบัญชีภายนอกรอเจ้าหน้าที่ตรวจสอบ
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { money, status } from "../shared/Finance";
import TransactionOtp from "../security/TransactionOtp";
const methods = {
  qr: "QR Code",
  deposit: "หักจากเงินฝาก",
  "linked-account": "หักจากบัญชีที่บันทึกไว้",
};
// ฟังก์ชัน LoanRepayment: แสดงช่องทางชำระ เปิด OTP และอัปเดตยอดหลังชำระ
export default function LoanRepayment({ f, c, admin = false }) {
  const { user } = useDemo();
  const can = (action) => canAccess(user || {}, "loans", action);
  const rows = f.data.schedules
    .filter((r) => r.contract === c.id)
    .sort((a, b) => a.number - b.number);
  const remaining = rows.reduce(
    (s, r) =>
      s + r.principalCents + r.interestCents - r.paidPrincipal - r.paidInterest,
    0,
  );
  const requests = (f.data.repaymentRequests || []).filter(
    (r) => r.contract === c.id,
  );
  const reserved = requests
    .filter((r) => r.status === "pending")
    .reduce((s, r) => s + r.amountCents, 0);
  const next = rows.find(
    (r) =>
      r.principalCents + r.interestCents > r.paidPrincipal + r.paidInterest,
  );
  const [amount, setAmount] = useState(
      next
        ? (
            (next.principalCents +
              next.interestCents -
              next.paidPrincipal -
              next.paidInterest) /
            100
          ).toFixed(2)
        : "",
    ),
    [method, setMethod] = useState(
      f.data.depositAccounts?.length ? "deposit" : "qr",
    ),
    [account, setAccount] = useState(f.data.depositAccounts?.[0]?.id || ""),
    [requestId, setRequestId] = useState(() => crypto.randomUUID()),
    [challenge, setChallenge] = useState(null),
    [showOtp, setShowOtp] = useState(false),
    [qr, setQr] = useState("");
  useEffect(() => {
    if (next)
      setAmount(
        (
          (next.principalCents +
            next.interestCents -
            next.paidPrincipal -
            next.paidInterest) /
          100
        ).toFixed(2),
      );
  }, [remaining]);
  useEffect(() => {
    if (admin || c.status === "closed") return;
    const refresh = () => {
      if (!document.hidden) f.load().catch(() => {});
    };
    const timer = setInterval(refresh, c.status === "approved" ? 5000 : 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [admin, c.status]);
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(
      "COOP-DEMO-NOT-PAYMENT|" + c.number + "|" + amount + "|" + requestId,
      { width: 160, margin: 2 },
    )
      .then((image) => {
        if (!cancelled) setQr(image);
      })
      .catch(() => {
        if (!cancelled) setQr("");
      });
    return () => {
      cancelled = true;
    };
  }, [amount, requestId, c.number]);
  // ฟังก์ชัน edit: เตรียมข้อมูลให้แก้ไข
  function edit(set, value) {
    set(value);
    setChallenge(null);
    setRequestId(crypto.randomUUID());
  }
  const input = {
    contract: c.id,
    amount,
    method,
    account: method === "deposit" ? account : null,
    requestId,
  };
  // ฟังก์ชัน askOtp: ขอรหัสยืนยันก่อนทำรายการในส่วน askOtp
  async function askOtp(resend = false) {
    if (challenge && !resend && challenge.expiresAt > Date.now()) {
      setShowOtp(true);
      return;
    }
    const response = await f.act(
      { ...input, action: "repayment-otp" },
      { preview: true, result: true },
    );
    if (response) {
      setChallenge(response.result);
      setShowOtp(true);
    }
  }
  // ฟังก์ชัน confirm: ยืนยันรายการหลังตรวจข้อมูล
  async function confirm(otp) {
    if (
      await f.act({
        ...input,
        action: "request-repayment",
        challengeId: challenge.challengeId,
        otp,
      })
    ) {
      setShowOtp(false);
      setChallenge(null);
      setRequestId(crypto.randomUUID());
    }
  }
  return (
    <section className="loan-payment-section" id="loan-repayment">
      <h3>{admin ? "ตรวจสอบรายการแจ้งชำระ" : "ชำระเงินกู้"}</h3>
      {!admin && (
        <>
          <p className="loan-muted">
            ยอดหนี้คงเหลือ {money(remaining / 100)} บาท · รอตรวจสอบ{" "}
            {money(reserved / 100)} บาท
          </p>
          {c.status === "approved" && (
            <p className="loan-contract-note">
              สัญญาอนุมัติแล้ว สามารถชำระได้ทันที
            </p>
          )}
          {c.status === "closed" ? (
            <p>ชำระครบแล้ว</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (["approved", "active"].includes(c.status)) askOtp();
              }}
            >
              <fieldset disabled={f.busy} className="loan-payment-fields">
                <label>
                  จำนวนเงินที่ต้องการชำระ (บาท)
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={Math.max(0, (remaining - reserved) / 100)}
                    value={amount}
                    required
                    onChange={(e) => edit(setAmount, e.target.value)}
                  />
                </label>
                <div className="loan-payment-methods">
                  {Object.entries(methods).map(([key, label]) => (
                    <label key={key}>
                      <input
                        type="radio"
                        name="repayment-method"
                        checked={method === key}
                        onChange={() => edit(setMethod, key)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {method === "qr" && (
                  <div className="loan-payment-qr">
                    {qr && (
                      <img
                        src={qr}
                        alt="QR Code สำหรับทดสอบ ไม่ใช่ QR ชำระเงินจริง"
                        width="160"
                        height="160"
                      />
                    )}
                    <div>
                      <strong>QR Code โหมดทดสอบ</strong>
                      <p className="loan-muted">
                        ยังไม่เชื่อมบัญชีรับเงิน จึงใช้ชำระเงินจริงไม่ได้
                        การแจ้งชำระจะรอเจ้าหน้าที่ยืนยัน
                      </p>
                    </div>
                  </div>
                )}
                {method === "deposit" && (
                  <label>
                    บัญชีเงินฝากสหกรณ์
                    <select
                      value={account}
                      required
                      onChange={(e) => edit(setAccount, e.target.value)}
                    >
                      <option value="">เลือกบัญชี</option>
                      {(f.data.depositAccounts || [])
                        .filter((a) => a.status === "active")
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {{
                              savings: "ออมทรัพย์ทั่วไป",
                              special: "ออมทรัพย์พิเศษ",
                              monthly: "ออมทรัพย์รายเดือน",
                            }[a.type || "savings"] || "บัญชีเงินฝาก"}{" "}
                            · {a.id} · คงเหลือ {money(a.balanceCents / 100)} บาท
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                {method === "linked-account" &&
                  (f.data.linkedAccount ? (
                    <p className="loan-contract-note">
                      {f.data.linkedAccount.bank} · บัญชีลงท้าย{" "}
                      {f.data.linkedAccount.last4}
                      <br />
                      ส่งคำขอหักจากบัญชีที่บันทึกไว้ รอเจ้าหน้าที่ตรวจสอบ
                    </p>
                  ) : (
                    <p className="loan-contract-note">
                      ยังไม่ได้บันทึกบัญชีรับเงิน{" "}
                      <a href="/returns/shares">เพิ่มบัญชีในหน้าผลตอบแทน</a>
                    </p>
                  ))}
                <button
                  className="primary"
                  disabled={
                    remaining <= reserved ||
                    (method === "linked-account" && !f.data.linkedAccount)
                  }
                >
                  {method === "deposit"
                    ? "ยืนยัน OTP และหักเงินฝาก"
                    : "ยืนยัน OTP และแจ้งชำระ"}
                </button>
              </fieldset>
            </form>
          )}
          {showOtp && challenge && (
            <TransactionOtp
              challenge={challenge}
              amount={amount}
              title={
                method === "deposit"
                  ? "ยืนยันหักเงินฝากชำระเงินกู้"
                  : "ยืนยันแจ้งชำระเงินกู้"
              }
              summaryLabel={c.number + " · " + methods[method]}
              confirmLabel={
                method === "deposit"
                  ? "ยืนยัน OTP และหักเงินฝาก"
                  : "ยืนยัน OTP และส่งคำขอ"
              }
              note={
                method === "deposit"
                  ? "เมื่อ OTP ถูกต้อง ระบบจะหักเงินฝากและลดหนี้ทันทีตามจำนวนที่แสดง"
                  : "ยืนยัน OTP เพื่อส่งให้เจ้าหน้าที่ตรวจสอบ ยอดหนี้ยังไม่เปลี่ยนทันที"
              }
              busy={f.busy}
              error={f.error}
              onCancel={() => setShowOtp(false)}
              onResend={() => askOtp(true)}
              onVerify={confirm}
            />
          )}
        </>
      )}
      {requests.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>วันที่แจ้ง</th>
                <th>วิธีชำระ</th>
                <th>ยอดชำระ</th>
                <th>สถานะ</th>
                {admin && can("confirm-repayment") && <th>ตรวจสอบ</th>}
              </tr>
            </thead>
            <tbody>
              {requests.toReversed().map((r) => (
                <tr key={r.id}>
                  <td>{r.created.slice(0, 10)}</td>
                  <td>
                    {methods[r.method]}
                    {r.account && <small>{r.account}</small>}
                  </td>
                  <td>{money(r.amountCents / 100)}</td>
                  <td>{status[r.status] || r.status}</td>
                  {admin && can("confirm-repayment") && (
                    <td>
                      {r.status === "pending" && (
                        <div className="actions">
                          <button
                            className="primary"
                            disabled={f.busy}
                            onClick={() =>
                              f.act({ action: "confirm-repayment", id: r.id })
                            }
                          >
                            ยืนยันรับชำระ
                          </button>
                          <button
                            disabled={f.busy}
                            onClick={() => {
                              const note = prompt("เหตุผลที่ไม่ยืนยัน");
                              if (note)
                                f.act({
                                  action: "reject-repayment",
                                  id: r.id,
                                  note,
                                });
                            }}
                          >
                            ไม่ยืนยัน
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
