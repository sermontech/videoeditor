import express from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  defaults,
  storyboard,
  validateProject,
  quality,
  contrastRatio,
} from "./core.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = process.env.CREATOR_DATA_DIR
  ? path.resolve(process.env.CREATOR_DATA_DIR)
  : path.join(root, ".creator");
fs.mkdirSync(path.join(data, "media"), { recursive: true });
fs.mkdirSync(path.join(data, "jobs"), { recursive: true });
const stateFile = path.join(data, "state.json");
const makeProject = (title, script, theme = "mint") => ({
  id: crypto.randomUUID(),
  title,
  script,
  theme,
  format: "portrait",
  sources: [],
  factsConfirmed: false,
  scenes: storyboard(script),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  audioId: null,
});
let state = fs.existsSync(stateFile)
  ? JSON.parse(fs.readFileSync(stateFile, "utf8"))
  : {
      brand: defaults,
      projects: [
        makeProject(
          "Make your next take count",
          "A clear point changes everything. Start with the story, not the effects. Give your audience the context they need. Then make one memorable point.",
        ),
        makeProject(
          "Small ideas. Big stories.",
          "You do not need a big idea to tell a good story. Notice something small. Ask a better question. Show us why it matters.",
          "lavender",
        ),
        makeProject(
          "A fresh perspective",
          "Look closer. There is often another side to the story. Take a moment to understand the context before you share your take.",
          "clay",
        ),
      ],
      assets: [],
      generations: [],
      feedback: [],
    };
state.schemaVersion = 1;
const running = new Map();
function terminate(child) {
  if (!child.pid) return;
  try {
    if (process.platform === "win32")
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
      });
    else process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}
for (const g of state.generations)
  if (["queued", "rendering"].includes(g.status)) {
    g.status = "failed";
    g.error = "Server restarted. Please render again.";
  }
