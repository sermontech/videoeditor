import test from "node:test";
import assert from "node:assert/strict";
import { storyboard } from "../../server/core.mjs";
test("12 explicit Markdown scenes retain multiple sentences and titles", () => {
  const script = Array.from(
    { length: 12 },
    (_, i) =>
      `**Scene ${i + 1} – Match ${i + 1}**\n\nFirst sentence. Another sentence! Third sentence?`,
  ).join("\n\n");
  const scenes = storyboard(script);
  assert.equal(scenes.length, 12);
  assert.equal(scenes[0].title, "Match 1");
  assert.equal(
    scenes[11].body,
    "First sentence. Another sentence! Third sentence?",
  );
  assert.equal(storyboard(`(\n${script})`).length, 12);
});
test("explicit headings support plain and Markdown forms with dash variants", () => {
  assert.equal(
    storyboard("Scene 1 - Opening\nHello. World.")[0].title,
    "Opening",
  );
  assert.equal(
    storyboard("## Scene 1: Opening\nHello. World.")[0].body,
    "Hello. World.",
  );
  assert.equal(storyboard("Scene 1\nHello.")[0].title, "Scene 1");
});
test("explicit scenes enforce limits without silently discarding text", () => {
  assert.throws(() => storyboard("Scene 1 - Empty\n"), /1–350/);
  assert.throws(() => storyboard("Scene 2 - Start\nHello."), /consecutively/);
  assert.throws(() => storyboard("Preamble\nScene 1 - Start\nHello."), /under/);
  assert.throws(
    () => storyboard("Scene 1 - Long\n" + "x".repeat(351)),
    /1–350/,
  );
  assert.throws(
    () =>
      storyboard(
        Array.from({ length: 13 }, (_, i) => `Scene ${i + 1}\nHello.`).join(
          "\n",
        ),
      ),
    /12 scenes/,
  );
});
