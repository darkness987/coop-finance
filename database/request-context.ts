// ฐานข้อมูลออนไลน์: แยก snapshot ต่อคำขอ ไม่ใช้ข้อมูลในหน่วยความจำร่วมกันระหว่างผู้ใช้
import { AsyncLocalStorage } from "node:async_hooks";
import type { Database } from "./store";
export type DatabaseSnapshot = { data: Database; etag: string; dirty: boolean };
export const databaseRequest = new AsyncLocalStorage<DatabaseSnapshot>();
export const usesCloudDatabase = () =>
  process.env.COOP_DATABASE_STORAGE === "vercel-blob";
