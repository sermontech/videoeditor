# Open-source investigation: useful feature paths, not automatic feature parity

GitHub repository search and repository/source inspection were performed in this
workspace. Public source was read directly; REA was used for shipped-package
inspection and a native backend smoke test. No proprietary application was
copied, no access control bypassed, and no third-party source was incorporated
into the app by this investigation. Clones are in ignored `.tools/research/`.

## Findings with reproducible source references

### OpenCut Classic — export and audio scheduling (MIT)

Source revision: `cf5e79e919144200294fb9fed22a222592a0aeea`.
Repository: https://github.com/opencut-app/opencut-classic

Read:
- `apps/web/src/services/renderer/scene-exporter.ts`: creates Mediabunny output,
  attaches canvas video and optional decoded audio, renders frames against an
  explicit timeline, supports cancellation/progress, closes sources and finalizes
  the muxer. Includes an AAC capability check and alternate audio-codec choice.
- `apps/web/src/core/managers/audio-manager.ts`: separates playback scheduling
  from the render UI, uses look-ahead scheduling, session identity, decoded-buffer
  caching and explicit disposal.
- `apps/web/src/media/audio-mastering.ts`: a shared gain/limiter chain for playback
  and offline processing, plus peak checks. This is not itself a measured LUFS
  guarantee.

Application: use these architectural ideas for a shared Clear Take audio timeline,
not a wholesale editor replacement. First acceptance target is a 10-second
licensed presenter with narration, visible mouth motion and both streams in the
export. Measure A/V alignment, duration, cancel/retry and resource cleanup.
The current lip-sync preview and silent capture path do not meet that target.

Important discovery: https://github.com/OpenCut-app/OpenCut at
`e668010778568641babef2cc40be4703ae6916d6` is now a Rust-core rewrite. Its README
points to Classic for current usage. Do not treat rewrite roadmap features as
working features or assume the original web editor paths still live there.

### Mediabunny — browser encoding/muxing (MPL-2.0)

Source revision: `01eebb87c2bc34b79b9af60c45cb091615700ba5`.
Repository: https://github.com/Vanilagy/mediabunny

Inspected `src/output.ts`: separate video/audio/subtitle tracks, output lifecycle
states, start/finalize/cancel handling. The tree includes codec, media-source,
media-sink, conversion and format implementations. This is a stronger path for
controlled export than assuming MediaRecorder always has the required codecs.

Application: codec capability preflight, explicit timestamps, muxed audio/video,
cancel/progress UI, FFmpeg fallback. Browser/device tests are essential, especially
on Iris Xe. The current upstream LICENSE is **MPL-2.0**, not a blanket MIT license.
Review obligations for distributed/modified covered files before integrating a
specific version. Not installed into application dependencies in this task.

### wawa-lipsync — shipped runtime inspection (MIT)

Source revision: `312dc31a1ee998248aae3431474f455bfc3ae3e1`.
Repository: https://github.com/wass08/wawa-lipsync
Artifact: npm `wawa-lipsync@0.0.2`, `dist/wawa-lipsync.es.js`.

Source `packages/wawa-lipsync/src/lipsync.ts` confirms `connectAudio` creates a
MediaElement source, routes it through an analyser to the destination, and
`processAudio` infers approximate visemes. Its source exposes no public disposal
method. This explains the existing pinned-runtime adapter and why it needs
upgrade tests. A separate recording branch must share the audio graph and clock,
not play an unrelated soundtrack after recording stops.

REA static analysis of that distributed ES module produced a sealed evidence
bundle at `.tools/rea/wawa-evidence.json`, parent evidence ID:
`ev_4711c38a978001778e96d9c5b5601fce2830ee92a1707595ee1ccc64885b80e4`.
This is static evidence, not proof of speech accuracy or runtime equivalence.
Three other inventoried files were explicitly outside the selected analysis scope.

### Kokoro — local narration candidate (not installed/tested)

Repository: https://github.com/hexgrad/kokoro
GitHub metadata identifies Apache-2.0; README describes the 82M model, KPipeline,
Python installation and espeak-ng dependencies, including Windows guidance.
This was README/metadata review, not model inference or a hardware benchmark.
Model weights, voice files and dependencies need their own license checks.
Use a supervised local worker job with cancellation and versioned assets; do not
promise latency or claim installation from reading a README.

## Ranked implementation backlog

1. **Talking-presenter export:** one audio clock; resettable viseme timeline;
   muxed output; actual mouth-deforming licensed VRM fixture; seek/cancel/pause
   semantics; decode and inspect exported frames/audio on Windows.
2. **Music + SFX mixing:** per-track gain, fades, ducking, clipping detection,
   consistent offline/export mix, attribution packaged with output. Rights intake
   and source evidence remain attached to each asset.
3. **Local narration and captions:** pronunciation overrides for players/clubs;
   model/version pinning; word timing and editable captions; CPU/Intel benchmarks.
4. **Editing robustness:** undoable timeline operations, autosave and restore,
   proxy/waveform caching, explicit resource budgets, reusable export presets.
5. **Factual workflow:** primary match-data connectors with permitted usage;
   source-linked claims, corrections and freshness checks before narration.
6. **Kit/dressing/physics:** still governed by OFFICIAL_KIT_PRIORITIES.md. None of
   these media repositories supplies universal licensed kits, guaranteed arbitrary
   character fitting, or physically realistic cloth/contact without engineering.

Each item needs implementation, tests and license review. This tooling/research
increment does not deliver these app features, generate licensed assets, or make
photorealistic local AI practical by itself. Commercial/remote tooling is not
enabled implicitly. Prefer source-level study when source is available; native
reverse engineering is an optional evidence path, not a prerequisite or shortcut.
