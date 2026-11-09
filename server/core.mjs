export const defaults = {
  name: "Clear Take",
  background: "#172B2E",
  foreground: "#F6F2E9",
  accent: "#B8E3CC",
  fontSize: 56,
  pace: 1,
};
export function storyboard(script, pace = 1) {
  // Explicit headings take precedence over automatic sentence splitting.
  // Accept plain or Markdown headings and the common dash variants.
  const heading =
    /^\s*(?:#{1,6}\s+)?(?:\*\*)?Scene\s+(\d+)\s*(?:[–—:\-]\s*(.*?))?(?:\*\*)?\s*$/gim;
  const trimmed = script.trim();
  const text =
    trimmed.startsWith("(") && trimmed.endsWith(")")
      ? trimmed.slice(1, -1).trim()
      : trimmed;
  const headings = [...text.matchAll(heading)];
  const pieces = [];
  const titles = [];
  if (headings.length) {
    if (text.slice(0, headings[0].index).trim())
      throw Error("Put all script text under a numbered Scene heading.");
    for (const [i, match] of headings.entries()) {
      if (Number(match[1]) !== i + 1)
        throw Error(
          "Number your scene headings consecutively, starting at Scene 1.",
        );
      const title = (match[2] || `Scene ${i + 1}`).replace(/\*\*$/, "").trim();
      const body = text
        .slice(
          match.index + match[0].length,
          headings[i + 1]?.index ?? text.length,
        )
        .trim();
      if (!body || body.length > 350)
        throw Error(`Scene ${i + 1} needs 1–350 characters of body text.`);
      if (title.length > 60)
        throw Error(`Scene ${i + 1}'s heading must be 60 characters or fewer.`);
      titles.push(title);
      pieces.push(body);
    }
  } else {
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/);
      for (let i = 0; i < words.length; i += 25)
        pieces.push(words.slice(i, i + 25).join(" "));
    }
  }
  if (pieces.length > 12)
    throw Error(
      "This script needs more than 12 scenes. Shorten it and try again.",
    );
  return pieces.map((body, i) => ({
    id: crypto.randomUUID(),
    title:
      titles[i] ??
      (i === 0
        ? "THE HOOK"
        : i === pieces.length - 1
          ? "THE TAKEAWAY"
          : `THE STORY / ${String(i + 1).padStart(2, "0")}`),
    body,
    duration: Math.max(
      4,
      Math.min(15, Math.ceil((body.split(/\s+/).length / 2.5) * pace)),
    ),
    assetId: null,
  }));
}
export function validateProject(p) {
  if (typeof p.title !== "string" || !p.title.trim() || p.title.length > 100)
    throw Error("Give your project a title of 1–100 characters.");
  if (!Array.isArray(p.scenes) || p.scenes.length < 1 || p.scenes.length > 12)
    throw Error("Use 1–12 scenes.");
  for (const s of p.scenes) {
    if (typeof s.body !== "string" || !s.body.trim() || s.body.length > 350)
      throw Error("Each scene needs 1–350 characters.");
    if (typeof s.title !== "string" || s.title.length > 60)
      throw Error("Scene headings must be under 60 characters.");
    if (!Number.isFinite(s.duration) || s.duration < 3 || s.duration > 20)
      throw Error("Scene durations must be between 3 and 20 seconds.");
  }
  if (!["portrait", "landscape", "square"].includes(p.format))
    throw Error("Choose a supported format.");
  if (!Array.isArray(p.sources) || p.sources.length > 10)
    throw Error("Use at most 10 sources.");
  for (const s of p.sources) {
    if (typeof s !== "string" || s.length > 2000 || !/^https?:\/\//.test(s))
      throw Error("Sources must be http or https URLs.");
  }
}
export function quality(scenes) {
  const changes = [];
  const adjusted = scenes.map((s, i) => {
    const min = Math.ceil(s.body.trim().split(/\s+/).length / 2.5);
    const duration = Math.max(s.duration, Math.min(20, min));
    if (duration > s.duration)
      changes.push(
        `Scene ${i + 1}: reading time increased from ${s.duration}s to ${duration}s.`,
      );
    return { ...s, duration };
  });
  return {
    scenes: adjusted,
    changes,
    checks: [
      {
        label: "Reading time",
        passed: adjusted.every(
          (s) => s.body.trim().split(/\s+/).length / s.duration <= 2.5,
        ),
        detail: "At most 2.5 words per second.",
      },
      {
        label: "Text length",
        passed: adjusted.every((s) => s.body.length <= 250),
        detail: "250 characters or fewer per scene recommended.",
      },
      {
        label: "Scene coverage",
        passed: adjusted.every((s) => s.body.trim().length > 0),
        detail: "Every scene has visible content.",
      },
    ],
  };
}

export function contrastRatio(a, b) {
  const lum = (c) => {
    const v = [1, 3, 5]
      .map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
      .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return v[0] * 0.2126 + v[1] * 0.7152 + v[2] * 0.0722;
  };
  const x = lum(a),
    y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
