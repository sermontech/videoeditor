import test from "node:test";
import assert from "node:assert/strict";
import {
  storyboard,
  validateProject,
  quality,
  defaults,
  contrastRatio,
} from "../../server/core.mjs";
const fixture = () => ({
  title: "Test",
  format: "portrait",
  sources: [],
  scenes: storyboard("Start with a point. Give it context. Make it count."),
});
test("storyboard preserves words and assigns stable editable scene IDs", () => {
  const text = "Start with a point. Give it context. Make it count.";
  const scenes = storyboard(text);
  assert.equal(scenes.map((s) => s.body).join(" "), text);
  assert.equal(new Set(scenes.map((s) => s.id)).size, 3);
  assert.ok(scenes.every((s) => s.duration >= 4));
});
test("quality checks extend insufficient reading time without changing the script", () => {
  const s = {
    title: "Hook",
    body: Array(25).fill("word").join(" "),
    duration: 3,
  };
  const q = quality([s]);
  assert.equal(q.scenes[0].duration, 10);
  assert.equal(q.scenes[0].body, s.body);
  assert.equal(s.duration, 3);
  assert.equal(q.changes.length, 1);
  assert.ok(q.checks.every((c) => c.passed));
});
test("long words do not crash storyboard generation", () => {
  assert.equal(storyboard("a".repeat(300))[0].body.length, 300);
});
test("slower preferences create longer draft scenes", () => {
  const text =
    "A longer scene gives every reader more time to understand the context.";
  assert.ok(
    storyboard(text, 1.5)[0].duration > storyboard(text, 1)[0].duration,
  );
});
test("invalid project values and unsafe source schemes are rejected", () => {
  validateProject(fixture());
  for (const update of [
    { title: "" },
    { format: "nope" },
    { scenes: [] },
    { sources: ["javascript:alert(1)"] },
    { scenes: [{ title: "a", body: "x", duration: -4 }] },
  ])
    assert.throws(() => validateProject({ ...fixture(), ...update }));
});
test("blank and oversized scripts produce bounded storyboards", () => {
  assert.equal(storyboard("").length, 0);
  assert.throws(
    () => storyboard(Array(500).fill("word").join(" ")),
    /12 scenes/,
  );
});
test("incomplete reading checks remain visible, not falsely green", () => {
  const q = quality([{ body: Array(70).fill("a").join(" "), duration: 4 }]);
  assert.equal(q.checks[0].passed, false);
  assert.equal(q.scenes[0].duration, 20);
});
test("brand defaults are independent of project content", () => {
  assert.equal(defaults.name, "Clear Take");
  assert.equal(defaults.fontSize, 56);
});

test("contrast check reports unreadable colour pairs", () => {
  assert.equal(contrastRatio("#ffffff", "#ffffff"), 1);
  assert.equal(contrastRatio("#000000", "#ffffff"), 21);
});
