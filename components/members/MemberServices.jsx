"use client";
// หน้าติดตามสมาชิก: รายงาน ยอดหุ้นขาด และงานตรวจสอบที่ไม่ใช่การรับจ่ายเงิน
import { useState } from "react";
import { useFinance, Notices, money } from "../shared/Finance";
import Link from "next/link";
import ProfileChangeReviews from "./ProfileChangeReviews";
import styles from "./member-services.module.css";
const kinds = {
  correction: "ขอแก้ข้อมูล",
  resign: "ขอลาออก",
  suspend: "ขอระงับสมาชิก",
};
const states = {
  pending: "รอตรวจ",
  answered: "สมาชิกแจ้งแก้ไขแล้ว",
  forwarded: "ส่ง Admin อนุมัติ",
  completed: "ตรวจเรียบร้อย",
  approved: "อนุมัติ",
  rejected: "ไม่อนุมัติ",
};
export default function MemberServices() {
  const f = useFinance("member-services"),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState(""),
    [onlyMissing, setOnlyMissing] = useState(false);
  if (!f.data)
    return (
      <div>
        <h2>งานดูแลสมาชิก</h2>
        <Notices f={f} />
        <p>กำลังโหลดข้อมูล…</p>
      </div>
    );
  const d = f.data,
    rows = d.members.filter(
      (m) =>
        (m.id + " " + m.name).toLowerCase().includes(query.toLowerCase()) &&
        (!onlyMissing || (m.active && m.shortfall > 0)),
    );
  const person = d.members.find((m) => m.id === selected) || rows[0];
  function csv() {
    const cell = (v) =>
      '"' +
      String(v ?? "")
        .replace(/^[=+@\-]/, "'$&")
        .replaceAll('"', '""') +
      '"';
    const data = [
      [
        "เลขสมาชิก",
        "ชื่อ",
        "สถานะ",
        "หุ้นสะสม",
        "เงินฝาก",
        "หนี้",
        "ภาระค้ำ",
        "ยอดรายเดือน",
        "ส่งแล้ว",
        "ขาดส่ง",
      ],
      ...rows.map((m) => [
        m.id,
        m.name,
        m.active ? "ปกติ" : "ระงับ",
        m.shares,
        m.deposits,
        m.debt,
        m.guaranteeCount,
        m.monthly,
        m.paid,
        m.shortfall,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + data.map((row) => row.map(cell).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "member-register.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function act(action, id) {
    const note = prompt("รายละเอียด / ผลตรวจสอบ");
    if (note === null) return;
    await f.act({ action, id, note });
  }
  return (
    <div className={styles.page}>
      <header>
        <h1>{d.staff ? "ดูแลและติดตามสมาชิก" : "งานติดตามข้อมูลของฉัน"}</h1>
        <p>ภาพรวมสมาชิก ค่าหุ้น และการตรวจสอบคำขอ</p>
      </header>
      <Notices f={f} />
      <ProfileChangeReviews f={f} />
      {d.staff && (
        <>
          <div className={styles.toolbar}>
            <input
              aria-label="ค้นหาสมาชิก"
              placeholder="ค้นหาชื่อ / เลขสมาชิก"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <label>
              <input
                type="checkbox"
                checked={onlyMissing}
                onChange={(e) => setOnlyMissing(e.target.checked)}
              />
              เฉพาะส่งหุ้นไม่ครบ
            </label>
            <button onClick={csv}>ดาวน์โหลดทะเบียน CSV</button>
          </div>
          <section className={styles.card}>
            <h2>ทะเบียนและการส่งหุ้นงวดปัจจุบัน</h2>
            <div className={styles.table}>
              <table>
                <thead>
                  <tr>
                    {[
                      "สมาชิก",
                      "สถานะ",
                      "ยอดรายเดือน",
                      "รับแล้ว",
                      "แจ้งรอตรวจ",
                      "ยังขาด",
                      "รายละเอียด",
                    ].map((t) => (
                      <th key={t}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.id}>
                      <td>
                        {m.name}
                        <small>{m.id}</small>
                      </td>
                      <td>{m.active ? "ปกติ" : "ระงับ"}</td>
                      <td>{money(m.monthly)}</td>
                      <td>{money(m.paid)}</td>
                      <td>{money(m.notified)}</td>
                      <td>{money(m.shortfall)}</td>
                      <td>
                        <button onClick={() => setSelected(m.id)}>
                          ดูภาพรวม
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>ยอดที่แจ้งแต่ยังไม่รับเงินจะแสดงแยก และยังไม่ถือว่าส่งครบ</p>
          </section>
        </>
      )}
      {person && (
        <section className={styles.card}>
          <h2>
            {person.name} · {person.id}
          </h2>
          <div className={styles.metrics}>
            {[
              ["หุ้นสะสม", person.shares],
              ["เงินฝาก", person.deposits],
              ["หนี้คงเหลือ", person.debt],
              ["ภาระค้ำ (สัญญา)", person.guaranteeCount],
            ].map(([t, n]) => (
              <div key={t}>
                <small>{t}</small>
                <strong>{money(n)}</strong>
              </div>
            ))}
          </div>
          <p>
            อีเมล: {person.email || "—"} · โทร: {person.phone || "—"}
          </p>
          <p>
            หน่วยงาน: {person.company || "—"} · อาชีพ:{" "}
            {person.occupation || "—"}
          </p>
          <p>
            บัญชีรับผลตอบแทน: {person.bank || "ยังไม่ระบุ"}{" "}
            {person.bankLast4 ? " · ลงท้าย " + person.bankLast4 : ""}
          </p>
          <p>
            คำขอกู้รอพิจารณา {person.pendingLoans} รายการ · ค้ำคำขอรอพิจารณา{" "}
            {person.pendingGuarantees} รายการ
          </p>
          {d.staff && (
            <form
              key={person.id}
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const values = Object.fromEntries(new FormData(form));
                if (
                  await f.act({
                    action:
                      values.kind === "correction"
                        ? "request-correction"
                        : "create-status-request",
                    member: person.id,
                    ...values,
                  })
                )
                  form.reset();
              }}
            >
              <div className={styles.toolbar}>
                <select name="kind">
                  {Object.entries(kinds).map(([k, v]) => (
                    <option value={k} key={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <input
                  name="note"
                  placeholder="รายละเอียดที่ต้องแก้ / เหตุผลคำขอ"
                  minLength={3}
                  maxLength={1000}
                  required
                />
                <button disabled={f.busy}>สร้างงานติดตาม</button>
              </div>
            </form>
          )}
        </section>
      )}
      {d.staff && (
        <section className={styles.card}>
          <h2>คำขอแก้ข้อมูล / ลาออก / ระงับสมาชิก</h2>
          {!d.staff && (
            <p>
              <Link href="/settings?tab=profile">แก้ข้อมูลในตั้งค่า</Link>{" "}
              แล้วแจ้งรายละเอียดกลับด้านล่าง
            </p>
          )}
          {!d.requests.length && <p>ยังไม่มีคำขอ</p>}
          {d.requests.map((r) => (
            <article className={styles.request} key={r.id}>
              <strong>
                {kinds[r.kind]} · {r.member} · {states[r.status]}
              </strong>
              <p>{r.note}</p>
              {r.response && <p>สมาชิกตอบ: {r.response}</p>}
              {r.reviewSnapshot && (
                <p>
                  ผลตรวจตอนส่ง: หนี้ {money(r.reviewSnapshot.debt)} บาท ·
                  ภาระค้ำ {r.reviewSnapshot.guaranteeCount} สัญญา
                </p>
              )}
              <div className={styles.toolbar}>
                {!d.staff &&
                  r.kind === "correction" &&
                  r.status === "pending" && (
                    <button
                      disabled={f.busy}
                      onClick={() => act("respond-correction", r.id)}
                    >
                      แจ้งแก้ข้อมูลแล้ว
                    </button>
                  )}
                {d.staff &&
                  r.kind === "correction" &&
                  ["pending", "answered"].includes(r.status) && (
                    <button
                      disabled={f.busy}
                      onClick={() => act("complete-correction", r.id)}
                    >
                      ตรวจข้อมูลเรียบร้อย
                    </button>
                  )}
                {d.staff &&
                  r.kind !== "correction" &&
                  r.status === "pending" && (
                    <button
                      disabled={f.busy}
                      onClick={() => act("forward-status-request", r.id)}
                    >
                      ตรวจภาระและส่ง Admin
                    </button>
                  )}
                {d.canApprove && r.status === "forwarded" && (
                  <>
                    <button
                      disabled={f.busy}
                      onClick={() => act("approve-status-request", r.id)}
                    >
                      อนุมัติคำขอสถานะ
                    </button>
                    <button
                      disabled={f.busy}
                      onClick={() => act("reject-status-request", r.id)}
                    >
                      ไม่อนุมัติ
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
      {d.staff && (
        <section className={styles.card}>
          <h2>ตรวจเบื้องต้นคำขอปรับยอดส่งหุ้น</h2>
          <p>
            ตรวจแล้วส่งต่อฝ่ายบัญชี การตรวจเบื้องต้นยังไม่เปลี่ยนยอดรายเดือน
          </p>
          {!d.shareChanges.length && <p>ไม่มีคำขอรอพิจารณา</p>}
          {d.shareChanges.map((r) => (
            <article className={styles.request} key={r.id}>
              <strong>
                {r.member} · {money(r.previous)} → {money(r.amount)} บาท
              </strong>
              <p>
                {r.reviewStatus === "reviewed"
                  ? "ส่งต่อแล้ว: " + r.reviewNote
                  : "ยังไม่ตรวจเบื้องต้น"}
              </p>
              {r.reviewStatus !== "reviewed" && (
                <button
                  disabled={f.busy}
                  onClick={() => act("review-share-change", r.id)}
                >
                  ตรวจและส่งต่อฝ่ายบัญชี
                </button>
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
