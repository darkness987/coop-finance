// ระบบ: ข้อมูลสมาชิกและใบสมัคร | ไฟล์: members.ts
// ระบบสมาชิก | ข้อมูลส่วนตัว สถานะสมาชิก และใบสมัคร

import { randomUUID } from "node:crypto";
import { currentMember } from "../shared/context";
import { today } from "../shared/date";
import { check, RequestError } from "../shared/validation";
import { openShareAccount } from "../shares/share-accounts";
import type { CoopData, Identity, MemberProfile } from "../shared/data-types";

// ฟังก์ชัน readMembers: อ่านข้อมูลในส่วน readMembers
export function readMembers(data: CoopData, admin: boolean) {
  if (!admin) {
    const member = data.members.find(({ id }) => id === currentMember());
    return member
      ? {
          ...member,
          profileChanges: (data.profile_change_requests || [])
            .filter((r) => r.member === member.id)
            .toReversed(),
        }
      : undefined;
  }
  return data.members
    .map(({ profile, ...member }) => {
      if (!profile) return member;
      const summary = { ...profile };
      delete summary.citizenNumber;
      return { ...member, profile: summary };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

// ฟังก์ชัน readApplications: อ่านข้อมูลในส่วน readApplications
export function readApplications(data: CoopData, admin: boolean) {
  return admin
    ? data.member_applications
        .map(({ profile, ...row }) => ({
          ...row,
          profile: profile
            ? {
                ...profile,
                citizenNumber: undefined,
                citizenLast4: profile.citizenNumber?.slice(-4),
              }
            : undefined,
        }))
        .sort((a, b) => a.id.localeCompare(b.id))
    : [];
}

// ฟังก์ชัน requireActiveMember: ตรวจเงื่อนไขหรือสิทธิ์ก่อนทำงานในส่วน requireActiveMember
export function requireActiveMember(data: CoopData) {
  check(
    data.members.find(({ id }) => id === currentMember())?.active,
    "สถานะสมาชิกถูกระงับ",
    403,
  );
}

// ฟังก์ชัน identity: ทำงานส่วน identity ของระบบนี้
function identity(input: Record<string, unknown>): Identity {
  const { id, name, email = "", phone = "" } = input;
  check(
    typeof id === "string" && /^\d{4,16}$/.test(id),
    "รหัสสมาชิกต้องเป็นตัวเลข 4–16 หลัก",
  );
  check(
    typeof name === "string" && name.trim().length > 0 && name.length <= 120,
    "กรุณาระบุชื่อ",
  );
  check(
    typeof email === "string" &&
      email.length <= 120 &&
      (!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
    "อีเมลไม่ถูกต้อง",
  );
  check(
    typeof phone === "string" && /^[0-9+() -]{0,30}$/.test(phone),
    "เบอร์โทรไม่ถูกต้อง",
  );
  return { id, name: name.trim(), email, phone };
}

// ฟังก์ชัน createMember: ทำงานส่วน createMember ของระบบนี้
function createMember(data: CoopData, fields: Identity, active: number) {
  check(
    !data.members.some(({ id }) => id === fields.id),
    "รหัสนี้เป็นสมาชิกแล้ว",
    409,
  );
  const joined = today();
  data.members.push({ ...fields, active, joined });
  openShareAccount(data, fields.id, joined);
}

// ตรวจข้อมูลจากหน้าข้อมูลส่วนตัวก่อนเขียนกลับไฟล์ข้อมูล
// ฟังก์ชัน readProfile: อ่านข้อมูลในส่วน readProfile
function readProfile(input: unknown): MemberProfile {
  check(
    input && typeof input === "object" && !Array.isArray(input),
    "ข้อมูลส่วนตัวไม่ถูกต้อง",
  );
  const fields = input as Record<string, unknown>;
  const limits = {
    citizenNumber: 13,
    prefix: 30,
    firstName: 60,
    lastName: 60,
    birthDate: 10,
    company: 120,
    occupation: 120,
    income: 12,
    address: 250,
    provincePostal: 120,
    bank: 120,
    bankLast4: 4,
  } satisfies Record<Exclude<keyof MemberProfile, "citizenLast4">, number>;
  const profile: MemberProfile = {};
  for (const key of Object.keys(limits) as (keyof typeof limits)[]) {
    const value = fields[key];
    if (value === undefined) continue;
    check(
      typeof value === "string" && value.length <= limits[key],
      "ข้อมูลส่วนตัวยาวเกินกำหนด",
    );
    profile[key] = value.trim();
  }
  if (profile.citizenNumber !== undefined) {
    check(
      /^\d{13}$/.test(profile.citizenNumber),
      "กรุณากรอกเลขประจำตัวประชาชน 13 หลัก",
    );
  }
  check(
    !profile.bankLast4 || /^\d{4}$/.test(profile.bankLast4),
    "กรุณากรอกเลขบัญชีธนาคาร 4 หลักท้าย",
  );
  if (profile.birthDate) {
    const date = new Date(profile.birthDate + "T00:00:00Z");
    check(
      /^\d{4}-\d{2}-\d{2}$/.test(profile.birthDate) &&
        Number.isFinite(date.getTime()) &&
        date.toISOString().slice(0, 10) === profile.birthDate &&
        profile.birthDate <= today(),
      "วันเดือนปีเกิดไม่ถูกต้อง",
    );
  }
  check(
    !profile.income ||
      (/^\d+(\.\d{1,2})?$/.test(profile.income) &&
        Number(profile.income) <= 100000000),
    "รายได้ต่อเดือนไม่ถูกต้อง",
  );
  return profile;
}

// ฟังก์ชัน changeMembers: ตรวจคำสั่งและบันทึกการเปลี่ยนแปลงในส่วน changeMembers
export function changeMembers(
  data: CoopData,
  resource: string,
  admin: boolean,
  input: Record<string, unknown>,
) {
  const { action, id } = input;
  if (resource === "members" && action === "profile" && !admin) {
    const original = data.members.find(({ id }) => id === currentMember());
    const member = original ? structuredClone(original) : undefined;
    check(member, "ไม่พบสมาชิก", 404);
    const { email, phone } = identity({
      ...input,
      id: currentMember(),
      name: member.name,
    });
    check(/^\d{10}$/.test(phone), "กรุณากรอกเบอร์โทรศัพท์เป็นตัวเลข 10 หลัก");
    if (input.profile !== undefined) {
      const changes = readProfile(input.profile);
      // เลขประชาชนเป็นข้อมูลคงที่ สมาชิกส่งแก้ผ่าน API โดยตรงก็ไม่ได้
      check(
        changes.citizenNumber === undefined ||
          changes.citizenNumber === member.profile?.citizenNumber,
        "เลขประจำตัวประชาชนแก้ไขไม่ได้ กรุณาติดต่อเจ้าหน้าที่",
        403,
      );
      const profile = { ...member.profile, ...changes };
      if (profile.firstName !== undefined) {
        const name = [profile.firstName, profile.lastName]
          .filter(Boolean)
          .join(" ");
        check(profile.firstName && name.length <= 120, "กรุณาระบุชื่อสมาชิก");
        member.name = name;
      }
      if (profile.citizenNumber) delete profile.citizenLast4;
      member.profile = profile;
    }
    Object.assign(member, { email, phone });
    const requests = (data.profile_change_requests ||= []);
    check(
      !requests.some((r) => r.member === member.id && r.status === "pending"),
      "มีคำขอแก้ข้อมูลรอแอดมินตรวจสอบแล้ว",
      409,
    );
    const snapshot = (m: typeof member) => ({
      name: m.name,
      email: m.email,
      phone: m.phone,
      profile: m.profile || {},
    });
    const before = snapshot(original!),
      proposed = snapshot(member);
    check(
      JSON.stringify(before) !== JSON.stringify(proposed),
      "ยังไม่มีข้อมูลเปลี่ยนแปลง",
    );
    requests.push({
      id: randomUUID(),
      member: member.id,
      before,
      proposed,
      status: "pending",
      created: new Date().toISOString(),
    });
  } else if (resource === "members" && action === "save" && admin) {
    const fields = identity(input);
    check(typeof input.active === "boolean", "สถานะไม่ถูกต้อง");
    if (input.edit) {
      const member = data.members.find((row) => row.id === id);
      check(member, "ไม่พบสมาชิก", 404);
      if (member.profile && member.name !== fields.name) {
        delete member.profile.firstName;
        delete member.profile.lastName;
      }
      Object.assign(member, fields, { active: Number(input.active) });
    } else {
      check(
        !data.member_applications.some(
          (row) => row.id === id && row.status === "pending",
        ),
        "มีใบสมัครรอตรวจสอบสำหรับรหัสนี้",
        409,
      );
      createMember(data, fields, Number(input.active));
    }
  } else if (resource === "applications" && action === "apply" && !admin) {
    const fields = identity(input);
    check(
      !data.members.some((row) => row.id === id),
      "รหัสนี้เป็นสมาชิกแล้ว",
      409,
    );
    check(
      !data.member_applications.some((row) => row.id === id),
      "มีใบสมัครสำหรับรหัสนี้แล้ว",
      409,
    );
    data.member_applications.push({ ...fields, status: "pending" });
  } else if (
    resource === "applications" &&
    admin &&
    (action === "approve" || action === "reject")
  ) {
    const row = data.member_applications.find(
      (item) => item.id === id && item.status === "pending",
    );
    check(row, "ใบสมัครนี้ถูกตรวจสอบแล้วหรือไม่มีในระบบ", 409);
    if (action === "approve") {
      const { id, name, email, phone } = row;
      createMember(data, { id, name, email, phone }, 1);
      if (row.profile)
        data.members.find((m) => m.id === id)!.profile = structuredClone(
          row.profile,
        );
    }
    row.status = action === "approve" ? "approved" : "rejected";
  } else {
    throw new RequestError("ไม่มีสิทธิ์ทำรายการนี้", 403);
  }
}
