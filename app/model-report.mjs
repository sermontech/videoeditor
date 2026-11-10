export function modelReport(json, bytes) {
  const primitives = (json.meshes || []).flatMap((m) => m.primitives || []);
  const extension = json.extensions?.VRMC_vrm || json.extensions?.VRM;
  const metadata = extension?.meta || {};
  return {
    format: json.extensions?.VRMC_vrm
      ? "VRM 1"
      : json.extensions?.VRM
        ? "VRM 0"
        : "GLB",
    megabytes: Math.round((bytes / 1048576) * 100) / 100,
    meshes: (json.meshes || []).length,
    materials: (json.materials || []).length,
    skins: (json.skins || []).length,
    animations: (json.animations || []).length,
    vertices: primitives.reduce(
      (n, p) => n + (json.accessors?.[p.attributes?.POSITION]?.count || 0),
      0,
    ),
    morphTargets: primitives.reduce((n, p) => n + (p.targets?.length || 0), 0),
    title: String(metadata.name || metadata.title || "").slice(0, 120),
    permissions: extension
      ? "Avatar usage restrictions may be embedded in this file. Review the author’s license before publishing."
      : "Review the model’s license before publishing.",
    warnings: [
      ...(primitives.length > 150
        ? [
            "Many draw calls: performance may be limited on integrated graphics.",
          ]
        : []),
      ...(!(json.animations || []).length
        ? ["No embedded animation clips."]
        : []),
      ...(primitives.some((p) => p.attributes?.TEXCOORD_0 == null)
        ? [
            "Some meshes lack UV coordinates; kit textures may not display correctly.",
          ]
        : []),
    ],
  };
}
