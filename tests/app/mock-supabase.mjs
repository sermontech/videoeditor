// Test-only provider stub loaded with node --import. Never copied into the Docker image.
import fs from "node:fs";
import { defaults } from "../../server/core.mjs";
let claimed = false;
const response = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
globalThis.fetch = async (input, init = {}) => {
  const u = new URL(String(input));
  if (u.origin !== "https://example.supabase.co")
    throw Error("Unexpected network request in isolated test");
  const h = new Headers(init.headers);
  const token = (h.get("authorization") || "").replace("Bearer ", "");
  const worker = process.env.MOCK_WORKER === "1";
  const owner = "c12f6532-e8b5-4fd5-af54-e652fe95da41";
  const id = "b12f6532-e8b5-4fd5-af54-e652fe95da41";
  if (worker) {
    if (u.pathname.endsWith("/rpc/clear_take_claim")) {
      if (claimed) return response([]);
      claimed = true;
      return response([
        {
          id,
          owner_id: owner,
          request: {
            title: "Worker pipeline test",
            format: "square",
            sources: [],
            factsConfirmed: true,
            audioId: null,
            brand: defaults,
            scenes: [
              {
                id: "one",
                title: "VERIFIED PIPELINE",
                body: "A real render with a simulated queue.",
                duration: 3,
              },
            ],
          },
        },
      ]);
    }
    if (u.pathname.endsWith("/clear_take_members"))
      return response({ enabled: true });
    if (u.pathname.endsWith("/clear_take_generations")) {
      if (
        u.searchParams.get("worker_token") == null ||
        u.searchParams.get("status") !== "eq.rendering"
      )
        throw Error("Unfenced worker write");
      const values = JSON.parse(init.body);
      fs.appendFileSync(process.env.MOCK_TRACE, JSON.stringify(values) + "\n");
      return response([{ id }]);
    }
    if (u.pathname.startsWith("/storage/v1/object/clear-take-exports/")) {
      const bytes = Buffer.from(await new Response(init.body).arrayBuffer());
      if (
        !bytes.includes(Buffer.from("ftyp")) ||
        !bytes.includes(Buffer.from("moov"))
      )
        throw Error("Expected a real fast-start MP4 upload");
      fs.appendFileSync(
        process.env.MOCK_TRACE,
        JSON.stringify({ realMp4Bytes: bytes.length }) + "\n",
      );
      return response({ Key: "uploaded" });
    }
    throw Error("Unexpected worker provider call: " + u.pathname);
  }
  if (u.pathname === "/auth/v1/user") {
    if (!["valid-member", "valid-nonmember"].includes(token))
      return response({ message: "Invalid token" }, 401);
    return response({
      id: owner,
      email: "test@example.com",
      email_confirmed_at: "2026-01-01T00:00:00Z",
      role: "authenticated",
    });
  }
  if (u.pathname.endsWith("/rpc/clear_take_can_access"))
    return response(token === "valid-member");
  if (u.pathname.startsWith("/rest/v1/")) {
    if (u.pathname.endsWith("/clear_take_profiles") && init.method === "POST")
      return response(null, 201);
    if (u.searchParams.get("owner_id") !== "eq." + owner)
      throw Error("API query missing verified owner filter");
    return response(
      u.pathname.endsWith("/clear_take_profiles") ? { brand: defaults } : [],
    );
  }
  throw Error("Unexpected provider call: " + u.pathname);
};
