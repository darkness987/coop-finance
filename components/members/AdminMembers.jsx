// ระบบ: ข้อมูลสมาชิกและใบสมัคร | ไฟล์: AdminMembers.jsx
"use client";

// ฝั่งเจ้าหน้าที่ | ค้นหา เพิ่ม แก้ไข และเปลี่ยนสถานะสมาชิก

import Link from "next/link";
import { useState } from "react";
import { Icon, Panel, Shell } from "../layout/shell";
import { useDemo } from "../shared/demo";

// ฟังก์ชัน Page: ทำงานส่วน Page ของระบบนี้
export default function Page() {
  const { data, mutate, busy } = useDemo();
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [error, setError] = useState("");
  const term = query.trim().toLowerCase();
  const rows = data.members.filter(
    (member) =>
      member.id.includes(term) || member.name.toLowerCase().includes(term),
  );

  // ฟังก์ชัน open: ทำงานส่วน open ของระบบนี้
  function open(member) {
    setError("");
    setEditor(member);
  }

  // ฟังก์ชัน save: บันทึกข้อมูล
  async function save(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = String(form.get("id")).trim();
    const name = String(form.get("name")).trim();
    if (!/^\d+$/.test(id) || !name) {
      setError("กรุณากรอกรหัสสมาชิกเป็นตัวเลขและระบุชื่อ");
      return;
    }
    if (!editor.id && data.members.some((member) => member.id === id)) {
      setError("รหัสสมาชิกนี้มีอยู่แล้ว");
      return;
    }
    if (
      await mutate("members", {
        action: "save",
        id,
        name,
        edit: Boolean(editor.id),
        email: form.get("email"),
        phone: form.get("phone"),
        active: form.get("status") === "active",
      })
    )
      setEditor(null);
  }

  return (
    <Shell
      admin
      title="จัดการสมาชิก"
      subtitle="ค้นหา เพิ่ม และแก้ไขข้อมูลสมาชิกสหกรณ์"
    >
      <p>
        <Link href="/admin/member-services">
          ภาพรวมรายสมาชิก / ติดตามหุ้น / งานตรวจสอบ →
        </Link>
      </p>
      <div className="filters">
        <label className="search">
          <Icon name="search" />
          <input
            aria-label="ค้นหาชื่อหรือรหัสสมาชิก"
            placeholder="ค้นหาชื่อ / รหัสสมาชิก"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button
          className="primary"
          onClick={() => open({ id: "", name: "", active: true })}
        >
          + เพิ่มสมาชิก
        </button>
      </div>
      {viewer && (
        <Panel
          icon="users"
          title={"ข้อมูลสมาชิก " + viewer.id}
          action={
            <button className="outline" onClick={() => setViewer(null)}>
              ปิดข้อมูล
            </button>
          }
        >
          <div className="member-detail-grid">
            {[
              ["ชื่อ – นามสกุล", viewer.name],
              ["รหัสสมาชิก", viewer.id],
              ["อีเมล", viewer.email],
              ["เบอร์โทรศัพท์", viewer.phone],
              ["วันที่สมัคร", viewer.joined],
              ["สถานะ", viewer.active ? "ปกติ" : "ระงับ"],
              ["หน่วยงาน", viewer.profile?.company],
              ["อาชีพ", viewer.profile?.occupation],
              ["รายได้ต่อเดือน", viewer.profile?.income],
              ["ที่อยู่", viewer.profile?.address],
              ["จังหวัด / รหัสไปรษณีย์", viewer.profile?.provincePostal],
              ["ธนาคารรับปันผล", viewer.profile?.bank],
            ].map(([label, value]) => (
              <div key={label}>
                <small>{label}</small>
                <strong>{value || "ยังไม่ระบุ"}</strong>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {editor && (
        <Panel
          icon="users"
          title={editor.id ? "แก้ไขข้อมูลสมาชิก" : "เพิ่มสมาชิก"}
          action={
            <button className="outline" onClick={() => setEditor(null)}>
              ยกเลิก
            </button>
          }
        >
          <form className="form" onSubmit={save} key={editor.id}>
            <label>
              รหัสสมาชิก
              <input
                name="id"
                inputMode="numeric"
                required
                defaultValue={editor.id}
                readOnly={Boolean(editor.id)}
              />
            </label>
            <label>
              ชื่อ - นามสกุล
              <input name="name" required defaultValue={editor.name} />
            </label>
            <label>
              อีเมล
              <input name="email" type="email" defaultValue={editor.email} />
            </label>
            <label>
              โทรศัพท์
              <input name="phone" type="tel" defaultValue={editor.phone} />
            </label>
            <label>
              สถานะ
              <select
                name="status"
                defaultValue={editor.active ? "active" : "inactive"}
              >
                <option value="active">ใช้งาน</option>
                <option value="inactive">ระงับ</option>
              </select>
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" disabled={busy}>
              บันทึกสมาชิก
            </button>
          </form>
        </Panel>
      )}
      <Panel icon="users" title="รายชื่อสมาชิก">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>รหัสสมาชิก</th>
                <th>ชื่อ - นามสกุล</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((member) => (
                <tr key={member.id}>
                  <td>{member.id}</td>
                  <td>{member.name}</td>
                  <td>
                    <span
                      className={
                        "status " + (member.active ? "done" : "pending")
                      }
                    >
                      {member.active ? "ใช้งาน" : "ระงับ"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="outline"
                      onClick={() => setViewer(member)}
                    >
                      ดูข้อมูล
                    </button>{" "}
                    <button className="outline" onClick={() => open(member)}>
                      แก้ไข
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="empty">ไม่พบสมาชิก</p>}
        </div>
      </Panel>
    </Shell>
  );
}
