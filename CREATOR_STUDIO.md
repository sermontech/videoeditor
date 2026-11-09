# Clear Take — Creator Studio

A working, local-first, single-user web app built from the existing video-editor workspace. This is the first app iteration, not a production multi-user SaaS.

## Quick start

Requirements: **Node.js 22.12+**, **Python 3.11+ with pip**, and a supported system font. Windows uses Arial Bold; Linux uses DejaVu Sans; macOS uses Arial Bold. Set `CREATOR_FONT` to an existing TTF if needed.

From the repository root (Windows PowerShell, macOS or Linux):

```sh
npm ci
npm run setup:render
npm run dev
```

Open `http://localhost:5173` on the machine running the app. In Arena, open the **Clear Take Creator Studio live preview** instead. Browser API and media URLs are relative; Vite proxies them to port 3001.

For a production-style local build:

```sh
npm run build
npm start
```

This serves the app and API together on port 3001. The current Arena preview runs this mode.

`setup:render` installs pinned Pillow and imageio-ffmpeg into `.tools/python`, not globally. The FFmpeg executable is bundled in the imageio-ffmpeg wheel. If Python is not on PATH, set `PYTHON` to the full Python executable path. Windows uses `python`, other platforms use `python3` by default. Python rendering dependencies must be installed **in the same workspace as the server**.

No Chromium download is necessary to use the app or render videos. Chromium is only needed for the optional browser tests.

## What works

- Dashboard with three clearly editable starter drafts, project search and draft/export filters.
- Project creation from a user-written script. Deterministic sentence splitting; no model-generated facts or copy.
- Editable scene text, labels, durations, order, deletion and additions (1–12 scenes).
- Saved project title, aspect ratio, references, audio selection and asset attachments.
- Media uploads: PNG/JPEG/WebP, MP4/MOV/WebM, MP3/WAV/M4A; 100 MB per file.
- Preview original uploads. Import files from this repository's `AI Video Editor/References` and `Raw footages` folders without altering the originals. Imports are deduplicated by origin and size.
- Adjustable brand colours, text size, name and draft reading pace.
- Approximate live storyboard preview. Export uses measured text wrapping and automatic fitting; it is not guaranteed to be pixel-identical to the browser preview.
- Real MP4 exports at 1080×1920, 1920×1080 or 1080×1080, 30 fps, H.264/yuv420p with fast-start metadata.
- Images as backgrounds, genuinely moving uploaded video backgrounds (looped to cover the scene), and an optional audio track starting at time zero. Clip source audio is discarded; select an audio asset separately. Short selected audio is padded with silence, and long audio is trimmed to video duration.
- Render progress, errors, export playback/download and per-project generation history.
- User confirmation of factual review and media permissions before rendering.
- Persisted feedback with visible changes to future defaults.

## What “improves after each generation” means

There are two distinct mechanisms:

1. **Automatic, on every render:** reading-time checks extend overly short scenes toward 2.5 words/second (up to the 20-second scene limit). Text is wrapped and reduced in size when necessary to fit, or the render fails rather than silently clipping body text. Reports retain the original render snapshot, brand settings, fit measurements and changes. Contrast is reported for the brand background, not assumed for uploaded imagery. Every MP4 is fully decoded as an output integrity check.
2. **Human-reviewed, for future work:** each successful generation accepts one review. “Slower” adds 0.15 to the saved pace (cap 1.6) for **new drafts**; “larger” adds 4 px to the saved font size (cap 80) for **future renders**; “keep” confirms the current direction. Notes are saved in the journal. Brand settings can be changed manually at any time.

Already exported videos and existing scene durations are not silently overwritten. A clean generation may need no automatic adjustment. This does **not** train an AI model, rewrite application code, guarantee creative improvement, identify music, transcribe speech, or verify facts. Generation checks are rules and measured layout validation, not audience-performance scores.

## Limits and next iterations

- No external AI writing, web research, TTS, avatar, transcription or social publishing provider is connected. The UI says so. Uploaded audio works now; AI voice integration is a future feature.
- No automatic word-level subtitle alignment. Scene text is a graphic overlay; it is not a transcript of uploaded audio.
- No multitrack timeline, per-clip trim controls, advanced transitions or colour grading yet. Rendering starts media at its beginning and uses hard cuts between scenes.
- Source links are retained for review and provenance, not fetched or validated against the script.
- File extension and size filtering plus media decoding are not a complete malware sandbox. Use trusted media. FFmpeg's media inputs are restricted to local protocols.
- One render at a time; no distributed queue. Timeout: ten minutes. Server shutdown terminates render subprocesses; incomplete generations are marked failed on restart.
- **No authentication, authorization or tenant isolation.** The server binds to `0.0.0.0` for preview compatibility. Anyone with network access to it can access this workspace. Keep it behind a trusted local/private preview; do not publish it publicly with private footage. Add authentication, rate limits, media sandboxing, quotas, and durable object storage before public hosting.
- A persistent Node/Python host is required. This is not a static-only or Vercel serverless deployment.

## Persistence and backups

`.creator/state.json` stores projects, brand settings, render histories, snapshots and feedback. Writes use a temp file then rename. `.creator/media/` holds uploads and completed exports; `.creator/jobs/` holds render manifests and intermediate files. These directories are Git-ignored. Download important exports and back up `.creator` yourself; do not rely on Git to preserve media.

The existing `AI Video Editor` folders remain intact. The new app does not automatically manage exports created by the earlier standalone scripts. Importing existing media copies it into the app's library; it does not move or delete the original files.

Runtime options:

| Variable | Default / purpose |
|---|---|
| `PORT` | 3001; production API/web server port. Vite's development proxy expects 3001. |
| `CREATOR_DATA_DIR` | `.creator`; alternate state/media/job directory. |
| `PYTHON` | `python` on Windows, `python3` elsewhere. |
| `CREATOR_FONT` | Optional path to a readable TTF font. |
| `CHROMIUM_PATH` | Optional browser executable for integration tests only. |

## Validation

```sh
npm test
npm run build
# Install a test browser once on your own machine:
npx playwright install chromium
npm run test:browser
```

Nine unit tests cover storyboard preservation, scene limits, project validation, duration adjustment, reading checks and contrast. Browser tests start an isolated temporary workspace and exercise creation/editing, persistence, fact-review gating, real video generation and downloads, feedback defaults, image/video/audio uploads, all three output aspect ratios and mobile horizontal overflow. Test workspaces are removed at the end, without adding artificial history to the user's workspace.

The earlier toolchain checks remain available as `npm run test:tools`; those require the standalone FFmpeg/Whisper/Remotion tool setup documented in the original README. They are separate from app tests.

## Architecture

- `app/main.jsx`, `app/styles.css`: responsive React studio, editor, library, brand settings and improvement journal.
- `server/index.mjs`: Express API, local storage, media imports/uploads, job management.
- `server/core.mjs`: deterministic storyboard, validation and quality rules.
- `server/render.py`: Pillow text composition plus FFmpeg video/audio pipeline.
- `scripts/dev.mjs`, `scripts/setup-renderer.mjs`: cross-platform developer startup and renderer setup.
- `tests/app/`: unit and full browser integration checks.

Next recommended implementation order: provider adapters with explicit costs/consent; transcript alignment; a richer scene timeline; then authenticated production storage and publishing. Each app iteration should preserve the rendering and feedback regression tests.
