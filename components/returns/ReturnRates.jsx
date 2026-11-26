"use client";
// ตั้งค่าอัตรารวมในหน้าแอดมิน แยกจากร่างผลจัดสรรรายปี
import Link from "next/link";
import { useEffect } from "react";
import { useFinance, Notices } from "../shared/Finance";
import styles from "./return-rates.module.css";
export default function ReturnRates({ onLoaded }) {
  const f = useFinance("return-rates");
  useEffect(() => {
    if (f.data) onLoaded(f.data);
  }, [f.data, onLoaded]);
  if (!f.data)
    return (
      <section className={styles.card}>
        <h2>กำหนดเปอร์เซ็นต์ผลตอบแทน</h2>
        <Notices f={f} />
      </section>
    );
  const d = f.data;
  return (
    <section className={styles.card}>
      <h2>กำหนดเปอร์เซ็นต์ผลตอบแทน</h2>
      <p>
        ใช้กับประมาณการปัจจุบันและค่าเริ่มต้นเมื่อจัดทำร่างใหม่
        ผลจัดสรรที่อนุมัติแล้วคงอัตราเดิม
      </p>
      <Notices f={f} />
      <form
        key={JSON.stringify(d)}
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const depositRates = Object.fromEntries(
            d.depositRates.map((t) => {
              if (["monthly"].includes(t.id)) return [t.id, t.rate];
              const value = form.get(t.id);
              return [t.id, value === "" ? null : Number(value)];
            }),
          );
          await f.act({
            action: "save",
            dividendPercent: Number(form.get("dividend")),
            rebatePercent: Number(form.get("rebate")),
            depositRates,
          });
        }}
      >
        <div className={styles.grid}>
          <label>
            เงินปันผลหุ้น (% ต่อปี)
            <input
              name="dividend"
              aria-label="อัตราเงินปันผลหุ้น"
              type="number"
              min="0"
              max="100"
              step="0.01"
              defaultValue={d.dividendPercent}
              required
            />
          </label>
          <label>
            เงินเฉลี่ยคืน (%)
            <input
              name="rebate"
              aria-label="อัตราเงินเฉลี่ยคืน"
              type="number"
              min="0"
              max="100"
              step="0.01"
              defaultValue={d.rebatePercent}
              required
            />
          </label>
        </div>
        <h3>ผลตอบแทนเงินฝาก (% ต่อปี)</h3>
        <div className={styles.grid}>
          {d.depositRates
            .filter((t) => !["monthly"].includes(t.id))
            .map((t) => (
              <label key={t.id}>
                {t.name}
                <input
                  aria-label={"อัตรา" + t.name}
                  name={t.id}
                  type="number"
                  min="0"
                  max="30"
                  step="0.01"
                  defaultValue={t.rate ?? ""}
                  placeholder="ยังไม่กำหนด"
                />
              </label>
            ))}
        </div>
        <p>
          อัตราและระยะเวลาออมทรัพย์รายเดือนกำหนดแยกตามแผนใน{" "}
          <Link href="/admin/deposits/interest#deposit-settings">
            ตั้งค่าเงินฝาก
          </Link>
        </p>
        <p>
          ช่องเงินฝากที่เว้นว่างหมายถึงยังไม่กำหนดอัตรา ส่วน 0 หมายถึงอัตรา 0%
          การจัดสรรดอกเบี้ยจริงยังต้องเลือกปีและยืนยันในหน้าจัดสรรดอกเบี้ย
        </p>
        <div className={styles.actions}>
          <button className="primary" disabled={f.busy}>
            {f.busy ? "กำลังบันทึก…" : "บันทึกอัตราผลตอบแทน"}
          </button>
        </div>
      </form>
    </section>
  );
}
