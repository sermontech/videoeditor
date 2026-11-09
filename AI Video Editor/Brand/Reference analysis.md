# Reference analysis & original editing direction

**Review draft 01 · 9 November 2026**

## Scope and confidence

Reviewed all three uploaded files through frames sampled every three seconds across their full durations, plus selected higher-resolution stills. Container metadata and whole-file audio loudness were measured with FFmpeg. Scene-change detection was used only as a diagnostic: camera movement in the supermarket clip triggers many false positives, while a partial-panel change may fall below the threshold. **No exact cut-rate or frame-accurate transition audit is claimed.** Timestamps below are approximate visual anchors, not an edit decision list.

This is a visual and technical-audio review, not a complete listening review. Music identity, genre, BPM, individual effects, speech transcription, and audio-to-cut synchronization remain unverified. Font families cannot be reliably identified from compressed exports; font descriptions are visual classifications. Recommendations below are new design choices, not claims about the references.

## 1. What the files show

| File | Duration | Video | Integrated loudness | True peak estimate | Loudness range |
|---|---:|---|---:|---:|---:|
| KOMBO (@ultimatekombo2) _ TikTok.mp4 | 2:41.20 | 576 × 1024, 30 fps | −14.4 LUFS | −0.5 dBTP | 6.0 LU |
| TikTok - Make Your Day.mp4 | 2:58.17 | 576 × 1024, 30 fps | −14.8 LUFS | +1.2 dBTP | 9.4 LU |
| bi_benard (@bi_benard) _ TikTok.mp4 | 2:59.28 | 576 × 1024, 25 fps | −18.8 LUFS | −3.8 dBTP | 6.9 LU |

All are 9:16 H.264 exports with stereo 44.1 kHz AAC audio reported at approximately 32 kb/s. These are compressed reference copies, not desirable mastering targets. FFmpeg ebur128 true-peak results are shown as dBTP here; the tool labels its peak output dBFS. Positive reconstructed peaks in the Eric export indicate limited headroom; they do not establish that audible clipping is present.

### A. KOMBO — persistent context, energetic presenter

- **Composition:** a football headline/table graphic fills roughly the upper third; presenter occupies the larger lower area. The same topic graphic remains visible throughout the sampled timeline.
- **Typography:** the graphic uses narrow, bold, uppercase sports-headline lettering with smaller table labels. No recurring dialogue captions are visible in the samples.
- **Colour:** strong red, blue and yellow from clothing and football artwork against a warm interior. This is not evidence of a deliberately limited editing palette.
- **Pacing:** stable overall layout from approximately 0:01 to 2:40. Facial expression, hand gestures and body movement provide most of the visible variation. No major full-frame scene change passed the diagnostic threshold; that does not prove there are no jump cuts.
- **Zooms/motion:** some apparent size changes may be the presenter leaning toward the camera; do not treat them as confirmed digital zooms. The top graphic is visually persistent rather than a succession of animated overlays.
- **Keep:** instantly readable subject context and a strong human focal point.
- **Improve for our version:** replace small table text with one legible fact; add accessible captions and let the presenter occasionally fill the screen.

### B. Eric reference — source clip, interpretation, emphasis

The generic filename is associated with the Eric reference by the visible end card naming Eric Gugua, rather than by the filename alone.

- **Structure:** approximately 0:00–0:09 presenter plus source inset; 0:09–1:06 supermarket source footage fills the frame; from about 1:07 the presenter returns as the main view. Source inset briefly returns around 1:34–1:38. A promotional card appears around 2:55.
- **Typography:** large white sans-serif phrase captions in the presenter segments, with selected words enlarged or heavier. Occasional contrast in type styling, including a finer serif-like emphasis near 2:49. Source-footage captions are smaller, often white or yellow; these should not be confused with the presenter's own caption system.
- **Colour:** restrained taupe, charcoal and warm skin tones in the studio; stronger red/yellow in the source footage; warm red/orange in the end card. A short monochrome treatment is visible around 1:55.
- **Pacing:** larger structural changes between evidence and interpretation, with caption changes maintaining activity inside relatively sustained presenter shots. The long source segment is not a rapid montage.
- **Zooms/motion:** visible framing changes and expressive movement, but the sampling does not establish precise zoom curves. Word-size emphasis, inset placement, monochrome treatment and the end card are clearer verified devices.
- **Keep:** evidence first, then a clear personal viewpoint; captions that prioritize meaning rather than decoration.
- **Improve:** maintain consistent caption spacing and sufficient audio headroom; use only the source excerpt needed to make the point.

