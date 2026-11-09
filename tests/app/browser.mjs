// Production-build end-to-end check in an isolated, disposable workspace.
import { chromium, expect } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "clear-take-test-"));
const port = 3187;
const server = spawn(process.execPath, ["server/index.mjs"], {
  env: { ...process.env, PORT: String(port), CREATOR_DATA_DIR: tmp },
  stdio: ["ignore", "pipe", "pipe"],
});
let browser;
try {
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (d) => {
      if (d.toString().includes("listening")) resolve();
    });
    server.on("error", reject);
    server.on("exit", (code) => reject(Error("API exited " + code)));
    setTimeout(() => reject(Error("API startup timeout")), 10000).unref();
  });
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = "http://127.0.0.1:" + port;
  await page.goto(base);
  await expect(
    page.getByRole("heading", { name: "Good stories start here." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.getByLabel("Project name").fill("Studio end-to-end test");
  await page
    .getByLabel("Your script")
    .fill(
      "Start with one clear idea. Give it the context it deserves. Make every take your own.",
    );
  await page.getByRole("button", { name: "Create storyboard" }).click();
  await expect(page.getByText("LIVE STORYBOARD")).toBeVisible();
  await page
    .getByLabel("On-screen story")
    .fill(
      "Start with one clear idea and give your audience enough time to read every word.",
    );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Project saved.", { exact: true })).toBeVisible();
  const st = await (await fetch(base + "/api/state")).json();
  const p = st.projects[0];
  expect(p.scenes.length).toBe(3);
  expect(p.scenes[0].body).toContain("enough time");
  const blocked = await fetch(base + "/api/projects/" + p.id + "/render", {
    method: "POST",
  });
  expect(blocked.status).toBe(400);
  await page
    .getByRole("button", { name: "Generate video", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Generate MP4" }),
  ).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Generate MP4" }).click();
  await expect(page.getByRole("link", { name: "Download MP4" })).toBeVisible({
    timeout: 120000,
  });
  const state = await (await fetch(base + "/api/state")).json();
  const gen = state.generations[0];
  expect(gen.status).toBe("complete");
  expect(gen.changes.length).toBeGreaterThan(0);
  expect(gen.layout.every((s) => s.fitted)).toBe(true);
  const video = await fetch(base + gen.url);
  expect(video.ok).toBe(true);
  expect((await video.arrayBuffer()).byteLength).toBeGreaterThan(2000);
  await page.getByRole("button", { name: "Review this take" }).click();
  await page.getByText("Make the text easier to read", { exact: true }).click();
  await page.getByRole("button", { name: "Save review" }).click();
  await expect(
    page.getByRole("button", { name: "Reviewed", exact: true }),
  ).toBeVisible();
  const after = await (await fetch(base + "/api/state")).json();
  expect(after.brand.fontSize).toBe(60);
  expect(after.feedback.length).toBe(1);
  await page
    .getByRole("button", { name: "Improvement lab", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Make. Learn. Make it yours." }),
  ).toBeVisible();
  await expect(
    page.getByText("Future renders will start with larger text.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Brand kit", exact: true }).click();
  await page.getByLabel("Brand name").fill("Test Studio");
  await page.getByRole("button", { name: "Save brand kit" }).click();
  await expect(
    page.getByText("Brand kit saved. Your next render will use it."),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Brand kit", exact: true }).click();
  await expect(page.getByLabel("Brand name")).toHaveValue("Test Studio");

  // Exercise real uploads, moving video backgrounds, optional audio and both alternate formats.
  const fixtures = path.join(tmp, "fixtures");
  fs.mkdirSync(fixtures);
  const py = spawnSync(
    process.env.PYTHON || (process.platform === "win32" ? "python" : "python3"),
    [
      "-c",
      `from PIL import Image
import imageio_ffmpeg,subprocess,sys,pathlib
p=pathlib.Path(sys.argv[1]);Image.new('RGB',(320,240),'#3b796d').save(p/'image.png');ff=imageio_ffmpeg.get_ffmpeg_exe()
subprocess.run([ff,'-v','error','-y','-f','lavfi','-i','testsrc2=size=320x240:rate=30','-t','1','-c:v','libx264',str(p/'clip.mp4')],check=True)
subprocess.run([ff,'-v','error','-y','-f','lavfi','-i','sine=frequency=220:duration=1',str(p/'audio.wav')],check=True)`,
      fixtures,
    ],
    { env: { ...process.env, PYTHONPATH: path.resolve(".tools/python") } },
  );
  expect(py.status).toBe(0);
  await page
    .getByRole("button", { name: "Media library", exact: true })
    .click();
  await page
    .locator("input[type=file]")
    .setInputFiles(
      ["image.png", "clip.mp4", "audio.wav"].map((n) => path.join(fixtures, n)),
    );
  await expect(
    page.getByText("Files added to your media library.", { exact: true }),
  ).toBeVisible();
  const mediaState = await (await fetch(base + "/api/state")).json();
  expect(mediaState.assets.length).toBe(3);
  for (const format of ["landscape", "square"]) {
    const scenes = [
      {
        ...p.scenes[0],
        body: "An uploaded image.",
        duration: 3,
        assetId: mediaState.assets.find((a) => a.kind === "image").id,
      },
      {
        ...p.scenes[1],
        body: "A moving video.",
        duration: 3,
        assetId: mediaState.assets.find((a) => a.kind === "video").id,
      },
    ];
    const edit = await fetch(base + "/api/projects/" + p.id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenes,
        format,
        audioId: mediaState.assets.find((a) => a.kind === "audio").id,
        factsConfirmed: true,
      }),
    });
    expect(edit.ok).toBe(true);
    const render = await fetch(base + "/api/projects/" + p.id + "/render", {
      method: "POST",
    });
    expect(render.status).toBe(202);
    const generation = await render.json();
    await expect
      .poll(
        async () => {
          const d = await (await fetch(base + "/api/state")).json();
          return d.generations.find((g) => g.id === generation.id).status;
        },
        { timeout: 120000, intervals: [1000] },
      )
      .toBe("complete");
  }
  const invalid = await fetch(base + "/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "", script: "This is invalid." }),
  });
  expect(invalid.status).toBe(400);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  console.log(
    "PASS: browser CRUD, persistence, review gate, actual MP4 render/download, automatic reading-time adjustment, layout checks, feedback defaults, image/video/audio uploads, all three output formats, validation and mobile overflow.",
  );
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (server.exitCode === null) {
    const closed = new Promise((r) => server.once("close", r));
    server.kill("SIGTERM");
    await closed;
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}
