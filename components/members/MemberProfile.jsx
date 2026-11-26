// ระบบ: ข้อมูลสมาชิกและใบสมัคร | ไฟล์: MemberProfile.jsx
"use client";

import { useState } from "react";
import { useDemo } from "../shared/demo";
import styles from "./profile.module.css";

// ฟังก์ชัน Field: ทำงานส่วน Field ของระบบนี้
function Field({
  label,
  name,
  value,
  placeholder,
  type = "text",
  readOnly = false,
  ...attributes
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldTitle}>
        {label}
        {readOnly && <small className={styles.lockBadge}>แก้ไขไม่ได้</small>}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={value ?? ""}
        placeholder={placeholder}
        {...attributes}
        readOnly={readOnly}
        disabled={readOnly}
        title={readOnly ? "ข้อมูลส่วนนี้แก้ไขไม่ได้" : undefined}
      />
    </label>
  );
}

// ฟังก์ชัน Profile: ทำงานส่วน Profile ของระบบนี้
export default function Profile({ showHeading = true }) {
  const { data, mutate, busy } = useDemo();
  const [saved, setSaved] = useState(false);
  const member = data.members;
  const profile = member.profile ?? {};
  const [firstName, ...surname] = member.name.split(/\s+/);

  // ฟังก์ชัน save: บันทึกข้อมูล
  async function save(event) {
    event.preventDefault();
    setSaved(false);
    const { email, phone, ...fields } = Object.fromEntries(
      new FormData(event.currentTarget),
    );
    setSaved(
      await mutate("members", {
        action: "profile",
        email,
        phone,
        profile: fields,
      }),
    );
  }

  return (
    <div className={styles.layout}>
      <div className={styles.content}>
        {showHeading && <h1>ข้อมูลสมาชิก</h1>}
        <div className={styles.memberSummary}>
          <span className={styles.memberAvatar}>{member.name.charAt(0)}</span>
          <div>
            <strong>{member.name}</strong>
            <p>
              เลขสมาชิก {member.id} · เข้าร่วม {member.joined}
            </p>
          </div>
          <span
            className={
              member.active ? styles.activeStatus : styles.inactiveStatus
            }
          >
            {member.active ? "สมาชิกปกติ" : "ระงับสมาชิก"}
          </span>
        </div>
        {member.demoProfile && (
          <p className={styles.demoNote}>
            ข้อมูลตัวอย่างสำหรับโครงงาน สามารถแก้ไขและบันทึกข้อมูลได้
          </p>
        )}
        <div className={styles.fieldGuide} role="note">
          <span>
            <i className={styles.editableSwatch} />
            พื้นขาว: แก้ไขได้
          </span>
          <span>
            <i className={styles.lockedSwatch} />
            พื้นเทา: แก้ไขไม่ได้
          </span>
        </div>
        <form onSubmit={save} onChange={() => setSaved(false)}>
          <div className={styles.cards}>
            <section className={styles.card} aria-labelledby="member-details">
              <div className={styles.cardHeading}>
                <h2 id="member-details">ข้อมูลส่วนตัว</h2>
                <p>ข้อมูลสมาชิกและข้อมูลการทำงาน</p>
              </div>
              <div className={styles.detailsGrid}>
                <Field
                  label="เลขประจำตัวประชาชน (13 หลัก)"
                  name="citizenNumber"
                  readOnly
                  value={profile.citizenNumber}
                  placeholder="กรอกเลข 13 หลัก"
                  inputMode="numeric"
                  maxLength={13}
                  pattern="[0-9]{13}"
                  required
                />
                <div className={styles.nameGrid}>
                  <Field
                    label="คำนำหน้า"
                    name="prefix"
                    value={profile.prefix}
                    placeholder="นาย / นาง / นางสาว"
                    maxLength={30}
                  />
                  <Field
                    label="ชื่อ"
                    name="firstName"
                    value={profile.firstName ?? firstName}
                    maxLength={60}
                    required
                  />
                  <Field
                    label="นามสกุล"
                    name="lastName"
                    value={profile.lastName ?? surname.join(" ")}
                    maxLength={60}
                  />
                </div>
                <Field
                  label="วันเดือนปีเกิด"
                  name="birthDate"
                  type="date"
                  value={profile.birthDate}
                />
                <Field
                  label="เบอร์โทรศัพท์ (10 หลัก)"
                  name="phone"
                  type="tel"
                  value={member.phone?.replace(/[-\s()]/g, "")}
                  placeholder="08XXXXXXXX"
                  inputMode="numeric"
                  maxLength={10}
                  pattern="[0-9]{10}"
                  required
                />
                <Field
                  label="อีเมล"
                  name="email"
                  type="email"
                  value={member.email}
                  placeholder="member@example.com"
                  maxLength={120}
                />
                <Field label="เลขสมาชิก" value={member.id} readOnly />
                <div className={styles.full}>
                  <Field
                    label="หน่วยงาน / บริษัท"
                    name="company"
                    value={profile.company}
                    placeholder="ชื่อหน่วยงานหรือบริษัท"
                    maxLength={120}
                  />
                </div>
                <Field
                  label="ตำแหน่ง / อาชีพ"
                  name="occupation"
                  value={profile.occupation}
                  placeholder="ตำแหน่งหรืออาชีพ"
                  maxLength={120}
                />
                <Field
                  label="รายได้ต่อเดือน (บาท)"
                  name="income"
                  type="number"
                  value={profile.income}
                  placeholder="0.00"
                  min="0"
                  max="100000000"
                  step="0.01"
                />
              </div>
            </section>

            <section className={styles.card} aria-labelledby="contact-details">
              <div className={styles.cardHeading}>
                <h2 id="contact-details">ข้อมูลติดต่อและบัญชี</h2>
                <p>ข้อมูลสำหรับติดต่อและระบุบัญชีรับเงินปันผล</p>
              </div>
              <div className={styles.contactGrid}>
                <Field
                  label="ประเภทสมาชิก"
                  name="memberType"
                  value="สมาชิกสหกรณ์"
                  readOnly
                />
                <Field
                  label="ที่อยู่ปัจจุบัน"
                  name="address"
                  value={profile.address}
                  placeholder="บ้านเลขที่ ถนน แขวง / ตำบล"
                  maxLength={250}
                />
                <Field
                  label="จังหวัด / รหัสไปรษณีย์"
                  name="provincePostal"
                  value={profile.provincePostal}
                  placeholder="จังหวัด / 00000"
                  maxLength={120}
                />
                <Field
                  label="ธนาคารรับเงินปันผล"
                  name="bank"
                  value={profile.bank}
                  placeholder="ชื่อธนาคาร"
                  maxLength={120}
                />
                <Field
                  label="เลขบัญชีธนาคาร (4 หลักท้าย)"
                  name="bankLast4"
                  value={profile.bankLast4}
                  placeholder="XXXX"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="[0-9]{4}"
                />
              </div>
              <p className={styles.note}>เลขบัญชีธนาคารใช้เฉพาะ 4 หลักท้าย</p>
            </section>
          </div>
          <div className={styles.actions}>
            {saved && (
              <p role="status">
                ส่งคำขอให้แอดมินตรวจสอบแล้ว ข้อมูลจะเปลี่ยนเมื่ออนุมัติ
              </p>
            )}
            {member.profileChanges?.[0] && (
              <p role="status">
                คำขอล่าสุด:{" "}
                {
                  {
                    pending: "รอแอดมินตรวจสอบ",
                    approved: "อนุมัติแล้ว",
                    rejected: "ไม่อนุมัติ",
                  }[member.profileChanges[0].status]
                }{" "}
                {member.profileChanges[0].note}
              </p>
            )}
            <button
              disabled={
                busy ||
                member.profileChanges?.some((r) => r.status === "pending")
              }
            >
              {busy ? "กำลังบันทึก…" : "ส่งคำขอแก้ข้อมูล"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
