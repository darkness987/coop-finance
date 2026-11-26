// ระบบ: เข้าสู่ระบบ บัญชีผู้ใช้ สิทธิ์และ OTP | ไฟล์: permissions.ts
// สิทธิ์กลาง: ใช้ชุดเดียวกันทั้ง API, หน้าเว็บ และเมนู ไม่เชื่อค่าบทบาทจากฟอร์ม
export const roles = [
  {
    id: "admin",
    label: "Admin",
    description: "จัดการผู้ใช้ ตั้งค่าระบบ และดูแลระบบทั้งหมด",
  },
  {
    id: "member_officer",
    label: "เจ้าหน้าที่สมาชิก",
    description: "จัดการสมาชิก ตรวจใบสมัคร และตรวจสอบ/อนุมัติสินเชื่อ",
  },
  {
    id: "loan_officer",
    label: "เจ้าหน้าที่สินเชื่อ",
    description: "ตรวจสอบคำขอกู้ และอนุมัติหรือไม่อนุมัติสินเชื่อ",
  },
  {
    id: "accountant",
    label: "เจ้าหน้าที่บัญชี",
    description: "จัดการหุ้น เงินฝาก ผลตอบแทน จ่ายเงินกู้และรับชำระ",
  },
  { id: "member", label: "สมาชิก", description: "ดูข้อมูลและทำรายการของตนเอง" },
];
type User = { role?: string; accessRole?: string };
export const roleOf = (user: User) => user.accessRole || user.role || "";
export const roleLabel = (user: User) =>
  roles.find((r) => r.id === roleOf(user))?.label || "ไม่ทราบบทบาท";
export const isStaff = (user: User) =>
  roles.some((r) => r.id === roleOf(user) && r.id !== "member");
// ฟังก์ชัน canAccess: ตรวจสิทธิ์ที่อนุญาตในส่วน canAccess
export function canAccess(user: User, module: string, action = "read") {
  const role = roleOf(user);
  if (role === "admin") return true;
  if (module === "return-rates") return role === "accountant";
  if (module === "member-services") {
    if (role === "member")
      return ["read", "respond-correction"].includes(action);
    if (role === "member_officer")
      return [
        "read",
        "request-correction",
        "complete-correction",
        "review-share-change",
        "create-status-request",
        "forward-status-request",
      ].includes(action);
    return false;
  }
  if (role === "member")
    return module === "users"
      ? action === "password"
      : module === "dashboard"
        ? action === "read"
        : [
            "members",
            "shares",
            "returns",
            "deposits",
            "loans",
            "benefits",
            "transactions",
          ].includes(module);
  if (module === "users") return isStaff(user) && action === "password";
  if (role === "member_officer") {
    if (module === "loans")
      return [
        "read",
        "check",
        "request-correction",
        "forward",
        "approve",
        "reject",
      ].includes(action);
    return ["members", "applications"].includes(module);
  }
  if (role === "accountant") {
    if (module === "directory") return action === "read";
    if (["shares", "returns", "deposits"].includes(module)) return true;
    if (module === "loans")
      return [
        "read",
        "disburse",
        "repay",
        "confirm-repayment",
        "reject-repayment",
      ].includes(action);
  }
  if (role === "loan_officer" && module === "loans")
    return [
      "read",
      "check",
      "request-correction",
      "forward",
      "approve",
      "reject",
    ].includes(action);
  return false;
}
// ฟังก์ชัน requireAccess: ตรวจเงื่อนไขหรือสิทธิ์ก่อนทำงานในส่วน requireAccess
export function requireAccess(user: User, module: string, action = "read") {
  if (!canAccess(user, module, action))
    throw Object.assign(new Error("บทบาทนี้ไม่มีสิทธิ์ทำรายการในหมวดนี้"), {
      status: 403,
    });
}
// ฟังก์ชัน landingPage: ทำงานส่วน landingPage ของระบบนี้
export function landingPage(user: User) {
  const role = roleOf(user);
  return role === "admin"
    ? "/admin/home"
    : role === "member_officer"
      ? "/admin/members"
      : role === "accountant"
        ? "/admin/deposits"
        : role === "loan_officer"
          ? "/admin/loans"
          : "/home";
}
// ฟังก์ชัน canAccessPath: ตรวจสิทธิ์ที่อนุญาตในส่วน canAccessPath
export function canAccessPath(user: User, path: string) {
  if (!path.startsWith("/admin")) return true;
  if (!isStaff(user)) return false;
  const module = path.split("/")[2] || "home";
  return canAccess(user, module === "home" ? "dashboard" : module);
}
