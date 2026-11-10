import { useState } from "react";
import {
  emptyCatalogue,
  validateCatalogue,
  reviewIssues,
} from "./kit-catalogue.mjs";
const labels = {
  team: "Club / national team",
  competition: "Competition",
  season: "Season / edition",
  variant: "Kit variant",
  supplier: "Supplier",
  rightsHolder: "Rights holder",
  sourceUrl: "Source HTTPS URL",
  evidenceReference: "Agreement / evidence reference",
  territories: "Territories declared by supplier",
  permittedUses: "Uses declared by supplier",
  validFrom: "Declared start date",
  validUntil: "Declared expiry date",
  notes: "Review notes",
};
export default function KitCatalogue() {
  const [catalogue, setCatalogue] = useState(emptyCatalogue),
    [draft, setDraft] = useState({}),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  function add(e) {
    e.preventDefault();
    try {
      setCatalogue(
        validateCatalogue({
          ...catalogue,
          records: [
            ...catalogue.records,
            { ...draft, id: crypto.randomUUID() },
          ],
        }),
      );
      setDraft({});
      setError("");
      setNotice(
        "Unverified intake record added. Export your register to keep it.",
      );
    } catch (e) {
      setError(e.message);
    }
  }
  async function open(file) {
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024)
        throw Error("Catalogue JSON must be no larger than 2 MB.");
      const data = validateCatalogue(JSON.parse(await file.text()));
      if (
        catalogue.records.length &&
        !window.confirm(
          "Replace the current intake register? Export it first to keep a copy.",
        )
      )
        return;
      setCatalogue(data);
      setError("");
      setNotice("Intake register imported. All records remain unverified.");
    } catch (e) {
      setError(e.message);
    }
  }
  function download() {
    const blob = new Blob([JSON.stringify(catalogue, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "official-kit-intake.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(
      "Intake register exported. It contains metadata only, not licensed assets.",
    );
  }
  return (
    <details className="football-presets">
      <summary>Official kit catalogue · rights intake</summary>
      <h3>Official kit rights register</h3>
      <strong>0 verified official assets available</strong>
      <p>
        This is a local intake register, not a licensed kit library. Supplier
        declarations are unverified. No record here unlocks dressing, download
        or publication of an official kit.
      </p>
      <p>
        Session-only: export to keep your work before leaving this studio. No
        agreements or assets are uploaded. Enter an evidence reference, not
        confidential contract text or credentials.
      </p>
      <label className="field">
        Import kit intake JSON
        <input
          type="file"
          accept=".json,application/json"
          onChange={(e) => {
            open(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      <button type="button" onClick={download}>
        Export kit intake register
      </button>
      <form onSubmit={add}>
        {Object.entries(labels).map(([key, label]) => (
          <label className="field" key={key}>
            {label}
            <input
              type={
                key === "validFrom" || key === "validUntil" ? "date" : "text"
              }
              value={draft[key] || ""}
              maxLength={key === "notes" ? 2000 : 500}
              required={["team", "season", "variant"].includes(key)}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
            />
          </label>
        ))}
        <button type="submit" disabled={catalogue.records.length >= 200}>
          Add unverified kit record
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <label className="field">
        Search kit intake
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <p>
        {catalogue.records.length} intake records · no licensed coverage claimed
      </p>
      {catalogue.records
        .filter((r) =>
          [r.team, r.competition, r.season, r.variant, r.supplier]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .map((r) => (
          <article key={r.id}>
            <h4>
              {r.team} · {r.season} · {r.variant}
            </h4>
            <strong>Unverified — official use blocked</strong>
            <dl>
              {Object.entries(labels)
                .filter(([key]) => r[key])
                .map(([key, label]) => (
                  <div key={key}>
                    <dt>{label}</dt>
                    <dd>{r[key]}</dd>
                  </div>
                ))}
            </dl>
            <ul>
              {reviewIssues(r).map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Remove this intake record?"))
                  setCatalogue({
                    ...catalogue,
                    records: catalogue.records.filter((x) => x.id !== r.id),
                  });
              }}
            >
              Remove {r.team} record
            </button>
          </article>
        ))}
    </details>
  );
}