### C. bi_benard — stable host, changing evidence

- **Composition:** presenter occupies the upper portion; supporting football imagery occupies the lower portion, often with blurred side-fill. A small creator mark is visible at upper right.
- **Typography:** condensed uppercase text belongs mainly to the opening supporting graphic, with white lettering and yellow emphasis. Recurring dialogue subtitles are not visible in sampled frames.
- **Colour:** purple-lit room, white clothing, dark background panels and neutral football imagery. The purple environment is an individual signature, not a shared palette across all three.
- **Pacing:** the presenter panel stays consistent while the lower panel updates. Approximate sampled changes: opening quote card until 0:26; player portrait near 0:29; touchline image near 0:59; distressed player near 1:26; coach portrait near 1:50; touchline image again near 2:08; player portrait again near 2:41. Boundaries need frame-level confirmation before reuse as edit timings.
- **Motion:** supporting stills hold for tens of seconds; body language carries activity. No basis to claim continual flashy transitions.
- **Keep:** supporting images change when the point changes, while the presenter remains easy to follow.
- **Improve:** avoid permanently sacrificing half the screen to a still; bring evidence in only when useful and add dialogue captions.

## 2. Shared style — and what is not shared

**Shared:** vertical framing; a visible presenter; contextual imagery; sustained layouts; expressive delivery; strong contrast between person and supporting material. The practical principle is **keep the speaker recognizable and the subject understandable**.

**Not shared:** one exact font, one colour palette, continuous captions, a standard split-screen ratio, a verified zoom cadence, or a verified music/effects package. Eric's captions should not be attributed to all three. The two football examples do not mean the user's brand must be about football.

The main retention mechanism appears visually to be presentation and context, not a new transition every second. We should preserve the speaker's rhythm rather than impose an arbitrary rapid cut rate.

## 3. Original direction: CLEAR TAKE

**Working creative direction, not a confirmed brand name.**

Positioning: **A clear point. The context behind it. Your own perspective.**

Character: warm, direct, informed and human. Borrow the explanatory structure, not the creators' logos, catchphrases, team colours, set design, source graphics or exact caption layouts.

### Palette

- Ink `#14272B` — main background, caption backing, dark type on light cards.
- Paper `#F6F2E9` — main text and evidence-card surface.
- Mint `#B8E3CC` — one emphasized phrase, evidence label, underline.
- Clay `#D98B70` — occasional counterpoint marker or small accent, not long body copy.
- Slate `#A5B6B5` — metadata on dark backgrounds.

Use roughly 70% neutral picture/ink, 20% paper and 10% accents in graphic elements; do not tint real footage to satisfy the ratio. Never place small mint or clay text directly on paper. Preserve natural skin tones.

### Type and captions

Proposed production fonts: **Manrope Bold/Semibold** for captions and headings; **Source Serif 4 Italic** only for rare editorial quotes. These are chosen for this brand, not identified reference fonts. The PDF uses built-in Helvetica/Times equivalents for portability, so final font appearance still requires approval and font installation.

1080 × 1920 baseline:
- Hook: 76–88 px, bold, sentence case, maximum two lines.
- Dialogue: 58–66 px, semibold/bold, 3–7 words per card, maximum two lines; shorten the phrase before shrinking the type.
- Source/context label: 30–36 px, medium.
- Caption treatment: paper text on a compact ink backing; one mint phrase per card, no rainbow word cycling. Padding about 18 px; corner radius about 12 px.
- Time cards to actual phrases. Starting hold range 0.8–2.2 seconds, extended for longer text; synchronize by listening before export. Never fabricate or change the speaker's meaning to fit a card.
- Keep captions clear of the mouth, hands where meaningful, and supporting evidence. In solo view, start with the caption box around y=1240–1510 and adjust to the shot.

