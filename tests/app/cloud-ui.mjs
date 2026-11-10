import { avatarFixture } from "./avatar-fixture.mjs";
// Isolated frontend session test with mocked Supabase and API endpoints. No real account is created.
import { chromium, expect } from "@playwright/test";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { defaults } from "../../server/core.mjs";
const build = spawnSync(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "build", "--outDir", ".tools/cloud-ui"],
  {
    env: {
      ...process.env,
      VITE_CREATOR_MODE: "cloud",
      VITE_API_URL: "https://api.example.com",
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    },
    stdio: "inherit",
  },
);
if (build.status !== 0) process.exit(1);
const root = path.resolve(".tools/cloud-ui");
const server = http.createServer((req, res) => {
  const file = path.join(root, req.url === "/" ? "index.html" : req.url);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader(
    "Content-Type",
    file.endsWith(".js")
      ? "application/javascript"
      : file.endsWith(".css")
        ? "text/css"
        : "text/html",
  );
  res.end(fs.readFileSync(file));
});
await new Promise((r) => server.listen(3189, "127.0.0.1", r));
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const user = {
    id: crypto.randomUUID(),
    email: "creator@example.com",
    role: "authenticated",
    aud: "authenticated",
    email_confirmed_at: new Date().toISOString(),
  };
  const token = [
    "eyJhbGciOiJIUzI1NiJ9",
    Buffer.from(
      JSON.stringify({
        sub: user.id,
        exp: Math.floor(Date.now() / 1000) + 3600,
        role: "authenticated",
      }),
    ).toString("base64url"),
    "dGVzdA",
  ].join(".");
  await page.route("https://example.supabase.co/**", async (route) => {
    if (route.request().url().includes("/token"))
      return route.fulfill({
        json: {
          access_token: token,
          refresh_token: "test-refresh",
          expires_in: 3600,
          token_type: "bearer",
          user,
        },
      });
    if (route.request().url().includes("/logout"))
      return route.fulfill({ status: 204 });
    return route.fulfill({ json: user });
  });
  await page.route("https://api.example.com/**", async (route) => {
    expect(route.request().headers().authorization).toBe("Bearer " + token);
    if (route.request().url().includes("/api/discovery/"))
      return route.fulfill({
        json: {
          kind: "facts",
          query: "Champions League",
          retrievedAt: "2026-11-09T00:00:00Z",
          results: [
            {
              id: "1",
              title: "Test Champions League source",
              summary: "Synthetic test excerpt, not match reporting.",
              url: "https://en.wikipedia.org/?curid=1",
              warning: "Verify against primary reports.",
            },
          ],
        },
      });

    return route.fulfill({
      json: {
        mode: "cloud",
        brand: defaults,
        projects: [],
        assets: [],
        generations: [],
        feedback: [],
      },
    });
  });
  await page.goto("http://127.0.0.1:3189");
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await page.getByLabel("Email address").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill("test-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Good stories start here." }),
  ).toBeVisible();
  await expect(
    page.getByText("Private cloud workspace", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Good stories start here." }),
  ).toBeVisible();
  await page.screenshot({ path: ".tools/cloud-ui/signed-in.png" });
  await page
    .getByRole("button", { name: "Research & audio", exact: true })
    .click();
  await page
    .getByLabel("Research query", { exact: true })
    .fill("Champions League");
  await page
    .getByRole("button", { name: "Search sources", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Test Champions League source",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save source to research pack", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Research pack · 1 saved sources",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Editorial notes / script outline", { exact: true })
    .fill("Verify match scores before analysis.");
  const packDownload = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Export research pack & credits",
      exact: true,
    })
    .click();
  await (await packDownload).saveAs(".tools/cloud-ui/research-pack.json");

  await page.getByRole("button", { name: "3D studio", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "3D character studio", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".three-viewport canvas")).toBeVisible();
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Play animation", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Import GLB / VRM model").setInputFiles({
    name: "invalid.glb",
    mimeType: "model/gltf-binary",
    buffer: Buffer.from("invalid"),
  });
  await expect(page.getByRole("alert")).toContainText("Invalid GLB");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download preview PNG" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("clear-take-3d-preview.png");
  const sceneDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Save scene file", exact: true })
    .click();
  const savedScene = await sceneDownload;
  await savedScene.saveAs(".tools/cloud-ui/scene.json");
  await page.getByLabel("Environment colour").fill("#ff0000");
  await page
    .getByLabel("Open scene file")
    .setInputFiles(".tools/cloud-ui/scene.json");
  await expect(page.getByLabel("Environment colour")).toHaveValue("#172b2e");
  await page
    .getByLabel("Content mode", { exact: true })
    .selectOption("football");
  await expect(
    page.getByRole("heading", { name: "Football environments", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Preset category", { exact: true })
    .selectOption("Stadium");
  await page
    .getByLabel("Search football presets", { exact: true })
    .fill("tunnel");
  await page.getByRole("button", { name: /Player walkout tunnel/ }).click();
  await expect(
    page.getByRole("button", { name: /Player walkout tunnel/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Primary team colour", { exact: true }).fill("#bb2244");
  await page.getByLabel("Pulse accent lights where present").check();
  await page
    .getByText("Official kit catalogue · rights intake", { exact: true })
    .click();
  const intake = page.locator("details").filter({
    has: page.getByRole("heading", {
      name: "Official kit rights register",
      exact: true,
    }),
  });
  await intake
    .getByLabel("Club / national team", { exact: true })
    .fill("Test club");
  await intake.getByLabel("Season / edition", { exact: true }).fill("2026/27");
  await intake.getByLabel("Kit variant", { exact: true }).fill("Home");
  await intake
    .getByRole("button", { name: "Add unverified kit record", exact: true })
    .click();
  await expect(
    intake.getByText("Unverified — official use blocked", { exact: true }),
  ).toBeVisible();
  await expect(
    intake.getByText("0 verified official assets available", { exact: true }),
  ).toBeVisible();
  const intakeDownload = page.waitForEvent("download");
  await intake
    .getByRole("button", { name: "Export kit intake register", exact: true })
    .click();
  await (await intakeDownload).saveAs(".tools/cloud-ui/kit-intake.json");
  await intake
    .getByLabel("Import kit intake JSON", { exact: true })
    .setInputFiles({
      name: "forged.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          version: 1,
          records: [
            {
              id: "forged",
              team: "Test",
              season: "2026",
              variant: "Home",
              status: "verified",
            },
          ],
        }),
      ),
    });
  await expect(intake.getByRole("alert")).toContainText(
    "cannot claim verified licensing",
  );
  await page
    .getByText("Official kit catalogue · rights intake", { exact: true })
    .click();
  await page.getByLabel("Apply football kit", { exact: true }).check();
  await page
    .getByLabel("Jersey pattern", { exact: true })
    .selectOption("stripes");
  await page.getByLabel("Player name", { exact: true }).fill("CLEAR TAKE");
  await page.getByLabel("Player number", { exact: true }).fill("9");
  await page.getByLabel("Shorts colour", { exact: true }).fill("#172b2e");
  await page
    .getByLabel("Demo motion", { exact: true })
    .selectOption("celebrate");
  await page.getByLabel("Camera move", { exact: true }).selectOption("orbit");
  const footballDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Save scene file", exact: true })
    .click();
  await (await footballDownload).saveAs(".tools/cloud-ui/football-scene.json");
  expect(
    JSON.parse(fs.readFileSync(".tools/cloud-ui/football-scene.json")).football
      .preset,
  ).toBe("tunnel");
  await page
    .getByLabel("Content mode", { exact: true })
    .selectOption("general");
  await page
    .getByLabel("Open scene file")
    .setInputFiles(".tools/cloud-ui/football-scene.json");
  await expect(page.getByLabel("Content mode", { exact: true })).toHaveValue(
    "football",
  );
  await expect(
    page.getByLabel("Primary team colour", { exact: true }),
  ).toHaveValue("#bb2244");
  await page
    .locator(".three-viewport")
    .screenshot({ path: ".tools/cloud-ui/football-tunnel.png" });
  await expect(
    page.getByLabel("Apply football kit", { exact: true }),
  ).toBeChecked();
  await expect(page.getByLabel("Player name", { exact: true })).toHaveValue(
    "CLEAR TAKE",
  );
  await expect(page.getByLabel("Player number", { exact: true })).toHaveValue(
    "9",
  );
  await page
    .locator(".three-viewport")
    .screenshot({ path: ".tools/cloud-ui/football-kit.png" });
  await expect(page.getByLabel("Demo motion", { exact: true })).toHaveValue(
    "celebrate",
  );
  await expect(page.getByLabel("Camera move", { exact: true })).toHaveValue(
    "orbit",
  );
  const videoDownload = page.waitForEvent("download", { timeout: 30000 });
  await page
    .getByRole("button", { name: "Export WebM video", exact: true })
    .click();
  const video = await videoDownload;
  await video.saveAs(".tools/cloud-ui/three-export.webm");
  expect(fs.statSync(".tools/cloud-ui/three-export.webm").size).toBeGreaterThan(
    1000,
  );
  await page.screenshot({ path: ".tools/cloud-ui/three-studio.png" });
  await page.getByLabel("Import GLB / VRM model").setInputFiles({
    name: "test.vrm",
    mimeType: "model/gltf-binary",
    buffer: Buffer.from(avatarFixture()),
  });
  await expect(
    page.getByRole("heading", {
      name: "Model inspection · VRM 1",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Synthetic test avatar", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Lip-sync audio", { exact: true }),
  ).toBeEnabled();
  // Original PCM tone exercises actual Web Audio playback, not speech accuracy.
  const wav = Buffer.alloc(44 + 16000 * 2 * 3);
  wav.write("RIFF");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(16000, 24);
  wav.writeUInt32LE(32000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(wav.length - 44, 40);
  for (let i = 0; i < 48000; i++)
    wav.writeInt16LE(
      Math.round(Math.sin((i * 2 * Math.PI * 440) / 16000) * 8000),
      44 + i * 2,
    );
  await page
    .getByLabel("Lip-sync audio", { exact: true })
    .setInputFiles({ name: "test.wav", mimeType: "audio/wav", buffer: wav });
  await page
    .getByRole("button", { name: "Play animation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Play lip-sync audio", exact: true })
    .click();
  await expect(
    page.getByText("Lip-sync audio playing", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Stop lip-sync audio", exact: true })
    .click();
  await expect(
    page.getByText("Lip-sync audio stopped", { exact: true }),
  ).toBeVisible();
  const vrmDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Save scene file", exact: true })
    .click();
  await (await vrmDownload).saveAs(".tools/cloud-ui/avatar-scene.json");
  await page
    .getByLabel("Open scene file")
    .setInputFiles(".tools/cloud-ui/avatar-scene.json");
  await expect(
    page.getByRole("heading", {
      name: "Model inspection · VRM 1",
      exact: true,
    }),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await page.screenshot({ path: ".tools/cloud-ui/login.png" });
  expect(errors).toEqual([]);
  console.log(
    "PASS: cloud sign-in, authenticated API header, session persistence, sign-out and private state unmount (mock providers).",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
