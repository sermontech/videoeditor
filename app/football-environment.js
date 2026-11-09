import * as T from "three";
import { footballPresets, validateFootball } from "./football-presets.mjs";
export function buildFootball(options) {
  const o = validateFootball(options),
    p = footballPresets.find((p) => p.id === o.preset),
    root = new T.Group();
  const accents = [];
  function box(w, h, d, x, y, z, color = o.primary) {
    const m = new T.Mesh(
      new T.BoxGeometry(w, h, d),
      new T.MeshStandardMaterial({ color, roughness: 0.7 }),
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
    return m;
  }
  function ball(r, x, y, z, color) {
    const m = new T.Mesh(
      new T.SphereGeometry(r, 12, 8),
      new T.MeshStandardMaterial({ color }),
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    root.add(m);
    return m;
  }
  function ring(radius, x, z, color) {
    const m = new T.Mesh(
      new T.RingGeometry(radius - 0.025, radius, 64),
      new T.MeshBasicMaterial({ color, side: T.DoubleSide }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.012, z);
    root.add(m);
  }
  const pitch = [
    "stadium",
    "pitch",
    "goal",
    "corner",
    "training",
    "indoor",
    "technical",
    "neon",
  ].includes(p.layout);
  box(24, 0.12, 24, 0, -0.06, 0, pitch ? "#29674a" : p.sky);
  if (pitch) {
    for (let i = -5; i <= 5; i++)
      box(1.8, 0.005, 18, i * 1.8, 0.004, 0, i % 2 ? "#2e7151" : "#326d4f");
    for (const x of [-8, 8]) box(0.04, 0.01, 18, x, 0.015, 0, "#eeeecc");
    for (const z of [-9, 9]) box(16, 0.01, 0.04, 0, 0.015, z, "#eeeecc");
    box(16, 0.01, 0.04, 0, 0.015, 0, "#eeeecc");
    ring(2, 0, 0, "#eeeecc");
  }
  function wall() {
    box(12, 4, 0.2, 0, 2, -4, p.sky);
  }
  function panels() {
    for (let x = -4; x <= 4; x += 2)
      box(1.8, 2, 0.08, x, 2, -3.8, (x / 2) % 2 ? o.primary : o.secondary);
  }
  function bench(x, z) {
    box(2, 0.12, 0.6, x, 0.5, z, o.secondary);
    for (const dx of [-0.8, 0.8])
      box(0.1, 0.5, 0.5, x + dx, 0.25, z, "#3a444b");
  }
  function goal(z = -4) {
    for (const x of [-2, 2]) box(0.07, 2.4, 0.07, x, 1.2, z, "#ffffff");
    box(4, 0.07, 0.07, 0, 2.4, z, "#ffffff");
    for (let x = -2; x <= 2; x += 0.25)
      box(0.015, 2.4, 0.015, x, 1.2, z - 0.15, "#b8c9be");
    for (let y = 0.2; y < 2.4; y += 0.25)
      box(4, 0.015, 0.015, 0, y, z - 0.15, "#b8c9be");
  }
  if (["stadium", "neon"].includes(p.layout)) {
    for (let tier = 0; tier < 4; tier++)
      for (const side of [-1, 1])
        box(
          20,
          0.6,
          1.2,
          0,
          0.3 + tier * 0.65,
          side * (10 + tier * 0.8),
          tier % 2 ? o.primary : o.secondary,
        );
    const count = p.id === "empty" ? 0 : Math.round(o.crowd * 160);
    if (count) {
      const mesh = new T.InstancedMesh(
        new T.BoxGeometry(0.22, 0.45, 0.22),
        new T.MeshStandardMaterial({ color: o.secondary }),
        count,
      );
      const matrix = new T.Matrix4();
      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / 40),
          x = ((i % 40) - 20) * 0.45;
        matrix.makeTranslation(x, 1 + row * 0.65, -10 - row * 0.8);
        mesh.setMatrixAt(i, matrix);
      }
      root.add(mesh);
    }
    for (const x of [-8, 8])
      for (const z of [-8, 8]) {
        box(0.15, 7, 0.15, x, 3.5, z, "#606c77");
        const panel = box(2, 0.5, 0.15, x, 7, z, o.secondary);
        panel.material.emissive.set(o.secondary);
        panel.material.emissiveIntensity = 1;
        accents.push(panel);
      }
    if (p.layout === "neon")
      for (const x of [-7, 7]) {
        const b = box(0.12, 5, 0.12, x, 2.5, -6, o.primary);
        b.material.emissive.set(o.primary);
        b.material.emissiveIntensity = 2;
        accents.push(b);
      }
  }
  if (p.layout === "goal") goal();
  if (p.layout === "corner") {
    box(0.04, 2, 0.04, 2, 1, -2, "#eeeeee");
    box(0.6, 0.4, 0.025, 2.3, 1.8, -2, o.primary);
    box(6, 0.01, 0.04, 0, 0.015, -2, "#eeeecc");
  }
  if (["training", "indoor"].includes(p.layout)) {
    for (let i = 0; i < 6; i++) {
      const cone = new T.Mesh(
        new T.ConeGeometry(0.18, 0.4, 12),
        new T.MeshStandardMaterial({ color: "#ff8b3d" }),
      );
      cone.position.set(((i % 3) - 1) * 2, 0.2, -2 - Math.floor(i / 3) * 2);
      root.add(cone);
    }
    for (const x of [-3, 3]) {
      box(0.6, 1.5, 0.08, x, 0.75, -4, o.secondary);
      ball(0.2, x, 1.7, -4, o.secondary);
    }
    goal(-7);
    if (p.layout === "indoor") {
      wall();
      box(12, 0.15, 10, 0, 4, 0, "#909a9f");
    }
  }
  if (p.layout === "technical") {
    bench(-3, -2);
    bench(3, -2);
    box(9, 0.12, 2, 0, 2.8, -3, o.primary);
  }
  if (p.layout === "tunnel") {
    for (const x of [-2.5, 2.5]) {
      box(0.2, 3.5, 10, x, 1.75, -3, o.primary);
      for (let z = -6; z <= 0; z += 2) {
        const b = box(0.03, 2.5, 0.12, x * 0.95, 1.5, z, o.secondary);
        b.material.emissive.set(o.secondary);
        accents.push(b);
      }
    }
    box(5, 0.2, 10, 0, 3.5, -3, "#202735");
  }
  if (["studio", "gear", "interview", "press"].includes(p.layout)) {
    wall();
    if (p.layout === "studio")
      for (const x of [-3.5, 3.5]) {
        const b = box(0.15, 3, 0.15, x, 1.5, -2, o.primary);
        b.material.emissive.set(o.primary);
        accents.push(b);
      }
    if (p.layout === "interview") {
      panels();
      bench(2, -1);
    }
    if (p.layout === "press") {
      panels();
      box(6, 0.15, 1, 0, 0.9, -1, o.primary);
      for (const x of [-2, 0, 2]) box(0.03, 0.35, 0.03, x, 1.15, -1, "#151515");
    }
    if (p.layout === "gear") {
      box(1.4, 0.6, 1.4, 2, 0.3, -1, o.primary);
      box(1, 0.3, 1, -2, 0.15, -1, o.secondary);
    }
  }
  if (
    [
      "gym",
      "recovery",
      "locker",
      "bus",
      "hotel",
      "airport",
      "fan",
      "trophy",
      "abstract",
    ].includes(p.layout)
  ) {
    wall();
    if (p.layout === "gym")
      for (const x of [-3, 3]) {
        box(0.1, 2, 0.1, x, 1, -2);
        box(2, 0.1, 0.1, x, 1.8, -2);
        for (const dx of [-0.8, 0.8]) ball(0.25, x + dx, 1.8, -2, "#353535");
        bench(x, -1);
      }
    if (p.layout === "recovery") {
      box(2, 0.2, 1, -2, 0.8, -2, "#eeeeee");
      box(0.12, 0.8, 0.8, -2, 0.4, -2, o.primary);
      box(1, 2, 0.5, 3, 1, -3, "#eff0ea");
    }
    if (p.layout === "locker")
      for (let x = -4; x <= 4; x += 1.3) {
        box(1.1, 2.6, 0.6, x, 1.3, -3, o.primary);
        box(0.04, 0.2, 0.04, x + 0.3, 1.2, -2.65, o.secondary);
        bench(x, -2);
      }
    if (p.layout === "bus") {
      for (const side of [-1, 1]) {
        box(0.15, 3, 9, side * 2.3, 1.5, -2, p.sky);
        for (let z = -4; z < 2; z += 1.5) {
          box(0.9, 0.5, 0.8, side * 1.4, 0.5, z, o.primary);
          box(0.9, 1, 0.15, side * 1.4, 1, z - 0.35, o.primary);
          box(0.02, 0.8, 1, side * 2.2, 1.9, z, "#9ebecd");
        }
      }
    }
    if (p.layout === "hotel") {
      box(3, 0.5, 2, -2, 0.25, -2, "#eeeeee");
      box(3, 1, 0.15, -2, 0.6, -3, o.primary);
      box(0.8, 0.7, 0.8, 2, 0.35, -2, o.secondary);
    }
    if (p.layout === "airport") {
      for (let x = -4; x <= 4; x += 2) box(0.15, 4, 0.15, x, 2, -3, "#e1e7e9");
      box(10, 1, 0.08, 0, 2.8, -3.7, o.primary);
      bench(-3, -2);
      bench(3, -2);
    }
    if (p.layout === "fan") {
      for (const x of [-4, 4]) {
        box(2, 5, 3, x, 2.5, -3, "#5c6b75");
        box(2, 0.8, 0.1, x, 2, -1.4, o.primary);
      }
      for (let x = -3; x <= 3; x++)
        box(0.6, 0.4, 0.03, x, 3, -2, x % 2 ? o.primary : o.secondary);
    }
    if (p.layout === "trophy")
      for (let x = -4; x <= 4; x += 2) {
        box(1, 0.8, 1, x, 0.4, -2, o.primary);
        const cup = new T.Mesh(
          new T.CylinderGeometry(0.35, 0.15, 0.5, 16),
          new T.MeshStandardMaterial({
            color: "#d6ac48",
            metalness: 0.7,
            roughness: 0.25,
          }),
        );
        cup.position.set(x, 1.15, -2);
        root.add(cup);
      }
    if (p.layout === "abstract")
      for (let i = 0; i < 8; i++) {
        const b = box(
          0.5 + i * 0.12,
          0.5 + i * 0.12,
          0.5 + i * 0.12,
          Math.cos(i) * 3,
          1 + Math.sin(i) * 0.6,
          -3,
          i % 2 ? o.primary : o.secondary,
        );
        b.rotation.set(i * 0.3, i * 0.4, 0);
      }
  }
  return {
    root,
    preset: p,
    update(time) {
      for (const [i, m] of accents.entries())
        m.material.emissiveIntensity = o.animated
          ? 1 + Math.sin(time * 1.2 + i) * 0.35
          : 1;
    },
  };
}
