// ระบบ: หน้าหลักและภาพรวม | ไฟล์: AdminDashboard.jsx
"use client";
// ภาพรวมเจ้าหน้าที่: แยกส่วนกราฟ คิวสินเชื่อ และข่าวจากข้อมูลกลาง
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "../layout/shell";
import { money, status } from "../shared/Finance";
import { TrendChart, Donut } from "./AdminCharts";
import styles from "./AdminDashboard.module.css";
import { demoAdminOverview } from "../../database/demo-admin-overview";
// ฟังก์ชัน Heading: ทำงานส่วน Heading ของระบบนี้
function Heading({ icon, title, subtitle, href, children }) {
  return (
    <div className={styles.heading}>
      <span className={styles.headingIcon}>
        <Icon name={icon} />
      </span>
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {href && (
        <Link href={href}>
          ดูทั้งหมด <span>→</span>
        </Link>
      )}
      {children}
    </div>
  );
}
// ฟังก์ชัน AdminDashboard: แสดงภาพรวมสหกรณ์จากข้อมูลจริงหรือจำลอง
export default function AdminDashboard() {
  const [liveData, setData] = useState(null),
    [error, setError] = useState(""),
    [year, setYear] = useState(null);
  const [demo, setDemo] = useState(true);
  const data = demo ? demoAdminOverview : liveData;
  useEffect(() => {
    if (demo) return;
    const controller = new AbortController();
    let loading = false;
    const refresh = async () => {
      if (loading || document.visibilityState === "hidden") return;
      loading = true;
      try {
        const r = await fetch("/api/dashboard", {
          cache: "no-store",
          signal: controller.signal,
        });
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        setData(d);
        setError("");
      } catch (e) {
        if (e.name !== "AbortError") setError(e.message);
      } finally {
        loading = false;
      }
    };
    refresh();
    const timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [demo]);
  const view = data?.overview;
  const trend =
    view?.trends.find((t) => t.year === (year || view.year)) || view?.trends[0];
  const approvalTotal = view
    ? view.approval.approved + view.approval.pending + view.approval.rejected
    : 0;
  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p>ภาพรวมการดำเนินงานของสหกรณ์ออมทรัพย์</p>
        <h1>ภาพรวมสหกรณ์</h1>
        <span>
          {demo
            ? "ข้อมูลจำลองสำหรับสาธิต"
            : "ข้อมูลทั้งสหกรณ์ · อัปเดตอัตโนมัติ"}
        </span>
      </header>
      <div className={styles.demoBanner}>
        <div>
          <strong>
            {demo ? "กำลังแสดงข้อมูลจำลอง" : "กำลังแสดงข้อมูลจริง"}
          </strong>
          <p>
            {demo
              ? "ตัวเลข กราฟ และรายชื่อเป็นตัวอย่างสำหรับหน้าภาพรวม ปุ่มจัดการจะเปิดหน้าระบบจริง"
              : "ข้อมูลล่าสุดจากฐานข้อมูลกลางของสหกรณ์"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDemo(!demo);
            setError("");
            setYear(null);
          }}
        >
          {demo ? "ดูข้อมูลจริง" : "ดูข้อมูลจำลอง"}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {!view ? (
        <p role="status">กำลังโหลดภาพรวม…</p>
      ) : (
        <>
          <div className={styles.stats}>
            {[
              [
                "users",
                "จำนวนสมาชิกทั้งหมด",
                data.members.toLocaleString("th-TH") + " คน",
                data.activeMembers + " คนใช้งานปกติ",
                "blue",
              ],
              [
                "refund",
                "ยอดเงินฝากรวม",
                "฿ " + money(data.depositTotal),
                data.depositAccounts + " บัญชีเงินฝาก",
                "blue",
              ],
              [
                "coins",
                "ยอดเงินกู้คงเหลือ",
                "฿ " + money(data.loanTotal),
                "เฉพาะสัญญาที่จ่ายเงินแล้ว",
                "amber",
              ],
              [
                "chart",
                "กำไรสุทธิ (ปีนี้)",
                view.netProfit === null
                  ? "ยังไม่มีข้อมูล"
                  : "฿ " + money(view.netProfit),
                (demo ? "ดอกเบี้ยรับ (จำลอง) " : "ดอกเบี้ยรับจริง ") +
                  money(view.interestIncome) +
                  " บาท",
                "purple",
              ],
            ].map(([icon, title, value, note, color]) => (
              <article key={title} className={styles.stat}>
                <span className={styles[color]}>
                  <Icon name={icon} />
                </span>
                <div>
                  <h2>{title}</h2>
                  <strong>{value}</strong>
                  <small>{note}</small>
                </div>
              </article>
            ))}
          </div>
          <div className={styles.chartGrid}>
            <section className={styles.card}>
              <Heading
                icon="chart"
                title="แนวโน้มเงินฝากและเงินกู้"
                subtitle="เปรียบเทียบยอดรวมรายเดือน (บาท)"
              >
                <select
                  aria-label="เลือกปีของกราฟ"
                  value={trend.year}
                  onChange={(e) => setYear(Number(e.target.value))}
                >
                  {view.trends.map((t) => (
                    <option key={t.year} value={t.year}>
                      ปี พ.ศ. {t.year + 543}
                    </option>
                  ))}
                </select>
              </Heading>
              <div className={styles.chartKeys}>
                <span>
                  <i style={{ background: "#6933e8" }} />
                  เงินฝากรวม
                </span>
                <span>
                  <i style={{ background: "#2684f5" }} />
                  เงินกู้คงเหลือ
                </span>
              </div>
              <TrendChart months={trend.months} />
            </section>
            <section className={styles.card + " " + styles.loanTypeCard}>
              <Heading
                icon="coins"
                title="สัดส่วนประเภทเงินกู้"
                subtitle="จำแนกตามวัตถุประสงค์ของเงินกู้"
              />
              <Donut
                variant="loan-types"
                items={view.loanTypes.map((p) => ({
                  name: p.name.replace(/^สินเชื่อ/, "เงินกู้"),
                  value: p.contractAmount,
                }))}
                center={
                  "฿ " +
                  Intl.NumberFormat("en-US", {
                    notation: "compact",
                    maximumFractionDigits: 2,
                  }).format(view.contractTotals.contractAmount)
                }
                caption="ยอดตามสัญญาที่ยังไม่ปิด"
                label="สัดส่วนสัญญาเงินกู้ที่อนุมัติและอยู่ระหว่างผ่อน แยกตามประเภท"
              />
              <div className={styles.contractBreakdown}>
                <div>
                  <span>จ่ายเงินแล้ว</span>
                  <strong>{money(view.contractTotals.amount)} บาท</strong>
                </div>
                <div>
                  <span>อนุมัติพร้อมชำระ</span>
                  <strong>
                    {money(view.contractTotals.approvedAmount)} บาท
                  </strong>
                </div>
              </div>
              {!view.contractTotals.contractAmount && (
                <p className={styles.empty}>ยังไม่มีสัญญาเงินกู้ที่อนุมัติ</p>
              )}
            </section>
            <section className={styles.card + " " + styles.approval}>
              <Heading
                icon="info"
                title="สัดส่วนเงินกู้"
                subtitle="สถานะคำขอที่ส่งตรวจแล้ว"
              />
              <Donut
                items={[
                  {
                    name: "อนุมัติแล้ว",
                    value: view.approval.approved,
                    color: "#30bd7d",
                    display: view.approval.approved + " ราย",
                  },
                  {
                    name: "รอพิจารณา",
                    value: view.approval.pending,
                    color: "#f4ba4e",
                    display: view.approval.pending + " ราย",
                  },
                  {
                    name: "ไม่อนุมัติ",
                    value: view.approval.rejected,
                    color: "#f65d85",
                    display: view.approval.rejected + " ราย",
                  },
                ]}
                center={approvalTotal + " ราย"}
                caption="รวมคำขอ"
                label="สัดส่วนสถานะคำขอสินเชื่อ"
              />
            </section>
          </div>
          <div className={styles.bottomGrid}>
            <section className={styles.card}>
              <Heading
                icon="refund"
                title="คำขอเงินกู้ที่ต้องจัดการ"
                subtitle="รายการคำขอที่รอการตรวจสอบและอนุมัติ"
                href="/admin/loans"
              />
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      {[
                        "เลขที่คำขอ",
                        "ชื่อ–สกุล",
                        "ประเภทเงินกู้",
                        "จำนวนเงิน",
                        "วันที่ยื่นคำขอ",
                        "สถานะ",
                      ].map((t) => (
                        <th key={t}>{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {view.waitingLoans.slice(0, 5).map((r) => (
                      <tr key={r.id}>
                        <td>
                          <Link href="/admin/loans">{r.number}</Link>
                        </td>
                        <td>
                          {r.name}
                          <small>{r.member}</small>
                        </td>
                        <td>{r.product}</td>
                        <td className={styles.numeric}>{money(r.amount)}</td>
                        <td>{r.date}</td>
                        <td>
                          <span className={styles.badge}>
                            {status[r.status] || r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!view.waitingLoans.length && (
                      <tr>
                        <td colSpan="6" className={styles.empty}>
                          ไม่มีคำขอสินเชื่อรอดำเนินการ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            <div className={styles.sideStack}>
              <section className={styles.card}>
                <Heading
                  icon="bell"
                  title="ประกาศ / แจ้งเตือน"
                  href="/admin/returns"
                />
                {view.notices.slice(0, 3).map((n) => (
                  <Link className={styles.notice} href={n.href} key={n.id}>
                    <Icon name="file" />
                    <div>
                      <strong>{n.title}</strong>
                      <small>{n.detail}</small>
                    </div>
                    <span>→</span>
                  </Link>
                ))}
                {!view.notices.length && (
                  <p className={styles.empty}>ยังไม่มีประกาศ</p>
                )}
              </section>
              <section className={styles.card}>
                <Heading icon="calendar" title="กิจกรรมล่าสุด" />
                {data.recent.slice(0, 3).map((r) => (
                  <Link className={styles.notice} href={r.href} key={r.id}>
                    <span className={styles.activityDot} />
                    <div>
                      <strong>
                        {r.title} · {r.name}
                      </strong>
                      <small>
                        {money(r.amount)} บาท · {status[r.state] || r.state}
                      </small>
                    </div>
                    <time>{r.date.slice(0, 10)}</time>
                  </Link>
                ))}
              </section>
            </div>
          </div>
          <nav className={styles.workQueue} aria-label="งานค้างแต่ละระบบ">
            {[
              ["members", "ใบสมัครสมาชิก", "/admin/applications"],
              ["shares", "ส่งหุ้นรอตรวจ", "/admin/shares"],
              ["changes", "คำขอปรับหุ้น", "/admin/shares"],
              ["deposits", "ฝาก / ถอนรอตรวจ", "/admin/deposits/approve"],
              ["loans", "สินเชื่อรอพิจารณา", "/admin/loans"],
            ].map(([k, label, href]) => (
              <Link key={k} href={href}>
                {label}
                <b>{data.pending[k]}</b>
                <span>→</span>
              </Link>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}
