// Explicit allowlist: media subprocesses must never inherit cloud credentials.
export function rendererEnvironment(env, root, platform = process.platform) {
  const result = {
    PATH: env.PATH || env.Path || "",
    PYTHONPATH: env.PYTHONPATH || `${root}/.tools/python`,
    CREATOR_FONT: env.CREATOR_FONT || "",
    LANG: "C.UTF-8",
  };
  if (platform === "win32") {
    for (const key of ["SystemRoot", "WINDIR", "TEMP", "TMP", "LOCALAPPDATA"])
      if (env[key]) result[key] = env[key];
  }
  return result;
}
export function rendererPython(env, platform = process.platform) {
  return env.PYTHON || (platform === "win32" ? "python" : "python3");
}
