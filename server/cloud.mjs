import express from "express";
import multer from "multer";
import { rateLimit } from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { cloudConfig } from "./cloud-config.mjs";
import { defaults, storyboard, validateProject } from "./core.mjs";
import {
  MEDIA,
  EXPORTS,
  types,
  brandSettings,
  projectView,
  feedbackView,
  generationView,
  dbResult,
} from "./cloud-shared.mjs";
const config = cloudConfig(process.env);
const opts = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};
const verifier = createClient(config.url, config.key, opts);
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
  const origin = req.headers.origin;
  if (origin && !config.origins.includes(origin))
    return res.status(403).json({ error: "Origin not allowed." });
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type",
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.get("/healthz", (req, res) =>
  res.json({ ok: true, mode: "cloud", service: "clear-take-api" }),
);
app.use(
  "/api",
  rateLimit({
    windowMs: 60000,
    limit: 180,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many requests. Try again shortly." },
  }),
);
app.use("/api", async (req, res, next) => {
  try {
    const match = /^Bearer (\S+)$/.exec(req.headers.authorization || "");
    if (!match)
      return res.status(401).json({ error: "Sign in to access your studio." });
    const { data, error } = await verifier.auth.getUser(match[1]);
    if (error || !data.user?.email_confirmed_at)
      return res
        .status(401)
        .json({ error: "A confirmed account is required." });
    req.user = data.user;
    req.db = createClient(config.url, config.key, {
      ...opts,
      global: { headers: { Authorization: `Bearer ${match[1]}` } },
    });
    const access = await req.db.rpc("clear_take_can_access");
    if (access.error)
      return res.status(503).json({
        error: "Cloud database setup is incomplete. Contact the studio owner.",
      });
    if (!access.data)
      return res.status(403).json({
        error:
          "Your account is signed in, but has not been invited to Clear Take. Ask the studio owner to enable your membership.",
      });
    next();
  } catch {
    res
      .status(503)
      .json({ error: "Authentication service unavailable. Please try again." });
  }
});
app.use(express.json({ limit: "300kb" }));
const uid = (req) => req.user.id;
const profile = async (req) => {
  dbResult(
    await req.db
      .from("clear_take_profiles")
      .upsert(
        { owner_id: uid(req) },
        { onConflict: "owner_id", ignoreDuplicates: true },
      ),
  );
  return dbResult(
    await req.db
      .from("clear_take_profiles")
      .select("brand")
      .eq("owner_id", uid(req))
      .single(),
  ).brand;
};
const assetsFor = async (req) =>
  dbResult(
    await req.db
      .from("clear_take_assets")
      .select("*")
      .eq("owner_id", uid(req))
      .order("created_at", { ascending: false }),
  );
