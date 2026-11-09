import test from "node:test";
import assert from "node:assert/strict";
import {
  kitDefaults,
  validateKit,
  competitions,
} from "../../app/football-kits.mjs";
import { validateScene } from "../../app/three-scene.mjs";
test("kit options are bounded and separate clothing assignments", () => {
  validateKit(kitDefaults);
  assert.ok(competitions.includes("AFCON"));
  assert.ok(competitions.includes("Women’s Super League"));
  for (const patch of [
    { number: "100" },
    { number: "<x>" },
    { player: "x".repeat(21) },
    { jersey: "red" },
    { pattern: "official" },
    { mapping: { jersey: 0, shorts: 0, socks: -1 } },
    { mapping: { jersey: 1.5, shorts: -1, socks: -1 } },
  ])
    assert.throws(() => validateKit({ ...kitDefaults, ...patch }));
});
test("kits persist as validated optional scene metadata", () => {
  const s = {
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
    kit: { ...kitDefaults, enabled: true, player: "TEST", number: "9" },
  };
  assert.equal(validateScene(JSON.parse(JSON.stringify(s))).kit.player, "TEST");
  assert.throws(() =>
    validateScene({ ...s, kit: { ...kitDefaults, enabled: "yes" } }),
  );
});
