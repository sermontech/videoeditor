import test from "node:test";
import assert from "node:assert/strict";
import {
  footballPresets,
  footballDefaults,
  validateFootball,
  fitHeight,
} from "../../app/football-presets.mjs";
import { buildFootball } from "../../app/football-environment.js";
import { validateScene } from "../../app/three-scene.mjs";
test("33 categorized football environments build actual scene geometry", () => {
  assert.equal(footballPresets.length, 33);
  assert.equal(new Set(footballPresets.map((p) => p.id)).size, 33);
  assert.equal(new Set(footballPresets.map((p) => p.category)).size, 6);
  for (const p of footballPresets) {
    const env = buildFootball({
      ...footballDefaults,
      preset: p.id,
      animated: true,
    });
    assert.ok(env.root.children.length > 3, p.id);
    env.update(2);
    env.root.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose();
    });
  }
});
test("football fitting normalizes height and bounds controls", () => {
  assert.equal(fitHeight({ min: { y: -1 }, max: { y: 2 } }), 0.6);
  assert.throws(() => fitHeight({ min: { y: 1 }, max: { y: 1 } }));
  for (const patch of [
    { preset: "missing" },
    { light: 99 },
    { crowd: -1 },
    { scale: 0 },
    { rotation: Infinity },
    { primary: "red" },
    { animated: "true" },
  ])
    assert.throws(() => validateFootball({ ...footballDefaults, ...patch }));
});
test("portable football settings are validated on restore", () => {
  const scene = {
    type: "clear-take-3d",
    version: 1,
    name: "Demo",
    background: "#172b2e",
    format: "portrait",
    duration: 5,
    playing: true,
    clip: -1,
    camera: [3, 2, 5],
    target: [0, 1, 0],
    model: null,
    football: { ...footballDefaults, preset: "tunnel" },
  };
  assert.equal(validateScene(scene).football.preset, "tunnel");
  assert.throws(() =>
    validateScene({ ...scene, football: { ...footballDefaults, x: 1000 } }),
  );
});
