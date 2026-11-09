import { defineConfig, loadEnv } from "vite";
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  if (env.VERCEL && env.VITE_CREATOR_MODE !== "cloud")
    throw Error(
      "Set VITE_CREATOR_MODE=cloud on Vercel. Refusing an unauthenticated local-mode build.",
    );
  if (env.VITE_CREATOR_MODE === "cloud") {
    for (const k of [
      "VITE_API_URL",
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_PUBLISHABLE_KEY",
    ])
      if (!env[k]) throw Error(`Missing ${k}`);
    for (const k of ["VITE_API_URL", "VITE_SUPABASE_URL"]) {
      const u = new URL(env[k]);
      if (u.protocol !== "https:" || u.username || u.password)
        throw Error(`${k} must be HTTPS.`);
    }
    const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
    let role;
    try {
      role = JSON.parse(Buffer.from(key.split(".")[1], "base64url")).role;
    } catch {}
    if (key.startsWith("sb_secret_") || role === "service_role")
      throw Error(
        "Never bundle a secret/service-role key in a VITE_ variable.",
      );
  }
  return {
    server: {
      host: "0.0.0.0",
      allowedHosts: true,
      proxy: {
        "/api": "http://127.0.0.1:3001",
        "/media": "http://127.0.0.1:3001",
      },
    },
    build: { outDir: "dist" },
  };
});
