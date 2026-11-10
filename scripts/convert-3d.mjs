import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  rendererEnvironment,
  rendererPython,
} from "../server/renderer-process.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync(
  rendererPython(process.env),
  [path.join(root, "scripts/convert-3d.py"), ...process.argv.slice(2)],
  { stdio: "inherit", env: rendererEnvironment(process.env, root) },
);
if (result.error)
  console.error(
    "Python could not start. Install Python and run npm run setup:render.",
  );
process.exit(result.status ?? 1);
