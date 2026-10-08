# Foyer-pack placeholders — Popcorn 2026

**Generated:** 2026-05-21 (revised after next-production + asset turn)
**Status:** Draft pack. Most blocking placeholders have been resolved; remaining items flagged below.

This file is the central index of every piece of content still owed before we lock the pack. Sorted by owner so you can chase the right person in one go.

---

## Resolved 2026-06-24 (foyer review pass — Chris + Dean feedback)

Canonical preview is now `popcorn-foyer.html` (the old `popcorn-foyer-preview.html` is a redirect stub).

- **Glow toned down** across the set (esp. the cyan coming-soon slides); **smallest fonts enlarged**
  (dates/footlines, archive text, ticket labels) with `min(vw,vh)` clamps applied set-wide — Chris's two notes.
- **Top-right ON AIR / poster overlap fixed** (P02).
- **Dean's director note** condensed from his programme text + **headshot** (`dean-sheridan-square.jpg`)
  → P09 and `show.json` foyer_content.director. *Confirm final wording with Dean.*
- **Karl Brezner + Farrah Delamitri** in-world covers added (XP5/XP6) with blurbs in `show.json`.
  In-world covers now appear in **both** preshow (2 teasers, P14/P15) and postshow (full set of 6).
- **Tickets QR** added to P13 (`tickets-qr.png`), captioned *not yet live*.
- **Bar photo** (`bar-foyer.jpg`) on the interval (I01) and postshow (X01) bar slides.
- **Rehearsal-photo placeholders**: preshow gallery (P16) + postshow cast montage (X11), auto-filling
  from `assets/photos/`. *Owed by Chris.*
- **Timing** raised toward ~10s; JSON playlists are canonical and the preview `data-dwell` mirrors them;
  policy floors raised (preshow 9 / interval 7 / postshow 10); the misleading Dwell-box default removed.
- **Engine parity** for the live obs-helper renderer is specced in
  `docs/cascade-prompts/2026-06-24-foyer-engine-parity-popcorn.md` (run before the 27 Jun freeze, or defer).

New owed items: **rehearsal/performance photos (Chris)** · **confirm Dean's note wording (Dean)** ·
**QR destination URL go-live (David)**.

---

## Blocking (must resolve before first night)

| Owner             | Item                              | Where it's referenced |
|-------------------|-----------------------------------|-----------------------|
| Dean Sheridan     | Confirm smoking on stage (yes/no) | `show.json` content_warnings → `smoking-on-stage` |
| Dean Sheridan     | Confirm suicide / self-harm references retained in his cut | `show.json` content_warnings → `references-self-harm` |
| Olivia Simone     | Confirm whether LX design uses strobing | `show.json` content_warnings → `flashing-lights` |
| Dean Sheridan     | Confirm running time and interval length (currently 130 min + 20 min) | `show.json` running_time_minutes / interval_minutes |
| Bar team          | Confirm bar close time per night (currently 22:30) | `playlists/postshow.json` → `bar-stays-open` |

## Non-blocking (improves the show but pack works without)

