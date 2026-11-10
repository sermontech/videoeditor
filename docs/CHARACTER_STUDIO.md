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
- Additional 3D formats, Ready Player Me/MetaHuman adapters and optional 3D renderer
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
yet support integrated 3D MP4 export, FBX/MetaHuman, generative poses or lip-sync. VRM support is described below.
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

## Football kit designer — concept material release

**3D studio → Football kit designer → Apply football kit** works independently
of the Football environment selector. The demo has predefined jersey, shorts
and sock sections. Choose solid/stripes/hoops/sash/halves, five colours, a player
name (20 characters) and number (0–99, optional). Toggle lettering off for clean
concepts. Generated 1024px jersey textures respond to the existing scene lights.

Competition suggestions cover major regional leagues, women's leagues and
international tournaments. Club/national-team and season fields accept custom
text. Home/Away/Third/Goalkeeper/Special/Historical are organizational labels;
changing these labels does not download a real kit or select official colours.
**No official, season-accurate, licensed or club-specific assets are bundled.**
Every design is explicitly marked Concept / stylized. No sponsor/manufacturer
logos, crests, competition patches or verified licensing badges are included.

Imported GLBs: assign one existing mesh per jersey/shorts/socks slot manually.
The system does not infer clothing or add garments to a bare/combined body mesh.
Patterns and lettering follow existing UVs; accurate placement can require UV
editing outside Clear Take. Original materials restore when kit mode is disabled;
new model imports reset mappings. No fabric physics, wrinkle generation, automatic
body fitting, collars, armbands or patches yet. Demo boxes are not realistic cloth.

Kit choices persist in downloaded scene JSON, remain unchanged when backgrounds
change, and appear in PNG/WebM exports. Old scenes without kit settings still
load. These browser-only features need no database migration or worker update.

Verified: 28 unit tests, build, browser demo kit editing/scene restore/export and
full FFmpeg decode of the recorded kitted-character WebM. Screenshot inspection
confirmed jersey stripes, number and independent shorts/socks. Imported garment
UVs and real Windows performance remain unverified. Global official asset
coverage, licensing/season-update pipeline and automatic dressing remain backlog.

## Motion presets, camera moves and local MP4 conversion

The built-in robot now has shoulder/hip pivots and five procedural presets:
idle, wave, walkout-in-place, celebration and warm-up. These are stylized
mathematical motions, not mocap, foot IK or ball control. Imported GLBs keep
using their own clips; no automatic rig retargeting is claimed.

Static/manual, gentle orbit, dolly-in/out and side-to-side tracking work with
both demo and imported models. Frame manually first, then select a move. Preset
speed (0.5–2×) affects camera/demo motion, not imported clip playback. Camera
paths are bounded but are not collision-aware: review framing in small rooms.
Motion settings persist in scene JSON. Playback pause stops preset motion;
export restarts it from zero. The kit follows the demo's animated limb meshes.

MP4 conversion is now available as a separate local command, not one-click cloud
export. After `git pull --ff-only` in the Windows checkout, with renderer
requirements already installed, use PowerShell:

```powershell
npm run convert:3d -- "$HOME/Downloads/clear-take-3d.webm" "$HOME/Downloads/clear-take-3d.mp4"
```

Append `--audio "C:/path/to/your-audio.mp3"` for an audio track you own/have
permission to use. The optional audio replaces original audio, is loudness
normalized and padded/trimmed to the video. Existing output files are never
overwritten. Input limit 200 MB video / 100 MB audio; output is capped at 30
seconds and 1920px per dimension, H.264/yuv420p 30 fps with AAC audio and fast
start. The converter uses existing local FFmpeg/Python dependencies and strips
cloud credentials from its environment. No local network listener or API needed.
This does not provide lip-sync, music generation, or licensed audio packs.

