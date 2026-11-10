import { createClient } from "@supabase/supabase-js";
export const cloudMode = import.meta.env.VITE_CREATOR_MODE === "cloud";
export const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const url = import.meta.env.VITE_SUPABASE_URL,
  key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
let configError = "";
if (cloudMode) {
  try {
    if (
      new URL(apiBase).protocol !== "https:" ||
      new URL(apiBase).origin !== apiBase ||
      new URL(url).protocol !== "https:" ||
      !key
    )
      throw Error();
    if (key.startsWith("sb_secret_")) throw Error();
    const parts = key.split(".");
    if (
      parts.length === 3 &&
      JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))).role ===
        "service_role"
    )
      throw Error();
  } catch {
    configError =
      "Cloud configuration is incomplete or unsafe. Ask the studio owner to check the frontend environment variables.";
  }
}
export const authConfigurationError = configError;
export const supabase =
  cloudMode && !configError
    ? createClient(url, key, {
        auth: {
          flowType: "pkce",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;
export async function authHeaders() {
  if (!cloudMode) return {};
  if (!supabase) throw Error(configError);
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw Error("Please sign in again.");
  return { Authorization: `Bearer ${data.session.access_token}` };
}
