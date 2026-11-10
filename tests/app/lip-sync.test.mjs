import test from "node:test";
import assert from "node:assert/strict";
import {
  mouthWeights,
  supportedMouths,
  applyMouth,
  disposeAnalyzer,
  resumeAnalyzer,
} from "../../app/lip-sync.mjs";
test("approximate visemes are bounded, finite and silent when idle", () => {
  for (const v of [
    "viseme_aa",
    "viseme_E",
    "viseme_I",
    "viseme_O",
    "viseme_U",
    "viseme_SS",
    "unknown",
  ])
    for (const volume of [0, 0.01, 0.3, 10, NaN]) {
      const weights = Object.values(mouthWeights(v, volume));
      assert.ok(weights.every((w) => Number.isFinite(w) && w >= 0 && w <= 1));
      assert.ok(weights.filter((w) => w > 0).length <= 1);
    }
  assert.equal(mouthWeights("viseme_aa", 0.2).aa, 0.8);
  assert.ok(Object.values(mouthWeights("viseme_sil", 1)).every((w) => w === 0));
});
test("only available VRM expressions are driven and reset", () => {
  const values = {};
  const manager = {
    getExpression: (n) => ["aa", "oh"].includes(n),
    setValue: (n, v) => (values[n] = v),
  };
  assert.deepEqual(supportedMouths(manager), ["aa", "oh"]);
  applyMouth(manager, mouthWeights("viseme_aa", 1));
  assert.deepEqual(values, { aa: 1, oh: 0 });
  applyMouth(manager, {});
  assert.deepEqual(values, { aa: 0, oh: 0 });
  assert.deepEqual(supportedMouths(null), []);
});
test("pinned analyzer adapter resumes and releases Web Audio resources", async () => {
  const calls = [];
  const analyzer = {
    analyser: { disconnect: () => calls.push("disconnect") },
    audioContext: {
      resume: async () => calls.push("resume"),
      close: async () => calls.push("close"),
    },
  };
  await resumeAnalyzer(analyzer);
  disposeAnalyzer(analyzer);
  assert.deepEqual(calls, ["resume", "disconnect", "close"]);
});
