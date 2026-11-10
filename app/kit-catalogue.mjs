export const catalogueVersion = 1;
export const emptyCatalogue = () => ({
  version: catalogueVersion,
  records: [],
});
const fields = [
  "id",
  "team",
  "competition",
  "season",
  "variant",
  "supplier",
  "rightsHolder",
  "sourceUrl",
  "evidenceReference",
  "territories",
  "permittedUses",
  "validFrom",
  "validUntil",
  "notes",
];
const date = /^\d{4}-\d{2}-\d{2}$/;
function validDate(value) {
  return (
    date.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function validateCatalogue(value) {
  if (
    !value ||
    value.version !== catalogueVersion ||
    !Array.isArray(value.records) ||
    value.records.length > 200
  )
    throw Error(
      "Use a version 1 catalogue with no more than 200 intake records.",
    );
  const ids = new Set();
  const records = value.records.map((input) => {
    if (!input || typeof input !== "object")
      throw Error("Invalid catalogue record.");
    // Intake files can never assert verified/licensed/approved status.
    if (input.status && input.status !== "unverified")
      throw Error(
        "Imported records cannot claim verified licensing. Submit an unverified intake record.",
      );
    const record = {};
    for (const key of fields) {
      const text = input[key] ?? "";
      if (
        typeof text !== "string" ||
        text.length > (key === "notes" ? 2000 : 500) ||
        /[\u0000-\u001f]/.test(text)
      )
        throw Error(`Invalid ${key}.`);
      record[key] = text.trim();
    }
    for (const key of ["id", "team", "season", "variant"])
      if (!record[key]) throw Error(`Missing ${key}.`);
    if (ids.has(record.id)) throw Error("Duplicate catalogue record ID.");
    ids.add(record.id);
    if (record.sourceUrl) {
      let url;
      try {
        url = new URL(record.sourceUrl);
      } catch {
        throw Error("Source must be an HTTPS URL.");
      }
      if (url.protocol !== "https:" || url.username || url.password)
        throw Error("Source must be an HTTPS URL without credentials.");
    }
    for (const key of ["validFrom", "validUntil"])
      if (record[key] && !validDate(record[key]))
        throw Error(`Invalid ${key} date.`);
    if (
      record.validFrom &&
      record.validUntil &&
      record.validFrom > record.validUntil
    )
      throw Error("Rights expiry precedes start date.");
    return { ...record, status: "unverified" };
  });
  return { version: catalogueVersion, records };
}
export function reviewIssues(
  record,
  today = new Date().toISOString().slice(0, 10),
) {
  const issues = [
    "Authorized rights review required; this record is not permission to use an official kit.",
  ];
  for (const [key, label] of [
    ["supplier", "supplier"],
    ["rightsHolder", "rights holder"],
    ["sourceUrl", "source"],
    ["evidenceReference", "agreement/evidence reference"],
    ["territories", "territory scope"],
    ["permittedUses", "permitted uses"],
    ["validFrom", "start date"],
    ["validUntil", "expiry date"],
  ])
    if (!record[key]) issues.push(`Missing ${label}.`);
  if (record.validFrom && record.validFrom > today)
    issues.push("Declared rights period has not started.");
  if (record.validUntil && record.validUntil < today)
    issues.push("Declared rights period has expired.");
  return issues;
}
