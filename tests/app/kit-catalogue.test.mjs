import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyCatalogue,
  validateCatalogue,
  reviewIssues,
} from "../../app/kit-catalogue.mjs";
const record = {
  id: "test",
  team: "Test club",
  season: "2026/27",
  variant: "Home",
};
const wrap = (r) => ({ version: 1, records: [r] });
test("catalogue starts empty; intake never implies licensed availability", () => {
  assert.deepEqual(emptyCatalogue(), { version: 1, records: [] });
  const r = validateCatalogue(
    wrap({
      ...record,
      approved: true,
      assetUrl: "https://example.com/kit.glb",
    }),
  ).records[0];
  assert.equal(r.status, "unverified");
  assert.equal(r.approved, undefined);
  assert.equal(r.assetUrl, undefined);
  assert.ok(reviewIssues(r).length > 1);
  for (const status of ["licensed", "verified", "approved"])
    assert.throws(
      () => validateCatalogue(wrap({ ...record, status })),
      /cannot claim/,
    );
});
test("catalogue rejects malformed, unsafe, duplicate and oversized intake", () => {
  for (const input of [
    null,
    { version: 2, records: [] },
    { version: 1, records: Array(201).fill(record) },
    { version: 1, records: [record, record] },
    wrap({ ...record, team: "" }),
    wrap({ ...record, notes: "x".repeat(2001) }),
    wrap({ ...record, sourceUrl: "javascript:alert(1)" }),
    wrap({ ...record, sourceUrl: "https://user:password@example.com" }),
    wrap({ ...record, validUntil: "2026-02-30" }),
    wrap({ ...record, validFrom: "2027-01-01", validUntil: "2026-01-01" }),
  ])
    assert.throws(() => validateCatalogue(input));
});
test("complete declarations remain unverified and date restrictions are visible", () => {
  const r = validateCatalogue(
    wrap({
      ...record,
      supplier: "Supplier",
      rightsHolder: "Holder",
      sourceUrl: "https://example.com",
      evidenceReference: "Agreement reference",
      territories: "NG",
      permittedUses: "Review only",
      validFrom: "2026-01-01",
      validUntil: "2026-11-01",
    }),
  ).records[0];
  assert.equal(reviewIssues(r, "2026-10-01").length, 1);
  assert.match(reviewIssues(r, "2026-11-09").join(" "), /expired/);
  assert.match(reviewIssues(r, "2025-01-01").join(" "), /not started/);
  assert.deepEqual(
    validateCatalogue(JSON.parse(JSON.stringify(wrap(r)))),
    wrap(r),
  );
});
