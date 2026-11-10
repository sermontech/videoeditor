// Original tiny synthetic VRM fixture. No third-party avatar or licensed artwork.
export function avatarFixture() {
  const nodes = [
    { name: "Avatar", children: [1, 16] },
    { name: "hips", translation: [0, 0.8, 0], children: [2, 10, 13] },
    { name: "spine", translation: [0, 0.3, 0], children: [3, 4, 7] },
    { name: "head", translation: [0, 0.5, 0] },
    { name: "leftUpperArm", translation: [0.2, 0.2, 0], children: [5] },
    { name: "leftLowerArm", translation: [0.3, 0, 0], children: [6] },
    { name: "leftHand", translation: [0.2, 0, 0] },
    { name: "rightUpperArm", translation: [-0.2, 0.2, 0], children: [8] },
    { name: "rightLowerArm", translation: [-0.3, 0, 0], children: [9] },
    { name: "rightHand", translation: [-0.2, 0, 0] },
    { name: "leftUpperLeg", translation: [0.1, 0, 0], children: [11] },
    { name: "leftLowerLeg", translation: [0, -0.35, 0], children: [12] },
    { name: "leftFoot", translation: [0, -0.35, 0.1] },
    { name: "rightUpperLeg", translation: [-0.1, 0, 0], children: [14] },
    { name: "rightLowerLeg", translation: [0, -0.35, 0], children: [15] },
    { name: "rightFoot", translation: [0, -0.35, 0.1] },
    { name: "Test mesh", mesh: 0 },
  ];
  const positions = new Float32Array([-0.3, 0, 0, 0.3, 0, 0, 0, 1.7, 0]);
  const json = {
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes,
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
    materials: [{ doubleSided: true }],
    buffers: [{ byteLength: positions.byteLength }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positions.byteLength },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: "VEC3",
        min: [-0.3, 0, 0],
        max: [0.3, 1.7, 0],
      },
    ],
    extensionsUsed: ["VRMC_vrm"],
    extensions: {
      VRMC_vrm: {
        specVersion: "1.0",
        meta: {
          name: "Synthetic test avatar",
          authors: ["Clear Take tests"],
          licenseUrl: "https://vrm.dev/licenses/1.0/",
        },
        expressions: { preset: { aa: {}, ee: {}, ih: {}, oh: {}, ou: {} } },
        humanoid: {
          humanBones: Object.fromEntries(
            nodes.slice(1, 16).map((n, i) => [n.name, { node: i + 1 }]),
          ),
        },
      },
    },
  };
  const text = new TextEncoder().encode(JSON.stringify(json));
  const length = Math.ceil(text.length / 4) * 4;
  const b = new ArrayBuffer(28 + length + positions.byteLength);
  const v = new DataView(b);
  v.setUint32(0, 0x46546c67, true);
  v.setUint32(4, 2, true);
  v.setUint32(8, b.byteLength, true);
  v.setUint32(12, length, true);
  v.setUint32(16, 0x4e4f534a, true);
  const dest = new Uint8Array(b, 20, length);
  dest.fill(32);
  dest.set(text);
  v.setUint32(20 + length, positions.byteLength, true);
  v.setUint32(24 + length, 0x004e4942, true);
  new Uint8Array(b, 28 + length).set(new Uint8Array(positions.buffer));
  return b;
}
