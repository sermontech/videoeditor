import { spawnSync } from "node:child_process";
import path from "node:path";
const python =
  process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const r = spawnSync(
  python,
  [
    "-m",
    "pip",
    "install",
    "--target",
    path.resolve(".tools/python"),
    "-r",
    "server/requirements.txt",
  ],
  { stdio: "inherit" },
);
if (r.error) {
  console.error(
    "Install Python 3.11+ and pip, or set PYTHON to its executable path.",
  );
  process.exit(1);
}
process.exit(r.status ?? 1);
