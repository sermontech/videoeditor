# Research and reusable audio

## Implemented

The **Research & audio** navigation item provides two discovery modes:

- Wikipedia background searches with introductory excerpts and source-page links.
  This is a secondary-source discovery tool, not a live sports feed or independent
  fact checker. Search with season and competition; check specific results against
  primary match reports before using them in an original script.
- Wikimedia Commons audio discovery with a strict CC0 / CC BY license-URL filter.
  Results require audio MIME, creator metadata, an HTTPS Commons file page and
  an HTTPS upload.wikimedia.org media URL, and must be no larger than 30 MB.
  NC, ND, SA, unknown and missing license URLs are excluded. These filters can
  exclude usable assets; they do not establish legal clearance for included ones.

Save selected sources into a session-only research pack. Export JSON containing
source URLs, provider retrieval times, excerpts or credits, editorial notes and
reviewer checklist responses. Export before navigating away; there is no cloud
persistence or pack import yet. Never treat checked review boxes as automated
verification. Wikipedia excerpt reuse has its own attribution/license conditions;
write original analysis and retain sources rather than assuming extracts are CC0.

Audio is **discovered, not automatically downloaded or mixed**. Open the source
page, review the actual terms and attribution, download manually, then use the
existing media import workflow. A file's metadata can be incorrect; personality,
trademark and other rights may still apply. No blanket Content ID safety claim is
made. Source text is rendered as text, not executable HTML.

## Backend and privacy

`GET /api/discovery/facts?q=...` and `/api/discovery/audio?q=...` are mounted in
local and cloud APIs. Cloud requests pass existing authentication/membership
checks. The provider receives the search query, not the project script or user
credentials. No paid service/key is required by these integrations.

Requests use fixed Wikipedia/Commons hosts, URL-encoded queries, redirects
blocked, a 12-second timeout, a 2 MB response cap, a 12-result limit and a
15-requests/minute route limiter. No arbitrary-URL fetch proxy is exposed. No
fallback invents results when a provider fails. Browser-facing calls use the
configured API base, not sandbox localhost.

Both backend and frontend must be deployed for this feature. The backend needs
outbound HTTPS to en.wikipedia.org and commons.wikimedia.org. Audio download
from source pages also requires access to upload.wikimedia.org in the browser.
The coding sandbox only permits a small host allowlist: the live provider check
failed with `fetch failed`. Production provider availability, actual response
metadata and usefulness for match research remain unverified.

## Tested

43 unit tests pass, including query validation, fixed provider construction,
license fail-closed behavior, unsafe media URL rejection, timeout configuration,
response caps and invalid-route input. Browser tests pass using mocked provider
responses for discovery, source saving, editorial notes and research-pack export;
these do not prove live internet retrieval. Existing software-WebGL studio tests
also pass. Production build passes with the existing 3D chunk-size warning.

## Remaining programme (not implemented by this increment)

1. Verify both providers from the deployed backend; test real audio license
   metadata, attribution completeness and empty/failure paths.
2. Add primary football data/report providers with explicit usage terms and
   necessary credentials; surface time zones, postponements, match status and
   disagreements instead of silently choosing a score.
3. Claim-to-source links, freshness warnings, correction history and persistent
   owner-isolated research packs. Preserve license evidence and asset hashes.
4. Local source-grounded script generation, with a selected licensed model,
   prompt-injection protections and human fact review; this UI currently provides
   an editable outline, not AI-authored scripts.
5. Licensed audio ingestion, preview, timeline placement, voice/music mixing,
   ducking, loudness checks, attribution packaging and provider-specific import
   adapters. Freesound requires its own API/terms integration; YouTube Audio
   Library remains manual. Do not scrape sources that disallow it.
6. Local narration, pronunciation dictionary, captions/transcript correction,
   synchronized presenter export and a real-human-avatar acceptance video.
7. Windows/Iris Xe timing and memory benchmarks, accessible captions, export
   preflight and failure recovery. No practical photorealistic AI speed promised.

These tasks supplement, not replace, the official-kit licensing/dressing/physics
priorities in OFFICIAL_KIT_PRIORITIES.md.
