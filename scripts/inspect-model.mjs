import fs from "node:fs/promises";
import { NodeIO } from "@gltf-transform/core";
import { validateGlb } from "../app/model-validation.js";
import { modelReport } from "../app/model-report.mjs";
try {
  const filename = process.argv[2];
  if (!filename)
    throw Error('Usage: npm run inspect:model -- "C:/path/to/model.glb"');
  const stat = await fs.stat(filename);
  if (stat.size > 30 * 1024 * 1024) throw Error("Model exceeds 30 MB.");
  const bytes = await fs.readFile(filename);
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
  const metadata = validateGlb(buffer);
  const report = modelReport(metadata, bytes.length);
  // Extension-aware rendering stays with three-vrm. Never rewrite VRM with an extension-unaware IO pipeline.
  if (!(metadata.extensionsUsed || []).length) {
    const doc = await new NodeIO().readBinary(bytes);
    report.structuralCheck = {
      meshes: doc.getRoot().listMeshes().length,
      animations: doc.getRoot().listAnimations().length,
    };
  } else
    report.structuralCheck =
      "Extension-bearing asset: metadata inspection only; no destructive optimization performed.";
  console.log(JSON.stringify(report, null, 2));
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