const save = () => {
  fs.writeFileSync(stateFile + ".tmp", JSON.stringify(state, null, 2));
  fs.renameSync(stateFile + ".tmp", stateFile);
};
save();
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "300kb" }));
app.use(
  "/media",
  express.static(path.join(data, "media"), {
    setHeaders: (r) => r.setHeader("X-Content-Type-Options", "nosniff"),
  }),
);
app.get("/api/state", (req, res) => res.json(state));
app.post("/api/projects", (req, res) => {
  try {
    const { title, script } = req.body;
    if (
      typeof script !== "string" ||
      script.trim().length < 10 ||
      script.length > 3000
    )
      throw Error("Add a script between 10 and 3,000 characters.");
    const p = makeProject(title, script);
    p.scenes = storyboard(script, state.brand.pace);
    if (
      p.scenes
        .map((s) => s.body)
        .join(" ")
        .split(/\s+/).length <
      script.trim().split(/\s+/).length - 3
    )
      throw Error(
        "This script is too long for 12 scenes. Shorten it and try again.",
      );
    validateProject(p);
    state.projects.unshift(p);
    save();
    res.status(201).json(p);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.put("/api/projects/:id", (req, res) => {
  try {
    const i = state.projects.findIndex((p) => p.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: "Project not found." });
    const current = state.projects[i];
    const p = {
      ...current,
      ...Object.fromEntries(
        ["title", "scenes", "format", "sources", "factsConfirmed", "audioId"]
          .filter((k) => k in req.body)
          .map((k) => [k, req.body[k]]),
      ),
      updatedAt: new Date().toISOString(),
    };
    validateProject(p);
    for (const s of p.scenes)
      if (
        s.assetId &&
        !state.assets.some((a) => a.id === s.assetId && a.kind !== "audio")
      )
        throw Error("Selected visual is not available.");
    if (
      p.audioId &&
      !state.assets.some((a) => a.id === p.audioId && a.kind === "audio")
    )
      throw Error("Audio is not available.");
    p.factsConfirmed = p.factsConfirmed === true;
    state.projects[i] = p;
    save();
    res.json(p);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.delete("/api/projects/:id", (req, res) => {
  if (
    state.generations.some(
      (g) =>
        g.projectId === req.params.id &&
        ["rendering", "queued"].includes(g.status),
    )
  )
    return res
      .status(409)
      .json({ error: "Wait until the current render finishes." });
  state.projects = state.projects.filter((p) => p.id !== req.params.id);
  save();
  res.json({ ok: true });
});
const extKinds = {
  ".jpg": "image",
  ".jpeg": "image",
  ".png": "image",
  ".webp": "image",
  ".mp4": "video",
  ".mov": "video",
  ".webm": "video",
  ".mp3": "audio",
  ".wav": "audio",
  ".m4a": "audio",
};
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(data, "media"),
    filename: (req, file, cb) =>
      cb(
        null,
        crypto.randomUUID() + path.extname(file.originalname).toLowerCase(),
      ),
  }),
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    cb(
      extKinds[path.extname(file.originalname).toLowerCase()]
        ? null
        : new Error("Use PNG, JPG, WebP, MP4, MOV, WebM, MP3, WAV or M4A."),
      !!extKinds[path.extname(file.originalname).toLowerCase()],
    ),
});
app.post("/api/assets", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Choose a file." });
  const a = {
    id: crypto.randomUUID(),
    name: req.file.originalname.slice(0, 150),
    filename: req.file.filename,
    url: "/media/" + req.file.filename,
    kind: extKinds[path.extname(req.file.filename)],
    size: req.file.size,
    createdAt: new Date().toISOString(),
  };
  state.assets.unshift(a);
  save();
  res.status(201).json(a);
});
app.post("/api/assets/import-workspace", (req, res) => {
  let count = 0;
  for (const folder of ["References", "Raw footages"]) {
    const dir = path.join(root, "AI Video Editor", folder);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const ext = path.extname(name).toLowerCase();
      if (!extKinds[ext] || !fs.lstatSync(full).isFile()) continue;
      const size = fs.statSync(full).size;
      if (size > 100 * 1024 * 1024) continue;
      const origin = folder + "/" + name;
      if (state.assets.some((a) => a.origin === origin && a.size === size))
        continue;
      const filename = crypto.randomUUID() + ext;
      fs.copyFileSync(full, path.join(data, "media", filename));
      state.assets.push({
        id: crypto.randomUUID(),
        name,
        filename,
        url: "/media/" + filename,
        kind: extKinds[ext],
        size,
        origin,
        createdAt: new Date().toISOString(),
      });
      count++;
    }
  }
  save();
  res.json({ count });
});
app.put("/api/brand", (req, res) => {
  try {
    const b = { ...state.brand, ...req.body };
    for (const k of ["background", "foreground", "accent"])
      if (!/^#[0-9a-f]{6}$/i.test(b[k])) throw Error("Choose valid colours.");
    if (typeof b.name !== "string" || b.name.length > 40 || !b.name.trim())
      throw Error("Brand name needs 1–40 characters.");
    if (
      !Number.isFinite(b.fontSize) ||
      b.fontSize < 40 ||
      b.fontSize > 80 ||
      !Number.isFinite(b.pace) ||
      b.pace < 0.7 ||
      b.pace > 1.6
    )
      throw Error("Invalid typography or pace.");
    state.brand = Object.fromEntries(
      Object.keys(defaults).map((k) => [k, b[k]]),
    );
    save();
    res.json(state.brand);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.post("/api/generations/:id/feedback", (req, res) => {
  const g = state.generations.find(
    (g) => g.id === req.params.id && g.status === "complete",
  );
  if (!g)
    return res.status(404).json({ error: "Completed generation not found." });
  const { kind, note = "" } = req.body;
  if (
    !["keep", "slower", "larger"].includes(kind) ||
    typeof note !== "string" ||
    note.length > 500
  )
    return res.status(400).json({ error: "Invalid feedback." });
  if (state.feedback.some((f) => f.generationId === g.id))
    return res
      .status(409)
      .json({ error: "This generation has already been reviewed." });
  if (kind === "slower")
    state.brand.pace = Math.min(1.6, +(state.brand.pace + 0.15).toFixed(2));
  if (kind === "larger")
    state.brand.fontSize = Math.min(80, state.brand.fontSize + 4);
  const f = {
    id: crypto.randomUUID(),
    generationId: g.id,
    kind,
    note,
    createdAt: new Date().toISOString(),
    change:
      kind === "slower"
        ? "New drafts will use longer reading times."
        : kind === "larger"
          ? "Future renders will start with larger text."
          : "Current defaults confirmed.",
  };
  state.feedback.unshift(f);
  save();
  res.json(f);
});
app.post("/api/projects/:id/render", (req, res) => {
  const p = state.projects.find((p) => p.id === req.params.id);
  if (!p) return res.status(404).json({ error: "Project not found." });
  if (state.generations.some((g) => ["queued", "rendering"].includes(g.status)))
    return res
      .status(409)
      .json({ error: "A render is already running. Please wait." });
  if (!p.factsConfirmed)
    return res.status(400).json({
      error: "Review the script and confirm that it is ready to publish.",
    });
  try {
    validateProject(p);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  const q = quality(p.scenes);
  const contrast = contrastRatio(
    state.brand.background,
    state.brand.foreground,
  );
  q.checks.push({
    label: "Brand contrast",
    passed: contrast >= 4.5,
    detail: `${contrast.toFixed(1)}:1 on the brand background. Media backgrounds need visual review.`,
  });
  const id = crypto.randomUUID();
  const g = {
    id,
    projectId: p.id,
    title: p.title,
    status: "rendering",
    progress: 0,
    createdAt: new Date().toISOString(),
    checks: q.checks,
    changes: q.changes,
    format: p.format,
    version: state.generations.filter((g) => g.projectId === p.id).length + 1,
    brand: { ...state.brand },
    snapshot: {
      scenes: q.scenes,
      sources: p.sources,
      audioId: p.audioId,
      factsConfirmed: true,
    },
    duration: q.scenes.reduce((a, s) => a + s.duration, 0),
  };
  state.generations.unshift(g);
  save();
  const job = {
    ...p,
    scenes: q.scenes,
    brand: state.brand,
    assets: state.assets,
    mediaDir: path.join(data, "media"),
    output: path.join(data, "media", id + ".mp4"),
    workDir: path.join(data, "jobs", id),
  };
  const jobPath = path.join(data, "jobs", id + ".json");
  fs.writeFileSync(jobPath, JSON.stringify(job));
  const child = spawn(
    process.env.PYTHON || (process.platform === "win32" ? "python" : "python3"),
    [path.join(root, "server/render.py"), jobPath],
    {
      cwd: root,
      detached: process.platform !== "win32",
      env: {
        ...process.env,
        PYTHONPATH: [path.join(root, ".tools/python"), process.env.PYTHONPATH]
          .filter(Boolean)
          .join(path.delimiter),
      },
    },
  );
  running.set(id, child);
  let err = "";
  let buffer = "";
  child.stdout.on("data", (d) => {
    buffer += d.toString();
    let end;
    while ((end = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 1);
      try {
        const e = JSON.parse(line);
        if (e.progress !== undefined) {
          g.progress = e.progress;
          save();
        }
        if (e.report) g.layout = e.report;
      } catch {}
    }
  });
  child.stderr.on("data", (d) => {
    err = (err + d).slice(-4000);
  });
  const fail = (msg) => {
    g.status = "failed";
    g.error = msg;
    save();
  };
  child.on("error", () =>
    fail("Python could not start. Check the setup instructions."),
  );
  const timer = setTimeout(
    () => {
      terminate(child);
    },
    10 * 60 * 1000,
  );
  child.on("close", (code) => {
    clearTimeout(timer);
    running.delete(id);
    if (code === 0 && fs.existsSync(job.output)) {
      g.status = "complete";
      g.progress = 100;
      g.url = "/media/" + id + ".mp4";
      g.size = fs.statSync(job.output).size;
    } else {
      g.status = "failed";
      g.error =
        "Render failed. Check that media files are valid and Python rendering dependencies are installed.";
      console.error(err);
    }
    save();
  });
  res.status(202).json(g);
});
if (fs.existsSync(path.join(root, "dist"))) {
  app.use(express.static(path.join(root, "dist")));
  app.get("/{*path}", (req, res) =>
    res.sendFile(path.join(root, "dist/index.html")),
  );
}
app.use((err, req, res, next) =>
  res.status(400).json({
    error:
      err.code === "LIMIT_FILE_SIZE"
        ? "File too large. Maximum is 100 MB."
        : err.message || "Request failed.",
  }),
);
const port = Number(process.env.PORT || 3001);
app.listen(port, "0.0.0.0", () =>
  console.log("Creator API listening on " + port),
);

for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    for (const [id, child] of running) {
      terminate(child);
      const g = state.generations.find((g) => g.id === id);
      if (g) {
        g.status = "failed";
        g.error = "Server stopped. Please render again.";
      }
    }
    save();
    process.exit(0);
  });
