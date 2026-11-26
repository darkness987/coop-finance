// ระบบ: เงินฝาก ถอนเงิน และดอกเบี้ย | ไฟล์: MemberDeposits.jsx
"use client";
// หน้าฝากเงินสมาชิก: เลือกรูปแบบ/บัญชี → ฝากหรือถอน → ตรวจสอบ → ส่งคำขอ
import { useState, useEffect } from "react";
import { useFinance, Notices, money } from "../shared/Finance";
import DepositTable from "./DepositTable";
import DepositAccounts from "./DepositAccounts";
import MonthlyDepositPlan from "./MonthlyDepositPlan";
import DepositRequest from "./DepositRequest";
import "./deposits.css";
import "./member-deposits.css";
// ฟังก์ชัน MemberDeposits: ทำงานส่วน MemberDeposits ของระบบนี้
export default function MemberDeposits() {
  const f = useFinance("deposits"),
    d = f.data,
    [tab, setTab] = useState("overview"),
    [type, setType] = useState("deposit"),
    [filter, setFilter] = useState("all"),
    [selected, setSelected] = useState(""),
    [choosing, setChoosing] = useState(true);
  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) f.load().catch(() => {});
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    const timer = setInterval(refresh, 5000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      clearInterval(timer);
    };
  }, []);
  const account =
    selected === "new-monthly"
      ? null
      : d?.accounts.find((a) => a.id === selected) || d?.accounts[0];
  const transactions = account
    ? d.transactions.filter((t) => t.account === account.id)
    : [];
  const pending = transactions.filter((t) => t.status === "pending");
  const withdrawals = pending
    .filter((t) => t.type === "withdrawal")
    .reduce((s, t) => s + t.amountCents, 0);
  // ฟังก์ชัน choose: ทำงานส่วน choose ของระบบนี้
  function choose(id) {
    setSelected(id);
    setTab("overview");
    setChoosing(false);
  }
  // ฟังก์ชัน request: ขอข้อมูลหรือรหัสยืนยัน
  function request(id, nextType = "deposit") {
    setSelected(id);
    setType(nextType);
    setTab("request");
  }
  return (
    <div className="deposit-page deposit-member">
      <div className="deposit-heading">
        <div>
          <p className="deposit-breadcrumb">บัญชีของฉัน / เงินฝาก</p>
          <h1>บัญชีเงินฝากของฉัน</h1>
          <p className="deposit-muted">
            {d?.types
              .filter((type) => type.id !== "fixed")
              .map((type) => type.name)
              .join(" · ")}
          </p>
        </div>
        {account && !choosing && (
          <a
            href={"/api/deposits/statement?account=" + account.id}
            className="deposit-link"
          >
            ดาวน์โหลดใบแจ้งยอด
          </a>
        )}
      </div>
      {d && (
        <nav className="deposit-tabs" aria-label="เมนูเงินฝากสมาชิก">
          {[
            ["products", "เลือกประเภทบัญชี"],
            ["overview", "บัญชี / แผนฝาก"],
            ["request", "ฝาก / ถอนเงิน"],
            ["history", "รายการเดินบัญชี"],
          ].map(([key, label]) => (
            <button
              key={key}
              aria-pressed={
                key === "products" ? choosing : !choosing && tab === key
              }
              disabled={
                key !== "products" &&
                !account &&
                !(key === "overview" && selected === "new-monthly")
              }
              onClick={() => {
                if (key === "products") setChoosing(true);
                else {
                  setChoosing(false);
                  setTab(key);
                }
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      )}
      <Notices f={f} />
      {!d ? (
        <p role="status">กำลังโหลด…</p>
      ) : choosing ? (
        <DepositAccounts f={f} selected={selected} onSelect={choose} />
      ) : (
        <>
          <button
            type="button"
            className="deposit-back-to-types"
            onClick={() => {
              setChoosing(true);
              setTab("overview");
            }}
          >
            ← เลือกประเภทเงินฝาก
          </button>
          {tab === "overview" &&
            (account?.type === "monthly" || selected === "new-monthly") && (
              <MonthlyDepositPlan
                key={account?.id || "new-monthly"}
                f={f}
                account={account}
                onSaved={choose}
              />
            )}
          {account && (
            <section className="deposit-balance">
              <div>
                <p>ยอดเงินคงเหลือในบัญชีที่เลือก</p>
                <strong>
                  {money(account.balanceCents / 100)} <small>บาท</small>
                </strong>
                <span>
                  {account.id} ·{" "}
                  {d.types.find((t) => t.id === account.type)?.name}
                </span>
              </div>
              <div>
                <p>ยอดเงินฝากรวมทุกบัญชี</p>
                <strong>
                  {money(
                    d.accounts.reduce((s, a) => s + a.balanceCents / 100, 0),
                  )}{" "}
                  <small>บาท</small>
                </strong>
                <span>
                  {d.accounts.length} บัญชี · ยอดถอนที่รอตรวจสอบบัญชีนี้{" "}
                  {money(withdrawals / 100)} บาท
                </span>
              </div>
            </section>
          )}
          {account && (
            <div className="deposit-account-picker">
              <label>
                เลือกบัญชีที่ทำรายการ
                <select
                  aria-label="เลือกบัญชีที่ทำรายการ"
                  value={account.id}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {d.accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {d.types.find((t) => t.id === a.type)?.name} · {a.id}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {tab === "overview" && (
            <>
              {account && (
                <>
                  <div className="deposit-columns">
                    <section className="deposit-card">
                      <h2>ข้อมูลบัญชีที่เลือก</h2>
                      {[
                        ["เลขบัญชี", account.id],
                        ["เจ้าของบัญชี", account.name],
                        [
                          "ประเภท",
                          d.types.find((t) => t.id === account.type)?.name,
                        ],
                        [
                          "สถานะ",
                          account.status === "active"
                            ? "ใช้งานปกติ"
                            : account.status === "restricted"
                              ? "จำกัดรายการ"
                              : "ระงับชั่วคราว",
                        ],
                        ["วันที่เปิดบัญชี", account.created.slice(0, 10)],
                      ].map(([label, value]) => (
                        <div className="deposit-rule" key={label}>
                          <span>{label}</span>
                          <strong>{value}</strong>
                        </div>
                      ))}
                    </section>
                    <section className="deposit-card">
                      <h2>บริการบัญชี</h2>
                      <button
                        className="deposit-shortcut"
                        onClick={() => request(account.id)}
                      >
                        ↓ ฝากเงินเข้าบัญชี <span>→</span>
                      </button>
                      <button
                        className="deposit-shortcut"
                        onClick={() => request(account.id, "withdrawal")}
                      >
                        ↑ ขอถอนเงิน <span>→</span>
                      </button>
                      <button
                        className="deposit-shortcut"
                        onClick={() => setTab("history")}
                      >
                        รายการเดินบัญชี <span>→</span>
                      </button>
                      <p className="deposit-note">
                        ยอดจะเปลี่ยนเมื่อเจ้าหน้าที่ยืนยันรายการแล้ว
                      </p>
                    </section>
                  </div>
                  <section className="deposit-card">
                    <div className="deposit-section-heading">
                      <h2>รายการล่าสุดของบัญชีนี้</h2>
                      <button onClick={() => setTab("history")}>
                        ดูทั้งหมด →
                      </button>
                    </div>
                    <DepositTable rows={transactions.slice(0, 4)} f={f} />
                  </section>
                </>
              )}
              {!account && (
                <p className="deposit-note">
                  เลือกรูปแบบด้านบนเพื่อเปิดบัญชีเงินฝาก
                </p>
              )}
            </>
          )}
          {tab === "request" && account && (
            <DepositRequest
              key={account.id}
              f={f}
              account={account}
              type={type}
              setType={setType}
              onDone={() => setTab("history")}
            />
          )}
          {tab === "history" && account && (
            <section className="deposit-card">
              <div className="deposit-section-heading">
                <h2>รายการเดินบัญชี · {account.id}</h2>
                <label>
                  สถานะ
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">ทุกสถานะ</option>
                    <option value="pending">รอตรวจสอบ</option>
                    <option value="confirmed">ยืนยันแล้ว</option>
                    <option value="rejected">ไม่อนุมัติ</option>
                  </select>
                </label>
              </div>
              <DepositTable
                rows={transactions.filter(
                  (t) => filter === "all" || t.status === filter,
                )}
                f={f}
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}
