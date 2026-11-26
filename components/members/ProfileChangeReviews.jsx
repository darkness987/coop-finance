"use client";
// ระบบอนุมัติข้อมูลสมาชิก: แสดงเฉพาะค่าที่เปลี่ยน และส่งคำตัดสินไปตรวจสิทธิ์ที่ API
const labels = {
  name: "ชื่อ–นามสกุล",
  email: "อีเมล",
  phone: "เบอร์โทร",
  prefix: "คำนำหน้า",
  firstName: "ชื่อ",
  lastName: "นามสกุล",
  birthDate: "วันเกิด",
  company: "หน่วยงาน",
  occupation: "อาชีพ",
  income: "รายได้",
  address: "ที่อยู่",
  provincePostal: "จังหวัด / รหัสไปรษณีย์",
  bank: "ธนาคาร",
  bankLast4: "บัญชี 4 หลักท้าย",
};
export default function ProfileChangeReviews({ f }) {
  const rows = f.data.profileChanges || [];
  if (!f.data.canApprove || !rows.length) return null;
  return (
    <section className="panel">
      <h2>คำขอแก้ข้อมูลสมาชิก</h2>
      {rows.map((r) => {
        const before = { ...r.before, ...r.before.profile },
          after = { ...r.proposed, ...r.proposed.profile };
        const keys = Object.keys(labels).filter(
          (k) => (before[k] || "") !== (after[k] || ""),
        );
        return (
          <article key={r.id}>
            <h3>
              {r.before.name} · {r.member}
            </h3>
            <p>
              {r.created.slice(0, 10)} ·{" "}
              {
                {
                  pending: "รอตรวจสอบ",
                  approved: "อนุมัติแล้ว",
                  rejected: "ไม่อนุมัติ",
                }[r.status]
              }
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ข้อมูล</th>
                    <th>เดิม</th>
                    <th>ขอเปลี่ยนเป็น</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k}>
                      <td>{labels[k]}</td>
                      <td>{before[k] || "—"}</td>
                      <td>{after[k] || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {r.status === "pending" ? (
              <div className="loan-actions">
                <button
                  disabled={f.busy}
                  onClick={async () => {
                    const note = prompt("เหตุผลไม่อนุมัติ");
                    if (note !== null)
                      await f.act({
                        action: "reject-profile-change",
                        id: r.id,
                        note,
                      });
                  }}
                >
                  ไม่อนุมัติ
                </button>
                <button
                  className="primary"
                  disabled={f.busy}
                  onClick={() =>
                    f.act({ action: "approve-profile-change", id: r.id })
                  }
                >
                  อนุมัติ
                </button>
              </div>
            ) : (
              <p>{r.note}</p>
            )}
          </article>
        );
      })}
    </section>
  );
}
