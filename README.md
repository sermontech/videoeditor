# AI Video Editor / Clear Take Studio

## Cloud deployment

See **[Render + Vercel deployment guide](docs/RENDER_DEPLOYMENT.md)** for the authenticated cloud API, background worker, environment variables, invite-only membership and acceptance checks. `Dockerfile` and `render.yaml` configure the two Render services. Both Supabase migrations have been applied to the selected Seler Ecommerce project; hosted services and real-account checks are still pending.

## Creator app

The repository now includes **Clear Take**, a working creator studio with projects, media uploads, editable storyboards, brand settings, MP4 rendering and a transparent per-generation review loop.

```sh
npm ci
npm run setup:render
npm run dev
```

See **[CREATOR_STUDIO.md](CREATOR_STUDIO.md)** for Windows-compatible setup, features, tests, storage and security limitations. The app is single-user and local-first; external AI providers are not connected. `npm test` now runs app unit tests; historical tool smoke checks use `npm run test:tools`.

---

The following records the original standalone editing-tool setup.

## Workspace

Created in `/home/user/videoeditor/AI Video Editor`:

```text
AI Video Editor/
├── Raw footages/
├── References/
└── Exports/
```

These are Arena workspace folders, **not folders on your personal computer**. Media, local tool installations and generated videos are Git-ignored. Keep your own backups of media. Node dependencies and build directories may need reinstalling after the workspace is restored.

## Verified 2026-11-09

| Tool | Installed version | Test result |
|---|---|---|
| Remotion | 4.0.541 | Rendered and probed a one-second H.264 MP4 |
| HyperFrames CLI | 0.9.26 | Lint: zero errors/warnings; rendered and probed a one-second MP4 |
| FFmpeg | n9.0.2-17-g2a571b6068-20260930 | Generated H.264/AAC video and decoded it without errors |
| whisper.cpp | 1.9.5-dev, commit f92e1e4d1056700c39d4e86c1140f0a088fe1ab6 | Built CPU CLI from source; help works. **No trained model installed; transcription not verified.** |
| yt-dlp | 2026.10.26 | Listed extractors and downloaded a local file URL; byte-for-byte comparison passed. External video websites not tested. |

`npm run test:tools` repeats the standalone render, decode, probe, Whisper CLI and local download checks. It does **not** certify speech recognition or external website downloads. Tests and logs live in `.tools/`. No user footage was needed for these synthetic tests.

## Use installed tools

From the repository root in Bash:

```bash
source scripts/env.sh
ffmpeg -version
ffprobe -version
remotion --help
hyperframes --help
whisper-cli --help
python3 -m yt_dlp --version
npm run test:tools
```

Rendering uses npm-packaged Chromium 153 with its bundled Linux libraries, software rendering, and one worker. HyperFrames telemetry was disabled. FFmpeg was installed from the `imageio-ffmpeg` Python wheel; FFprobe comes from Remotion's compositor package. These are local executables, not a system-wide OS installation. HyperFrames is the CLI, not its desktop application.

## Remaining requirements

- Obtain a compatible trained whisper.cpp GGML model from the official model distribution, normally linked by `whisper.cpp/models/download-ggml-model.sh`, and place it under `.tools/models/`. The normal model host is outside this environment's allowed network hosts. The tiny files named `for-tests-*` in the source tree are **not trained speech models**.
- Then test real transcription, for example:
  `whisper-cli -m .tools/models/ggml-base.en.bin -f .tools/whisper.cpp/samples/jfk.wav`.
- External downloads require network access to the source website and permission to download the material.
- For installation on your own computer, OS-specific instructions are still required. Nothing here changed your personal computer.

## Reinstallation notes (this Linux workspace)

Node packages: `npm ci` (requires Node 22+). Python packages were installed with:

```bash
python3 -m pip install --break-system-packages --target .tools/python imageio-ffmpeg==0.8.1 yt-dlp==2026.10.26 cmake==4.4.4
```

Whisper source is cloned at `.tools/whisper.cpp` from https://github.com/ggml-org/whisper.cpp and built using CMake, GCC/G++, and Make:

```bash
PYTHONPATH="$PWD/.tools/python" .tools/python/bin/cmake -S .tools/whisper.cpp -B .tools/whisper.cpp/build -DCMAKE_BUILD_TYPE=Release -DWHISPER_BUILD_TESTS=OFF -DWHISPER_CURL=OFF
PYTHONPATH="$PWD/.tools/python" .tools/python/bin/cmake --build .tools/whisper.cpp/build -j 4
```

The `.tools/bin/` links point to the installed FFmpeg, Remotion FFprobe, and built whisper-cli. Chromium's `al2023.tar.br` from `node_modules/@sparticuz/chromium/bin/` was Brotli-decompressed and extracted into `.tools/chrome-libs/` to supply missing runtime libraries. `scripts/env.sh` configures executable and library paths.

An npm override pins HyperFrames' transitive `undici` dependency to 7.30.1 to resolve reported security advisories. Final `npm audit` returned zero vulnerabilities. Review each tool's license before commercial use.
