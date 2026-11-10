import test from "node:test";
import assert from "node:assert/strict";
import { runtimeMode, cloudConfig } from "../../server/cloud-config.mjs";
import {
  brandSettings,
  validateRender,
  safeObjectPath,
} from "../../server/cloud-shared.mjs";
import { defaults } from "../../server/core.mjs";
const env = {
  CREATOR_MODE: "cloud",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  CREATOR_ALLOWED_ORIGINS: "https://studio.example.com",
};
test("hosted environments cannot start the unauthenticated local API", () => {
  assert.equal(runtimeMode({}), "local");
  for (const v of [
    { RENDER: "true" },
    { VERCEL: "1" },
    { NODE_ENV: "production" },
    { CREATOR_MODE: "typo" },
  ])
    assert.throws(() => runtimeMode(v));
  assert.equal(runtimeMode({ ...env, RENDER: "true" }), "cloud");
});
test("cloud config requires exact HTTPS origins and separate API/worker credentials", () => {
  assert.equal(cloudConfig(env).origins[0], "https://studio.example.com");
  assert.throws(() => cloudConfig({ ...env, CREATOR_ALLOWED_ORIGINS: "*" }));
  assert.throws(() =>
    cloudConfig({ ...env, SUPABASE_PUBLISHABLE_KEY: "sb_secret_test" }),
  );
  assert.throws(() => cloudConfig(env, true));
  assert.ok(
    cloudConfig({ ...env, SUPABASE_SERVICE_ROLE_KEY: "worker-only" }, true),
  );
  const jwt =
    "a." +
    Buffer.from(JSON.stringify({ role: "service_role" })).toString(
      "base64url",
    ) +
    ".x";
  assert.throws(() => cloudConfig({ ...env, SUPABASE_PUBLISHABLE_KEY: jwt }));
});
const snapshot = () => ({
  title: "Owned render",
  format: "portrait",
  factsConfirmed: true,
  brand: defaults,
  sources: [],
  audioId: null,
  scenes: [
    {
      id: "scene",
      title: "Hook",
      body: "Only render owned media.",
      duration: 4,
      assetId: "asset",
    },
  ],
});
const asset = {
  id: "asset",
  owner_id: "owner",
  kind: "image",
  object_path: "owner/image.png",
};
test("worker rejects cross-user, missing and wrong-kind media before download", () => {
  assert.ok(validateRender(snapshot(), "owner", [asset]));
  for (const a of [
    [],
    [{ ...asset, owner_id: "someone-else" }],
    [{ ...asset, object_path: "someone-else/image.png" }],
    [{ ...asset, kind: "audio" }],
  ])
    assert.throws(() => validateRender(snapshot(), "owner", a));
});
test("worker independently requires factual review and revalidates brand and text", () => {
  assert.throws(() =>
    validateRender({ ...snapshot(), factsConfirmed: false }, "owner", [asset]),
  );
  assert.throws(() =>
    validateRender(
      { ...snapshot(), brand: { ...defaults, fontSize: 10000 } },
      "owner",
      [asset],
    ),
  );
  assert.throws(() =>
    brandSettings({ ...defaults, background: "url(https://evil.test)" }),
  );
  assert.throws(() =>
    validateRender({ ...snapshot(), scenes: [] }, "owner", [asset]),
  );
});
test("storage references cannot cross user prefixes or traverse local paths", () => {
  for (const p of [
    "owner/../file",
    "other/file",
    "owner/%2e%2e/file",
    "owner\\file",
  ])
    assert.equal(safeObjectPath("owner", p), false);
  assert.equal(safeObjectPath("owner", "owner/id.mp4"), true);
});
