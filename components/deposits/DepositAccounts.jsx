// ระบบ: เงินฝาก ถอนเงิน และดอกเบี้ย | ไฟล์: DepositAccounts.jsx
"use client";
// การ์ดประเภทเงินฝาก: อ่านอัตราจากระบบ และเลือกบัญชีแยกตามประเภท
import { money } from "../shared/Finance";
const descriptions = {
  savings: ["สำหรับสะสมเงินออมทั่วไป", "เก็บออมและทำรายการฝาก–ถอนในบัญชีเดียว"],
  special: [
    "สำหรับผู้ที่ต้องการแยกเงินออม",
    "รับอัตราดอกเบี้ยสูงกว่าออมทรัพย์ทั่วไป",
  ],
  monthly: [
    "สำหรับออมเงินอย่างต่อเนื่องทุกเดือน",
    "แยกยอดออมรายเดือนเพื่อวางแผนการออม",
  ],
};
// ฟังก์ชัน DepositAccounts: ทำงานส่วน DepositAccounts ของระบบนี้
export default function DepositAccounts({ f, selected, onSelect }) {
  const rates = (f.data.monthlyTerms || []).map((t) => t.rate);
  const monthlyRateText = rates.length
    ? `${Math.min(...rates).toFixed(2)}–${Math.max(...rates).toFixed(2)}% ต่อปี`
    : "ยังไม่มีแผนเปิดรับ";
  // เลือกบัญชีรายเดือนแล้วเข้าไปกำหนดแผนภายใน ยังไม่บันทึกหรือเปิดบัญชีในขั้นนี้
  async function choose(type, account) {
    if (type === "monthly") return onSelect(account?.id || "new-monthly");
    if (account) return onSelect(account.id);
    const res = await f.act(
      {
        action: "open",
        type,
      },
      { result: true },
    );
    if (res?.result?.id) onSelect(res.result.id);
  }
  return (
    <section className="deposit-products-section">
      <div className="deposit-section-heading">
        <div>
          <h2>เลือกรูปแบบบัญชีเงินฝาก</h2>
          <p className="deposit-muted">
            เลือกบัญชีที่ต้องการดูข้อมูลหรือทำรายการฝาก–ถอน
          </p>
        </div>
      </div>
      <div className="deposit-product-grid">
        {f.data.types
          .filter((type) => type.id !== "fixed")
          .map((type) => {
            const account = f.data.accounts.find(
              (item) => item.type === type.id,
            );
            const isSelected = Boolean(account && selected === account.id);
            const [description, benefit] = descriptions[type.id] || [
              "บัญชีเงินฝากสมาชิก",
              "แยกยอดเงินตามประเภทบัญชี",
            ];
            return (
              <article
                key={type.id}
                className={`deposit-card deposit-product ${isSelected ? "selected" : ""}`}
              >
                <div className="deposit-product-top">
                  <span className="deposit-product-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    >
                      <rect x="3" y="4" width="18" height="16" rx="3" />
                      <path d="M3 10h18M7 15h5" />
                    </svg>
                  </span>
                  {isSelected && (
                    <span className="deposit-selected-badge">
                      บัญชีที่เลือก
                    </span>
                  )}
                </div>
                <h3>
                  บัญชี
                  {"เงินฝาก" + type.name}
                </h3>
                <p className="deposit-product-description">{description}</p>
                <div className="deposit-product-intro">
                  <div>
                    <span>ยอดเปิดบัญชีเริ่มต้น</span>
                    <strong>0 บาท</strong>
                  </div>
                  <p>{benefit}</p>
                </div>
                <dl className="deposit-product-terms">
                  <div>
                    <dt>อัตราดอกเบี้ย</dt>
                    <dd>
                      {type.id === "monthly"
                        ? monthlyRateText
                        : type.rate == null
                          ? "ยังไม่กำหนด"
                          : `${type.rate.toFixed(2)}% ต่อปี`}
                    </dd>
                  </div>
                  <div>
                    <dt>การทำรายการ</dt>
                    <dd>ฝาก / ถอน</dd>
                  </div>
                  {type.withdrawalGuidance && (
                    <div>
                      <dt>การถอนทั่วไป</dt>
                      <dd>{type.withdrawalGuidance.frequency}</dd>
                    </div>
                  )}
                  <div>
                    <dt>ยืนยันรายการ</dt>
                    <dd>โดยเจ้าหน้าที่สหกรณ์</dd>
                  </div>
                </dl>
                {type.withdrawalGuidance && (
                  <p className="deposit-note">
                    {type.withdrawalGuidance.conditions}
                  </p>
                )}
                <div className="deposit-product-account">
                  {account ? (
                    <>
                      <span>{account.id}</span>
                      <strong>
                        {money(account.balanceCents / 100)} <small>บาท</small>
                      </strong>
                      <small>
                        {account.status === "suspended"
                          ? "บัญชีถูกระงับ"
                          : account.status === "restricted"
                            ? "บัญชีจำกัดรายการ"
                            : "ยอดเงินคงเหลือ"}
                      </small>
                    </>
                  ) : (
                    <p>ยังไม่มีบัญชีประเภทนี้ เลือกเพื่อเปิดบัญชี</p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={`เลือกบัญชี${type.name}`}
                  aria-pressed={isSelected}
                  className={
                    isSelected ? "deposit-primary" : "deposit-product-select"
                  }
                  disabled={
                    f.busy ||
                    (!account &&
                      f.data.settings?.openingEnabled[type.id] === false)
                  }
                  onClick={() => choose(type.id, account)}
                >
                  {f.busy
                    ? "กำลังบันทึก…"
                    : !account &&
                        f.data.settings?.openingEnabled[type.id] === false
                      ? "ปิดรับเปิดบัญชีใหม่"
                      : "เลือกบัญชีนี้"}
                </button>
              </article>
            );
          })}
      </div>
    </section>
  );
}
