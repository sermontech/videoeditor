# Character-first Clear Take: local-first rollout

## Implemented first slice

Scene editor: choose a reusable image from existing private media, independently
of the background. Set left/center/right placement and still/gentle-float motion.
Apply the character to all scenes. Transparent PNGs preserve alpha; photographs
keep their background (no automatic cutout). Upload using the existing media button.

The editor shows an approximate character-layer preview. Export uses Pillow and
FFmpeg on the Windows worker, preserving original artwork rather than generating
new poses. Text space is reduced to reserve room for the character; long dialogue
may need shortening. Export text fitting fails explicitly instead of cropping it.
Current export remains MP4 in portrait, landscape, or square. Native-size small
images may appear smaller in exports than in the approximate preview.

Character selection is stored in existing scene JSON: characterId,
characterPosition, characterMotion. No database migration is necessary. Both APIs
validate image references; the cloud worker independently checks ownership,
private object paths and asset kind, and includes character inputs in its existing
selected-media size limit. Existing projects without characters still work.

This is 2D compositing, NOT generative AI video, lip-sync, face embeddings,
automatic relighting, background removal, or physics simulation. Only use assets
and likenesses you have permission to use. No new AI model downloads or paid
services have been introduced.

## Rollout

1. Wait for active jobs to finish, then stop the Windows worker with Ctrl+C.
2. In the Windows repository on arena/edccf97e-videoeditor, run:
   `git pull --ff-only`.
3. Restart with the existing scripts/start-windows-worker.ps1 launcher.
4. Deploy the latest commit from that same branch to the Render API and Vercel
   frontend project videoeditor-nb9j. Do not redeploy old main code.
5. Upload a transparent PNG, choose it under 2D character animation, use a short
   scene with gentle float, save, render, and inspect the downloaded MP4.

Updating the worker is mandatory: an old worker will ignore character layers.
No Windows installation or remote production deployment was performed by the
code changes themselves.

## Verification

20 Node unit tests, Vite build, existing cloud integration with real FFmpeg,
and tests/app/character-render.py passed on Linux. The character smoke test
creates transparent artwork, exports a real portrait MP4, decodes frames and
asserts character visibility and vertical movement. Windows end-to-end rendering
and browser interaction with the new controls remain to be verified.

## Full PRD backlog (not implemented in this slice)

- Dedicated character records, consent records, reference galleries and versioning
- Photograph-to-character, text-to-character and curated licensed character packs
- Local-model benchmarking on Intel Iris Xe / 32 GB RAM; no CUDA assumptions
- Background generation and reference conditioning; weather/time/palette controls
- Depth-aware layers, perspective, scale and lighting alignment
- Camera paths, richer motion, speech synthesis and lip-sync
- Licensed music/SFX library and dialogue tools
- 4:5, WebM and GIF; 5–30 second character-focused projects
- Direct social publishing with per-platform OAuth/API permissions
- 3D formats, VRM/Ready Player Me/MetaHuman adapters and optional 3D renderer
- Multi-character composition, physics-aware interactions and identity evaluation
- Generation history/refinement, export/share metrics, retention and billing

Heavy generative video on the user's integrated GPU is not a promised capability.
A local model must pass installation, license and performance checks before its
controls are exposed as working features. Existing feedback changes editing
preferences; it does not train AI models.

## 3D preview workspace (next increment)

The sidebar now has **3D studio**. A procedural demo robot provides immediate
3D animation playback. Import a self-contained, uncompressed GLB (glTF 2.0,
maximum 30 MB), select its embedded animation clips, pause/play, orbit/pan/zoom,
change the environment colour, reset the camera or download a PNG screenshot.
No external model URLs are fetched; metadata rejects URI-based resources.
Files are browser-session-only: they are not uploaded, persisted, or attached to
render jobs. Models without clips do not gain new body animations. This does not
yet support 3D MP4 export, VRM/FBX/MetaHuman, generative poses, lip-sync or physics.
Three.js loads only when the workspace opens. Large textures/models can still
stress integrated graphics; use small trusted assets. The GLB limits are basic
resource safeguards, not a guarantee against all GPU-memory exhaustion.

