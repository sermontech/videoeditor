import express from "express";
import { rateLimit } from "express-rate-limit";
export function plain(value, max = 2000) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .slice(0, max);
}
export function queryText(q) {
  if (
    typeof q !== "string" ||
    q.trim().length < 3 ||
    q.length > 180 ||
    /[\u0000-\u001f]/.test(q)
  )
    throw Error("Enter a search query of 3–180 characters.");
  return q.trim();
}
function safeUrl(value, host) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      u.hostname === host
      ? u.href
      : null;
  } catch {
    return null;
  }
}
export function normalizeFacts(data) {
  return Object.values(data.query?.pages || {})
    .filter((p) => p.pageid > 0)
    .map((p) => ({
      id: String(p.pageid),
      title: plain(p.title, 200),
      summary: plain(p.extract),
      url: `https://en.wikipedia.org/?curid=${p.pageid}`,
      provider: "Wikipedia",
      warning:
        "Secondary source; verify scores, dates and claims against primary match reports.",
    }));
}
export function normalizeAudio(data) {
  return Object.values(data.query?.pages || {}).flatMap((p) => {
    const i = p.imageinfo?.[0],
      m = i?.extmetadata;
    if (!i || !m || !i.mime?.startsWith("audio/")) return [];
    const licenseUrl = m.LicenseUrl?.value || "",
      license = plain(m.LicenseShortName?.value, 100);
    // Fail closed: accept only explicit CC0 or CC BY URLs, never BY-SA/NC/ND.
    if (
      !/^https:\/\/creativecommons\.org\/(?:publicdomain\/zero\/1\.0|licenses\/by\/(?:1\.0|2\.0|2\.5|3\.0|4\.0))\/?$/.test(
        licenseUrl,
      )
    )
      return [];
    const url = safeUrl(i.descriptionurl, "commons.wikimedia.org"),
      downloadUrl = safeUrl(i.url, "upload.wikimedia.org");
    if (
      !url ||
      !downloadUrl ||
      !Number.isInteger(i.size) ||
      i.size < 1 ||
      i.size > 30 * 1024 * 1024
    )
      return [];
    const creator = plain(m.Artist?.value, 500);
    if (!creator) return [];
    const title = plain(p.title, 200);
    return [
      {
        id: String(p.pageid),
        title,
        creator,
        license,
        licenseUrl,
        url,
        downloadUrl,
        bytes: i.size,
        mime: i.mime,
        attribution: `${title} — ${creator}. ${license}: ${licenseUrl}. Source: ${url}`,
        warning:
          "Provider metadata is not legal clearance. Review the file page, attribution and other rights before use.",
      },
    ];
  });
}
export async function searchDiscovery(kind, query, fetcher = fetch) {
  const q = queryText(query);
  if (!["facts", "audio"].includes(kind))
    throw Error("Unknown discovery kind.");
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: kind === "audio" ? `${q} filetype:audio` : q,
    gsrnamespace: kind === "audio" ? "6" : "0",
    gsrlimit: "12",
    ...(kind === "audio"
      ? { prop: "imageinfo", iiprop: "url|mime|size|extmetadata" }
      : { prop: "extracts", exintro: "1", explaintext: "1", exchars: "1600" }),
  });
  const url = `https://${kind === "audio" ? "commons.wikimedia.org" : "en.wikipedia.org"}/w/api.php?${params}`;
  const response = await fetcher(url, {
    redirect: "error",
    signal: AbortSignal.timeout(12000),
    headers: {
      "User-Agent": "ClearTake/1.0 (https://github.com/sermontech/videoeditor)",
      Accept: "application/json",
    },
  });
  if (!response.ok)
    throw Error("Provider is unavailable or rate-limited. Try again later.");
  const reader = response.body.getReader();
  let length = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 2 * 1024 * 1024)
        throw Error("Provider response exceeds the safety limit.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (data.error) throw Error("Provider could not complete this search.");
  return {
    kind,
    query: q,
    retrievedAt: new Date().toISOString(),
    results: kind === "audio" ? normalizeAudio(data) : normalizeFacts(data),
  };
}
export function discoveryRouter() {
  const router = express.Router();
  router.use(
    rateLimit({
      windowMs: 60000,
      limit: 15,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Discovery limit reached. Wait a minute." },
    }),
  );
  router.get("/:kind", async (req, res) => {
    try {
      queryText(req.query.q);
      if (!["facts", "audio"].includes(req.params.kind))
        return res.status(400).json({ error: "Unknown discovery kind." });
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    try {
      res.setHeader("Cache-Control", "no-store");
      res.json(await searchDiscovery(req.params.kind, req.query.q));
    } catch {
      res.status(502).json({
        error:
          "Research provider unavailable. Check backend internet access or try again later. No results have been invented.",
      });
    }
  });
  return router;
}
