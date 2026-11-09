import { createClient } from "@supabase/supabase-js";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { openAsBlob } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cloudConfig } from "./cloud-config.mjs";
import {
  MEDIA,
  EXPORTS,
  types,
  validateRender,
  dbResult,
} from "./cloud-shared.mjs";
const config = cloudConfig(process.env, true);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const db = createClient(config.url, config.key, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (url, init) =>
      fetch(url, { ...init, signal: AbortSignal.timeout(90000) }),
  },
});
let stopping = false,
  child = null;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
function stopChild(target = child) {
  if (!target?.pid) return;
  try {
    process.kill(-target.pid, "SIGTERM");
  } catch {
    target.kill("SIGTERM");
  }
}
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    stopping = true;
    stopChild();
  });
async function processJob(g, token) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "clear-take-job-"));
  let jobChild = null;
  let alive = true,
    heartbeatBusy = false,
    uploaded = null,
    committed = false;
  const update = async (values) => {
    const r = await db
      .from("clear_take_generations")
      .update(values)
      .eq("id", g.id)
      .eq("worker_token", token)
      .eq("status", "rendering")
      .select("id");
    dbResult(r);
    if (!r.data.length) throw Error("Render lease lost");
  };
  const heart = async () => {
    if (heartbeatBusy || !alive) return;
    heartbeatBusy = true;
    try {
      await update({
        lease_until: new Date(Date.now() + 120000).toISOString(),
      });
    } catch {
      if (alive) {
        alive = false;
        stopChild(jobChild);
      }
    } finally {
      heartbeatBusy = false;
    }
  };
  const timer = setInterval(heart, 20000);
  try {
    const member = dbResult(
      await db
        .from("clear_take_members")
        .select("enabled")
        .eq("owner_id", g.owner_id)
        .maybeSingle(),
    );
    if (!member?.enabled) throw Error("Membership is not active");
    const request = g.request;
    const ids = [
      ...new Set(
        [
          ...(request.scenes || []).map((s) => s.assetId),
          request.audioId,
        ].filter(Boolean),
      ),
    ];
    const assets = ids.length
      ? dbResult(
          await db
            .from("clear_take_assets")
            .select("*")
            .eq("owner_id", g.owner_id)
            .in("id", ids),
        )
      : [];
    const q = validateRender(request, g.owner_id, assets);
    if (
      assets.reduce((s, a) => s + Number(a.size_bytes), 0) >
      500 * 1024 * 1024
    )
      throw Error("Combined media exceeds 500 MB");
    await update({
      checks: q.checks,
      adjustments: q.changes,
      request: { ...request, brand: q.brand, scenes: q.scenes },
    });
    const local = [];
    for (const a of assets) {
      if (stopping || !alive) throw Error("Worker interrupted");
      const ext = path.extname(a.object_path).toLowerCase();
      if (!types[ext] || types[ext][0] !== a.kind)
        throw Error("Unsupported asset");
      const r = await db.storage.from(MEDIA).download(a.object_path);
      if (r.error) throw Error("Media download failed");
      if (
        r.data.size > 100 * 1024 * 1024 ||
        r.data.size !== Number(a.size_bytes)
      )
        throw Error("Invalid media size");
      const filename = a.id + ext;
      await fs.writeFile(
        path.join(dir, filename),
        Buffer.from(await r.data.arrayBuffer()),
      );
      local.push({ id: a.id, filename, kind: a.kind });
    }
    const output = path.join(dir, "export.mp4");
    const job = {
      ...request,
      brand: q.brand,
      scenes: q.scenes,
      assets: local,
      mediaDir: dir,
      workDir: path.join(dir, "frames"),
      output,
    };
    const manifest = path.join(dir, "job.json");
    await fs.writeFile(manifest, JSON.stringify(job));
    let report = [],
      progress = 0,
      buffer = "";
    await new Promise((resolve, reject) => {
      // Deliberately do not pass Supabase keys or other application secrets into the media parser.
      child = spawn(
        process.env.PYTHON || "python3",
        [path.join(root, "server/render.py"), manifest],
        {
          cwd: dir,
          detached: true,
          env: {
            PATH: process.env.PATH,
            PYTHONPATH:
              process.env.PYTHONPATH || path.join(root, ".tools/python"),
            CREATOR_FONT: process.env.CREATOR_FONT || "",
            LANG: "C.UTF-8",
          },
        },
      );
      jobChild = child;
      const timeout = setTimeout(() => {
        stopChild(jobChild);
        reject(Error("Render exceeded ten minutes"));
      }, 600000);
      child.stdout.on("data", (d) => {
        buffer += d.toString();
        let pos;
        while ((pos = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, pos);
          buffer = buffer.slice(pos + 1);
          try {
            const e = JSON.parse(line);
            if (Number.isFinite(e.progress))
              progress = Math.min(95, e.progress);
            if (e.report) report = e.report;
          } catch {}
        }
      });
      child.stderr.on("data", () => {}); // Do not leak paths or media content into shared logs.
      const monitor = setInterval(() => {
        update({ progress }).catch(() => {
          if (alive) {
            alive = false;
            stopChild(jobChild);
          }
        });
      }, 4000);
      child.on("error", (e) => {
        clearTimeout(timeout);
        clearInterval(monitor);
        reject(e);
      });
      child.on("close", (code) => {
        clearTimeout(timeout);
        clearInterval(monitor);
        child = null;
        code === 0 ? resolve() : reject(Error("Media rendering failed"));
      });
    });
    if (stopping || !alive) throw Error("Worker interrupted");
    const size = (await fs.stat(output)).size;
    if (size > 200 * 1024 * 1024) throw Error("Output exceeds 200 MB");
    const objectPath = `${g.owner_id}/${g.id}/${token}.mp4`;
    const result = await db.storage
      .from(EXPORTS)
      .upload(objectPath, await openAsBlob(output, { type: "video/mp4" }), {
        contentType: "video/mp4",
        upsert: false,
      });
    if (result.error) throw Error("Export upload failed");
    uploaded = objectPath;
    if (!alive || stopping) throw Error("Worker interrupted");
    await update({
      status: "complete",
      progress: 100,
      output_path: objectPath,
      size_bytes: size,
      layout: report,
      error_message: null,
      lease_until: null,
      worker_token: null,
    });
    committed = true;
    console.log("Completed job", g.id);
  } catch (e) {
    console.error("Job failed", g.id, e.message);
    if (alive && !stopping) {
      try {
        await update({
          status: "failed",
          error_message:
            "Render failed. Check your media, text and size limits, then try again.",
          lease_until: null,
          worker_token: null,
        });
      } catch {}
    }
  } finally {
    alive = false;
    clearInterval(timer);
    if (uploaded && !committed)
      await db.storage
        .from(EXPORTS)
        .remove([uploaded])
        .catch(() => {});
    await fs.rm(dir, { recursive: true, force: true });
  }
}
console.log("Clear Take worker started. Waiting for durable jobs.");
while (!stopping) {
  try {
    const token = crypto.randomUUID();
    const jobs = dbResult(await db.rpc("clear_take_claim", { p_token: token }));
    if (jobs.length) await processJob(jobs[0], token);
    else await pause(3000);
  } catch {
    console.error("Queue unavailable; retrying in 10 seconds.");
    await pause(10000);
  }
}