Verified: 21 unit tests, Vite build, and headless browser checks with software
WebGL for workspace navigation, canvas creation, pause, invalid GLB rejection,
PNG download and sign-out cleanup. Imported production character rigs and Intel
Iris Xe performance still need real-device testing.

## Portable scenes and local WebM exports

The 3D studio now offers **Save scene file**, **Open scene file**, and **Export
WebM video**. A versioned JSON scene includes the original embedded GLB, camera
position/target, selected animation, playing state, background, duration and
aspect ratio. Keep this downloaded file: there is no automatic browser or cloud
persistence. To restore a demo scene after importing another model, leave the
workspace and reopen it first. Animation playback time is not saved.

WebM exports are silent, real-time browser captures at up to 30 fps, with
5/10/15/20/30-second duration choices and 16:9 (1280×720), 9:16 (720×1280),
1:1 (720×720), and 4:5 (720×900). Export restarts the selected animation; rest
poses stay still. The chosen ratio determines export framing (the interactive
viewport itself is responsive). Camera edits/imports are locked during capture.
Keep the tab visible; hiding it cancels the export. Cancel or leaving the workspace
releases capture tracks and timers. Browser/GPU load can reduce frame rate or
alter timing; this is not an offline frame-exact renderer. No audio or MP4
conversion is provided yet. Use Chrome/Edge with canvas capture/WebM support.

Verified on Linux software WebGL: 23 unit tests, build, browser scene-file
roundtrip and actual five-second demo WebM download, followed by full FFmpeg
decode. Windows performance and imported-rig recording remain to be tested.
This supersedes the earlier preview-only status; cloud history, MP4, lip-sync,
AI generation and advanced PRD features remain pending.

## Football Background Preset System — first procedural release

In **3D studio → Content mode → Football**, browse 33 original presets in six
categories: Studio (5), Stadium (8), Training (5), Lifestyle (7), Stylized (5),
and Branded (3). Search names or content workflows. All entries build actual
low-poly scene geometry using shared layout families, not downloaded venue
photos. Sets include pitch markings, goal nets, cones/mannequins, stands,
tunnels, benches, lockers, interview panels and other scenario-specific props.
Palette/layout variations are deliberate; these are stylized prototypes rather
than photorealistic broadcast-ready venue reconstructions. White studio is a
simple floor/backdrop approximation, not an infinite curved cyclorama.

Controls: primary/secondary team colours; lighting intensity; stylized crowd
amount for stadium layouts (empty stadium stays empty); optional pulsing emissive
accent panels where present; composition safe-zone guide; model horizontal,
depth and ground offsets, rotation and scale; reset fit. The generic safe-zone
guide is preview-only and is not a platform-specific overlay or burned into video.
Choosing the vertical social preset sets the export ratio to 9:16.

Imported models normalize to 1.8 scene units in height and are translated using
their rest-pose bounds. They share the environment camera, lighting and directional
shadow map. This preserves the imported mesh/materials; it does not infer feet,
fix root-motion animation, automatically re-light baked photographic textures,
or guarantee perfect intersections. Use manual offsets for unusual rigs,
seated models and equipment. Colour controls affect the environment, not kits.

Presets and adjustments persist inside downloaded scene files and appear in PNG
and WebM exports. Files created before football settings existed still open.
Workflow tips are suggestions only: no walkout/celebration clips or licensed
audio beds are bundled. Supported embedded model animations continue to play.
No club crests, sponsor trademarks, venue scans or copyrighted imagery included.

Verified: 26 unit tests (all 33 builders, parameter bounds, fitting and scene
validation), frontend build, headless software-WebGL interaction selecting a
tunnel, colour editing, saved-scene restore, and actual football WebM export
with full FFmpeg decode. Intel Iris Xe performance remains a real-device check.

Remaining requirements: photorealistic environments and HDR lighting; accurate
foot IK/contact and ambient occlusion/reflections; independent time/weather
controls; animated crowds; moving cameras/preset audio and animation assets;
custom venue reconstruction; multi-player layouts; licensed official branding;
kit-aware recolouring. Presets currently apply only to the 3D workspace, not the
separate 2D card renderer. No backend migration or worker upgrade is needed.
