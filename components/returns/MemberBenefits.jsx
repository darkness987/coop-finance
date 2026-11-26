// ระบบ: ปันผล เฉลี่ยคืน และบัญชีรับผลตอบแทน | ไฟล์: MemberBenefits.jsx
"use client";
// หน้าผลตอบแทนแยกหุ้น/เงินฝาก: ใช้บัญชีรับเงินชุดเดียวกันและอ่านยอดยืนยันล่าสุด
import { useEffect } from "react";
import ReceivingAccount from "./ReceivingAccount";
import { demoDepositReturns } from "../../database/demo-deposit-returns";
import { useFinance, Notices, money } from "../shared/Finance";
import "./benefits.css";
// ฟังก์ชัน MemberBenefits: ทำงานส่วน MemberBenefits ของระบบนี้
export default function MemberBenefits({ kind }) {
  const f = useFinance("benefits"),
    d = f.data;
  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) f.load().catch(() => {});
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("coop:finance-updated", refresh);
    const storageRefresh = (e) => {
      if (e.key === "coop:finance-updated") refresh();
    };
    window.addEventListener("storage", storageRefresh);
    // อ่านข้อมูลล่าสุดซ้ำขณะเปิดหน้านี้ รองรับเจ้าหน้าที่รับเงินหรือเพิ่มบัญชีจากอีกเบราว์เซอร์
    const timer = setInterval(refresh, 5000);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("coop:finance-updated", refresh);
      window.removeEventListener("storage", storageRefresh);
      clearInterval(timer);
    };
  }, []);
  if (!d)
    return (
      <div className="benefits-page">
        <h1>ผลตอบแทนสมาชิก</h1>
        <Notices f={f} />
        <p>กำลังโหลด…</p>
      </div>
    );
  const isShares = kind === "shares",
    title = isShares ? "เงินปันผลหุ้น" : "ผลตอบแทนเงินฝาก";
  const demo = !isShares && d.deposits.history.length === 0;
  const history = (
    isShares ? d.shares.history : demo ? demoDepositReturns : d.deposits.history
  ).toSorted((a, b) => b.year - a.year);
  const total = history.reduce((s, r) => s + r.cents, 0) / 100,
    latest = history[0];
  const byYear = Object.entries(
    history.reduce(
      (s, r) => ({ ...s, [r.year]: (s[r.year] || 0) + r.cents / 100 }),
      {},
    ),
  )
    .sort(([a], [b]) => Number(a) - Number(b))
    .slice(-5);
  const highest = Math.max(1, ...byYear.map(([, value]) => value));
  return (
    <div className="benefits-page">
      <p className="benefits-muted">
        ผลตอบแทนสมาชิก / {isShares ? "หุ้นสมาชิก" : "เงินฝาก"}
      </p>
      <h1>{title}</h1>
      <p className="benefits-muted">
        ดูประมาณการจากยอดปัจจุบัน และผลจัดสรรที่อนุมัติแล้ว
      </p>
      <Notices f={f} />
      {demo && (
        <p className="benefits-demo-note" role="note">
          ข้อมูลผลตอบแทนย้อนหลังสมมุติสำหรับสาธิต
          ไม่รวมในยอดเงินฝากหรือยอดรับเงินจริง เมื่อมีผลจัดสรรจริง
          ระบบจะแสดงข้อมูลจริงแทน
        </p>
      )}
      <div className="benefits-stats">
        <article>
          <span>
            {title}
            {demo ? "สะสม (สมมุติ)" : "ที่อนุมัติสะสม"}
          </span>
          <strong>{money(total)} บาท</strong>
        </article>
        <article>
          <span>
            {demo ? "ผลตอบแทนตัวอย่างล่าสุด" : "ผลจัดสรรล่าสุด"}
            {latest ? " · ปี " + (latest.year + 543) : ""}
          </span>
          <strong>
            {latest ? money(latest.cents / 100) + " บาท" : "ยังไม่มีผลจัดสรร"}
          </strong>
          <small>{latest?.rate != null ? latest.rate + "% ต่อปี" : ""}</small>
        </article>
        <article>
          <span>สถานะรายการล่าสุด</span>
          <strong className="benefits-green">
            {demo
              ? "จ่ายแล้ว (สมมุติ)"
              : latest
                ? latest.status === "confirmed"
                  ? "จ่ายแล้ว"
                  : "อนุมัติแล้ว"
                : "ยังไม่มีรายการ"}
          </strong>
        </article>
      </div>
      <section className="benefits-card">
        <div className="benefits-section-heading">
          <h2>ประมาณการจากยอดปัจจุบัน</h2>
        </div>
        {isShares ? (
          <div className="benefits-estimate">
            <div>
              <span>หุ้นสะสมที่ยืนยันแล้ว</span>
              <strong>{money(d.shares.amount)} บาท</strong>
            </div>
            <div>
              <span>อัตราเงินปันผลที่ใช้อ้างอิง</span>
              <strong>
                {d.shares.rate == null ? "ยังไม่กำหนด" : d.shares.rate + "%"}
              </strong>
            </div>
            <div>
              <span>ปันผลประมาณการเต็มปี</span>
              <strong>
                {d.shares.estimatedCents == null
                  ? "ยังคำนวณไม่ได้"
                  : money(d.shares.estimatedCents / 100) + " บาท"}
              </strong>
            </div>
          </div>
        ) : (
          <>
            <div className="benefits-estimate">
              <div>
                <span>เงินฝากรวมปัจจุบัน</span>
                <strong>
                  {money(
                    d.deposits.accounts.reduce((s, a) => s + a.balance, 0),
                  )}{" "}
                  บาท
                </strong>
              </div>
              <div>
                <span>ผลตอบแทนประมาณการเต็มปี</span>
                <strong>{money(d.deposits.estimatedCents / 100)} บาท</strong>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>บัญชี / ประเภท</th>
                    <th>ยอดเงินฝาก</th>
                    <th>อัตรา</th>
                    <th>ประมาณการเต็มปี</th>
                  </tr>
                </thead>
                <tbody>
                  {d.deposits.accounts.map((a) => (
                    <tr key={a.account}>
                      <td>
                        {a.name}
                        <small>{a.account}</small>
                      </td>
                      <td>{money(a.balance)}</td>
                      <td>{a.rate == null ? "ยังไม่กำหนด" : a.rate + "%"}</td>
                      <td>
                        {a.estimatedCents == null
                          ? "ยังคำนวณไม่ได้"
                          : money(a.estimatedCents / 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {!isShares && d.deposits.accounts.some((a) => a.monthlyPlan) && (
          <div className="benefits-monthly-plans">
            <h3>ผลตอบแทนออมทรัพย์รายเดือนตามสัญญา</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>บัญชี</th>
                    <th>ฝากต่อเดือน</th>
                    <th>ระยะเวลา / อัตรา</th>
                    <th>ดอกเบี้ยครบสัญญาโดยประมาณ</th>
                    <th>ยอดรวมครบสัญญาโดยประมาณ</th>
                  </tr>
                </thead>
                <tbody>
                  {d.deposits.accounts
                    .filter((a) => a.monthlyPlan)
                    .map((a) => (
                      <tr key={a.account}>
                        <td>
                          {a.name}
                          <small>{a.account}</small>
                        </td>
                        <td>{money(a.monthlyPlan.monthlyCents / 100)}</td>
                        <td>
                          {a.monthlyPlan.termMonths} เดือน ·{" "}
                          {a.monthlyPlan.annualRate.toFixed(2)}% ต่อปี
                        </td>
                        <td>{money(a.monthlyPlan.interestCents / 100)}</td>
                        <td>{money(a.monthlyPlan.totalCents / 100)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <p className="benefits-muted">
              ประมาณการตามแผนที่บันทึก สมมุติฝากวันที่ 1 ทุกเดือนและไม่ทบต้น
              ยอดตามสัญญายังไม่รวมเป็นเงินฝากปัจจุบันจนกว่าจะยืนยันรับเงินจริง
            </p>
          </div>
        )}
        <p className="benefits-muted">
          เป็นประมาณการเต็มปีจากยอดที่ยืนยันแล้วในปัจจุบัน
          ไม่ใช่ยอดอนุมัติจ่ายจริง{" "}
          {isShares
            ? "ยอดหุ้นเพิ่มหรือลด ประมาณการจะเปลี่ยนตามอัตราอ้างอิง"
            : "ดอกเบี้ยที่จัดสรรจริงคำนวณจากยอดปิดสิ้นวันและระยะเวลาที่ฝาก บัญชีที่ยังไม่กำหนดอัตราจะไม่รวมในประมาณการ"}
        </p>
      </section>
      <div className="benefits-columns">
        <section className="benefits-card">
          <h2>แนวโน้มผลตอบแทนรายปี{demo ? " (สมมุติ)" : ""}</h2>
          {byYear.length ? (
            <div
              className="benefits-chart"
              role="img"
              aria-label="กราฟผลตอบแทนที่อนุมัติย้อนหลัง"
            >
              {byYear.map(([year, amount]) => (
                <div className="benefits-bar-column" key={year}>
                  <span>{money(amount)}</span>
                  <div
                    className="benefits-bar"
                    style={{ height: Math.max(4, (amount / highest) * 140) }}
                  />
                  <small>{Number(year) + 543}</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="benefits-muted">ยังไม่มีผลจัดสรรที่อนุมัติแล้ว</p>
          )}
        </section>
        <ReceivingAccount f={f} isShares={isShares} />
      </div>
      <section className="benefits-card">
        <h2>
          ประวัติ{title}
          {demo ? " (สมมุติ)" : ""}
        </h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ปี พ.ศ.</th>
                <th>รายการ</th>
                <th>อัตรา</th>
                <th>จำนวนเงิน</th>
                <th>บัญชี / สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r, index) => (
                <tr key={r.id || r.year + "-" + index}>
                  <td>{r.year + 543}</td>
                  <td>{title}</td>
                  <td>{r.rate == null ? "—" : r.rate + "%"}</td>
                  <td>{money(r.cents / 100)} บาท</td>
                  <td>
                    {r.account && <small>{r.account}</small>}
                    {demo
                      ? "จ่ายแล้ว (สมมุติ)"
                      : r.status === "confirmed"
                        ? "จ่ายแล้ว"
                        : "อนุมัติแล้ว"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!history.length && <p className="benefits-muted">ยังไม่มีรายการ</p>}
      </section>
    </div>
  );
}
