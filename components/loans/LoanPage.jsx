// ระบบ: สินเชื่อ วงเงิน ผู้ค้ำ และชำระหนี้ | ไฟล์: LoanPage.jsx
"use client";
import { securityDescription } from "../../lib/loans/security-description";
import { membershipMonths } from "../../lib/loans/membership";
import { useDemo } from "../shared/demo";
import { canAccess, roleOf } from "../../lib/auth/permissions";
// หน้าประกอบระบบสินเชื่อ: แยกขั้นตอนและรายละเอียด ไม่แสดงทุกคำขอเป็นฟอร์มยาว
import { useState } from "react";
import { useFinance, Notices, money, status } from "../shared/Finance";
import LoanWizard from "./LoanWizard";
import ApplicationDetail from "./ApplicationDetail";
import ContractDetail from "./ContractDetail";
import ProductSettings from "./ProductSettings";
import Guarantees from "./Guarantees";
import "./loans.css";
const tabs = [
  ["products", "เลือกประเภทสินเชื่อ"],
  ["applications", "คำขอของฉัน"],
  ["contracts", "เงินกู้และตารางชำระ"],
  ["guarantees", "รายการค้ำประกัน"],
];
// ฟังก์ชัน LoanPage: ประกอบแท็บสินเชื่อ คำขอ และสัญญา
export default function LoanPage({ admin = false, initialContract = "" }) {
  const { user } = useDemo();
  const can = (action) => canAccess(user || {}, "loans", action);
  const f = useFinance("loans"),
    d = f.data,
    [tab, setTab] = useState(
      initialContract ? "contracts" : admin ? "applications" : "products",
    ),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState(""),
    [selected, setSelected] = useState(initialContract || null),
    [wizard, setWizard] = useState(null);
  const row = d?.applications.find((r) => r.id === selected),
    contract = d?.contracts.find((c) => c.id === selected);
  const switchTab = (t) => {
    setTab(t);
    setSelected(null);
    setWizard(null);
    setSearch("");
    setFilter("");
  };
  if (!d)
    return (
      <div className="loan-page">
        <h1>ระบบสินเชื่อ</h1>
        <Notices f={f} />
        <p role="status">กำลังโหลดข้อมูล…</p>
      </div>
    );
  // ตัวกรองใช้เฉพาะสถานะที่มีจริง ก่อนกรองข้อความค้นหา
  const availableStatuses = [
    "draft",
    "submitted",
    "checking",
    "needs_documents",
    "forwarded",
    "approved",
    "rejected",
  ].filter((applicationStatus) =>
    d.applications.some(
      (application) => application.status === applicationStatus,
    ),
  );
  // หลังรายการเปลี่ยนสถานะ ให้กลับทุกสถานะหากตัวเลือกเดิมไม่มีแล้ว
  const activeFilter = availableStatuses.includes(filter) ? filter : "";
  const rows = d.applications.filter(
    (r) =>
      (!activeFilter || r.status === activeFilter) &&
      `${r.id} ${r.member} ${r.terms.name}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="loan-page">
      <div className="loan-heading">
        <div>
          <p className="loan-breadcrumb">
            สินเชื่อ /{" "}
            {wizard ? "ยื่นคำขอ" : admin ? "สำหรับเจ้าหน้าที่" : "สำหรับสมาชิก"}
          </p>
          <h1>
            {wizard
              ? "ยื่นคำขอสินเชื่อ"
              : admin
                ? "ตรวจสอบและจัดการสินเชื่อ"
                : "สินเชื่อสำหรับสมาชิก"}
          </h1>
          <p className="loan-muted">
            {admin
              ? "ตรวจข้อมูล พิจารณาคำขอ และติดตามการชำระหนี้"
              : "เลือกสินเชื่อ คำนวณค่างวด และติดตามความคืบหน้าได้ในที่เดียว"}
          </p>
        </div>
      </div>
      <Notices f={f} />
      {wizard ? (
        <LoanWizard
          key={wizard.draft?.id || wizard.product.id}
          f={f}
          {...wizard}
          onExit={() => {
            setWizard(null);
            setTab("applications");
          }}
        />
      ) : (
        <>
          <nav className="loan-tabs" aria-label="เมนูสินเชื่อ">
            {tabs
              .filter(
                ([key]) =>
                  !admin ||
                  (key !== "guarantees" &&
                    (key !== "products" || can("product"))),
              )
              .map(([key, label]) => (
                <button
                  key={key}
                  aria-pressed={tab === key}
                  onClick={() => switchTab(key)}
                >
                  {admin
                    ? key === "products"
                      ? "จัดการประเภทสินเชื่อ"
                      : key === "applications"
                        ? "คำขอและการอนุมัติ"
                        : "สัญญา / รับชำระ"
                    : label}
                </button>
              ))}
          </nav>
          {tab === "guarantees" && !admin && (
            <Guarantees rows={d.guarantees || []} />
          )}
          {tab === "products" &&
            (admin ? (
              <div className="loan-settings">
                <ProductSettings f={f} admin />
              </div>
            ) : (
              <>
                <div className="loan-steps">
                  {[
                    "เลือกประเภท",
                    "ข้อมูลคำขอ",
                    "คำนวณและตรวจสิทธิ์",
                    "ยืนยันและส่งตรวจ",
                  ].map((s, i) => (
                    <span key={s} className={i === 0 ? "done" : ""}>
                      <b>{i + 1}</b>
                      {s}
                    </span>
                  ))}
                </div>
                <div className="loan-products">
                  {d.products.map((p) => (
                    <article
                      className={`loan-card loan-product ${p.id === "ordinary" ? "featured" : ""}`}
                      key={p.id}
                    >
                      <div className="loan-section-title">
                        <span className="loan-icon">฿</span>
                        <span className="loan-pill">
                          {p.active ? "เปิดรับคำขอ" : "รอกำหนดเงื่อนไข"}
                        </span>
                      </div>
                      <h2>{p.name}</h2>
                      <p className="loan-muted">{p.description}</p>
                      <dl>
                        <div>
                          <dt>วงเงินขั้นต่ำ</dt>
                          <dd>{money(p.minAmount)} บาท</dd>
                        </div>
                        <div>
                          <dt>อัตราดอกเบี้ย</dt>
                          <dd>
                            {p.annualRate == null
                              ? "ตามเงื่อนไข"
                              : p.annualRate + "% ต่อปี"}
                          </dd>
                        </div>
                        <div>
                          <dt>วงเงินกู้ด้วยสินทรัพย์</dt>
                          <dd>
                            สูงสุด {p.assetPercent}% ของมูลค่าหุ้นและเงินฝาก
                          </dd>
                        </div>
                        <div>
                          <dt>อายุสมาชิกขั้นต่ำ</dt>
                          <dd>
                            เป็นสมาชิกอย่างน้อย {membershipMonths(p.id)} เดือน
                          </dd>
                        </div>
                        <div>
                          <dt>ระยะเวลาผ่อน</dt>
                          <dd>สูงสุด {p.maxMonths} เดือน</dd>
                        </div>
                      </dl>
                      <button
                        className={p.active ? "primary" : ""}
                        disabled={!p.active}
                        onClick={() => setWizard({ product: p })}
                      >
                        {p.active ? "เลือกสินเชื่อนี้" : "ยังไม่เปิดรับคำขอ"}
                      </button>
                    </article>
                  ))}
                </div>
                <section className="loan-card loan-info">
                  <h2>เตรียมตัวก่อนยื่นคำขอ</h2>
                  <p>
                    สมาชิกสถานะใช้งาน สามัญ/พิเศษครบ 6 เดือน ฉุกเฉินครบ 3 เดือน
                    และภาระผ่อนรวมไม่เกิน 40% ของรายได้
                  </p>
                  <p>
                    เตรียมบัตรประชาชน สลิปเงินเดือน และหลักฐานรายได้ ·
                    ตรวจรายได้ในหน้าข้อมูลสมาชิกให้ถูกต้องก่อนคำนวณ
                  </p>
                </section>
              </>
            ))}
          {tab === "applications" &&
            (row ? (
              <>
                <div className="loan-actions">
                  <button onClick={() => setSelected(null)}>
                    ← กลับรายการคำขอ
                  </button>
                  {!admin &&
                    ["draft", "needs_documents"].includes(row.status) && (
                      <button
                        className="primary"
                        onClick={() =>
                          setWizard({
                            draft: row,
                            product:
                              d.products.find((p) => p.id === row.product) ||
                              row.terms,
                          })
                        }
                      >
                        แก้ไขร่าง / คำนวณ / ส่งคำขอ
                      </button>
                    )}
                </div>
                <ApplicationDetail f={f} row={row} admin={admin} />
              </>
            ) : (
              <>
                <div className="loan-kpis">
                  {[
                    ["คำขอทั้งหมด", d.applications.length],
                    [
                      "รอตรวจสอบ",
                      d.applications.filter((r) =>
                        ["submitted", "checking"].includes(r.status),
                      ).length,
                    ],
                    [
                      "ต้องแก้ไขข้อมูล",
                      d.applications.filter(
                        (r) => r.status === "needs_documents",
                      ).length,
                    ],
                    [
                      "รายการอนุมัติแล้ว",
                      d.applications.filter((r) => r.status === "approved")
                        .length,
                    ],
                  ].map(([label, n]) => (
                    <div className="loan-card" key={label}>
                      <small>{label}</small>
                      <strong>
                        {n}
                        <small> คำขอ</small>
                      </strong>
                    </div>
                  ))}
                </div>
                <section className="loan-card">
                  <div className="loan-section-title">
                    <h2>รายการคำขอสินเชื่อ</h2>
                    <span>{rows.length} รายการ</span>
                  </div>
                  <div className="loan-filters">
                    <input
                      aria-label="ค้นหาคำขอ"
                      placeholder="ค้นหาเลขคำขอ / สมาชิก / ประเภท"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <select
                      aria-label="กรองสถานะคำขอ"
                      value={activeFilter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="">ทุกสถานะ</option>
                      {availableStatuses.map((s) => (
                        <option key={s} value={s}>
                          {status[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>เลขคำขอ / วันที่</th>
                          <th>สมาชิก / ประเภท</th>
                          <th>วงเงิน</th>
                          <th>ระยะเวลา</th>
                          <th>สถานะ</th>
                          <th>จัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.id}>
                            <td title={r.id}>
                              {r.id.slice(0, 8).toUpperCase()}
                              <small>{r.created}</small>
                            </td>
                            <td>
                              {r.terms.name}
                              <small>{r.member}</small>
                              {(r.guarantors?.length
                                ? r.guarantors
                                : r.guarantor
                                  ? [r.guarantor]
                                  : []
                              ).map((g, index) => (
                                <small key={g.member}>
                                  ผู้ค้ำ {index + 1}: {g.name} ({g.member})
                                </small>
                              ))}
                              {r.loanMode === "collateral" && (
                                <small>
                                  หลักทรัพย์ค้ำประกัน:{" "}
                                  {{ land: "ที่ดิน", house: "บ้าน" }[
                                    r.collateral?.type
                                  ] || "ยังไม่ระบุ"}
                                </small>
                              )}
                              {r.demo && <small>ข้อมูลตัวอย่าง</small>}
                            </td>
                            <td>{money(r.amount)}</td>
                            <td>{r.months} เดือน</td>
                            <td>
                              <span className={"loan-status " + r.status}>
                                {status[r.status]}
                              </span>
                            </td>
                            <td>
                              <button onClick={() => setSelected(r.id)}>
                                ดูรายละเอียด
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!rows.length && (
                      <div className="loan-empty">
                        {search || activeFilter
                          ? "ไม่พบคำขอตามตัวกรอง"
                          : "ยังไม่มีคำขอสินเชื่อ"}
                      </div>
                    )}
                  </div>
                </section>
              </>
            ))}
          {tab === "contracts" &&
            (contract ? (
              <>
                <button onClick={() => setSelected(null)}>
                  ← กลับรายการสัญญา
                </button>
                <ContractDetail f={f} c={contract} admin={admin} />
              </>
            ) : (
              <section className="loan-card">
                <h2>สัญญาสินเชื่อและการชำระ</h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>สัญญา / สมาชิก</th>
                        <th>วงเงิน</th>
                        <th>หลักประกัน</th>
                        <th>ค่างวด</th>
                        <th>สถานะ</th>
                        <th>จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.contracts.map((c) => (
                        <tr key={c.id}>
                          <td>
                            {c.number}
                            <small>{c.member}</small>
                          </td>
                          <td>{money(c.amount)}</td>
                          <td>{securityDescription(c)}</td>
                          <td>{money(c.installment)}</td>
                          <td>
                            <span className={"loan-status " + c.status}>
                              {status[c.status]}
                            </span>
                          </td>
                          <td>
                            <button onClick={() => setSelected(c.id)}>
                              ตารางผ่อน / รายละเอียด
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!d.contracts.length && (
                    <div className="loan-empty">ยังไม่มีสัญญาที่อนุมัติ</div>
                  )}
                </div>
              </section>
            ))}
          {tab === "contracts" &&
            !contract &&
            !admin &&
            d.guarantees?.some((g) => g.contractNumber) && (
              <Guarantees rows={d.guarantees.filter((g) => g.contractNumber)} />
            )}
        </>
      )}
    </div>
  );
}
