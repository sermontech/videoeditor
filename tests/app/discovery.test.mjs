import test from "node:test";
import assert from "node:assert/strict";
import {
  queryText,
  normalizeFacts,
  normalizeAudio,
  searchDiscovery,
  discoveryRouter,
} from "../../server/discovery.mjs";
import express from "express";
const audio = (license = "https://creativecommons.org/licenses/by/4.0/") => ({
  query: {
    pages: {
      1: {
        pageid: 1,
        title: "File:Original tone.ogg",
        imageinfo: [
          {
            mime: "audio/ogg",
            size: 123,
            url: "https://upload.wikimedia.org/example.ogg",
            descriptionurl:
              "https://commons.wikimedia.org/wiki/File:Original_tone.ogg",
            extmetadata: {
              LicenseUrl: { value: license },
              LicenseShortName: { value: "CC BY 4.0" },
              Artist: { value: "<b>Test author</b>" },
            },
          },
        ],
      },
    },
  },
});
test("discovery limits queries and treats provider excerpts as plain text", () => {
  for (const q of ["", null, "ab", "a".repeat(181), "abc\n"])
    assert.throws(() => queryText(q));
  assert.equal(queryText(" football "), "football");
  const r = normalizeFacts({
    query: {
      pages: {
        1: { pageid: 1, title: "Test", extract: "<script>bad</script> plain" },
      },
    },
  });
  assert.equal(r[0].summary, "bad plain");
  assert.match(r[0].warning, /verify/);
});
test("audio licensing fails closed, filters noncommercial/sharealike and unsafe URLs", () => {
  assert.equal(normalizeAudio(audio()).length, 1);
  assert.equal(
    normalizeAudio(audio("https://creativecommons.org/publicdomain/zero/1.0/"))
      .length,
    1,
  );
  for (const license of [
    "",
    "https://creativecommons.org/licenses/by-nc/4.0/",
    "https://creativecommons.org/licenses/by-sa/4.0/",
    "https://evil.example/licenses/by/4.0/",
  ])
    assert.equal(normalizeAudio(audio(license)).length, 0);
  const data = audio();
  data.query.pages[1].imageinfo[0].url = "http://127.0.0.1/private";
  assert.equal(normalizeAudio(data).length, 0);
});
test("search uses fixed providers, encoded query, no redirects, and retrieval timestamp", async () => {
  let requested;
  const result = await searchDiscovery(
    "facts",
    "football & test",
    async (url, options) => {
      requested = url;
      assert.equal(options.redirect, "error");
      assert.ok(options.signal instanceof AbortSignal);
      return new Response(JSON.stringify({ query: { pages: {} } }));
    },
  );
  assert.equal(new URL(requested).hostname, "en.wikipedia.org");
  assert.equal(
    new URL(requested).searchParams.get("gsrsearch"),
    "football & test",
  );
  assert.ok(result.retrievedAt);
  assert.deepEqual(result.results, []);
  await assert.rejects(
    () =>
      searchDiscovery(
        "facts",
        "football",
        async () => new Response("x", { status: 429 }),
      ),
    /unavailable/,
  );
  await assert.rejects(
    () =>
      searchDiscovery(
        "facts",
        "football",
        async () => new Response("x".repeat(2100000)),
      ),
    /safety limit/,
  );
});
test("discovery router rejects invalid input before provider access", async () => {
  const app = express();
  app.use("/api/discovery", discoveryRouter());
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  try {
    const r = await fetch(
      `http://127.0.0.1:${server.address().port}/api/discovery/facts?q=a`,
    );
    assert.equal(r.status, 400);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
