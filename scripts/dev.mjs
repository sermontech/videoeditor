import { spawn } from "node:child_process";
const children = [
  spawn(process.execPath, ["server/index.mjs"], { stdio: "inherit" }),
  spawn(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "--host", "0.0.0.0"],
    { stdio: "inherit" },
  ),
];
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const c of children) c.kill();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
for (const c of children)
  c.on("exit", (code) => {
    stop();
    process.exitCode = code || 0;
  });
