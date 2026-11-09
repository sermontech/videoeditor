import { runtimeMode } from "./cloud-config.mjs";
const mode = runtimeMode(process.env);
await import(mode === "cloud" ? "./cloud.mjs" : "./local.mjs");