| Owner             | Item                              | Where it's referenced |
|-------------------|-----------------------------------|-----------------------|
| Dean Sheridan     | 25-40 word director's note        | `playlists/preshow.json` → `director-note`; preview slide P09 |
| Bar team          | Featured drink + price for interval spotlight | `playlists/interval.json` → `bar-spotlight`; preview slide I01 |
| Chris             | Video files + per-video phase eligibility | `playlists/postshow.json` → `chris-video-1` onwards |
| David / archive   | Cast headshots (optional)         | Cast slide P03 — currently text-only |
| Archive team      | Sensitivity check on archive memories before include | `archive_memories.json` — all entries |
| Criterion programme | Confirm Underdog (549) direction — Ruth Miller listed as Assistant Director only | `next_productions.json` → underdog-2026 |
| Criterion programme | Shakespeare in Love cast (550) — not yet listed; open reading 31 May | `next_productions.json` → shakespeare-in-love-2026 |
| David             | QR code pointing to /tickets to add on next-production slides | preview slide X05 |
| David             | Pick a Ben Elton photo from [Wikimedia Commons Category:Ben_Elton](https://commons.wikimedia.org/wiki/Category:Ben_Elton) and drop to `assets/people/ben-elton.jpg` | preview slide P07 |

## Re-download required this turn

The image URLs changed (David asked for the website's actual crops):
- Popcorn:    `/icon/548/800/800`     (was `/poster/548/700`)
- Underdog:   `/square/549/600/600`   (was `/poster/549/700`)
- Shakespeare:`/square/550/600/600`   (was `/poster/550/700`)

If you already ran `download-assets.py` last turn, the old files are still on disk under the
same filename. Run with `--force` to refresh:

```
cd D:\Criterion\Popcorn\foyer-pack-draft
python download-assets.py --force
```

Or just delete the three poster files and re-run normally.

## Resolved this turn (visual finesse pass)

- Switched poster URLs to the website's own crops (square crops for visual continuity)
- Watermark relocated: large + centred + behind content (was small bottom-right)
- Criterion roofline mark inlined bottom-right (from springboard SVG assets)
- Archive thumbnails switched to `object-fit: contain` so varied aspect ratios letterbox cleanly instead of cropping (fixes Single Spies)
- Oscars slide redesigned with SVG motif (film reel + spotlights + magenta star burst) — avoids the AMPAS copyright on the Oscar statuette which runs until 2037
- Ben Elton slide laid out for a photo slot (asset path `assets/people/ben-elton.jpg`), graceful fallback in place until you pick from Wikimedia Commons
- Interval countdown now animates (ticks once per second in the preview; once per real minute at runtime)
- Tickets / walk-ins slide added (P13) with three-tier price treatment + source attribution
- Sold-out announcement template added (FoH-fireable overlay)

## Resolved last turn (next-production + first asset pass)

- ~~next-production (preshow)~~ → Underdog (production 549)
- ~~next-production (interval)~~ → Underdog
- ~~next-production (postshow)~~ → Underdog + Shakespeare in Love (production 550)
- ~~archive memories — 1971 Crime and Punishment placeholder~~ → real Karl Stafford memory, verbatim
- ~~archive memories — 1997 Arsenic placeholder~~ → real Nicole Firth memory
- ~~archive memories — 2005 Forbidden Planet placeholder~~ → real Anne-marie Greene memory
- Added 5 new archive memories with real attribution + production posters
- Added Criterion "Did you know" slide (P10b) using About-page facts

---

## Assets to download before viewing the preview

Run once on any machine with internet access:

```
cd D:\Criterion\Popcorn\foyer-pack-draft
python download-assets.py
```

Pulls 14 images into `assets/` (3 production posters + 8 archive posters + 3 icons).
Idempotent. Use `--force` to refresh, `--dry-run` to list without fetching.

The preview HTML degrades gracefully if assets are missing — each image card shows a
Neon Noir styled fallback label until the file appears.

---

## How obs-helper should treat placeholders at runtime

1. **`placeholder: true` items still get rotated** — they show their current copy with a small unobtrusive marker in `--dev` mode; in production they render exactly as authored.
2. **Blocking placeholders raise a warning at startup.** obs-helper prints to its log and (optionally) refuses to start until `--allow-placeholders` is passed.
3. **Keys starting with `_` are documentation, not engine logic** — obs-helper should ignore any key starting with underscore.

---

## What we deliberately didn't placeholder

- **No invented archive memories.** Every memory in `archive_memories.json` is verbatim from criteriontheatre.co.uk/archive/find/memory with attribution.
- **No invented critic quotes.** Reviews on the next-production slides are scraped directly from the Criterion production pages (where they listed them as official PR quotes).
- **No fake Dean Sheridan quote.** P09 stays visibly empty until Dean provides text.
