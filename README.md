# Crimson Coast Cover Lab

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/haidildariell/gta6-cover-art-01-v3/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/haidildariell/gta6-cover-art-01-v3/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Bounty: https://make.fun/bounty/gta6-cover-art-01

Turn your photos into GTA-style multi-panel poster cover art, in the browser, fully offline. Upload photos, pick a layout and a grade, write your title, export a share-ready PNG.

## What it does

- **Multi-panel covers** — 6 layouts: Photo Grid 9 (the default), Hero + Three, Full Bleed, Tilted Snapshots, Grid 4, Split 2. One photo can fill several panels with different crops, or each panel can hold a different photo.
- **Real photo grades** — 6 grades: Sunset, Neon Nights, Teal Noir, Rose Gold, Mono Poster, and Poster Ink, a genuine halftone treatment (posterized colour mapped through a hot gradient ramp, plus ink dots sized by each cell's darkness).
- **Big poster lettering** — giant gradient title in a condensed display face, glowing neon script subtitle, starburst badge, tagline strip, grain and vignette.
- **Per-panel crop** — click a panel, then drag the photo inside it, zoom, or nudge it with sliders. Undo and redo (Ctrl+Z / Ctrl+Y) cover every change.
- **One-click presets** — Photo Cover (9-panel grid), Hero Photo, Neon Night.
- **Export** — PNG in 1080 × 1080, 1080 × 1350, and 1920 × 1080.
- **Offline** — every script, font, and image ships under `app/`. Your photos are read on your own machine and never uploaded.

## How to run

Any static server works:

```sh
node serve.ts
```

Then open http://localhost:8080/ in desktop Chrome. Or serve `app/` with any static file server of your choice.

## How to use

1. Upload your photos (or tap one of the four built-in samples).
2. Pick a preset, layout, and grade.
3. Edit the title, subtitle, badge, and tagline.
4. Click a panel and drag to position its photo; zoom to crop tighter.
5. Hit an Export button for the size you want.

## Photo credits

Sample photos generated with an image model for this entry; no real person depicted.

## Fonts

Anton and Pacifico, both under the SIL Open Font License — see `app/fonts/OFL-Anton.txt` and `app/fonts/OFL-Pacifico.txt`.

## Originality

All art, lettering, and code in this entry are original. No Rockstar Games logo, wordmark, official artwork, character, or font is used.
