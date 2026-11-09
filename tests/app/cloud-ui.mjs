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
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
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
