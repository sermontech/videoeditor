import test from "node:test";
import assert from "node:assert/strict";
import { validateProject, defaults } from "../../server/core.mjs";
import { validateRender } from "../../server/cloud-shared.mjs";
const owner = "owner";
const project = {
  title: "Character",
  format: "portrait",
  sources: [],
  factsConfirmed: true,
  brand: defaults,
  scenes: [
    {
      title: "Hello",
      body: "A character scene.",
      duration: 5,
      characterId: "hero",
      characterPosition: "left",
      characterMotion: "float",
    },
  ],
};
test("character controls validate without breaking legacy projects", () => {
  validateProject(project);
  validateProject({
    ...project,
    scenes: [{ title: "Legacy", body: "Hello", duration: 5 }],
  });
  for (const patch of [
    { characterPosition: "bad" },
    { characterMotion: "walk" },
    { characterId: {} },
  ])
    assert.throws(() =>
      validateProject({
        ...project,
        scenes: [{ ...project.scenes[0], ...patch }],
      }),
    );
});
test("character references enforce ownership and image kind even without a background", () => {
  const asset = {
    id: "hero",
    owner_id: owner,
    kind: "image",
    object_path: "owner/hero.png",
  };
  validateRender(project, owner, [asset]);
  for (const assets of [
    [],
    [{ ...asset, owner_id: "other" }],
    [{ ...asset, kind: "video" }],
    [{ ...asset, object_path: "other/hero.png" }],
  ])
    assert.throws(
      () => validateRender(project, owner, assets),
      /Character image/,
    );
});
