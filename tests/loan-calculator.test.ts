import test from "node:test";
import assert from "node:assert/strict";
import Decimal from "decimal.js";
import {
  estimate,
  calculateDailyInterest,
} from "../lib/loans/calculator/calculator";
import { buildSchedule } from "../lib/loans/calculator/repayment";

test("ตารางลดต้นลดดอกคิดจากยอดคงเหลือและปิดเงินต้นครบถึงสตางค์", () => {
  const calculation = estimate(10000, 5.5, 3);
  assert.equal(calculation.payment, "3363.94");
  assert.deepEqual(
    calculation.rows.map((row) => row.principal),
    ["3318.11", "3333.31", "3348.58"],
  );
  assert.deepEqual(
    calculation.rows.map((row) => row.interest),
    ["45.83", "30.63", "15.35"],
  );
  assert.equal(calculation.rows[1].openingBalance, calculation.rows[0].balance);
  assert.equal(calculation.rows.at(-1)?.balance, "0.00");
  assert.equal(
    calculation.rows
      .reduce((sum, row) => sum.plus(row.principal), new Decimal(0))
      .toFixed(2),
    "10000.00",
  );
});

test("ดอกเบี้ยศูนย์และวันสิ้นเดือนยังสร้างตารางได้ถูกต้อง", () => {
  const schedule = buildSchedule(1000, 0, 3, "2028-01-31");
  assert.equal(schedule.totalInterest, "0.00");
  assert.deepEqual(
    schedule.rows.map((row) => row.dueDate),
    ["2028-01-31", "2028-02-29", "2028-03-31"],
  );
  assert.equal(schedule.rows.at(-1)?.principal, "333.34");
  assert.equal(schedule.rows.at(-1)?.balance, "0.00");
});

test("ตัวอย่างรายวันฐาน 365 คิดตามเงินต้นที่ลดลง", () => {
  assert.equal(calculateDailyInterest(120000, 6, 31), "611.51");
  assert.equal(calculateDailyInterest(110000, 6, 30), "542.47");
  assert.throws(() => calculateDailyInterest(-1, 6, 30));
});
