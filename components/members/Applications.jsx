// ระบบ: ข้อมูลสมาชิกและใบสมัคร | ไฟล์: Applications.jsx
"use client";

// ฝั่งเจ้าหน้าที่ | ตรวจสอบและตัดสินผลใบสมัครสมาชิก

import { useState } from "react";
import { Panel, Shell } from "../layout/shell";
import { useDemo } from "../shared/demo";

// ฟังก์ชัน Applications: ทำงานส่วน Applications ของระบบนี้
export default function Applications() {
  const [selected, setSelected] = useState(null);
  const { data, mutate, busy } = useDemo();
  const labels = {
    pending: "รอตรวจสอบ",
    approved: "อนุมัติแล้ว",
    rejected: "ไม่อนุมัติ",
  };
  return (
    <Shell
      admin
      title="ตรวจสอบใบสมัครสมาชิก"
      subtitle="เมื่ออนุมัติ ระบบจะสร้างสมาชิกและเปิดบัญชีหุ้น"
    >
      {selected && (
        <Panel icon="file" title={"รายละเอียดใบสมัคร " + selected.id}>
          <p>
            {selected.name} · {selected.email} · {selected.phone}
          </p>
          <p>
            เลขประชาชนท้าย 4 หลัก: {selected.profile?.citizenLast4 || "—"} ·
            วันเกิด: {selected.profile?.birthDate || "—"}
          </p>
          <p>ที่อยู่: {selected.profile?.address || "—"}</p>
          <p>
            อาชีพ: {selected.profile?.occupation || "—"} · รายได้:{" "}
            {selected.profile?.income || "—"} บาท
          </p>
          <button type="button" onClick={() => setSelected(null)}>
            ปิดรายละเอียด
          </button>
        </Panel>
      )}
      <Panel icon="file" title="รายการใบสมัคร">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>รหัส</th>
                <th>ชื่อ</th>
                <th>อีเมล</th>
                <th>โทรศัพท์</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {data.applications.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.name}</td>
                  <td>{row.email}</td>
                  <td>{row.phone || "—"}</td>
                  <td>{labels[row.status]}</td>
                  <td>
                    <button
                      type="button"
                      className="outline"
                      onClick={() => setSelected(row)}
                    >
                      ดูรายละเอียด
                    </button>
                    {row.status === "pending" && (
                      <div className="inline-form">
                        <button
                          className="outline"
                          disabled={busy}
                          onClick={() =>
                            mutate("applications", {
                              action: "approve",
                              id: row.id,
                            })
                          }
                        >
                          อนุมัติ
                        </button>
                        <button
                          className="outline"
                          disabled={busy}
                          onClick={() =>
                            mutate("applications", {
                              action: "reject",
                              id: row.id,
                            })
                          }
                        >
                          ไม่อนุมัติ
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </Shell>
  );
}
