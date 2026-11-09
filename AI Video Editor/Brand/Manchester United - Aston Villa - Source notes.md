# Manchester United 4–4 Aston Villa — video source notes

Research checked: 9 November 2026. Final video: `AI Video Editor/Exports/Manchester United vs Aston Villa - 4-4 - Clear Take.mp4`.

## Sources consulted

[2](https://www.espn.com/soccer/match/_/gameId/401879240) — ESPN match centre, 8 November 2026. Read the score summary, scorer list and commentary, including the 90+6 goal and assist entries. Primary event ledger for this recap.

[5](https://www.aljazeera.com/sports/2026/11/8/man-united-earn-4-4-draw-against-aston-villa-but-remain-in-relegation-zone) — Al Jazeera Staff and AFP report, 8 November 2026. Independently cross-checks the result, venue, early scoring sequence, first six scorer timings and the two late goals. Exact stoppage-time notation and Dorgu's credited assist are taken from ESPN.

## Fact ledger

Scores below are always Manchester United first, Aston Villa second.

| Event | Score after event | Support |
|---|---|---|
| Premier League, Old Trafford, 8 November 2026 | Final: 4–4 | [2](https://www.espn.com/soccer/match/_/gameId/401879240), [5](https://www.aljazeera.com/sports/2026/11/8/man-united-earn-4-4-draw-against-aston-villa-but-remain-in-relegation-zone) |
| Alysson, 1′ | 0–1 | [2](https://www.espn.com/soccer/match/_/gameId/401879240) |
| Nicolas Jackson, 4′ | 0–2 | [2](https://www.espn.com/soccer/match/_/gameId/401879240) |
| Bruno Fernandes, 16′, penalty | 1–2 | [2](https://www.espn.com/soccer/match/_/gameId/401879240) |
| Youri Tielemans, 44′ | 2–2, also half-time score | [2](https://www.espn.com/soccer/match/_/gameId/401879240) |
| John McGinn, 48′, penalty | 2–3 | [2](https://www.espn.com/soccer/match/_/gameId/401879240) |
| Leon Goretzka, 53′ | 2–4 | [2](https://www.espn.com/soccer/match/_/gameId/401879240) |
| Joshua Zirkzee, 90+2′ | 3–4 | [2](https://www.espn.com/soccer/match/_/gameId/401879240) |
| Patrick Dorgu, 90+6′, header from Bruno Fernandes corner | 4–4 | [2](https://www.espn.com/soccer/match/_/gameId/401879240) |

The phrases “eight goals,” “two comebacks” and “two two-goal deficits” describe the arithmetic and sequence in that ledger, not additional speculation. One point per side follows from the league draw. [2](https://www.espn.com/soccer/match/_/gameId/401879240)

## Editorial choices

- Original animated scorecards and event summaries; **no broadcast match footage, match photography, fabricated scenes, crowd audio or impersonated commentary**.
- User-selected synthetic narration is disclosed on screen. No music bed was added.
- On-screen text is a key-fact summary, not a verbatim subtitle track. Scoreboards identify their checkpoint (e.g. half time, after 53 minutes), rather than pretending to be a live match clock.
- On-screen sources identify ESPN and Al Jazeera/AFP. This file provides the complete links.
- Transfer history, predictions, managerial speculation, disputed interpretations of goalkeeper actions, xG and league standings are omitted.
- The ESPN closing prose contains an apparent typo saying Zirkzee reduced the deficit to 4–2; the scorer list and goal sequence establish 3–4. The video uses the structured scorer ledger, not that typo.
- “Clear Take” remains the working brand direction. Portable DejaVu Sans fonts were used; the proposed production font Manrope was not installed.

## Delivery and checks

- 63.23 seconds; vertical 1080 × 1920; 30 fps; H.264 video and 48 kHz AAC mono narration; fast-start MP4.
- Approximately 2.94 MB.
- All seven chapter audio clips are padded to exact video frame boundaries before concatenation. Narration and each associated scorecard share the same chapter duration.
- Entire exported file decoded without errors; representative graphic frames visually checked.
- Final encoded audio measured approximately −16.8 LUFS integrated, 2.6 LU loudness range, and −1.4 dBTP true peak with FFmpeg ebur128. No claim of a subjective listening review is made.
- Editable renderer: `scripts/render-match-recap.py`. It requires Pillow, imageio-ffmpeg, DejaVu fonts and the seven `.tools/match/01.wav`–`07.wav` narration files. Narration inputs and video exports are ignored by Git; preserve/download them separately.
- `Match recap - timeline.json` beside the MP4 contains exact chapter timings, narration text and graphic content.
