# Popcorn 2026 foyer preview — smoke test

**File:** `D:\Criterion\Popcorn\popcorn-foyer-preview.html`
**Theme:** Neon Noir (Hollywood thriller)
**For:** David's first-pass aesthetic review before show content goes anywhere near the production obs-helper.

---

## Step 1 — Open the preview

Double-click `popcorn-foyer-preview.html` in File Explorer. It should open in your default browser. No server, no setup, no internet required after the first load (Google Fonts cache on first open).

If your default browser is anything other than Chrome or Edge, right-click and open in Chrome/Edge — the CSS uses some modern features (`aspect-ratio`, neon `text-shadow` stacks, custom properties on `:root`) that older browsers fudge. Chrome and Edge are the safe targets because that's what OBS Browser Source uses internally; if it looks right there, it looks right on the foyer Samsung.

## Step 2 — Get to the right viewing distance

The foyer screen sits a certain distance from where most patrons stand. Pretend you're at that distance:

- **On a laptop / desktop monitor:** push your chair back to about 1.5–2 metres. If you can read everything at that distance, the 55-inch foyer Samsung will be readable from across the foyer. If you have to squint, the foyer screen will too.
- **On the real foyer Samsung if you're in the building:** open the HTML on the foyer machine and view from where the patrons queue at the bar.

The window will scale the 16:9 "stage" to fit, so the relative type sizes (which are all `vw`-based) hold up under any window size.

## Step 3 — Walk through the phases

**Top bar has three phase buttons: Preshow, Interval, Postshow.** Click each in turn, or press `1` / `2` / `3` on the keyboard.

In each phase, watch at least two full slide cycles. Don't read every slide on the first cycle — just take in the overall mood. Things to notice:

- **PRESHOW** — magenta-dominant, hot energy, lots of pink/red glow. The "live broadcast" feel. The ON-AIR dot in the top-right pulses subtly.
- **INTERVAL** — shifts cyan-dominant, cooler, the ambient vignette swings to the other side of the screen. Implication: we're "off-air during the commercial break." Bar slides feel inviting against cool ambient.
- **POSTSHOW** — neon dims considerably. More cream-on-black for reflective archive content. The ON-AIR indicator disappears (the broadcast is over). Drifting popcorn kernels fade to barely-visible.

## Step 4 — Inspect each slide individually

Click any thumbnail in the **SLIDES — click any to jump** strip below the stage to pause on it. You can also use:

- `←` / `→` arrow keys — previous / next slide
- `Space` — play / pause auto-advance
- Dwell box (top-right) — override the per-slide dwell time. Try 20s if you want time to read carefully.

For each slide, ask yourself:

1. **Can I read the headline from my "across the foyer" position?** It should be effortless.
2. **Does the body copy fit comfortably in the dwell?** If a slide feels rushed, that's a signal to either shorten the copy or extend the dwell. The current dwells are encoded in `data-dwell` on each slide element and in the playlist JSON.
3. **Does anything feel "trashy" rather than "darkly comic"?** The poster sits on a knife edge. If the screen has tipped into looking cheap, I want to know — that's the difference between art and gimmick.
4. **Is the watermark visible without being noisy?** The popcorn-bucket-in-neon in the bottom-right should register subliminally, not compete for attention.

## Step 5 — Check it against the Popcorn poster

This is the single most important test. Put the printed Popcorn poster next to the screen (open `Popcorn.jpg` in another window if you're not in the building). Stand back.

- The **yellow** in the warning chips (`#FFD434`) should match the poster's title yellow.
- The **red** in the content-alert eyebrow (`#B11D2E`) should rhyme with the poster's red ground.
- The screen should feel like the **same world** as the poster, but **at a different hour** — the poster is the cinema lobby, the screen is the after-dark broadcast. They should agree without being a copy of each other.

If the screen looks completely unrelated to the poster, the foyer-pack failed at its job. If it looks identical, we've under-used the medium. The sweet spot is *family resemblance*.

## Step 6 — Spot the placeholders

Five slides are flagged `[ PLACEHOLDER ]` in their copy:

- **P09** Director's note — waiting on Dean
- **P11** Next production — not published on the site yet
- **I01** Bar featured drink — waiting on bar team
- **I03** Interval next-production repeat — same as P11
- **X04** Chris's video slot — waiting on file list
- **X05** Postshow next-production — same as P11

These need to look acceptable in their placeholder state (someone might see a foyer monitor mid-build), and they need to be clearly distinguishable from finished content for me. Tell me if either of those tests fails.

## Step 7 — What to send back

The shortest useful feedback is a list of slide IDs (P01, P03, I02, X05 etc.) with one line each:

```
P01 — too much neon, dial back the magenta glow
P03 — cast list is hard to scan, try left-aligning the actor names
I02 — countdown number too small; should fill the screen
X03 — archive memory headline outline is doing too much, prefer solid fill
```

Or — easier still — open it on the foyer machine, take a phone photo from where patrons stand, send me the photo. I'll calibrate from what you actually see.

If you want a different mood for one specific phase (e.g. "I love preshow but postshow feels too dim"), say that — phases are tonally independent in the theme and I can shift each one without disturbing the others.

---

## What this preview deliberately doesn't do

- **No bag-refill randomisation.** The preview cycles slides in order so you can review systematically. The real obs-helper will shuffle wildcards properly.
- **No HOUSE-OPEN one-shot logic.** Slide P05 (full content warnings) is shown in the rotation here for review; at runtime it fires once when FoH presses the house-open button and then drops out of the loop.
- **No real video.** The Chris video slot X04 is a placeholder card. Real videos play full-frame *without* the Neon Noir overlay (per `04-popcorn-content-plan.md §7`).
- **No live data.** The interval countdown (I02) shows a static "14 MIN." The real engine re-renders this each minute from `performances.json`.
- **No audio.** Silent-first per the policy in `show.json`. Don't be surprised by the silence.

---

## If something is broken

Likely failure modes and quick fixes:

| Symptom                                            | Probable cause                                | Fix                                                    |
|----------------------------------------------------|-----------------------------------------------|--------------------------------------------------------|
| Fonts look generic / serif                         | First-time load, Google Fonts not cached      | Hard refresh (Ctrl+F5) once you're online              |
| Slides don't advance                                | Auto-play was paused                          | Click ⏯ Play in the top bar, or press Space            |
| Stage is taller than wide / squashed                | Browser is very narrow                        | Resize the window — stage is fixed 16:9                |
| Neon glow missing                                   | Browser too old (looking at you, IE)          | Open in Chrome or Edge                                  |
| Phase buttons don't change colour                   | JavaScript disabled                           | Re-enable JS for local files                           |

If you see anything else odd, screenshot it and we'll debug on the next turn.
