import { useState } from "react";
import { apiBase, authHeaders } from "./session";
const checks = [
  "Match scores, dates, stage and team names checked against primary reports",
  "Facts distinguished from opinion and predictions",
  "Audio license, creator attribution and commercial use reviewed",
  "Presenter/avatar and footage rights reviewed",
  "Pronunciation, captions, audio levels and final playback reviewed",
];
export default function ResearchStudio() {
  const [kind, setKind] = useState("facts"),
    [query, setQuery] = useState(""),
    [data, setData] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState([]),
    [notes, setNotes] = useState(""),
    [checked, setChecked] = useState({});
  async function search(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setData(null);
    try {
      const r = await fetch(
        `${apiBase}/api/discovery/${kind}?q=${encodeURIComponent(query)}`,
        { headers: await authHeaders(), signal: AbortSignal.timeout(16000) },
      );
      const result = await r.json();
      if (!r.ok) throw Error(result.error || "Search failed.");
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function save(item) {
    const key = item.url;
    if (saved.some((x) => x.url === key)) return;
    setSaved([
      ...saved,
      { ...item, kind: data.kind, retrievedAt: data.retrievedAt },
    ]);
  }
  function exportPack() {
    const text = JSON.stringify(
      {
        version: 1,
        createdAt: new Date().toISOString(),
        sources: saved,
        editorNotes: notes,
        reviewChecklist: checks.map((label, i) => ({
          label,
          reviewerChecked: !!checked[i],
        })),
        warning:
          "Research pack, not independently verified facts or license clearance.",
      },
      null,
      2,
    );
    const url = URL.createObjectURL(
      new Blob([text], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "clear-take-research-pack.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section
      className="football-presets"
      style={{ maxWidth: 1000, margin: "24px auto", padding: 24 }}
    >
      <h2>Research & reusable audio</h2>
      <p>
        Search Wikipedia for background facts or Wikimedia Commons for audio
        with declared CC0 / CC BY licenses. These are not live scores, automatic
        fact checks or legal clearance. Queries are sent to the selected
        provider via your backend.
      </p>
      <form onSubmit={search}>
        <label className="field">
          Discovery type
          <select
            value={kind}
            disabled={busy}
            onChange={(e) => {
              setKind(e.target.value);
              setData(null);
            }}
          >
            <option value="facts">Factual background</option>
            <option value="audio">Music & sound effects</option>
          </select>
        </label>
        <label className="field">
          Research query
          <input
            required
            minLength={3}
            maxLength={180}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Champions League 2025–26 or stadium ambience"
          />
        </label>
        <button disabled={busy} type="submit">
          {busy ? "Searching…" : "Search sources"}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <p>
            {data.results.length} results · retrieved {data.retrievedAt}
          </p>
          {!data.results.length && (
            <p>
              No matching results passed the filters. Try another query; no
              unrestricted-use claim is implied.
            </p>
          )}
          {data.results.map((item) => (
            <article
              key={item.id}
              style={{ padding: 16, borderBottom: "1px solid #aaa" }}
            >
              <h3>{item.title}</h3>
              <p>{item.summary || item.attribution}</p>
              <p>{item.warning}</p>
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                Review source page
              </a>
              {item.licenseUrl && (
                <>
                  {" "}
                  ·{" "}
                  <a
                    href={item.licenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Review license
                  </a>
                  <p>
                    Download manually from the source page after review, then
                    import into Media. No automatic download or audio mixing is
                    provided here.
                  </p>
                </>
              )}
              <button
                type="button"
                disabled={saved.some((x) => x.url === item.url)}
                onClick={() => save(item)}
              >
                Save source to research pack
              </button>
            </article>
          ))}
        </>
      )}
      <h3>Research pack · {saved.length} saved sources</h3>
      <p>
        Session-only: export before leaving. Saved excerpts and credits are not
        a generated script. Verify facts before rewriting them into your
        original analysis.
      </p>
      {saved.map((item) => (
        <p key={item.url}>
          {item.title}{" "}
          <button
            onClick={() => setSaved(saved.filter((x) => x.url !== item.url))}
          >
            Remove saved source: {item.title}
          </button>
        </p>
      ))}
      <label className="field">
        Editorial notes / script outline
        <textarea
          rows={8}
          maxLength={20000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Opening • verified match facts and sources • tactical analysis • uncertainty • conclusion"
        />
      </label>
      <h3>Pre-publication review</h3>
      {checks.map((label, i) => (
        <label key={label} style={{ display: "block", margin: "10px 0" }}>
          <input
            type="checkbox"
            checked={!!checked[i]}
            onChange={(e) => setChecked({ ...checked, [i]: e.target.checked })}
          />{" "}
          {label}
        </label>
      ))}
      <p>
        {checks.filter((_, i) => !checked[i]).length} review items outstanding.
        Checking these boxes records your review, not independent verification.
      </p>
      <button onClick={exportPack}>Export research pack & credits</button>
      <p>
        Never use commercial match commentary, broadcasts or popular music
        merely because it is downloadable. Provider metadata can be wrong;
        separate personality, trademark and other rights may still apply.
      </p>
    </section>
  );
}
