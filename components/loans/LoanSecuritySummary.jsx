// สรุปสิ่งที่ใช้ค้ำประกันจากคำขอ/สัญญาจริง ใช้ร่วมกันทั้งสมาชิกและเจ้าหน้าที่
export default function LoanSecuritySummary({ row }) {
  const guarantors = row.guarantors?.length
    ? row.guarantors
    : row.guarantor
      ? [row.guarantor]
      : row.guarantorMember
        ? [{ member: row.guarantorMember, name: row.guarantorName }]
        : [];
  const mode =
    row.loanMode ||
    (row.collateral
      ? "collateral"
      : guarantors.length
        ? "guaranteed"
        : "asset");
  return (
    <section
      className="loan-contract-note"
      aria-label="รูปแบบและรายละเอียดการค้ำประกัน"
    >
      <h3>รูปแบบการค้ำประกัน</h3>
      {mode === "guaranteed" ? (
        <>
          <strong>
            ใช้บุคคลค้ำประกัน {row.guarantorCount ?? guarantors.length} คน
          </strong>
          {guarantors.map((person, index) => (
            <p key={person.member}>
              ผู้ค้ำคนที่ {index + 1}: {person.name} · เลขสมาชิก {person.member}
            </p>
          ))}
          {!guarantors.length && <p>ยังไม่ระบุข้อมูลผู้ค้ำประกัน</p>}
        </>
      ) : null}
      {mode === "collateral" || row.collateral ? (
        <>
          <strong>
            หลักทรัพย์ที่ใช้ค้ำ:{" "}
            {{ land: "ที่ดิน", house: "บ้าน" }[row.collateral?.type] ||
              "ยังไม่ระบุประเภท"}
          </strong>
          <p>ชื่อเจ้าของ: {row.collateral?.owner || "ยังไม่ระบุ"}</p>
          <p>
            เลขโฉนด / เอกสารสิทธิ์:{" "}
            {row.collateral?.documentNumber || "ยังไม่ระบุ"}
          </p>
          <p>ที่ตั้ง: {row.collateral?.address || "ยังไม่ระบุ"}</p>
          {row.collateralReview && (
            <p>
              วงเงินประเมินที่อนุมัติ:{" "}
              {Number(row.collateralReview.approvedLimit).toLocaleString(
                "th-TH",
              )}{" "}
              บาท
            </p>
          )}
        </>
      ) : mode === "guaranteed" ? (
        <p>ยังไม่ได้ระบุหลักทรัพย์บ้านหรือที่ดินประกอบ</p>
      ) : (
        <>
          <strong>ใช้วงเงินจากมูลค่าหุ้นและเงินฝากของสมาชิก</strong>
          <p>
            คำนวณสิทธิ์กู้จากสินทรัพย์ในระบบตามอัตราที่กำหนด ไม่ใช้ผู้ค้ำประกัน
          </p>
        </>
      )}
    </section>
  );
}
