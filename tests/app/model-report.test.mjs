import test from "node:test";
import assert from "node:assert/strict";
import { modelReport } from "../../app/model-report.mjs";
import { validateGlb } from "../../app/model-validation.js";
import { avatarFixture } from "./avatar-fixture.mjs";
test("VRM inspection reports metadata and missing animation/UV limitations", () => {
  const buffer = avatarFixture(),
    report = modelReport(validateGlb(buffer), buffer.byteLength);
  assert.equal(report.format, "VRM 1");
  assert.equal(report.vertices, 3);
  assert.equal(report.meshes, 1);
  assert.equal(report.title, "Synthetic test avatar");
  assert.equal(report.warnings.length, 2);
});
test("plain GLB and legacy VRM reports are distinct", () => {
  assert.equal(modelReport({}, 20).format, "GLB");
  assert.equal(
    modelReport({ extensions: { VRM: { meta: { title: "Legacy" } } } }, 20)
      .format,
    "VRM 0",
  );
});
