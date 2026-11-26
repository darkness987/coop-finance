// ระบบ: สินเชื่อ วงเงิน ผู้ค้ำ และชำระหนี้ | ไฟล์: ContractDetail.jsx
"use client";
import { useDemo } from "../shared/demo";
import { canAccess, roleOf } from "../../lib/auth/permissions";
// สัญญาและตารางผ่อน: แยกต้น/ดอกเบี้ย พร้อมคำอธิบายสั้นใต้ตาราง
import { money, status, Field } from "../shared/Finance";
import LoanCalculation from "./LoanCalculation";
import LoanRepayment from "./LoanRepayment";
import LoanSecuritySummary from "./LoanSecuritySummary";
// ฟังก์ชัน ContractDetail: แสดงสัญญา ตารางผ่อนและประวัติชำระ
export default function ContractDetail({ f, admin = false, c }) {
  const { user } = useDemo();
  const can = (action) => canAccess(user || {}, "loans", action);
  const schedules = f.data.schedules
    .filter((installment) => installment.contract === c.id)
    .sort((a, b) => a.number - b.number);
  let scheduledPrincipal = Number(c.amount);
  const rows = schedules.map((installment) => {
    const openingPrincipal = scheduledPrincipal;
    scheduledPrincipal =
      Math.round(
        (scheduledPrincipal - installment.principalCents / 100) * 100,
      ) / 100;
    return {
      ...installment,
      openingPrincipal,
      closingPrincipal: Math.max(0, scheduledPrincipal),
    };
  });
  const paidCents = rows.reduce(
      (sum, r) => sum + r.paidPrincipal + r.paidInterest,
      0,
    ),
    interestCents = rows.reduce((sum, r) => sum + r.interestCents, 0);
  const payments = f.data.payments.filter((p) => p.contract === c.id);
  return (
    <article className="panel loan-contract-detail">
      <div className="loan-section-title">
        <div>
          <small>รายละเอียดสินเชื่อ</small>
          <h2>สัญญา {c.number}</h2>
        </div>
        <span className={"loan-status " + c.status}>{status[c.status]}</span>
      </div>
      <p>
        สมาชิก {c.member} · ระยะเวลาผ่อน {c.months} เดือน · งวดแรก {c.firstDue}
      </p>
      <LoanSecuritySummary row={c} />
      {c.status === "approved" && (
        <p className="loan-contract-note">
          สัญญาอนุมัติแล้ว สามารถชำระได้ทันที ตารางด้านล่างเป็นกำหนดชำระตามสัญญา
        </p>
      )}
      <div className="loan-result-grid">
        {[
          ["เงินต้นที่กู้", c.amount],
          ["ค่างวดประมาณ", c.installment],
          ["ดอกเบี้ยรวมตามตาราง", interestCents / 100],
          ["ชำระแล้ว", paidCents / 100],
        ].map(([label, value]) => (
          <div key={label}>
            <small>{label}</small>
            <strong>{money(value)} ฿</strong>
          </div>
        ))}
      </div>
      <p className="loan-muted">
        วิธีรับเงิน:{" "}
        {c.disbursementMethod === "cash"
          ? "เงินสด"
          : c.disbursementMethod === "account"
            ? "เข้าบัญชี · " +
              c.disbursementAccount?.bank +
              " · " +
              c.disbursementAccount?.last4
            : "ยังไม่ระบุ"}
      </p>
      <LoanRepayment key={c.id} f={f} c={c} admin={admin} />
      <section className="loan-schedule-section">
        <h3>ตารางผ่อนชำระแบบลดต้นลดดอก</h3>
        <p className="loan-muted">
          ดอกเบี้ย {c.annualRate}% ต่อปี คิดรายเดือนจากเงินต้นก่อนงวด
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>งวด / ครบกำหนด</th>
                <th>เงินต้นก่อนงวด</th>
                <th>ดอกเบี้ย</th>
                <th>ตัดเงินต้น</th>
                <th>ค่างวด</th>
                <th>เงินต้นคงเหลือ</th>
                <th>ชำระแล้ว</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.number}>
                  <td>
                    งวด {r.number}
                    <small>{r.dueDate}</small>
                  </td>
                  <td>{money(r.openingPrincipal)}</td>
                  <td>{money(r.interestCents / 100)}</td>
                  <td>{money(r.principalCents / 100)}</td>
                  <td>{money((r.principalCents + r.interestCents) / 100)}</td>
                  <td>{money(r.closingPrincipal)}</td>
                  <td>
                    {money((r.paidPrincipal + r.paidInterest) / 100)}
                    <small>
                      {r.paidPrincipal + r.paidInterest >=
                      r.principalCents + r.interestCents
                        ? "ชำระครบงวด"
                        : r.paidPrincipal + r.paidInterest > 0
                          ? "ชำระบางส่วน"
                          : "ยังไม่ชำระ"}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={2}>รวมตามสัญญา (บาท)</th>
                <td>{money(interestCents / 100)}</td>
                <td>
                  {money(
                    rows.reduce((sum, r) => sum + r.principalCents, 0) / 100,
                  )}
                </td>
                <td>
                  {money(
                    rows.reduce(
                      (sum, r) => sum + r.principalCents + r.interestCents,
                      0,
                    ) / 100,
                  )}
                </td>
                <td>0.00</td>
                <td>{money(paidCents / 100)}</td>
              </tr>
            </tfoot>
          </table>
          {!rows.length && (
            <p className="loan-empty">
              ยังไม่มีตารางผ่อน กรุณาติดต่อเจ้าหน้าที่
            </p>
          )}
        </div>
      </section>
      {rows.length > 0 && (
        <LoanCalculation
          annualInterestPercent={c.annualRate}
          openingPrincipal={rows[0].openingPrincipal}
          interestAmount={rows[0].interestCents / 100}
        />
      )}
      {admin && can("repay") && c.status === "active" && (
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            f.act({
              ...Object.fromEntries(new FormData(e.currentTarget)),
              action: "repay",
              id: c.id,
            });
          }}
        >
          <h3>รับชำระหนี้</h3>
          <Field label="เลขอ้างอิง (ห้ามซ้ำ)" name="reference" required />
          <Field
            label="จำนวนเงิน (บาท)"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
          />
          <button disabled={f.busy}>ยืนยันรายการ</button>
        </form>
      )}
      <h3>ประวัติรับชำระ</h3>
      {payments.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>วันที่</th>
                <th>ยอดชำระ</th>
                <th>ตัดดอกเบี้ย</th>
                <th>ตัดเงินต้น</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.date?.slice(0, 10)}</td>
                  <td>{money(p.amountCents / 100)}</td>
                  <td>{money(p.interestCents / 100)}</td>
                  <td>{money(p.principalCents / 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="loan-muted">ยังไม่มีรายการรับชำระ</p>
      )}
    </article>
  );
}
