import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readReturnRates,
  changeReturnRates,
} from "../lib/returns/return-rates";
import { readBenefits } from "../lib/returns/benefits";
import { readDeposits } from "../lib/deposits/deposits";
import { withShares } from "../database/shares";
import { readDatabase, type Database } from "../database/store";
const admin = { id: "admin", role: "admin", member: "m" };
function fixture(): Database {
  return {
    version: 1,
    members: {
      records: [{ id: "m", active: 1, name: "Test" }],
      applications: [],
    },
    shares: {
      rules: [{ id: 1, price: 100, min: 500 }],
      accounts: [
        {
          member: "m",
          opening_amount: 50000,
          opening_units: 500,
          opening_date: "2020-01-01",
          monthly: 500,
        },
      ],
      payments: [],
      changeRequests: [],
    },
    returns: {
      allocations: [
        { year: 2025, dividend_rate: 400, rebate_rate: 500, approved: 1 },
      ],
      dividends: [{ year: 2025, member: "m", basis: 49500, cents: 198000 }],
      rebates: [],
    },
    deposits: {
      accounts: [
        { id: "SA-m", member: "m", type: "savings", balanceCents: 10000000 },
      ],
      transactions: [],
    },
    loans: {
      products: [],
      applications: [],
      documents: [],
      handoffs: [],
      decisions: [],
      contracts: [],
      payments: [],
      schedules: [],
    },
    auth: { users: [], auditLogs: [] },
  };
}
const input = {
  action: "save",
  dividendPercent: 6.25,
  rebatePercent: 7.5,
  depositRates: { savings: 3.5, special: 4, monthly: null, fixed: 5 },
};
test("configured rates drive share/deposit estimates and deposit screens without rewriting historical allocation", () => {
  const db = fixture();
  assert.equal(readReturnRates(db, admin).dividendPercent, 4);
  const history =
    JSON.stringify(db.returns.allocations) +
    JSON.stringify(db.returns.dividends);
  changeReturnRates(db, admin, input);
  const d = readBenefits(db, { id: "member", role: "member", member: "m" });
  assert.equal(d.shares.rate, 6.25);
  assert.equal(d.shares.estimatedCents, 312500);
  assert.equal(d.deposits.estimatedCents, 350000);
  assert.equal(d.shares.history[0].rate, 4);
  assert.equal(d.shares.history[0].cents, 198000);
  assert.equal(readDeposits(db, admin).types[0].rate, 3.5);
  assert.equal(
    JSON.stringify(db.returns.allocations) +
      JSON.stringify(db.returns.dividends),
    history,
  );
});
test("only admin and accountant may read/write rates, member and other staff cannot", () => {
  for (const role of ["member", "member_officer", "loan_officer", "approver"]) {
    const a = {
      id: role,
      role: role === "member" ? "member" : "admin",
      accessRole: role,
      member: "m",
    };
    assert.throws(() => readReturnRates(fixture(), a), { status: 403 });
    assert.throws(() => changeReturnRates(fixture(), a, input), {
      status: 403,
    });
  }
  changeReturnRates(fixture(), { ...admin, accessRole: "accountant" }, input);
});
test("rates reject missing, negative, nonfinite and excessive precision without partial mutation; zero differs from null", () => {
  const db = fixture();
  for (const bad of [
    { ...input, dividendPercent: -1 },
    { ...input, rebatePercent: 101 },
    { ...input, dividendPercent: "4" },
    { ...input, rebatePercent: NaN },
    { ...input, depositRates: { ...input.depositRates, special: 30.01 } },
    { ...input, depositRates: { ...input.depositRates, savings: 1.234 } },
    { ...input, depositRates: { savings: 2 } },
  ]) {
    assert.throws(() => changeReturnRates(db, admin, bad));
    assert.equal(db.returns.settings, undefined);
  }
  changeReturnRates(db, admin, {
    ...input,
    dividendPercent: 0,
    depositRates: { savings: 0, special: null, monthly: 2, fixed: 3 },
  });
  assert.equal(readReturnRates(db, admin).depositRates[0].rate, 0);
  assert.equal(readReturnRates(db, admin).depositRates[1].rate, null);
});
test("legacy share writes preserve saved rates in central database", () => {
  const dir = mkdtempSync(join(tmpdir(), "coop-rates-"));
  const old = process.env.ALLPROJECT_DATA_FILE;
  try {
    const db = fixture();
    changeReturnRates(db, admin, input);
    const path = join(dir, "data.ts");
    writeFileSync(path, "export const database = " + JSON.stringify(db) + ";");
    process.env.ALLPROJECT_DATA_FILE = path;
    withShares((data) => {
      data.share_accounts[0].monthly = 1000;
    }, true);
    assert.equal(readDatabase().returns.settings!.dividendPercent, 6.25);
    assert.equal(readDatabase().returns.settings!.depositRates.savings, 3.5);
  } finally {
    if (old === undefined) delete process.env.ALLPROJECT_DATA_FILE;
    else process.env.ALLPROJECT_DATA_FILE = old;
    rmSync(dir, { recursive: true, force: true });
  }
});
