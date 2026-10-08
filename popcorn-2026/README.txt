Criterion foyer export: popcorn-2026

START HERE:
  Open START-HERE.html for directors or publicity.
  It links to the LIVE ENGINE review at index.html?preview=1
  (phase tabs + step controls + build stamp — the real foyer output).
  The engine needs a static host; serve the folder (see below) before reviewing.

Live production engine:
  Do not open index.html directly with file://.
  The live engine uses JavaScript modules and requires a static host.
  From this folder run: python -m http.server 8000
  Then open: http://localhost:8000/?phase=preshow
  Theatre scene demo: http://localhost:8000/demo.html
  Hosted step-through review: http://localhost:8000/review.html

Share online:
  Upload this extracted folder to Netlify Drop or another static host.

Production engine routes:
  ?phase=preshow | interval | postshow
  ?scene=welcome | coming-soon | tonight
  Live engine review: ?preview=1 (e.g. index.html?preview=1)

popcorn-foyer.html is the STATIC design reference only, not the live screen.
popcorn-foyer-preview.html is the retired preview and is not exported.
