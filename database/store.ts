// ระบบ: ฐานข้อมูลกลางและข้อมูลตัวอย่าง | ไฟล์: store.ts
// ฐานข้อมูลกลางสำหรับโครงงาน: อ่านไฟล์ใหม่ทุกครั้ง จึงแก้ใน VS Code แล้วรีเฟรชได้
// ห้าม import ไฟล์นี้จาก client component เพราะมีข้อมูลส่วนตัวและเข้าถึง filesystem
import { databaseRequest, usesCloudDatabase } from "./request-context";
import {
  readFileSync,
  writeFileSync,
  renameSync,
  openSync,
  closeSync,
  unlinkSync,
  existsSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

export type Row = Record<string, any>;
export type Database = {
  version: number;
  members: {
    records: Row[];
    applications: Row[];
    serviceRequests?: Row[];
    profileChanges?: Row[];
  };
  shares: {
    rules: Row[];
    accounts: Row[];
    payments: Row[];
    changeRequests: Row[];
  };
  returns: {
    allocations: Row[];
    dividends: Row[];
    rebates: Row[];
    settings?: {
      dividendPercent: number;
      rebatePercent: number;
      depositRates: Record<string, number | null>;
      updated: string;
      updatedBy: string;
    };
  };
  deposits: {
    accounts: Row[];
    transactions: Row[];
    withdrawalOtps?: Row[];
    settings?: {
      revision: number;
      monthlyTerms: {
        id: string;
        months: number;
        rate: number;
        active: boolean;
      }[];
      openingEnabled: Record<string, boolean>;
      minimumMonthlyCents: number;
      updated: string;
      updatedBy: string;
    };
  };
  loans: {
    policy?: {
      totalPercent: number;
      firstPercent: number;
      updated?: string;
      updatedBy?: string;
    };
    submissionOtps?: Row[];
    repaymentOtps?: Row[];
    repaymentRequests?: Row[];
    products: Row[];
    applications: Row[];
    documents: Row[];
    handoffs: Row[];
    decisions: Row[];
    contracts: Row[];
    payments: Row[];
    schedules: Row[];
  };
  auth: { users: Row[]; auditLogs: Row[] };
};
const prefix = "export const database = ";
const header =
  "// ฐานข้อมูลกลาง: แบ่งหมวดตามระบบ แก้ตัวเลขแล้วบันทึกและรีเฟรชหน้าเว็บ\n// ภายในออบเจ็กต์ใช้รูปแบบ JSON: คีย์ใช้เครื่องหมายคำพูดคู่ ไม่มี comment หรือจุลภาคท้ายรายการ\n";

// หาไฟล์เดียวกันแม้เริ่มแอปจากโฟลเดอร์ systems/shares หรือ systems/loans
// ฟังก์ชัน databasePath: ทำงานส่วน databasePath ของระบบนี้
export function databasePath() {
  if (process.env.ALLPROJECT_DATA_FILE)
    return resolve(process.env.ALLPROJECT_DATA_FILE);
  let dir = process.cwd();
  while (true) {
    const candidate = join(dir, "database", "data.ts");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir)
      throw new Error("ไม่พบ database/data.ts กรุณารันจากโฟลเดอร์ allproject");
    dir = parent;
  }
}

// อ่านเป็นข้อมูลเท่านั้น ไม่ eval หรือรันโค้ดที่เขียนในไฟล์ข้อมูล
// ฟังก์ชัน decode: ทำงานส่วน decode ของระบบนี้
export function decode(text: string): Database {
  const start = text.indexOf(prefix);
  if (start < 0 || !text.trimEnd().endsWith(";"))
    throw new Error("รูปแบบ database/data.ts ไม่ถูกต้อง");
  const data = JSON.parse(text.trimEnd().slice(start + prefix.length, -1));
  if (data.version !== 1) throw new Error("เวอร์ชันข้อมูลไม่รองรับ");
  const tables = {
    members: ["records", "applications"],
    shares: ["rules", "accounts", "payments", "changeRequests"],
    returns: ["allocations", "dividends", "rebates"],
    deposits: ["accounts", "transactions"],
    loans: [
      "products",
      "applications",
      "documents",
      "handoffs",
      "decisions",
      "contracts",
      "payments",
      "schedules",
    ],
    auth: ["users", "auditLogs"],
  };
  for (const [group, names] of Object.entries(tables))
    for (const name of names) {
      if (!Array.isArray(data[group]?.[name]))
        throw new Error(`ข้อมูล ${group}.${name} ต้องเป็นรายการ`);
    }
  return data;
}

// อ่าน snapshot ใหม่เสมอ การแก้ object ที่คืนจากฟังก์ชันนี้จะยังไม่ถูกบันทึก
// ฟังก์ชัน readDatabase: อ่านข้อมูลในส่วน readDatabase
export function readDatabase(): Database {
  const context = databaseRequest.getStore();
  if (context) return structuredClone(context.data);
  if (usesCloudDatabase())
    throw Error("ต้องอ่านฐานข้อมูลออนไลน์ผ่าน loadDatabase หรือ withDatabase");
  return decode(readFileSync(databasePath(), "utf8"));
}
// ใช้รูปแบบไฟล์เดียวกันทั้งข้อมูลในเครื่องและไฟล์ส่วนตัวออนไลน์
export function encode(data: Database): string {
  const output = header + prefix + JSON.stringify(data, null, 2) + ";\n";
  decode(output);
  return output;
}

// Transaction แบบ synchronous: สำเร็จจึงบันทึกทั้งชุด ถ้า throw จะไม่บันทึกอะไร
// lock ใช้ร่วมกันข้ามเซิร์ฟเวอร์; rename ทำให้ผู้อ่านไม่เห็นไฟล์ที่เขียนค้างครึ่งเดียว
// ฟังก์ชัน updateDatabase: ทำงานส่วน updateDatabase ของระบบนี้
export function updateDatabase<T>(change: (data: Database) => T): T {
  const context = databaseRequest.getStore();
  if (context) {
    const data = structuredClone(context.data);
    const result = change(data);
    if (result && typeof (result as any).then === "function")
      throw Error("Transaction ต้องทำงานแบบ synchronous");
    context.data = decode(encode(data));
    context.dirty = true;
    return result;
  }
  if (usesCloudDatabase())
    throw Error("ต้องบันทึกฐานข้อมูลออนไลน์ภายใน withDatabase");
  const path = databasePath(),
    lockPath = path + ".lock",
    temporary = path + "." + randomUUID() + ".tmp";
  let lock: number;
  try {
    lock = openSync(lockPath, "wx", 0o600);
  } catch (error: any) {
    if (error.code === "EEXIST")
      throw new Error("มีการบันทึกข้อมูลพร้อมกัน กรุณาลองใหม่");
    throw error;
  }
  try {
    const original = readFileSync(path, "utf8");
    const data = decode(original);
    const result = change(data);
    if (result && typeof (result as any).then === "function")
      throw new Error("Transaction ต้องทำงานแบบ synchronous");
    const output = header + prefix + JSON.stringify(data, null, 2) + ";\n";
    decode(output);
    writeFileSync(temporary, output, { mode: 0o600 });
    if (readFileSync(path, "utf8") !== original)
      throw new Error("ข้อมูลถูกแก้ในไฟล์ระหว่างบันทึก กรุณารีเฟรช");
    renameSync(temporary, path);
    return result;
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
    closeSync(lock);
    unlinkSync(lockPath);
  }
}
