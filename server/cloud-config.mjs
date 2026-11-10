export function runtimeMode(env) {
  const mode = env.CREATOR_MODE || "local";
  if (!["local", "cloud"].includes(mode))
    throw Error("CREATOR_MODE must be local or cloud.");
  if (
    (env.RENDER || env.VERCEL || env.NODE_ENV === "production") &&
    mode !== "cloud"
  )
    throw Error(
      "Hosted/production execution requires CREATOR_MODE=cloud. Refusing the unauthenticated local backend.",
    );
  return mode;
}
export function cloudConfig(env, worker = false) {
  if (env.CREATOR_MODE !== "cloud")
    throw Error("Cloud services require CREATOR_MODE=cloud.");
  const required = [
    "SUPABASE_URL",
    worker ? "SUPABASE_SERVICE_ROLE_KEY" : "SUPABASE_PUBLISHABLE_KEY",
    ...(!worker ? ["CREATOR_ALLOWED_ORIGINS"] : []),
  ];
  for (const key of required)
    if (!env[key]?.trim())
      throw Error(`Missing required environment variable: ${key}`);
  const url = new URL(env.SUPABASE_URL);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/"
  )
    throw Error("SUPABASE_URL must be an HTTPS origin.");
  const origins = worker
    ? []
    : env.CREATOR_ALLOWED_ORIGINS.split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  for (const origin of origins) {
    const u = new URL(origin);
    if (u.origin !== origin || u.protocol !== "https:" || origin.includes("*"))
      throw Error(
        "Use exact HTTPS frontend origins, without trailing slashes or wildcards.",
      );
  }
  const key =
    env[worker ? "SUPABASE_SERVICE_ROLE_KEY" : "SUPABASE_PUBLISHABLE_KEY"];
  if (
    !worker &&
    (key.startsWith("sb_secret_") || jwtRole(key) === "service_role")
  )
    throw Error(
      "The API must use a publishable/anon key, not a privileged secret.",
    );
  return { url: url.origin, key, origins, port: Number(env.PORT || 3001) };
}
function jwtRole(key) {
  try {
    return JSON.parse(Buffer.from(key.split(".")[1], "base64url")).role;
  } catch {
    return null;
  }
}
