import test from "node:test";
import assert from "node:assert/strict";
import { membershipMonths, membershipEligible } from "../lib/loans/membership";
test("ordinary and special require six calendar months; emergency three", () => {
  assert.equal(membershipMonths("ordinary"), 6);
  assert.equal(membershipMonths("special"), 6);
  assert.equal(membershipMonths("emergency"), 3);
  for (const product of ["ordinary", "special"]) {
    assert.equal(
      membershipEligible("2026-05-21", product, "2026-11-20"),
      false,
    );
    assert.equal(membershipEligible("2026-05-21", product, "2026-11-21"), true);
  }
  assert.equal(
    membershipEligible("2026-08-21", "emergency", "2026-11-20"),
    false,
  );
  assert.equal(
    membershipEligible("2026-08-21", "emergency", "2026-11-21"),
    true,
  );
});
test("invalid dates fail and calendar month ends are respected", () => {
  for (const d of [undefined, "", "2026-02-30", "nonsense"])
    assert.equal(membershipEligible(d, "emergency", "2026-11-21"), false);
  assert.equal(
    membershipEligible("2026-01-31", "emergency", "2026-04-29"),
    false,
  );
  assert.equal(
    membershipEligible("2026-01-31", "emergency", "2026-04-30"),
    true,
  );
});
