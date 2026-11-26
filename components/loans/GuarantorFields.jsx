// ระบบ: สินเชื่อ วงเงิน ผู้ค้ำ และชำระหนี้ | ไฟล์: GuarantorFields.jsx
"use client";
import { useState, useRef } from "react";
import { money } from "../shared/Finance";
// ฟังก์ชัน GuarantorFields: ทำงานส่วน GuarantorFields ของระบบนี้
export default function GuarantorFields({
  f,
  applicationId,
  productId,
  loanMode,
  onModeChange,
  amount,
  collateral,
  onCollateralChange,
  members,
  onChange,
  initialGuarantors = [],
}) {
  const existing = f.data.applications.find(
    (r) => r.id === applicationId && r.product === productId,
  );
  const security =
    existing?.borrowingCapacity ||
    f.data.securityByProduct?.[productId] ||
    f.data.security ||
    {};
  return (
    <section className="loan-guarantor-fields" aria-label="ข้อมูลผู้ค้ำประกัน">
      <h3>สินทรัพย์และวงเงินกู้ของคุณ</h3>
      <div className="loan-asset-total">
        <span>สินทรัพย์ทั้งหมด (หุ้น + เงินฝาก)</span>
        <strong>{money(security.totalAmount)} บาท</strong>
      </div>
      <p className="loan-muted">
        หุ้นสะสม {money(security.shareAmount)} + เงินฝาก{" "}
        {money(security.depositAmount)} = {money(security.totalAmount)} บาท
      </p>
      <dl className="loan-capacity-list">
        <div>
          <dt>วงเงินรวมสูงสุด {security.totalPercent}%</dt>
          <dd>{money(security.totalLoanLimit)} บาท</dd>
        </div>
        <div>
          <dt>เงินต้นคงค้างแบบไม่ใช้ผู้ค้ำ</dt>
          <dd>{money(security.outstandingAmount)} บาท</dd>
        </div>
        <div>
          <dt>วงเงินที่คำขออื่นจองไว้</dt>
          <dd>{money(security.reservedAmount)} บาท</dd>
        </div>
      </dl>
      <div className="loan-asset-total loan-capacity-available">
        <span>ยอดที่กู้ได้ตอนนี้โดยไม่ใช้ผู้ค้ำ</span>
        <strong>{money(security.availableAmount)} บาท</strong>
      </div>
      <p className="loan-muted">
        กู้ได้สูงสุด {security.totalPercent}% ตั้งแต่ครั้งแรก
        เงินต้นที่ชำระแล้วคืนเป็นวงเงิน โดยเงินต้นคงค้างและคำขอที่จองรวมไม่เกิน{" "}
        {security.totalPercent}% ของสินทรัพย์
      </p>
      {security.hasPendingApplication && (
        <p className="loan-guarantor-required">
          มีคำขออยู่ระหว่างตรวจสอบ ระบบหักยอดจองออกแล้ว
          ยื่นเพิ่มได้ไม่เกินวงเงินคงเหลือที่แสดง
        </p>
      )}
      <div className="loan-borrowing-modes" aria-label="รูปแบบการกู้">
        <label>
          <input
            type="radio"
            name="loan-mode"
            value="asset"
            checked={loanMode === "asset"}
            onChange={() => onModeChange("asset")}
          />
          กู้ด้วยสินทรัพย์ (ไม่ใช้ผู้ค้ำ)
        </label>
        <label>
          <input
            type="radio"
            name="loan-mode"
            value="guaranteed"
            checked={loanMode === "guaranteed"}
            onChange={() => onModeChange("guaranteed")}
          />
          กู้โดยมีผู้ค้ำประกัน
        </label>
        <label>
          <input
            type="radio"
            name="loan-mode"
            checked={loanMode === "collateral"}
            onChange={() => onModeChange("collateral")}
          />
          ใช้หลักประกันที่ดินหรือบ้าน
        </label>
      </div>
      {loanMode === "guaranteed" && (
        <label className="radio">
          <input
            type="checkbox"
            checked={!!collateral}
            onChange={(e) =>
              onCollateralChange(
                e.target.checked
                  ? { type: "land", owner: "", documentNumber: "", address: "" }
                  : null,
              )
            }
          />
          ใช้หลักทรัพย์บ้านหรือที่ดินร่วมกับผู้ค้ำประกัน
        </label>
      )}
      {(loanMode === "collateral" ||
        (loanMode === "guaranteed" && collateral)) && (
        <div className="loan-form-grid">
          <label>
            ประเภทหลักประกัน
            <select
              value={collateral?.type || "land"}
              onChange={(e) =>
                onCollateralChange({ ...collateral, type: e.target.value })
              }
            >
              <option value="land">ที่ดิน</option>
              <option value="house">บ้าน</option>
            </select>
          </label>
          {[
            ["owner", "ชื่อเจ้าของหลักประกัน"],
            ["documentNumber", "เลขโฉนด / เอกสารสิทธิ์"],
            ["address", "ที่ตั้งหลักประกัน"],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                required
                maxLength={500}
                value={collateral?.[key] || ""}
                onChange={(e) =>
                  onCollateralChange({ ...collateral, [key]: e.target.value })
                }
              />
            </label>
          ))}
          <p className="loan-muted">
            เจ้าหน้าที่ต้องตรวจเอกสารสิทธิ์และประเมินหลักประกันก่อนอนุมัติ
          </p>
        </div>
      )}
      {loanMode === "asset" && (
        <p
          className={
            Number(amount) > security.availableAmount
              ? "loan-guarantor-required"
              : "loan-muted"
          }
        >
          {Number(amount) > security.availableAmount
            ? "ยอดที่กรอกเกินวงเงินไม่ใช้ผู้ค้ำ กรุณาลดยอดหรือเลือกกู้แบบมีผู้ค้ำ"
            : "ยอดที่กรอกอยู่ในวงเงิน ไม่ต้องมีผู้ค้ำประกัน"}
        </p>
      )}
      {loanMode === "guaranteed" && (
        <>
          <p className="loan-muted">
            ระบุผู้ค้ำประกัน 2 คน ต้องไม่ซ้ำกันและไม่ใช่ผู้กู้เอง
          </p>
          {[0, 1].map((index) => (
            <GuarantorLookup
              key={index}
              f={f}
              index={index}
              member={members[index] || ""}
              initial={initialGuarantors[index]}
              onChange={(value) => onChange(index, value)}
            />
          ))}
        </>
      )}
    </section>
  );
}
// ฟังก์ชัน GuarantorLookup: ทำงานส่วน GuarantorLookup ของระบบนี้
function GuarantorLookup({ f, index, member, initial, onChange }) {
  const [person, setPerson] = useState(initial || null),
    [message, setMessage] = useState("");
  const latest = useRef(member);
  latest.current = member;
  // ฟังก์ชัน lookup: ทำงานส่วน lookup ของระบบนี้
  async function lookup() {
    const requested = member;
    const response = await f.act(
      { action: "lookup-guarantor", guarantorMember: requested },
      { preview: true, result: true },
    );
    if (latest.current !== requested) return;
    if (response) {
      setPerson(response.result);
      setMessage("");
    } else {
      setPerson(null);
      setMessage("ตรวจสอบเลขสมาชิกและสถานะผู้ค้ำประกัน");
    }
  }
  return (
    <div className="loan-guarantor-inputs">
      <label>
        เลขสมาชิกผู้ค้ำคนที่ {index + 1}
        <div className="loan-guarantor-search">
          <input
            aria-label={"เลขสมาชิกผู้ค้ำคนที่ " + (index + 1)}
            value={member}
            maxLength={50}
            onChange={(e) => {
              onChange(e.target.value);
              setPerson(null);
              setMessage("");
            }}
          />
          <button
            type="button"
            disabled={f.busy || !member.trim()}
            onClick={lookup}
          >
            ตรวจสอบคนที่ {index + 1}
          </button>
        </div>
      </label>
      <label>
        ชื่อผู้ค้ำคนที่ {index + 1}
        <input
          value={person?.member === member.trim() ? person.name : ""}
          placeholder="ชื่อหลังตรวจสอบสมาชิก"
          readOnly
          disabled
        />
      </label>
      {message && <p className="error">{message}</p>}
    </div>
  );
}
