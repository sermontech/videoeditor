export function validateGlb(buffer) {
  if (buffer.byteLength > 30 * 1024 * 1024)
    throw Error("Use a GLB smaller than 30 MB.");
  if (buffer.byteLength < 20) throw Error("Invalid GLB file.");
  const v = new DataView(buffer);
  if (
    v.getUint32(0, true) !== 0x46546c67 ||
    v.getUint32(4, true) !== 2 ||
    v.getUint32(8, true) !== buffer.byteLength ||
    v.getUint32(16, true) !== 0x4e4f534a
  )
    throw Error("Use a valid glTF 2.0 binary (.glb) file.");
  const size = v.getUint32(12, true);
  if (size > buffer.byteLength - 20) throw Error("Invalid GLB metadata.");
  const json = JSON.parse(
    new TextDecoder().decode(new Uint8Array(buffer, 20, size)),
  );
  if ([...(json.buffers || []), ...(json.images || [])].some((x) => x.uri))
    throw Error(
      "Use a self-contained GLB with embedded textures and buffers. External resources are not allowed.",
    );
  if (
    (json.nodes || []).length > 2000 ||
    (json.meshes || []).length > 500 ||
    (json.accessors || []).some((x) => x.count > 2000000)
  )
    throw Error("This model is too complex for this lightweight preview.");
  return json;
}