### Layout system

Do not permanently copy either reference's upper/lower split.

1. **Viewpoint:** presenter fills the vertical frame; small context label near the upper-left safe area.
2. **Receipt:** presenter still leads; a temporary paper evidence card appears below or beside them when space permits. Caption placement shifts rather than overlaps. For dense evidence, cut to a readable full-screen crop with a small presenter inset.
3. **Takeaway:** presenter returns full-frame; one short mint underline or keyword supports the conclusion.

At 1080 × 1920, start critical-content bounds at x=90–900 and y=180–1570. This is a conservative working area, not a guaranteed platform specification. Check the actual TikTok/Reels UI before delivery. Keep credit visible, but remove or replace irrelevant interface clutter only when permitted; do not erase attribution to imply ownership.

### Cuts, pacing and zooms

- Cut on a completed thought or a clear change of argument; remove dead air without making speech breathless.
- Suggested presenter holds: 4–8 seconds when delivery supports them. A visual reset every 6–12 seconds is a starting option, not a mandatory rule.
- Evidence card: 3–6 seconds for a simple fact; longer for reading. Use the shortest sufficient excerpt, with context intact and rights checked.
- Punch-in: 100% to 106–110%, one emphasis per important beat, typically no more than 2–3 per 30 seconds. Source resolution must support the crop. The supplied 576p references are not quality sources for new edits.
- Prefer direct cuts. Evidence entry: 180–240 ms, 16–24 px movement plus fade, ease-out. Exit: 120–180 ms fade. At 30 fps, round to whole frames in implementation.
- A quote can receive one brief treatment; avoid copying the reference's particular monochrome joke or caption wording.
- No default whip transitions, constant bouncing text, spin zooms or random stickers.

### Sound direction — proposed, not reverse-engineered

The measured loudness differs materially, so there is no single shared audio master. Music presence, style and sound effects remain unverified.

- Make intelligible voice the priority. Music is optional; silence under a strong statement is acceptable.
- If used: licensed, low-density instrumental without competing vocals; choose tempo after hearing the delivery, not from an assumed reference BPM.
- Start music around 18–24 dB below dialogue and duck a further 3–6 dB when needed. These are starting mix decisions, not guaranteed settings.
- One subtle tick on an evidence reveal; a soft transition sound only for a genuine structural change. No effect on every caption.
- Aim for approximately −16 to −14 LUFS integrated and ≤ −1 dBTP on the final mix. This is a house target, not a TikTok requirement. Check after AAC encoding and listen on a phone, headphones and at low volume.
- Review noise reduction and compression by ear; do not over-process breathing or room tone.

### Example 30-second structure

| Time | Purpose | Picture / text | Sound proposal |
|---|---|---|---|
| 0–3s | State a clear tension | Presenter full-frame; short hook | Voice only |
| 3–8s | Give essential context | Single temporary evidence card | Optional soft reveal tick |
| 8–17s | Explain your position | Presenter; phrase captions; one motivated punch-in | Voice; optional low bed |
| 17–24s | Address the counterpoint | Replace card only if the argument needs it | Duck bed under key phrase |
| 24–28s | Deliver takeaway | Full-frame presenter; one mint keyword | Let the sentence land |
| 28–30s | Invite a response | One specific question, not a long logo outro | Clean ending |

This is a new shorter-format template. The uploaded references are approximately 2:41–2:59; longer videos should repeat the context–viewpoint–evidence cycle rather than compress every argument into 30 seconds.

## 4. Review decisions and next test

Please approve or adjust: (1) Ink/Paper/Mint palette; (2) captions on every spoken section; (3) temporary evidence cards instead of a permanent split; (4) optional minimal music rather than a heavy soundtrack. Brand name and niche remain open.

Next production test: apply the approved system to 15–30 seconds of the user's own raw footage. Verify speech timing, reading speed, skin tones, source attribution and phone UI safe areas. A full listening pass is required before locking sound design. Source files remain unmodified in References; reference excerpts in the PDF are for review, not assets to publish as the user's brand.
