import test from "node:test";
import assert from "node:assert/strict";
import {
  demoMotions,
  cameraMoves,
  motionDefaults,
  validateMotion,
  poseAt,
  cameraAt,
} from "../../app/motion-presets.mjs";
test("demo motions are finite, bounded and distinguishable", () => {
  for (const mode of Object.keys(demoMotions))
    for (const t of [0, 0.5, 1, 10, 100])
      for (const n of Object.values(poseAt(mode, t)))
        assert.ok(Number.isFinite(n) && Math.abs(n) < 3);
  assert.notDeepEqual(poseAt("walkout", 0), poseAt("walkout", 0.5));
  assert.ok(poseAt("celebrate", 0.5).bounce > 0);
});
test("camera moves start at saved framing and stay bounded", () => {
  for (const mode of Object.keys(cameraMoves)) {
    assert.deepEqual(cameraAt(mode, 0, [3, 2, 5], [0, 1, 0]), [3, 2, 5]);
    for (const n of cameraAt(mode, 100, [3, 2, 5], [0, 1, 0]))
      assert.ok(Number.isFinite(n) && Math.abs(n) < 10);
  }
  assert.deepEqual(cameraAt("static", 5, [3, 2, 5], [0, 1, 0]), [3, 2, 5]);
});
test("motion settings reject unsupported retargeting claims and invalid speeds", () => {
  validateMotion(motionDefaults);
  for (const patch of [
    { demo: "ai-walk" },
    { camera: "teleport" },
    { speed: Infinity },
    { speed: 0 },
    { speed: 3 },
  ])
    assert.throws(() => validateMotion({ ...motionDefaults, ...patch }));
});
