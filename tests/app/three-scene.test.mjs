import test from "node:test";
import assert from "node:assert/strict";
import { validateScene, base64, unbase64 } from "../../app/three-scene.mjs";
const scene = {
  type: "clear-take-3d",
  version: 1,
  name: "Demo",
  background: "#172b2e",
  format: "landscape",
  duration: 5,
  playing: true,
  clip: -1,
  camera: [3, 2, 5],
  target: [0, 1, 0],
  model: null,
};
test("portable scene settings are bounded and versioned", () => {
  assert.equal(validateScene(scene), scene);
  for (const patch of [
    { version: 2 },
    { duration: 100 },
    { format: "bad" },
    { camera: [Infinity, 0, 0] },
    { background: "url(x)" },
    { playing: "true" },
    { clip: -2 },
    { model: "https://x" },
  ])
    assert.throws(() => validateScene({ ...scene, ...patch }));
});
test("embedded binary round-trips without mutation", () => {
  const b = Uint8Array.from([0, 1, 255, 128]).buffer;
  assert.deepEqual(new Uint8Array(unbase64(base64(b))), new Uint8Array(b));
});