// Cache short-lived owner-bound URLs to avoid restarting video previews on each progress poll.
const signedCache = new Map();
const signed = async (req, bucket, p, download) => {
  if (!p) return null;
  const key = [uid(req), bucket, p, download || ""].join("|");
  const cached = signedCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.url;
  const r = await req.db.storage
    .from(bucket)
    .createSignedUrl(p, 900, download ? { download } : undefined);
  if (r.error) throw Error("Could not authorize media access.");
  if (signedCache.size >= 1000)
    signedCache.delete(signedCache.keys().next().value);
  signedCache.set(key, { url: r.data.signedUrl, expires: Date.now() + 840000 });
  return r.data.signedUrl;
};
const assetView = async (req, a) => ({
  id: a.id,
  name: a.name,
  kind: a.kind,
  size: Number(a.size_bytes),
  createdAt: a.created_at,
  url: await signed(req, MEDIA, a.object_path),
  downloadUrl: await signed(req, MEDIA, a.object_path, a.name),
});
app.get("/api/state", async (req, res) => {
  const [brand, p, a, g, f] = await Promise.all([
    profile(req),
    req.db
      .from("clear_take_projects")
      .select("*")
      .eq("owner_id", uid(req))
      .order("created_at", { ascending: false }),
    assetsFor(req),
    req.db
      .from("clear_take_generations")
      .select("*")
      .eq("owner_id", uid(req))
      .order("created_at", { ascending: false }),
    req.db
      .from("clear_take_feedback")
      .select("*")
      .eq("owner_id", uid(req))
      .order("created_at", { ascending: false }),
  ]);
  res.json({
    mode: "cloud",
    brand,
    projects: dbResult(p).map(projectView),
    assets: await Promise.all(a.map((x) => assetView(req, x))),
    generations: await Promise.all(
      dbResult(g).map(async (x) => ({
        ...generationView(x, await signed(req, EXPORTS, x.output_path)),
        downloadUrl: await signed(
          req,
          EXPORTS,
          x.output_path,
          "clear-take-" + x.id + ".mp4",
        ),
      })),
    ),
    feedback: dbResult(f).map(feedbackView),
  });
});
app.post("/api/projects", async (req, res) => {
  const { title, script } = req.body;
  if (
    typeof script !== "string" ||
    script.trim().length < 10 ||
    script.length > 3000
  )
    return res
      .status(400)
      .json({ error: "Write a script of 10–3,000 characters." });
  const brand = brandSettings(await profile(req));
  const p = {
    title,
    script,
    format: "portrait",
    sources: [],
    scenes: storyboard(script, brand.pace),
  };
  validateProject(p);
  const r = dbResult(
    await req.db
      .from("clear_take_projects")
      .insert({ ...p, owner_id: uid(req) })
      .select()
      .single(),
  );
  res.status(201).json(projectView(r));
});
app.put("/api/projects/:id", async (req, res) => {
  const found = dbResult(
    await req.db
      .from("clear_take_projects")
      .select("*")
      .eq("id", req.params.id)
      .eq("owner_id", uid(req))
      .maybeSingle(),
  );
  if (!found) return res.status(404).json({ error: "Project not found." });
  const p = {
    ...projectView(found),
    ...Object.fromEntries(
      ["title", "scenes", "format", "sources", "factsConfirmed", "audioId"]
        .filter((k) => k in req.body)
        .map((k) => [k, req.body[k]]),
    ),
  };
  validateProject(p);
  const a = await assetsFor(req);
  for (const s of p.scenes)
    if (s.assetId && !a.some((x) => x.id === s.assetId && x.kind !== "audio"))
      throw Error("Visual asset is not available.");
  if (p.audioId && !a.some((x) => x.id === p.audioId && x.kind === "audio"))
    throw Error("Audio is not available.");
  const r = dbResult(
    await req.db
      .from("clear_take_projects")
      .update({
        title: p.title,
        scenes: p.scenes,
        format: p.format,
        sources: p.sources,
        facts_confirmed: p.factsConfirmed === true,
        audio_id: p.audioId || null,
      })
      .eq("id", p.id)
      .eq("owner_id", uid(req))
      .select()
      .single(),
  );
  res.json(projectView(r));
});
app.delete("/api/projects/:id", async (req, res) => {
  const r = await req.db.rpc("clear_take_delete_project", {
    p_project_id: req.params.id,
  });
  if (r.error)
    return res
      .status(409)
      .json({ error: "Project is missing or has an active render." });
  res.json({ ok: true });
});
app.put("/api/brand", async (req, res) => {
  const b = brandSettings(req.body);
  dbResult(
    await req.db
      .from("clear_take_profiles")
      .upsert({ owner_id: uid(req), brand: b }),
  );
  res.json(b);
});
app.post("/api/projects/:id/render", async (req, res) => {
  const r = await req.db.rpc("clear_take_enqueue", {
    p_project_id: req.params.id,
  });
  if (r.error)
    return res.status(409).json({
      error:
        "Could not queue this project. Confirm factual review, save your brand, and check for active jobs or the 20-per-day render limit.",
    });
  res.status(202).json(generationView(r.data, null));
});
app.post("/api/generations/:id/feedback", async (req, res) => {
  const { kind, note = "" } = req.body;
  if (
    !["keep", "slower", "larger"].includes(kind) ||
    typeof note !== "string" ||
    note.length > 500
  )
    return res.status(400).json({ error: "Invalid feedback." });
  const r = await req.db.rpc("clear_take_feedback_apply", {
    p_generation_id: req.params.id,
    p_kind: kind,
    p_note: note,
  });
  if (r.error)
    return res.status(409).json({
      error:
        "This take is missing, not complete, or has already been reviewed.",
    });
  res.json(feedbackView(r.data));
});
const upload = multer({
  dest: os.tmpdir(),
  limits: { files: 1, fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(
      types[ext] ? null : Error("Unsupported media file."),
      Boolean(types[ext]),
    );
  },
});
app.post("/api/assets", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Choose a file." });
  let objectPath;
  try {
    const file = req.file;
    const ext = path.extname(file.originalname).toLowerCase();
    const [kind, mime] = types[ext];
    objectPath = `${uid(req)}/${crypto.randomUUID()}${ext}`;
    const blob = await fs.openAsBlob(file.path, { type: mime });
    const uploadResult = await req.db.storage
      .from(MEDIA)
      .upload(objectPath, blob, { contentType: mime, upsert: false });
    if (uploadResult.error)
      throw Error(
        "Media upload failed. Check your file size and storage quota.",
      );
    const row = await req.db
      .from("clear_take_assets")
      .insert({
        owner_id: uid(req),
        name: file.originalname.slice(0, 150),
        kind,
        object_path: objectPath,
        size_bytes: file.size,
        mime_type: mime,
      })
      .select()
      .single();
    if (row.error) {
      await req.db.storage.from(MEDIA).remove([objectPath]);
      throw Error("Could not save media metadata.");
    }
    res.status(201).json(await assetView(req, row.data));
  } finally {
    await fsp.rm(req.file.path, { force: true });
  }
});
app.post("/api/assets/import-workspace", (req, res) =>
  res.status(409).json({
    error:
      "Cloud workspaces cannot import Arena/local folders. Upload files from your computer instead.",
  }),
);
app.use((req, res) => res.status(404).json({ error: "Not found." }));
app.use((err, req, res, next) => {
  console.error("API error", err.code || err.dbCode || err.name);
  res.status(err.dbCode ? 503 : 400).json({
    error: err.dbCode
      ? "Database request failed. Please try again."
      : err.code === "LIMIT_FILE_SIZE"
        ? "Maximum upload size is 100 MB."
        : err.message || "Request failed.",
  });
});
app.listen(config.port, "0.0.0.0", () =>
  console.log("Clear Take authenticated API listening on " + config.port),
);
