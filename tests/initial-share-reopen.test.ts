import test from "node:test";
import assert from "node:assert/strict";
import { initialShareFromRows } from "../lib/shares/initial-share";
import { changeShares } from "../lib/shares/shares";
import { requestActor } from "../lib/shared/context";
import type { CoopData } from "../lib/shared/data-types";
function fixture() {
  return {
    members: [
      { id: "66001239", name: "สมาชิกทดสอบ", active: 1, joined: "2020-01-01" },
    ],
    member_applications: [],
    rules: [{ id: 1, price: 100, min: 500 }],
    share_accounts: [
      {
        member: "66001239",
        monthly: 2000,
        opening_amount: 49500,
        opening_units: 495,
        opening_date: "2020-01-01",
        initial_payment_required: true,
      },
    ],
    share_payments: [
      {
        id: 1,
        member: "66001239",
        period: "2026-10",
        amount: 1000,
        price: 100,
        method: "เงินสด",
        date: "2026-10-05",
        received: "2026-10-05",
        reference: "old",
      },
      {
        id: 2,
        member: "66001239",
        period: "2026-11",
        amount: 500,
        price: 100,
        method: "เงินสด",
        date: "2026-11-05",
        received: null,
        reference: null,
        initial: true,
      },
    ],
    share_change_requests: [],
    allocations: [],
    member_dividends: [],
    member_rebates: [],
  } as CoopData;
}
test("reopening initial shares preserves existing holdings and waits for the designated pending receipt", () => {
  const d = fixture();
  let status = initialShareFromRows(
    d.share_accounts,
    d.share_payments,
    "66001239",
  );
  assert.equal(status.required, true);
  assert.equal(status.state, "pending");
  assert.equal(status.pending!.id, 2);
  requestActor.run({ id: "test-admin", role: "admin", member: "" }, () =>
    changeShares(d, true, {
      action: "receive",
      id: 2,
      expectedAmount: 500,
      expectedMethod: "เงินสด",
      expectedPrice: 100,
    }),
  );
  status = initialShareFromRows(d.share_accounts, d.share_payments, "66001239");
  assert.equal(status.required, false);
  assert.equal(status.state, "active");
  assert.equal(d.share_accounts[0].opening_amount, 49500);
  assert.equal(d.share_accounts[0].monthly, 2000);
  assert.equal(d.share_payments.length, 2);
  assert.equal(d.share_payments[0].reference, "old");
});
test("an unrelated old monthly payment does not unlock a reopened initial-share step", () => {
  const d = fixture();
  d.share_payments.push({ ...d.share_payments[1], id: 3, initial: false });
  requestActor.run({ id: "test-admin", role: "admin", member: "" }, () =>
    changeShares(d, true, {
      action: "receive",
      id: 3,
      expectedAmount: 500,
      expectedMethod: "เงินสด",
      expectedPrice: 100,
    }),
  );
  assert.equal(
    initialShareFromRows(d.share_accounts, d.share_payments, "66001239")
      .required,
    true,
  );
  assert.equal(d.share_accounts[0].initial_payment_required, true);
});
