// Approximate mapping, not phoneme alignment or speech recognition.
export const mouthNames = ["aa", "ee", "ih", "oh", "ou"];
const mapping = {
  viseme_aa: "aa",
  viseme_E: "ee",
  viseme_I: "ih",
  viseme_O: "oh",
  viseme_U: "ou",
  viseme_FF: "ih",
  viseme_TH: "ih",
  viseme_DD: "aa",
  viseme_kk: "aa",
  viseme_CH: "ih",
  viseme_SS: "ih",
  viseme_nn: "ih",
  viseme_RR: "oh",
};
export function mouthWeights(viseme, volume, strength = 1) {
  const result = Object.fromEntries(mouthNames.map((n) => [n, 0]));
  const name = mapping[viseme];
  if (name && Number.isFinite(volume) && volume > 0.015)
    result[name] = Math.max(
      0,
      Math.min(1, volume * 4 * (Number.isFinite(strength) ? strength : 1)),
    );
  return result;
}
export function supportedMouths(manager) {
  return mouthNames.filter((n) => manager?.getExpression(n));
}
export function applyMouth(manager, weights) {
  for (const n of supportedMouths(manager))
    manager.setValue(n, weights[n] || 0);
}
// wawa-lipsync 0.0.2 has no public disposal/resume API. Isolate the pinned
// runtime access here; revisit this adapter when upgrading the dependency.
export async function resumeAnalyzer(analyzer) {
  await analyzer.audioContext.resume();
}
export function disposeAnalyzer(analyzer) {
  analyzer?.analyser?.disconnect();
  analyzer?.audioContext?.close().catch(() => {});
}