Verified on Linux: 31 units, browser celebration/orbit settings restoration and
WebM capture, real WebM→MP4 conversion with and without audio, full FFmpeg decode,
and an automated overwrite-protection test. Windows execution still requires a
real-device check. Browser conversion guidance is in the 3D export section.


## VRM avatars and model inspection

The 3D studio now imports self-contained `.vrm` binary files as well as `.glb`.
The pinned MIT-licensed `@pixiv/three-vrm` 3.5.5 loader initializes VRM avatars,
normalizes legacy VRM orientation and updates the avatar runtime during playback.
Existing 30 MB/resource/geometry limits still apply. Scene files preserve the
original bytes, including VRM extensions. Imports remain browser-local.

A downloadable inspection report shows format, file size, mesh/material/skin
counts, vertex references, morph-target counts, embedded clips and missing UV
warnings. These counts are estimates, not a GPU benchmark or license clearance.
Check the avatar author's actual permissions before publishing.

For local command-line inspection:

```powershell
npm run inspect:model -- "C:/path/to/avatar.vrm"
```

Pinned MIT-licensed `@gltf-transform/core` 4.5.1 performs an additional structural
read for extension-free GLBs. Extension-bearing files receive metadata inspection
only. No automatic optimization/rewrite is performed, to avoid stripping VRM
metadata. The unused functions package was removed rather than shipping unused
optimization dependencies. Avatar/model licenses are separate from code licenses.

Validation: 33 unit tests and production build pass. The mocked-auth browser
suite passes with real software WebGL, including an original minimal synthetic
VRM 1 import and portable scene round-trip; local GLB and VRM inspection commands
were exercised. This does not validate realistic skinned avatars, legacy VRM 0,
MToon textures, spring-bone behavior or performance on the user's Windows Iris Xe.
No rig retargeting, speech generation or audio-driven lip-sync is included yet.
The lazy 3D bundle is about 838 kB minified and still triggers the size warning.

## Local audio-driven VRM lip-sync preview

`wawa-lipsync` 0.0.2 (MIT, exact-pinned) now analyzes local audio with Web Audio
and maps approximate visemes to available VRM `aa`, `ee`, `ih`, `oh`, `ou`
expressions. Import a compatible VRM, choose **Lip-sync audio**, ensure animation
is playing, then click **Play lip-sync audio**. WAV/MP3/M4A/OGG/WebM files up to
30 MB are accepted; decoding depends on the browser. No audio is uploaded and
no microphone permissions are requested. Music and noise can produce incorrect
mouth shapes: this is not transcript-aligned phoneme detection.

Stop, animation pause, recording start, avatar replacement and studio unmount
stop the preview. Replacing/unmounting releases the blob URL and AudioContext.
The package lacks public resume/disposal methods, so a small documented adapter
accesses those runtime properties of the pinned version; upgrades need review.

This is **preview only**: audio is not included in scene JSON, and starting WebM
recording stops it. It is not a lip-synced video export workflow. Text-to-speech,
Kokoro model installation and real Windows performance testing remain pending.
The earlier statement that no audio-driven lip-sync exists is superseded by this
limited preview integration; production-quality facial animation is not claimed.

Validation: 36 unit tests pass, including viseme bounds, silence/reset, available
expression filtering and analyzer lifecycle. The browser integration suite uses
real Web Audio with an original PCM test tone and a synthetic VRM with empty
expression definitions to exercise import, audio play/stop and scene restoration.
It does not validate visible mouth deformation or speech accuracy on a real avatar.
Production build passes (the approximately 846 kB 3D bundle size warning remains).

## Official kit priority

Official catalogue, automatic dressing, cloth/contact and practical local
photorealistic video are core priorities, not delivered by the previews above.
See [Official kit priority gates](OFFICIAL_KIT_PRIORITIES.md) for requirements,
remaining dependencies and acceptance evidence. The studio now includes a local
rights-intake register; it starts with zero verified assets and cannot approve
licenses or load official kits. Export intake JSON before leaving the studio.
