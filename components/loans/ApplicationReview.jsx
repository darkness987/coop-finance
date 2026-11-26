"use client";
// หน้าตรวจสินเชื่อของเจ้าหน้าที่: ข้อมูลล่าสุด + snapshot ตอนส่งคำขอ + ตารางประมาณการ
import { money } from "../shared/Finance";
import LoanSecuritySummary from "./LoanSecuritySummary";
export default function ApplicationReview({ row }) {
  const r = row.review;
  if (!r) return null;
  const original = row.securityAtSubmission;
  const submitted = row.reviewAtSubmission;
  return (
    <section
      className="loan-application-review"
      aria-label="ข้อมูลประกอบการพิจารณาสินเชื่อ"
    >
      <LoanSecuritySummary row={row} />
      <div className="loan-section-title">
        <div>
          <h3>ข้อมูลสมาชิกและฐานะการเงิน</h3>
          <p className="loan-muted">
            ข้อมูลล่าสุด ณ{" "}
            {new Date(r.checkedAt).toLocaleString("th-TH", {
              timeZone: "Asia/Bangkok",
            })}
          </p>
        </div>
        <span
          className={"loan-status " + (r.member.active ? "active" : "rejected")}
        >
          {r.member.active ? "สมาชิกใช้งาน" : "สมาชิกถูกระงับ"}
        </span>
      </div>
      <div className="loan-review-member">
        {[
          ["ชื่อ–นามสกุล", r.member.name],
          ["เลขสมาชิก", r.member.id],
          ["วันที่เป็นสมาชิก", r.member.joined],
          ["หน่วยงาน", r.member.company],
          ["อาชีพ", r.member.occupation],
          ["โทรศัพท์", r.member.phone],
          ["อีเมล", r.member.email],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value || "—"}</strong>
          </div>
        ))}
      </div>
      <div className="loan-review-metrics">
        {[
          [
            "หุ้นสะสม (มูลค่า)",
            r.security.shareAmount,
            `${money(r.shareUnits)} หุ้น`,
          ],
          [
            "เงินฝากรวม",
            r.security.depositAmount,
            `${r.deposits.length} บัญชี`,
          ],
          [
            "สินทรัพย์รวม",
            r.security.totalAmount,
            "หุ้นและเงินฝากที่ยืนยันแล้ว",
          ],
          ["รายได้ต่อเดือน", r.income, "ข้อมูลสมาชิกที่อนุมัติแล้ว"],
          [
            "เงินต้นหนี้เดิมคงเหลือ",
            r.outstandingPrincipal,
            "ไม่รวมคำขอกู้ครั้งนี้",
          ],
          [
            "วงเงินไม่ใช้ผู้ค้ำที่เหลือ",
            r.security.availableAmount,
            `เพดาน ${r.security.totalPercent}% หักหนี้และวงเงินจองแล้ว`,
          ],
        ].map(([label, value, note]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{money(value)} บาท</strong>
            <small>{note}</small>
          </div>
        ))}
      </div>
      <details className="loan-review-details">
        <summary>รายละเอียดบัญชีเงินฝาก ({r.deposits.length} บัญชี)</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>เลขบัญชี</th>
                <th>ประเภท</th>
                <th>ยอดคงเหลือ</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {r.deposits.map((a) => (
                <tr key={a.id}>
                  <td>{a.id}</td>
                  <td>{a.type}</td>
                  <td>{money(a.balance)} บาท</td>
                  <td>
                    {{
                      active: "ใช้งาน",
                      restricted: "จำกัดรายการ",
                      suspended: "ระงับ",
                    }[a.status] || a.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      {original && (
        <details className="loan-review-details">
          <summary>เทียบข้อมูลตอนยื่นกับข้อมูลล่าสุด</summary>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ข้อมูล</th>
                  <th>ตอนส่งคำขอ</th>
                  <th>ล่าสุด</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["มูลค่าหุ้น", original.shareAmount, r.security.shareAmount],
                  ["เงินฝาก", original.depositAmount, r.security.depositAmount],
                  [
                    "สินทรัพย์รวม",
                    original.totalAmount,
                    r.security.totalAmount,
                  ],
                  [
                    "วงเงินไม่ใช้ผู้ค้ำที่เหลือ",
                    original.availableAmount,
                    r.security.availableAmount,
                  ],
                  ...(submitted
                    ? [
                        ["รายได้ต่อเดือน", submitted.income, r.income],
                        [
                          "ภาระผ่อนเดิมต่อเดือน",
                          submitted.existingMonthly,
                          r.existingMonthly,
                        ],
                      ]
                    : []),
                ].map(([label, before, after]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{money(before)} บาท</td>
                    <td>{money(after)} บาท</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!submitted && (
            <p className="loan-muted">
              คำขอเดิมมีข้อมูลสินทรัพย์ตอนยื่น แต่ยังไม่มีภาพรวมรายได้ตอนยื่น
              ใช้รายได้ล่าสุดประกอบการตรวจสอบ
            </p>
          )}
        </details>
      )}
      <h3>ตรวจเงื่อนไขประกอบการพิจารณา</h3>
      <ul className="loan-checks">
        {r.checks.map((c) => (
          <li key={c.label} className={c.passed ? "passed" : "failed"}>
            {c.passed ? "✓" : "!"} {c.label}
            {c.detail && (
              <small className="loan-review-check-detail">{c.detail}</small>
            )}
          </li>
        ))}
      </ul>
      {r.guarantors.length > 0 && (
        <div className="loan-review-guarantors">
          <h3>ตรวจผู้ค้ำประกัน</h3>
          {r.guarantors.map((g) => (
            <p key={g.member}>
              {g.name} · {g.member}{" "}
              <span
                className={"loan-status " + (g.active ? "active" : "rejected")}
              >
                {g.active ? "ใช้งาน" : "ไม่พบหรือถูกระงับ"}
              </span>
            </p>
          ))}
        </div>
      )}
      {r.calculation ? (
        <>
          <div className="loan-result-grid">
            {[
              ["ค่างวดกู้ครั้งนี้", r.calculation.installment],
              ["ภาระผ่อนเดิมต่อเดือน", r.existingMonthly],
              ["ภาระผ่อนรวมต่อเดือน", r.totalMonthly],
              ["ดอกเบี้ยรวมสัญญานี้", r.calculation.totalInterest],
              ["ยอดชำระรวมสัญญานี้", r.calculation.total],
              ["สัดส่วนผ่อนต่อรายได้", r.incomeRatio],
            ].map(([label, value]) => (
              <div key={label}>
                <small>{label}</small>
                <strong>
                  {value == null
                    ? "ไม่มีข้อมูล"
                    : money(value) +
                      (label === "สัดส่วนผ่อนต่อรายได้" ? "%" : " บาท")}
                </strong>
              </div>
            ))}
          </div>
          <details className="loan-review-details">
            <summary>ตารางผ่อนที่ใช้พิจารณา ({row.months} งวด)</summary>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>งวด</th>
                    <th>กำหนดโดยประมาณ</th>
                    <th>เงินต้นก่อนงวด</th>
                    <th>ดอกเบี้ย</th>
                    <th>ตัดเงินต้น</th>
                    <th>ค่างวด</th>
                    <th>เงินต้นคงเหลือ</th>
                  </tr>
                </thead>
                <tbody>
                  {r.calculation.rows.map((s) => (
                    <tr key={s.number}>
                      <td>{s.number}</td>
                      <td>{s.dueDate}</td>
                      <td>{money(s.openingBalance)}</td>
                      <td>{money(s.interest)}</td>
                      <td>{money(s.principal)}</td>
                      <td>{money(s.payment)}</td>
                      <td>{money(s.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : (
        <p className="error">{r.calculationError}</p>
      )}
      <p className="loan-muted">
        ยอดรอตรวจยังไม่เพิ่มเป็นหุ้นหรือเงินฝาก การตรวจเบื้องต้นไม่ใช่ผลอนุมัติ
        เจ้าหน้าที่ต้องตรวจข้อมูลผู้ค้ำหรือเอกสารหลักประกันก่อนอนุมัติ
        วันครบกำหนดจริงอ้างอิงสัญญาที่สร้างเมื่ออนุมัติ
      </p>
    </section>
  );
}
