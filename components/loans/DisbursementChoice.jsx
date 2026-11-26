// ระบบ: สินเชื่อ วงเงิน ผู้ค้ำ และชำระหนี้ | ไฟล์: DisbursementChoice.jsx
"use client";
// เลือกวิธีรับเงินก่อนยืนยันคำขอ ไม่ใช่การยืนยันว่าจ่ายเงินแล้ว
// ฟังก์ชัน DisbursementChoice: ทำงานส่วน DisbursementChoice ของระบบนี้
export default function DisbursementChoice({ f, row }) {
  const editable = ["draft", "needs_documents"].includes(row.status);
  if (!editable)
    return (
      <p className="loan-contract-note">
        วิธีรับเงิน:{" "}
        {row.disbursementMethod === "account"
          ? "รับเข้าบัญชี " +
            (row.disbursementAccount?.bank || "") +
            " · ลงท้าย " +
            (row.disbursementAccount?.last4 || "")
          : row.disbursementMethod === "cash"
            ? "รับเงินสด"
            : "ยังไม่ได้ระบุ"}
      </p>
    );
  // ฟังก์ชัน choose: ทำงานส่วน choose ของระบบนี้
  function choose(value) {
    f.act({
      action: "choose-disbursement",
      id: row.id,
      revision: row.revision,
      disbursementMethod: value,
    });
  }
  return (
    <fieldset className="loan-disbursement-choice" disabled={f.busy}>
      <legend>เลือกวิธีรับเงินกู้ก่อนยืนยัน</legend>
      <label>
        <input
          type="radio"
          name={"receive-" + row.id}
          checked={row.disbursementMethod === "cash"}
          onChange={() => choose("cash")}
        />
        รับเงินสด
      </label>
      <label>
        <input
          type="radio"
          name={"receive-" + row.id}
          checked={row.disbursementMethod === "account"}
          onChange={() => choose("account")}
        />
        รับเข้าบัญชี
      </label>
      {f.data.linkedAccount ? (
        <p className="loan-muted">
          บัญชีที่บันทึกไว้: {f.data.linkedAccount.bank} · ลงท้าย{" "}
          {f.data.linkedAccount.last4}
        </p>
      ) : (
        <p className="loan-muted">
          หากรับเข้าบัญชี <a href="/returns/shares">เพิ่มบัญชีรับเงิน</a> ก่อน
        </p>
      )}
    </fieldset>
  );
}
