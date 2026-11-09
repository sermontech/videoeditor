export const demoMotions = {
  idle: "Idle stance",
  wave: "Wave to fans",
  walkout: "Walkout (in place)",
  celebrate: "Goal celebration",
  warmup: "Warm-up steps",
};
export const cameraMoves = {
  static: "Static / manual",
  orbit: "Gentle orbit",
  dolly: "Dolly in and out",
  pan: "Side-to-side tracking",
};
export const motionDefaults = { demo: "wave", camera: "static", speed: 1 };
export function validateMotion(m) {
  if (
    !m ||
    !Object.hasOwn(demoMotions, m.demo) ||
    !Object.hasOwn(cameraMoves, m.camera) ||
    !Number.isFinite(m.speed) ||
    m.speed < 0.5 ||
    m.speed > 2
  )
    throw Error("Invalid motion settings.");
  return m;
}
export function poseAt(mode, time) {
  const t = time,
    step = Math.sin(t * 3),
    pose = {
      leftArm: 0,
      rightArm: 0,
      leftLeg: 0,
      rightLeg: 0,
      armSpread: 0,
      bounce: 0,
    };
  if (mode === "wave") {
    pose.rightArm = -1.5 + Math.sin(t * 4) * 0.25;
    pose.armSpread = 0.35;
  }
  if (mode === "walkout") {
    pose.leftLeg = step * 0.45;
    pose.rightLeg = -step * 0.45;
    pose.leftArm = -step * 0.4;
    pose.rightArm = step * 0.4;
  }
  if (mode === "warmup") {
    pose.leftLeg = Math.max(0, step) * 0.6;
    pose.rightLeg = Math.max(0, -step) * 0.6;
    pose.leftArm = -step * 0.25;
    pose.rightArm = step * 0.25;
  }
  if (mode === "celebrate") {
    pose.armSpread = 2.4;
    pose.bounce = Math.abs(Math.sin(t * 3)) * 0.12;
  }
  return pose;
}
export function cameraAt(mode, time, base, target) {
  const [x, y, z] = base,
    [tx, ty, tz] = target,
    dx = x - tx,
    dz = z - tz;
  if (mode === "orbit") {
    const a = Math.sin(time * 0.35) * 0.3;
    return [
      tx + dx * Math.cos(a) + dz * Math.sin(a),
      y,
      tz + dz * Math.cos(a) - dx * Math.sin(a),
    ];
  }
  if (mode === "dolly") {
    const f = 1 - 0.15 * (1 - Math.cos(time * 0.5));
    return [tx + (x - tx) * f, ty + (y - ty) * f, tz + (z - tz) * f];
  }
  if (mode === "pan") return [x + Math.sin(time * 0.5) * 0.7, y, z];
  return [...base];
}
