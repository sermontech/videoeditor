import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
const baseEnv = {
  ...process.env,
  CREATOR_MODE: "cloud",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  CREATOR_ALLOWED_ORIGINS: "https://studio.example.com",
  PORT: "3188",
};
const launch = (file, env) =>
  spawn(process.execPath, ["--import", "./tests/app/mock-supabase.mjs", file], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
async function waitFor(child, text, ms = 30000) {
  return new Promise((resolve, reject) => {
    let out = "";
    const timer = setTimeout(() => reject(Error("Timed out: " + out)), ms);
    child.stdout.on("data", (d) => {
      out += d;
      if (out.includes(text)) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.stderr.on("data", (d) => (out += d));
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(Error("Process exited " + code + ": " + out));
    });
  });
}
async function stop(child) {
  if (child.exitCode !== null) return;
  const p = new Promise((r) => child.once("close", r));
  child.kill("SIGTERM");
  await p;
}
const api = launch("server/index.mjs", baseEnv);
let worker;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clear-take-cloud-"));
try {
  await waitFor(api, "authenticated API listening");
  const base = "http://127.0.0.1:3188";
  assert.equal((await fetch(base + "/healthz")).status, 200);
  assert.equal((await fetch(base + "/api/state")).status, 401);
  assert.equal(
    (
      await fetch(base + "/api/state", {
        headers: { Authorization: "Bearer forged-admin-token" },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await fetch(base + "/api/state", {
        headers: { Authorization: "Bearer valid-nonmember" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + "/api/state", {
        headers: {
          Authorization: "Bearer valid-member",
          Origin: "https://evil.example.com",
        },
      })
    ).status,
    403,
  );
  const r = await fetch(base + "/api/state", {
    headers: {
      Authorization: "Bearer valid-member",
      Origin: "https://studio.example.com",
    },
  });
  assert.equal(r.status, 200);
  assert.equal(
    r.headers.get("Access-Control-Allow-Origin"),
    "https://studio.example.com",
  );
  assert.equal((await r.json()).mode, "cloud");
  assert.equal((await fetch(base + "/media/private.mp4")).status, 404);
  worker = launch("server/worker.mjs", {
    ...baseEnv,
    SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test_worker",
    MOCK_WORKER: "1",
    MOCK_TRACE: path.join(dir, "trace"),
  });
  await waitFor(worker, "Completed job", 120000);
  const trace = fs
    .readFileSync(path.join(dir, "trace"), "utf8")
    .trim()
    .split("\n")
    .map(JSON.parse);
  assert.ok(trace.some((r) => r.realMp4Bytes > 1000));
  assert.ok(
    trace.some(
      (r) => r.status === "complete" && r.output_path && r.layout?.[0]?.fitted,
    ),
  );
  console.log(
    "PASS: cloud API token/membership/origin enforcement; owner-filtered queries; separate worker credentials; real MP4 through a simulated durable queue and storage provider.",
  );
} finally {
  await stop(api);
  if (worker) await stop(worker);
  fs.rmSync(dir, { recursive: true, force: true });
}
