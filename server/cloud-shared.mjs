import { defaults, validateProject, quality, contrastRatio } from "./core.mjs";
export const MEDIA = "clear-take-media",
  EXPORTS = "clear-take-exports";
export const types = {
  ".jpg": ["image", "image/jpeg"],
  ".jpeg": ["image", "image/jpeg"],
  ".png": ["image", "image/png"],
  ".webp": ["image", "image/webp"],
  ".mp4": ["video", "video/mp4"],
  ".mov": ["video", "video/quicktime"],
  ".webm": ["video", "video/webm"],
  ".mp3": ["audio", "audio/mpeg"],
  ".wav": ["audio", "audio/wav"],
  ".m4a": ["audio", "audio/mp4"],
};
export function brandSettings(input) {
  const b = { ...defaults, ...input };
  if (typeof b.name !== "string" || !b.name.trim() || b.name.length > 40)
    throw Error("Brand name must be 1–40 characters.");
  for (const c of ["background", "foreground", "accent"])
    if (typeof b[c] !== "string" || !/^#[0-9a-f]{6}$/i.test(b[c]))
      throw Error("Invalid brand colour.");
  if (
    !Number.isInteger(b.fontSize) ||
    b.fontSize < 40 ||
    b.fontSize > 80 ||
    !Number.isFinite(b.pace) ||
    b.pace < 0.7 ||
    b.pace > 1.6
  )
    throw Error("Invalid brand size or pace.");
  return Object.fromEntries(Object.keys(defaults).map((k) => [k, b[k]]));
}
export const projectView = (p) => ({
  id: p.id,
  title: p.title,
  script: p.script,
  theme: p.theme,
  format: p.format,
  scenes: p.scenes,
  sources: p.sources,
  factsConfirmed: p.facts_confirmed,
  audioId: p.audio_id,
  createdAt: p.created_at,
  updatedAt: p.updated_at,
});
export const feedbackView = (f) => ({
  id: f.id,
  generationId: f.generation_id,
  kind: f.kind,
  note: f.note,
  createdAt: f.created_at,
  change:
    f.kind === "slower"
      ? "New drafts will use longer reading times."
      : f.kind === "larger"
        ? "Future renders will start with larger text."
        : "Current defaults confirmed.",
});
export function generationView(g, url) {
  return {
    id: g.id,
    projectId: g.project_id,
    title: g.request.title,
    status: g.status,
    progress: g.progress,
    version: g.version,
    createdAt: g.created_at,
    format: g.request.format,
    brand: g.request.brand,
    checks: g.checks,
    changes: g.adjustments,
    layout: g.layout,
    error: g.error_message,
    url,
    size: Number(g.size_bytes || 0),
    duration: (g.request.scenes || []).reduce((sum, s) => sum + s.duration, 0),
  };
}
export function safeObjectPath(owner, p) {
  return (
    typeof p === "string" &&
    p.startsWith(owner + "/") &&
    !p.includes("..") &&
    !p.includes("\\") &&
    !p.includes("%") &&
    p.length < 1024
  );
}
export function validateRender(snapshot, owner, assets) {
  validateProject(snapshot);
  if (snapshot.factsConfirmed !== true) throw Error("Factual review required.");
  const brand = brandSettings(snapshot.brand);
  const ids = new Map(assets.map((a) => [a.id, a]));
  for (const s of snapshot.scenes) {
    if (!s.assetId) continue;
    const a = ids.get(s.assetId);
    if (
      !a ||
      a.owner_id !== owner ||
      a.kind === "audio" ||
      !safeObjectPath(owner, a.object_path)
    )
      throw Error("Visual asset is not owned by this user.");
  }
  if (snapshot.audioId) {
    const a = ids.get(snapshot.audioId);
    if (
      !a ||
      a.owner_id !== owner ||
      a.kind !== "audio" ||
      !safeObjectPath(owner, a.object_path)
    )
      throw Error("Audio asset is not owned by this user.");
  }
  const q = quality(snapshot.scenes);
  q.checks.push({
    label: "Brand contrast",
    passed: contrastRatio(brand.background, brand.foreground) >= 4.5,
    detail: "Brand-background contrast; review uploaded imagery separately.",
  });
  return { ...q, brand };
}
export function dbResult(r) {
  if (r.error) {
    const e = Error("The database request failed.");
    e.dbCode = r.error.code;
    throw e;
  }
  return r.data;
}
