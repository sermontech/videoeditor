import test from "node:test";
import assert from "node:assert/strict";
import { validateGlb } from "../../app/model-validation.js";
function file(json) {
  const data = new TextEncoder().encode(JSON.stringify(json));
  const b = new ArrayBuffer(20 + data.length);
  const v = new DataView(b);
  v.setUint32(0, 0x46546c67, true);
  v.setUint32(4, 2, true);
  v.setUint32(8, b.byteLength, true);
  v.setUint32(12, data.length, true);
  v.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(b, 20).set(data);
  return b;
}
test("GLB metadata rejects external resources and oversized geometry", () => {
  assert.deepEqual(validateGlb(file({ asset: { version: "2.0" } })), {
    asset: { version: "2.0" },
  });
  assert.throws(
    () => validateGlb(file({ images: [{ uri: "https://example.com/a.png" }] })),
    /self-contained/,
  );
  assert.throws(
    () => validateGlb(file({ buffers: [{ uri: "file:///secret" }] })),
    /self-contained/,
  );
  assert.throws(
    () => validateGlb(file({ accessors: [{ count: 3000000 }] })),
    /complex/,
  );
  assert.throws(() => validateGlb(new ArrayBuffer(8)), /Invalid/);
});
