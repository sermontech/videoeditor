import * as T from "three";
import { validateKit } from "./football-kits.mjs";
export function clothingMeshes(root) {
  const result = [];
  root.traverse((m) => {
    if (m.isMesh) result.push(m);
  });
  return result;
}
function shirtTexture(k, labels) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const c = canvas.getContext("2d");
  c.fillStyle = k.jersey;
  c.fillRect(0, 0, 1024, 1024);
  c.fillStyle = k.accent;
  if (k.pattern === "stripes")
    for (let x = 0; x < 1024; x += 256) c.fillRect(x, 0, 128, 1024);
  if (k.pattern === "hoops")
    for (let y = 0; y < 1024; y += 256) c.fillRect(0, y, 1024, 128);
  if (k.pattern === "halves") c.fillRect(512, 0, 512, 1024);
  if (k.pattern === "sash") {
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(200, 0);
    c.lineTo(1024, 824);
    c.lineTo(1024, 1024);
    c.closePath();
    c.fill();
  }
  if (labels && k.personalize) {
    c.textAlign = "center";
    c.fillStyle = k.ink;
    c.strokeStyle = "#17212b";
    c.lineWidth = 6;
    c.font = "bold 64px sans-serif";
    c.strokeText(k.player.toUpperCase(), 512, 220, 880);
    c.fillText(k.player.toUpperCase(), 512, 220, 880);
    c.font = "bold 420px sans-serif";
    c.strokeText(k.number, 512, 690, 800);
    c.fillText(k.number, 512, 690, 800);
  }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.flipY = false;
  return texture;
}
export function applyKit(root, settings, demo) {
  const k = validateKit(settings);
  if (!k.enabled) return () => {};
  const meshes = clothingMeshes(root),
    changes = [],
    materials = [],
    textures = [];
  const plain = shirtTexture(k, false),
    labelled = shirtTexture(k, true);
  plain.flipY = demo;
  labelled.flipY = demo;
  textures.push(plain, labelled);
  for (const [index, mesh] of meshes.entries()) {
    const part = demo
      ? mesh.userData.kitPart
      : Object.keys(k.mapping).find((p) => k.mapping[p] === index);
    if (!part) continue;
    const old = mesh.material;
    const originals = Array.isArray(old) ? old : [old];
    const converted = originals.map((original) => {
      const material = original.clone();
      if (material.color)
        material.color.set(part === "jersey" ? "#ffffff" : k[part]);
      material.map =
        part === "jersey"
          ? demo && !mesh.userData.kitLabels
            ? plain
            : labelled
          : null;
      if ("roughness" in material) material.roughness = 0.9;
      if ("metalness" in material) material.metalness = 0;
      material.needsUpdate = true;
      materials.push(material);
      return material;
    });
    mesh.material = Array.isArray(old) ? converted : converted[0];
    changes.push([mesh, old]);
  }
  return () => {
    for (const [mesh, old] of changes) mesh.material = old;
    for (const material of materials) material.dispose();
    for (const texture of textures) texture.dispose();
  };
}
