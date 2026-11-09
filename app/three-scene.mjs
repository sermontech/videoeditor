export const formats = {
  landscape: [1280, 720],
  portrait: [720, 1280],
  square: [720, 720],
  social: [720, 900],
};
export function validateScene(s) {
  if (!s || s.version !== 1 || s.type !== "clear-take-3d")
    throw Error("Unsupported Clear Take scene file.");
  if (
    !/^#[0-9a-f]{6}$/i.test(s.background) ||
    !Object.hasOwn(formats, s.format)
  )
    throw Error("Invalid scene appearance.");
  if (!Number.isInteger(s.duration) || s.duration < 5 || s.duration > 30)
    throw Error("Duration must be 5–30 seconds.");
  for (const v of [s.camera, s.target])
    if (
      !Array.isArray(v) ||
      v.length !== 3 ||
      v.some((n) => !Number.isFinite(n) || Math.abs(n) > 100)
    )
      throw Error("Invalid camera coordinates.");
  if (
    typeof s.name !== "string" ||
    s.name.length > 255 ||
    typeof s.playing !== "boolean" ||
    !Number.isInteger(s.clip) ||
    s.clip < -1 ||
    s.clip > 10000
  )
    throw Error("Invalid animation settings.");
  if (
    s.model !== null &&
    (typeof s.model !== "string" ||
      s.model.length > 42 * 1024 * 1024 ||
      s.model.length % 4 !== 0 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(s.model))
  )
    throw Error("Invalid embedded model.");
  return s;
}
export function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function base64(buffer) {
  const bytes = new Uint8Array(buffer);
  let text = "";
  for (let i = 0; i < bytes.length; i += 8192)
    text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
}
export function unbase64(text) {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0)).buffer;
}
