"use client";
// Admin ตั้งเงื่อนไขที่ใช้ร่วมกับฝั่งสมาชิก ตรวจสิทธิ์และตัวเลขซ้ำใน API ก่อนบันทึก
import { useEffect, useState } from "react";
export default function DepositSettings({ f }) {
  const config = f.data.settings;
  const [draft, setDraft] = useState(() => structuredClone(config));
  useEffect(
    () => setDraft(structuredClone(config)),
    [config.revision, config.rates.savings, config.rates.special],
  );
  if (!f.data.canConfigure)
    return (
      <section className="deposit-card">
        <p>เฉพาะ Admin ตั้งค่าเงื่อนไขเงินฝากได้</p>
      </section>
    );
  const termChange = (id, key, value) =>
    setDraft({
      ...draft,
      monthlyTerms: draft.monthlyTerms.map((t) =>
        t.id === id ? { ...t, [key]: value } : t,
      ),
    });
  async function save(e) {
    e.preventDefault();
    await f.act({
      action: "save-settings",
      revision: draft.revision,
      savingsRate: Number(draft.rates.savings),
      specialRate: Number(draft.rates.special),
      minimumMonthlyAmount: Number(draft.minimumMonthlyCents) / 100,
      monthlyTerms: draft.monthlyTerms.map((t) => ({
        ...t,
        months: Number(t.months),
        rate: Number(t.rate),
      })),
      openingEnabled: draft.openingEnabled,
    });
  }
  return (
    <div className="deposit-settings-layout">
      <form className="deposit-settings-form" onSubmit={save}>
        {/* อัตรากลางแยกตามประเภท เพื่อให้เห็นทั่วไปและพิเศษชัดเจน */}
        {[
          ["savings", "ออมทรัพย์ทั่วไป"],
          ["special", "ออมทรัพย์พิเศษ"],
        ].map(([id, label]) => (
          <section className="deposit-card" key={id}>
            <h2>บัญชีเงินฝาก{label}</h2>
            <p className="deposit-muted">
              กำหนดอัตราดอกเบี้ยกลาง ใช้ร่วมกันทุกบัญชีประเภท{label}
            </p>
            <div className="deposit-form deposit-settings-fields">
              <label>
                อัตราดอกเบี้ย (% ต่อปี)
                <input
                  aria-label={"อัตราดอกเบี้ย" + label}
                  type="number"
                  min="0"
                  max="30"
                  step="0.01"
                  required
                  value={draft.rates[id] ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      rates: { ...draft.rates, [id]: e.target.value },
                    })
                  }
                />
              </label>
            </div>
          </section>
        ))}
        <section className="deposit-card">
          <div className="deposit-section-heading">
            <div>
              <h2>บัญชีเงินฝากออมทรัพย์รายเดือน</h2>
              <p className="deposit-muted">
                ปรับจำนวนเดือนและอัตราดอกเบี้ยของแต่ละแผน
              </p>
            </div>
          </div>
          <div className="deposit-term-grid">
            {draft.monthlyTerms.map((t) => (
              <article className="deposit-term-card" key={t.id}>
                <div className="deposit-section-heading">
                  <h3>
                    {t.months ? `แผนฝาก ${t.months} เดือน` : "แผนฝากใหม่"}
                  </h3>
                  <span
                    className={
                      "deposit-status " + (t.active ? "confirmed" : "pending")
                    }
                  >
                    {t.active ? "เปิดรับ" : "ปิดรับ"}
                  </span>
                </div>
                <div className="deposit-form deposit-form-grid">
                  <label>
                    ระยะเวลา (เดือน)
                    <input
                      aria-label={"จำนวนเดือน " + t.id}
                      type="number"
                      min="1"
                      max="120"
                      step="1"
                      required
                      value={t.months}
                      onChange={(e) =>
                        termChange(t.id, "months", e.target.value)
                      }
                    />
                  </label>
                  <label>
                    ดอกเบี้ย (% ต่อปี)
                    <input
                      aria-label={"อัตราดอกเบี้ย " + t.id}
                      type="number"
                      min="0"
                      max="30"
                      step="0.01"
                      required
                      value={t.rate}
                      onChange={(e) => termChange(t.id, "rate", e.target.value)}
                    />
                  </label>
                </div>
                <div className="deposit-term-actions">
                  <label className="deposit-checkbox">
                    <input
                      aria-label={"เปิดรับแผน " + t.id}
                      type="checkbox"
                      checked={t.active}
                      onChange={(e) =>
                        termChange(t.id, "active", e.target.checked)
                      }
                    />
                    เปิดรับแผนนี้
                  </label>
                </div>
              </article>
            ))}
          </div>
          <div className="deposit-form deposit-settings-fields deposit-settings-minimum">
            <label>
              ยอดฝากรายเดือนขั้นต่ำ (บาท)
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={draft.minimumMonthlyCents / 100}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    minimumMonthlyCents: Math.round(
                      Number(e.target.value) * 100,
                    ),
                  })
                }
              />
            </label>
          </div>
        </section>
        <section className="deposit-card">
          <h2>เปิด–ปิดการรับบัญชีใหม่</h2>
          <p className="deposit-muted">
            ใช้กับการเปิดบัญชีใหม่
            บัญชีที่มีอยู่ยังใช้งานได้ตามสถานะในทะเบียนบัญชี
          </p>
          <div className="deposit-opening-grid">
            {[
              ["savings", "ออมทรัพย์ทั่วไป"],
              ["special", "ออมทรัพย์พิเศษ"],
              ["monthly", "ออมทรัพย์รายเดือน"],
            ].map(([id, label]) => (
              <label className="deposit-opening-option" key={id}>
                <span>
                  <strong>{label}</strong>
                  <small>
                    {draft.openingEnabled[id]
                      ? "เปิดรับบัญชีใหม่"
                      : "ปิดรับบัญชีใหม่"}
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={draft.openingEnabled[id]}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      openingEnabled: {
                        ...draft.openingEnabled,
                        [id]: e.target.checked,
                      },
                    })
                  }
                />
              </label>
            ))}
          </div>
        </section>
        <div className="deposit-card deposit-settings-save">
          <div>
            <p className="deposit-muted">
              เงื่อนไขใหม่ใช้เมื่อสมาชิกเลือกบันทึกแผนใหม่
              สัญญาเดิมคงเงื่อนไขที่บันทึกไว้
            </p>
            {config.updated && (
              <small>
                บันทึกล่าสุด{" "}
                {new Date(config.updated).toLocaleString("th-TH", {
                  timeZone: "Asia/Bangkok",
                })}
              </small>
            )}
          </div>
          <button className="deposit-primary" disabled={f.busy}>
            {f.busy ? "กำลังบันทึก…" : "บันทึกเงื่อนไขเงินฝาก"}
          </button>
        </div>
      </form>
    </div>
  );
}
