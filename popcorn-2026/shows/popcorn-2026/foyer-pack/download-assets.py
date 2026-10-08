#!/usr/bin/env python3
"""
download-assets.py — fetch all image assets needed for the Popcorn 2026 foyer pack.

USAGE:
    cd D:\\Criterion\\Popcorn\\foyer-pack-draft
    python download-assets.py

REQUIRES:
    - Internet access AT BUILD TIME (this machine, right now).
    - Python 3.8+. Uses stdlib only (urllib, no extra packages).

WHAT IT DOES:
    Downloads every poster and memory image referenced by the foyer pack to
    ./assets/<category>/<filename>. Idempotent — files that already exist locally
    are skipped unless --force is passed. Safe to run repeatedly.

WHY:
    The foyer machine (CRI-SERVER01) cannot be relied on to have internet at
    show time. Build-time downloads cache everything locally; runtime serves
    from disk.

CONFIG:
    The ASSET_MANIFEST list below is the source of truth. Edit it here, not in
    a separate config file — this script is short enough to grok at a glance.
"""

import argparse
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

# ----------------------------------------------------------------------------
# CONFIG — every asset the foyer pack needs.
# ----------------------------------------------------------------------------

CRITERION_BASE = "https://criteriontheatre.co.uk"

# Each row: (url_path, local_relative_path, human_label)
# Updated 2026-05-22: switched to David's preferred image endpoints so the
# foyer screen carries the same crops the public website does. Visual
# continuity foyer → website → poster.
ASSET_MANIFEST = [
    # Current production — Popcorn — large square icon
    (f"{CRITERION_BASE}/icon/548/800/800",
     "assets/posters/popcorn-2026.jpg",
     "Popcorn (2026) — square 800px (matches website)"),

    # Next productions — square crops at 600px (matches website tickets/production pages)
    (f"{CRITERION_BASE}/square/549/600/600",
     "assets/posters/underdog-2026.jpg",
     "Underdog: The Other Other Bronte (2026) — square 600px"),

    (f"{CRITERION_BASE}/square/550/600/600",
     "assets/posters/shakespeare-in-love-2026.jpg",
     "Shakespeare in Love (2026) — square 600px"),

    # Easy 3 jazz night (event 10554) — landscape event photo, NOT a square poster.
    # Added 2026-06-26. If the crop looks poor in the poster frame, replace this file
    # manually with a squarer image.
    (f"{CRITERION_BASE}/image/0/800/events/10554/images/uploads/26-Jun-15-r9f.jpg",
     "assets/posters/easy-3-2026.jpg",
     "Easy 3 jazz night (10 Jul 2026) — event image, 800px wide"),

    # Archive memory posters — production thumbnails referenced by postshow wildcards
    (f"{CRITERION_BASE}/poster/416/400",
     "assets/archive/single-spies-2012.jpg",
     "Single Spies (2012) — Phil Reynolds snowstorm memory"),
    (f"{CRITERION_BASE}/poster/112/400",
     "assets/archive/crime-and-punishment-1971.jpg",
     "Crime And Punishment (1971) — Karl Stafford nails-and-glue memory"),
    (f"{CRITERION_BASE}/poster/253/400",
     "assets/archive/babes-in-the-wood-1988.jpg",
     "The Babes In The Wood (1988) — Chris Firth ironing-fairy memory"),
    (f"{CRITERION_BASE}/poster/188/400",
     "assets/archive/funny-peculiar-1981.jpg",
     "Funny Peculiar (1981) — Terry Nicholls ice-water prank memory"),
    (f"{CRITERION_BASE}/poster/364/400",
     "assets/archive/return-to-the-forbidden-planet-2005.jpg",
     "Return To The Forbidden Planet (2005) — Anne-marie Greene wardrobe memory"),
    (f"{CRITERION_BASE}/poster/311/400",
     "assets/archive/arsenic-and-old-lace-1997.jpg",
     "Arsenic And Old Lace (1997) — Doug Griffiths countries memory"),
    (f"{CRITERION_BASE}/poster/128/400",
     "assets/archive/guys-and-dolls-1973.jpg",
     "Guys And Dolls (1973) — Marcus Pugh ring-box memory"),
    (f"{CRITERION_BASE}/poster/26/400",
     "assets/archive/inherit-the-wind-1962.jpg",
     "Inherit The Wind (1962) — Geoff Firth first-visit memory"),
]


# ----------------------------------------------------------------------------
# DOWNLOAD ENGINE
# ----------------------------------------------------------------------------

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
      "AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/121.0.0.0 Safari/537.36 "
      "criterion-av/popcorn-2026-build-tool")

def download_one(url: str, dest: Path, force: bool = False) -> tuple[bool, str]:
    """Download `url` to `dest`. Returns (ok, message)."""
    if dest.exists() and not force:
        size = dest.stat().st_size
        return True, f"SKIP (already {size:,} bytes)"

    dest.parent.mkdir(parents=True, exist_ok=True)

    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
            ctype = resp.headers.get("Content-Type", "unknown")
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}: {e.reason}"
    except urllib.error.URLError as e:
        return False, f"URL error: {e.reason}"
    except TimeoutError:
        return False, "timeout"
    except Exception as e:
        return False, f"unexpected: {e.__class__.__name__}: {e}"

    if not data:
        return False, "empty response"
    if len(data) < 200:
        # plausibly an error page, not an image
        return False, f"suspiciously small ({len(data)} bytes), likely error page"

    dest.write_bytes(data)
    return True, f"OK {len(data):,} bytes, {ctype}"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true",
                        help="Re-download even if local copy exists.")
    parser.add_argument("--dry-run", action="store_true",
                        help="List what would be downloaded; do nothing.")
    args = parser.parse_args()

    base = Path(__file__).resolve().parent
    os.chdir(base)
    print(f"Working in: {base}\n")

    ok_count = 0
    fail_count = 0
    skip_count = 0
    failures: list[tuple[str, str]] = []

    for (url, local, label) in ASSET_MANIFEST:
        dest = base / local
        if args.dry_run:
            status = "exists" if dest.exists() else "would download"
            print(f"  [{status:14s}] {label}\n                  -> {local}")
            continue

        print(f"  Fetching: {label}")
        print(f"     URL  : {url}")
        print(f"     Local: {local}")

        ok, msg = download_one(url, dest, force=args.force)
        print(f"     -> {msg}\n")

        if ok:
            if msg.startswith("SKIP"):
                skip_count += 1
            else:
                ok_count += 1
        else:
            fail_count += 1
            failures.append((label, msg))

    if args.dry_run:
        print(f"\nDry run complete. {len(ASSET_MANIFEST)} assets in manifest.")
        return 0

    print("-" * 70)
    print(f"Done. Downloaded {ok_count}, skipped {skip_count}, failed {fail_count}.")
    if failures:
        print("\nFailures:")
        for label, msg in failures:
            print(f"  - {label}: {msg}")
        print("\nTry running again. Transient network errors are common.")
        return 1

    # write a marker so the preview HTML knows assets are ready
    marker = base / "assets" / ".ready"
    marker.parent.mkdir(parents=True, exist_ok=True)
    marker.write_text(f"Built {ok_count + skip_count} assets via download-assets.py\n")

    print(f"\nMarker written: {marker.relative_to(base)}")
    print("\nNext: open ..\\popcorn-foyer-preview.html in a browser.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
