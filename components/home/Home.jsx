// ระบบ: หน้าหลักและภาพรวม | ไฟล์: Home.jsx
"use client";
// หน้าหลักเดิม: การ์ดสรุป กราฟ สัดส่วนเงิน ทางลัด ธุรกรรม และติดตามสินเชื่อ
import { useEffect, useState } from "react";
import Link from "next/link";
import { useDemo, money } from "../shared/demo";
import { Icon } from "../layout/shell";
import HomeChart from "./HomeChart";
import InitialShareOnboarding from "../shares/InitialShareOnboarding";
import styles from "./Home.module.css";
// ฟังก์ชัน Home: แสดงยอดบัญชี กราฟ และทางลัดของสมาชิก
export default function Home() {
  const { data } = useDemo(),
    [overview, setOverview] = useState(null),
    [error, setError] = useState("");
  const activation = data.shares.activation;
  const needsInitialShare = Boolean(
    activation?.required && activation.state !== "pending",
  );
  useEffect(() => {
    if (needsInitialShare) return;
    const abort = new AbortController();
    let loading = false;
    // ฟังก์ชัน refresh: อ่านข้อมูลล่าสุดมาแสดง
    async function refresh() {
      if (loading) return;
      loading = true;
      try {
        const r = await fetch("/api/dashboard", {
          cache: "no-store",
          signal: abort.signal,
        });
        const result = await r.json();
        if (!r.ok) throw Error(result.error);
        setOverview(result);
        setError("");
      } catch (e) {
        if (e.name !== "AbortError") setError(e.message);
      } finally {
        loading = false;
      }
    }
    // ฟังก์ชัน visible: ทำงานส่วน visible ของระบบนี้
    function visible() {
      if (document.visibilityState === "visible") refresh();
    }
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    const timer = setInterval(visible, 15000);
    return () => {
      abort.abort();
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [needsInitialShare]);
  if (needsInitialShare) return <InitialShareOnboarding />;
  const member = data.members;
  const d = overview;
  const total = d ? d.shareTotal + d.depositTotal : 0;
  const shareRatio = total ? d.shareTotal / total : 0;
  return (
    <div className={styles.home}>
      <div className={styles.greeting}>
        <h1>
          สวัสดี, {member.name} <span>👋</span>
        </h1>
        <p>ยินดีต้อนรับสู่ระบบข้อมูลบัญชีและสินเชื่อสหกรณ์</p>
        <Link href="/shares/first">ดูตัวอย่างส่งหุ้นครั้งแรก</Link>
      </div>
      {activation?.state === "pending" && (
        <div className={styles.initialPending} role="status">
          <div>
            <strong>
              แจ้งส่งหุ้นครั้งแรกแล้ว {money(activation.pending?.amount || 0)}{" "}
              บาท · รอตรวจสอบ
            </strong>
            <p>
              กลับมาดูภาพรวมบัญชีได้แล้ว
              ยอดหุ้นจะเพิ่มและบริการอื่นจะเปิดเมื่อเจ้าหน้าที่ยืนยันรับเงิน
            </p>
          </div>
          <Link href="/shares">ดูรายการส่งหุ้นครั้งแรก</Link>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {!d ? (
        <p role="status">กำลังโหลดภาพรวมบัญชี…</p>
      ) : (
        <>
          <div className={styles.kpis}>
            {[
              [
                "refund",
                "ยอดเงินฝากรวม",
                d.depositTotal,
                "ยอดเงินฝากที่ยืนยันแล้ว",
                "blue",
              ],
              [
                "coins",
                "หุ้นสะสม",
                d.shareUnits,
                "มูลค่าหุ้น " + money(d.shareTotal) + " บาท",
                "green",
              ],
              [
                "file",
                d.loanTotal > 0
                  ? "ยอดสินเชื่อคงเหลือ"
                  : d.approvedLoanTotal > 0
                    ? "ยอดสินเชื่อที่อนุมัติ"
                    : "ยอดสินเชื่อคงเหลือ",
                d.loanTotal > 0 ? d.loanTotal : d.approvedLoanTotal || 0,
                d.loanTotal > 0
                  ? d.approvedLoanTotal > 0
                    ? `เงินต้นคงเหลือ · อนุมัติเพิ่ม ${money(d.approvedLoanTotal)} บาท`
                    : "เงินต้นที่ยังไม่ได้ชำระ"
                  : d.approvedLoanTotal > 0
                    ? ""
                    : "ยังไม่มีสัญญาสินเชื่อที่ค้างชำระ",
                "purple",
              ],
              [
                "calendar",
                "ยอดประจำเดือนรวม",
                d.monthlyObligation ?? d.installmentSummary?.amount ?? 0,
                d.installmentSummary
                  ? "กำหนดชำระ " +
                    new Date(
                      d.installmentSummary.firstDue + "T00:00:00+07:00",
                    ).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: "Asia/Bangkok",
                    }) +
                    (d.installmentSummary.lastDue !==
                    d.installmentSummary.firstDue
                      ? " – " +
                        new Date(
                          d.installmentSummary.lastDue + "T00:00:00+07:00",
                        ).toLocaleDateString("th-TH", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          timeZone: "Asia/Bangkok",
                        })
                      : "")
                  : d.monthlySavings?.amount > 0
                    ? "งวดฝาก " + d.monthlySavings.period
                    : "ยังไม่มีกำหนดชำระ",
                "light",
              ],
            ].map(([icon, label, value, caption, color]) => (
              <section key={label} className={`${styles.kpi} ${styles[color]}`}>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiIcon}>
                    <Icon name={icon} />
                  </span>
                  <span>{label}</span>
                </div>
                <div className={styles.kpiAmount}>
                  <strong>{money(value)}</strong>
                  <span>{icon === "coins" ? "หุ้น" : "บาท"}</span>
                </div>
                <div className={styles.kpiCaption}>{caption}</div>
              </section>
            ))}
          </div>
          <div className={styles.middle}>
            <HomeChart monthly={d.monthly} />
            <section className={styles.card}>
              <h2>สัดส่วนเงินของฉัน</h2>
              <p>เงินฝากและมูลค่าหุ้น (หน่วยบาท)</p>
              <div className={styles.donut}>
                <svg
                  viewBox="0 0 160 160"
                  aria-label="สัดส่วนหุ้นและเงินฝาก"
                  role="img"
                >
                  <circle
                    cx="80"
                    cy="80"
                    r="56"
                    fill="none"
                    stroke={total ? "#129642" : "#e5ecf5"}
                    strokeWidth="22"
                  />
                  {total > 0 && (
                    <circle
                      cx="80"
                      cy="80"
                      r="56"
                      fill="none"
                      stroke="#0b5ed7"
                      strokeWidth="22"
                      strokeDasharray={`${351.86 * (1 - shareRatio)} 351.86`}
                      transform="rotate(-90 80 80)"
                    />
                  )}
                </svg>
                <div>
                  <small>รวมทั้งสิ้น</small>
                  <strong>฿ {money(total)}</strong>
                </div>
              </div>
              <div className={styles.legend}>
                <span>
                  <i style={{ background: "#0b5ed7" }} />
                  เงินฝาก {total ? ((1 - shareRatio) * 100).toFixed(1) : 0}%
                </span>
                <span>
                  <i style={{ background: "#129642" }} />
                  หุ้น {total ? (shareRatio * 100).toFixed(1) : 0}%
                </span>
              </div>
            </section>
            <section className={`${styles.card} ${styles.quick}`}>
              <h2>ทำรายการด่วน</h2>
              {[
                ["/deposits", "refund", "ฝาก / ถอนเงิน"],
                ["/shares", "coins", "ส่งหุ้นสมาชิก"],
                ["/loans", "file", "ยื่นขอสินเชื่อ"],
                ["/documents", "calendar", "ดูประวัติธุรกรรม"],
              ].map(([href, icon, label]) => (
                <Link key={href} href={href}>
                  <Icon name={icon} />
                  <span>{label}</span>
                  <b>›</b>
                </Link>
              ))}
            </section>
          </div>
          <div className={styles.bottom}>
            <section className={styles.card}>
              <div className={styles.cardTitle}>
                <h2>รายการธุรกรรมล่าสุด</h2>
                <Link href="/deposits">ดูเงินฝากทั้งหมด ›</Link>
              </div>
              {d.recent.length ? (
                d.recent.map((t) => (
                  <Link className={styles.transaction} key={t.id} href={t.href}>
                    <span
                      className={`${styles.arrow} ${t.amount < 0 ? styles.negative : ""}`}
                    >
                      {t.amount < 0 ? "↑" : "↓"}
                    </span>
                    <div>
                      <strong>{t.title}</strong>
                      <small>{t.date.slice(0, 10)}</small>
                    </div>
                    <b
                      className={
                        t.amount < 0 ? styles.negative : styles.positive
                      }
                    >
                      {t.amount < 0 ? "−" : "+"} {money(Math.abs(t.amount))} ฿
                    </b>
                  </Link>
                ))
              ) : (
                <p className={styles.empty}>ยังไม่มีรายการที่ยืนยันแล้ว</p>
              )}
            </section>
            <section className={`${styles.card} ${styles.tracker}`}>
              <h2>สินเชื่อที่ต้องติดตาม</h2>
              {d.loan ? (
                <>
                  <h3>สัญญา : {d.loan.number}</h3>
                  <progress
                    aria-label="สัดส่วนเงินต้นที่ชำระแล้ว"
                    value={d.loan.paidPercent}
                    max="100"
                  />
                  <p>ชำระเงินต้นแล้ว {d.loan.paidPercent}%</p>
                  <p>เงินต้นและดอกเบี้ยคงเหลือ ฿ {money(d.loan.remaining)}</p>
                </>
              ) : d.pendingLoan ? (
                <div className={styles.pendingLoan}>
                  <span>อนุมัติแล้ว · พร้อมชำระ</span>
                  <h3>สัญญา : {d.pendingLoan.number}</h3>
                  <p>วงเงินอนุมัติ ฿ {money(d.pendingLoan.amount)}</p>
                  <p>ค่างวดตามสัญญา ฿ {money(d.pendingLoan.installment)}</p>
                  <small>
                    กำหนดงวดแรก {d.pendingLoan.firstDue} ·
                    ชำระเงินได้ในรายละเอียดสัญญา
                  </small>
                </div>
              ) : (
                <div className={styles.empty}>
                  <Icon name="file" />
                  <p>ยังไม่มีสินเชื่อที่อยู่ระหว่างผ่อนชำระ</p>
                </div>
              )}
              <Link
                className={styles.primary}
                href={
                  d.loan?.id || d.pendingLoan?.id
                    ? `/loans?contract=${encodeURIComponent(d.loan?.id || d.pendingLoan.id)}`
                    : "/loans"
                }
              >
                {d.loan
                  ? "ดูตารางชำระหนี้"
                  : d.pendingLoan
                    ? "ดูสัญญาที่อนุมัติแล้ว"
                    : "ดูสินเชื่อและคำขอ"}
              </Link>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
