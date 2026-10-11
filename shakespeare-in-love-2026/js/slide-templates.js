/*
  slide-templates.js — Foyer live-HTML slide registry (FOY-01).

  Single source of truth for foyer slide DESIGN. Each entry maps a template
  key -> a pure function (item, ctx) => HTMLString that returns the INNER
  markup of a `.slide` (the renderer wraps it in `<div class="slide active">`).

  Ported from shows/popcorn-2026/foyer-pack/popcorn-foyer.html
  (sections P01-P13, I01-I03, X01-X10, XP1-XP2). That signed-off file is the content/design reference;
  this registry is the production rendering implementation.

  ctx shape (loaded once in nextgen-foyer.html buildScheduler()):
    {
      show:            <show.json>,
      nextProductions: <next_productions.json>,
      archiveMemories: <archive_memories.json>,
      countdown:       { minutes, state },
      foyerPackBase:   "<origin>/shows/<id>/foyer-pack"   // real <img> base
    }

  Real images (posters/people/archive) MUST resolve against foyerPackBase,
  not the page origin, and keep the preview's graceful onerror fallback.
*/

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ASSET_CACHE = "20261011holding3c1";

function asset(ctx, path) {
  if (!path) {
    return "";
  }
  const base = (ctx && ctx.foyerPackBase) ? ctx.foyerPackBase.replace(/\/$/, "") : "";
  const suffix = ASSET_CACHE ? `?v=${ASSET_CACHE}` : "";
  return `${base}/${String(path).replace(/^\//, "")}${suffix}`;
}

function motionEnabled(ctx, itemOverride) {
  if (typeof itemOverride === "boolean") return itemOverride;
  return ctx.theme?.motion?.photos !== false;
}

function particlesEnabled(ctx, itemOverride) {
  if (itemOverride === false) return false;
  if (itemOverride === true) return ctx.theme?.motion?.particles !== false;
  return ctx.theme?.motion?.particles === true;
}

function seededRandom(seed) {
  // Mulberry32 PRNG. Seed should be a stable string/number per slide.
  let t = Number(seed);
  if (Number.isNaN(t)) {
    for (let i = 0; i < String(seed).length; i += 1) {
      t = (t * 31 + String(seed).charCodeAt(i)) >>> 0;
    }
  }
  return function next() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* Inline emphasis convention: {word} in show copy renders the braced word in the
   theme's emphasis colour. The swap happens AFTER toUpperCase() - braces are
   unaffected by it - so no HTML ever lives in the show JSON. plain() strips the
   braces for the handful of places the same string is used as plain text.
   Added 2026-09-10 for Underdog's "THIS IS {NOT} A STORY..." headline. */
const EM_BRACES = /\{([^{}]*)\}/g;

function emphasise(text) {
  return String(text ?? "").replace(EM_BRACES, '<span class="hl-em">$1</span>');
}

function plain(text) {
  return String(text ?? "").replace(EM_BRACES, "$1");
}

/* headline_case theme token ("upper" | "as_written"), applied by theme-loader.js
   as <html data-headline-case>. upper() is the ONE switch: every headline-tier
   string goes through it, so "as_written" renders titles and headlines in the
   pack's own casing, {braces} emphasis still applied. caps() never reads the
   token - eyebrows, credits, badges and fallback placeholder labels are
   small-caps design elements, not headlines, and stay in capitals either way.
   No document (node render check, tests) reads as the "upper" default. */
function headlineAsWritten() {
  return typeof document !== "undefined"
    && document.documentElement?.dataset?.headlineCase === "as_written";
}

/* HTML entities must survive the capitals pass: "&mdash;".toUpperCase() is
   "&MDASH;", which is not an entity and would render as literal text. The
   capitals run segment-wise between entities so "Phones off &mdash;" becomes
   "PHONES OFF &mdash;" - byte-identical to writing the caps by hand (C20). */
const HTML_ENTITY = /&(?:#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g;

function caps(value) {
  const text = String(value || "");
  let out = "";
  let last = 0;
  for (const match of text.matchAll(HTML_ENTITY)) {
    out += text.slice(last, match.index).toUpperCase() + match[0];
    last = match.index + match[0].length;
  }
  return emphasise(out + text.slice(last).toUpperCase());
}

function upper(value) {
  return headlineAsWritten() ? emphasise(String(value || "")) : caps(value);
}

function parseDate(iso) {
  if (!iso) {
    return null;
  }
  const parts = String(iso).split("-").map(Number);
  if (parts.length < 3 || parts.some(Number.isNaN)) {
    return null;
  }
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDay(iso) {
  const date = parseDate(iso);
  if (!date) {
    return String(iso || "");
  }
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/* Run-date range for the footline. Reads as a run, not a machine interval:
   the year prints once when both ends share it, an en dash (not the "/"
   separator used elsewhere) joins the ends, a one-day or one-sided run
   prints a single date, and no usable dates prints nothing - callers must
   not wrap an empty result in a <p class="footline">. */
function formatRange(first, last) {
  const start = parseDate(first);
  const end = parseDate(last);
  if (start && end && start.getTime() !== end.getTime()) {
    if (start.getFullYear() === end.getFullYear()) {
      return `${formatDay(first)} &ndash; ${formatDay(last)} ${end.getFullYear()}`;
    }
    return `${formatDay(first)} ${start.getFullYear()} &ndash; ${formatDay(last)} ${end.getFullYear()}`;
  }
  const single = start || end;
  return single ? `${formatDay(start ? first : last)} ${single.getFullYear()}` : "";
}

function minutesToText(minutes) {
  const total = Number(minutes) || 0;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  const parts = [];
  if (hours) {
    parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
  }
  if (mins) {
    parts.push(`${mins} minute${mins > 1 ? "s" : ""}`);
  }
  return parts.join(" ") || "0 minutes";
}

function posterFrame(ctx, { src, alt = "", classes = "", fallback }) {
  return `<div class="poster-frame ${classes}">
      <img src="${asset(ctx, src)}" alt="${alt}" onerror="this.parentElement.classList.add('missing')">
      <div class="fallback">${fallback}</div>
    </div>`;
}

/* Inline SVG marks, not raster icons: they take the theme's accent token, stay
   crisp at any size on a 1920x1080 foyer screen, and cannot 404 at curtain-up.
   Stroke widths are set for legibility at 3-8 metres. Added 2026-09-10. */
function warningIcon() {
  return `<svg class="slide-icon" viewBox="0 0 64 58" aria-hidden="true" focusable="false">
      <path d="M32 3.5 L61.5 54.5 H2.5 Z" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>
      <line x1="32" y1="22" x2="32" y2="38" stroke="currentColor" stroke-width="5.5" stroke-linecap="round"/>
      <circle cx="32" cy="46.5" r="3.2" fill="currentColor"/>
    </svg>`;
}

function phonesOffIcon() {
  return `<svg class="slide-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect x="19" y="5" width="26" height="54" rx="5" fill="none" stroke="currentColor" stroke-width="4.5"/>
      <line x1="27.5" y1="13" x2="36.5" y2="13" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="32" cy="50" r="2.8" fill="currentColor"/>
      <line x1="9" y1="59" x2="55" y2="5" stroke="var(--colour-background)" stroke-width="11" stroke-linecap="round"/>
      <line x1="9" y1="59" x2="55" y2="5" stroke="currentColor" stroke-width="5.5" stroke-linecap="round"/>
    </svg>`;
}

function particleOverlay(item, ctx, { seed = "foyer", count = 15 } = {}) {
  if (item?.sales_intent !== true || !particlesEnabled(ctx)) {
    return "";
  }
  const rand = seededRandom(seed);
  const motes = [];
  for (let i = 0; i < count; i += 1) {
    // Keep motes in spare margins (top/bottom bands and left/right strips),
    // avoiding the central text/price/QR focus area.
    const edge = rand();
    let left;
    let top;
    if (edge < 0.25) {
      left = 2 + rand() * 18;
      top = 2 + rand() * 96;
    } else if (edge < 0.5) {
      left = 80 + rand() * 18;
      top = 2 + rand() * 96;
    } else if (edge < 0.75) {
      left = 2 + rand() * 96;
      top = 2 + rand() * 18;
    } else {
      left = 2 + rand() * 96;
      top = 80 + rand() * 18;
    }
    const size = 4 + Math.round(rand() * 8); // 4-12 px
    const opacity = 0.45 + rand() * 0.3; // Visible at foyer distance, no flashing.
    const duration = 16 + Math.round(rand() * 14); // 16-30 s
    const delay = -Math.round(rand() * duration);
    const driftX = -30 + Math.round(rand() * 60);
    const driftY = -60 + Math.round(rand() * 120);
    const style = `--gd-left:${left.toFixed(2)}%;--gd-top:${top.toFixed(2)}%;--gd-size:${size}px;--gd-opacity:${opacity.toFixed(3)};--gd-duration:${duration}s;--gd-delay:${delay}s;--gd-drift-x:${driftX}px;--gd-drift-y:${driftY}px;`;
    motes.push(`<span style="${style}" data-mote="${i}"></span>`);
  }
  return `<div class="gold-dust" aria-hidden="true" data-particle-seed="${seed}">${motes.join("")}</div>`;
}

function photoFrame(ctx, { src, alt = "", classes = "", fallback, motion = null, cover = false, style = "" }) {
  const url = asset(ctx, src);
  const wantsMotion = motionEnabled(ctx, motion);
  const motionAttr = wantsMotion ? "true" : "false";
  const modeClass = cover ? "cover" : "contain";
  const extraClasses = String(classes).split(/\s+/).filter(name => name && name !== "cover" && name !== "contain").join(" ");
  const safeFallback = fallback || `<strong>IMAGE</strong><span>pending</span>`;
  return `<div class="photo-presentation ${modeClass}${extraClasses ? ` ${extraClasses}` : ""}" data-motion="${motionAttr}"${style ? ` style="${style}"` : ""}>
      <div class="photo-window"><img class="photo-fg" src="${url}" alt="${alt}" onerror="this.closest('.photo-presentation').classList.add('missing')"></div>
      <div class="photo-fallback">${safeFallback}</div>
    </div>`;
}

/* In-card clips (Shakespeare in Love prop-making shorts, C15 October 2026).
   A short silent loop inside a card, not a full-frame media item. The video
   sits on top of its poster still inside the same .photo-presentation frame
   a photo gets, so the poster is doing three jobs at once: it paints while
   the clip loads, it becomes the photo (Ken Burns allowed) when the clip
   cannot load or play, and a missing poster degrades the same frame to the
   shared .photo-fallback. Both dead ends therefore land on the placeholder -
   never a black box or a broken-media icon (foyer rule 9). The element is
   always muted and never carries controls or audio (foyer rule 7).
   Only .webm and .mp4 are accepted in a card: both were proven looping in
   OBS 32.1.2 on AURORA, 9 October 2026 (tools/obs-video-spike/README.md).
   Anything else renders the poster as an ordinary photo and warns once. */
const warnedClips = new Set();

function warnClipOnce(message) {
  if (warnedClips.has(message)) {
    return;
  }
  warnedClips.add(message);
  console.warn(message);
}

function videoFrame(ctx, { video, poster, alt = "", classes = "", fallback, motion = null, cover = false, style = "" }) {
  const clip = String(video || "");
  const ext = clip.split(/[?#]/)[0].split(".").pop().toLowerCase();
  if (ext !== "webm" && ext !== "mp4") {
    warnClipOnce(`Foyer clip '${clip}' is not .webm or .mp4 - rendering its poster as a photo.`);
    return photoFrame(ctx, { src: poster, alt, classes, fallback, motion, cover });
  }
  const url = asset(ctx, clip);
  const posterUrl = asset(ctx, poster);
  const wantsMotion = motionEnabled(ctx, motion);
  const motionAttr = wantsMotion ? "true" : "false";
  const modeClass = cover ? "cover" : "contain";
  const extraClasses = String(classes).split(/\s+/).filter(name => name && name !== "cover" && name !== "contain").join(" ");
  const safeFallback = fallback || `<strong>CLIP</strong><span>pending</span>`;
  return `<div class="photo-presentation video-presentation ${modeClass}${extraClasses ? ` ${extraClasses}` : ""}" data-motion="${motionAttr}"${style ? ` style="${style}"` : ""}>
      <div class="photo-window"><img class="photo-fg" src="${posterUrl}" alt="${alt}" onerror="this.classList.add('poster-gone'); if(this.parentElement.querySelector('.video-fg.failed')){this.closest('.photo-presentation').classList.add('missing');}"><video class="video-fg" src="${url}" poster="${posterUrl}" muted autoplay loop playsinline preload="auto" onerror="this.classList.add('failed'); if(this.parentElement.querySelector('.photo-fg.poster-gone')){this.closest('.photo-presentation').classList.add('missing');}"></video></div>
      <div class="photo-fallback">${safeFallback}</div>
    </div>`;
}

function findProduction(ctx, id, index = 0) {
  const list = (ctx && ctx.nextProductions && ctx.nextProductions.productions) || [];
  return (id ? list.find(prod => prod.id === id) : null) || list[index] || null;
}

function findMemory(ctx, source, memoryId) {
  const list = (ctx && ctx.archiveMemories && ctx.archiveMemories.memories) || [];
  const sourceToMemory = {
    "slides/archive-crime-and-punishment-1971.png": "crime-and-punishment-1971-nails",
    "slides/archive-single-spies-2012.png": "single-spies-2012-snowstorm",
    "slides/archive-funny-peculiar-1981.png": "funny-peculiar-1981-ice-water",
    "slides/archive-arsenic-and-old-lace-1997.png": "arsenic-and-old-lace-1997-countries",
    "slides/archive-babes-in-the-wood-1988.png": "babes-in-the-wood-1988-ironing-fairy",
    "slides/archive-guys-and-dolls-1973.png": "guys-and-dolls-1973-ring-box",
    "slides/archive-inherit-the-wind-1962.png": "inherit-the-wind-1962-first-visit",
    "slides/archive-return-to-forbidden-planet-2005.png": "return-to-forbidden-planet-2005-wardrobe",
  };
  const id = memoryId || sourceToMemory[source];
  return list.find(memory => memory.id === id || memory.image_local === source) || null;
}

function productionYear(production) {
  const match = String(production || "").match(/\((\d{4})\)\s*$/);
  return match ? match[1] : "";
}

function productionTitle(production) {
  return String(production || "").replace(/\s*\(\d{4}\)\s*$/, "");
}

function titleFromAsset(path) {
  const filename = String(path || "").split("/").pop() || "";
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+\d+\s+\d+$/, "")
    .replace(/\s+cover$/i, "")
    .trim();
}

function tbcLabel(warning) {
  const key = Object.keys(warning).find(name => name.startsWith("_TBC_from_"));
  if (!key) {
    return "tbc";
  }
  const who = key.replace("_TBC_from_", "");
  return `tbc with ${who.charAt(0).toUpperCase()}${who.slice(1)}`;
}

function warningLine(warning) {
  const pill = warning.confidence && warning.confidence !== "high"
    ? `&nbsp;<span class="pill">${tbcLabel(warning)}</span>`
    : "";
  return `<p class="body small"><b style="color:var(--poster-yellow);">${warning.headline}.</b> ${warning.detail}${pill}</p>`;
}

function ticketUrl(prod, ctx) {
  return String((prod && prod.tickets_url) || (ctx && ctx.show && ctx.show.tickets_url) || "")
    .replace(/^https?:\/\//, "");
}

function ticketCta(prod, ctx) {
  const url = ticketUrl(prod, ctx);
  return url ? `<p class="ticket-cta">${url}</p>` : "";
}

function bookQr(ctx) {
  return `<div class="book-qr">
        <div class="book-qr-frame">
          <img src="${asset(ctx, "assets/images/tickets-qr.png")}" alt="Scan to book tickets" onerror="this.style.display='none'; this.parentElement.innerHTML='<span class=&quot;book-qr-fallback&quot;>QR</span>';">
        </div>
        <div class="book-qr-caption">Scan to book</div>
      </div>`;
}

// Coming-up booking block: only advertise a QR + ticket link when the
// production is actually on sale. Otherwise show a muted holding line so we
// never promote a booking route we can't fulfil.
function bookBlock(prod, ctx) {
  if (prod && prod.tickets_on_sale === true) {
    return `<div class="book-row">
            ${bookQr(ctx)}
            ${ticketCta(prod, ctx)}
          </div>`;
  }
  return `<p class="tickets-pending">Tickets on sale nearer the date</p>`;
}

function storyMontage(item, ctx) {
  const show = ctx.show || {};
  const content = item.content || {};
  const packCopy = item.story_key && show.foyer_content?.story_montages?.[item.story_key]
    ? show.foyer_content.story_montages[item.story_key]
    : {};
  const frames = (content.frames && content.frames.length ? content.frames : packCopy.frames) || [];
  const usableFrames = frames.filter(f => f && (f.source || f.video));
  if (!usableFrames.length) {
    return `<p class="eyebrow alert">Story montage</p>
      <h2 class="headline small">MISSING FRAMES</h2>
      <p class="body">No usable frames for ${content.headline || item.story_key || "this story"}.</p>`;
  }
  const eyebrow = content.eyebrow || packCopy.eyebrow || "Behind the scenes";
  const headline = content.headline || packCopy.headline || titleFromAsset(usableFrames[0].source || usableFrames[0].video);
  const body = content.body || packCopy.body || "";
  const footline = content.footline || packCopy.footline || "";
  const credit = content.credit || packCopy.credit || "";
  const reviewStatus = item.review_status || content.review_status || "";
  const draftOwner = reviewStatus === "draft"
    ? (content.draft_owner || packCopy.draft_owner || item.draft_owner || "Department")
    : "";
  const draftLabel = reviewStatus === "draft"
    ? (content.draft_label || item.draft_label || packCopy.draft_label || `for ${draftOwner}'s approval`)
    : "";
  const dwell = Math.max(9, Math.min(120, Number(item.dwell_seconds) || 21));
  const count = usableFrames.length;
  const frameClass = count === 2 ? "story-frames-2" : (count === 1 ? "story-frames-1" : "story-frames-3");
  /* At most one clip per montage: a second <video> would compete for the
     eye the card is supposed to share. Extra video frames still contribute
     their poster still rather than being dropped silently. */
  let clipUsed = false;
  const framesHtml = usableFrames.map((frame, idx) => {
    const alt = frame.alt || frame.caption || "";
    const isClip = Boolean(frame.video);
    const useVideo = isClip && !clipUsed;
    if (isClip && clipUsed) {
      warnClipOnce(`Story montage '${item.id || item.story_key || "?"}' carries more than one video frame - extra clips render as their poster stills.`);
    }
    clipUsed = clipUsed || useVideo;
    const frameInner = useVideo
      ? videoFrame(ctx, {
          video: frame.video,
          poster: frame.poster,
          alt,
          classes: "story-photo",
          fallback: `<strong>FRAME ${idx + 1}</strong><span>${frame.caption || "clip pending"}</span>`,
          motion: frame.motion,
          cover: frame.cover === true,
        })
      : photoFrame(ctx, {
          src: isClip ? frame.poster : frame.source,
          alt,
          classes: "story-photo",
          fallback: `<strong>FRAME ${idx + 1}</strong><span>${frame.caption || "image pending"}</span>`,
          motion: frame.motion,
          cover: frame.cover === true,
        });
    return `<div class="story-frame" data-frame="${idx}">
        <div class="story-frame-photo">
          ${frameInner}
        </div>
        ${frame.caption ? `<p class="frame-caption">${frame.caption}</p>` : ""}
      </div>`;
  }).join("\n        ");
  const badge = reviewStatus === "draft"
    ? `<p class="review-badge">Draft — ${draftLabel}</p>`
    : "";
  const salesClass = item?.sales_intent === true ? " sales-card" : "";
  return `<div class="story-montage ${frameClass}${salesClass}" data-story-count="${count}" data-dwell="${dwell}" style="--story-dwell:${dwell}s;">
      ${particleOverlay(item, ctx, { seed: item.id || "story-montage", count: 15 })}
      <div class="story-heading">
        <p class="eyebrow calm">${eyebrow}</p>
        <h2 class="headline tiny">${upper(headline)}</h2>
        ${body ? `<p class="body story-body">${body}</p>` : ""}
      </div>
      <div class="story-stage">
        ${framesHtml}
      </div>
      <div class="story-credit">
        ${footline ? `<p class="footline">${footline}</p>` : ""}
        ${credit ? `<p class="footline">${credit}</p>` : ""}
        ${badge}
      </div>
    </div>`;
}

// Generic large-image-with-caption feature slide.
// The image is the hero; the text is a caption. Landscape sources are
// presented landscape (no portrait poster letterboxing). `popcorn-feature`
// is a thin alias for backward compatibility with the existing Popcorn pack.
function featureTemplate(item, ctx) {
  const show = ctx.show || {};
  const content = item.content || {};
  const titleFromFile = titleFromAsset(item.source || item.video) || "Feature";
  const title = content.headline || titleFromFile;
  const featureKey = titleFromFile.toLowerCase().replace(/\s+/g, "-");
  const showContent = show.foyer_content?.features?.[featureKey] || {};
  const eyebrow = content.eyebrow || showContent.eyebrow || "From tonight's production";
  const body = content.body || showContent.body || show.synopsis || "";
  const footline = content.footline || showContent.footline || "Production feature";
  const reviewStatus = item.review_status || content.review_status || "";
  const draftOwner = reviewStatus === "draft"
    ? (content.draft_owner || item.draft_owner || showContent.draft_owner || "Department")
    : "";
  const draftLabel = reviewStatus === "draft"
    ? (content.draft_label || item.draft_label || `for ${draftOwner}'s approval`)
    : "";
  const badge = reviewStatus === "draft"
    ? `<p class="review-badge">Draft \u2014 ${draftLabel}</p>`
    : "";
  const salesClass = item?.sales_intent === true ? " sales-card" : "";
  return `<div class="feature-layout${salesClass}">
      ${particleOverlay(item, ctx, { seed: item.id || "feature", count: 15 })}
      <div class="feature-hero">
        ${item.video
          ? videoFrame(ctx, {
              video: item.video,
              poster: item.poster,
              alt: `${title} clip`,
              classes: "feature feature-hero contain",
              fallback: `<strong>${caps(title)}</strong><span>${eyebrow}</span>`,
            })
          : photoFrame(ctx, {
              src: item.source,
              alt: `${title} image`,
              classes: "feature feature-hero contain",
              fallback: `<strong>${caps(title)}</strong><span>${eyebrow}</span>`,
            })}
      </div>
      <div class="feature-caption">
        <p class="eyebrow calm">${eyebrow}</p>
        <h2 class="headline small" style="color:var(--poster-yellow);">${upper(title)}</h2>
        <p class="body" style="max-width:none;">${body}</p>
        <p class="footline">${footline}</p>
        ${badge}
      </div>
    </div>`;
}

function aboutWriterTemplate(item, ctx) {
  const show = ctx.show || {};
  const content = item.content || {};
  const writer = show.foyer_content?.writer || {};
  const body = content.body || writer.body || show.author_note || `Writer of ${show.title || "tonight's production"}.`;
  const footline = content.footline || writer.footline;
  const image_local = content.image_local || writer.image_local;
  return `<div class="split-layout">
        <div class="split-text">
          <p class="eyebrow">About the writer</p>
          <h2 class="headline small">${upper(show.author || "The writer")}</h2>
          <p class="body" style="max-width:none;">
            ${body}
          </p>
          ${footline ? `<p class="footline">${footline}</p>` : ""}
        </div>
        ${photoFrame(ctx, {
          src: image_local,
          alt: show.author || "",
          classes: "contain",
          fallback: `<strong>${caps(show.author) || "WRITER"}</strong><span>Photo pending</span>`,
        })}
      </div>`;
}

function gallerySources(item, fallbackPattern) {
  if (Array.isArray(item.sources) && item.sources.length) {
    return item.sources;
  }
  if (item.glob) {
    // The engine expects globs to be expanded into an explicit sources list
    // before rendering (e.g. by the export step). Without one, fall back.
    return [];
  }
  if (typeof fallbackPattern === "function") {
    const count = Number(item.fallback_count) ||
      Math.max(3, (Number(item.offset) || 0) + (Number(item.limit) || 3));
    return Array.from({ length: count }, (_, i) => fallbackPattern(i + 1));
  }
  return [];
}

function paginateSources(sources, item) {
  const offset = Math.max(0, Number(item.offset) || 0);
  if (offset >= sources.length) {
    return [];
  }
  const limit = item.limit != null ? Number(item.limit) : null;
  const end = limit != null ? offset + Math.max(0, limit) : undefined;
  return sources.slice(offset, end);
}

function galleryFrame(ctx, src, { title = "", note = "", muted = false } = {}) {
  return photoFrame(ctx, {
    src,
    alt: title || "",
    classes: `contain${muted ? " muted" : ""}`.trim(),
    fallback: `<strong>${caps(title) || "PHOTO"}</strong><span>${note || "production image"}</span>`,
  });
}

function castGallery(item, ctx) {
  const show = ctx.show || {};
  const content = item.content || {};
  const packCopy = show.foyer_content?.cast_gallery || {};
  const sourcePattern = content.source_pattern || packCopy.source_pattern || "assets/photos/performance-0N.jpg";
  const sources = gallerySources(item, n => String(sourcePattern).replace(/0N/, String(n).padStart(2, "0")));
  const page = paginateSources(sources, { offset: item.offset, limit: item.limit != null ? item.limit : 3 });
  if (!page.length) {
    return "";
  }
  const eyebrow = content.eyebrow || packCopy.eyebrow || "Tonight's company";
  const headline = content.headline || packCopy.headline || (show.title ? `The cast of ${show.title}` : "Tonight's company");
  const footline = content.footline || packCopy.footline || "";
  const cellNote = content.note || packCopy.note || "cast in performance";
  const gridClass = `photo-grid${item.portrait ? " portrait-safe" : ""}`;
  const cells = page.map(src => galleryFrame(ctx, src, {
    title: titleFromAsset(src),
    note: cellNote,
    muted: true,
  })).join("\n        ");
  return `<p class="eyebrow calm">${eyebrow}</p>
      <h2 class="headline small">${upper(headline)}</h2>
      <div class="${gridClass}">
        ${cells}
      </div>${footline ? `<p class="footline">${footline}</p>` : ""}`;
}

function productionGallery(item, ctx) {
  const show = ctx.show || {};
  const content = item.content || {};
  const packCopy = show.foyer_content?.production_gallery || {};
  const sourcePattern = content.source_pattern || packCopy.source_pattern || "assets/photos/rehearsal-0N.jpg";
  const sources = gallerySources(item, n => String(sourcePattern).replace(/0N/, String(n).padStart(2, "0")));
  const page = paginateSources(sources, { offset: item.offset, limit: item.limit != null ? item.limit : 3 });
  if (!page.length) {
    return "";
  }
  const eyebrow = content.eyebrow || packCopy.eyebrow || "In rehearsal";
  const headline = content.headline || packCopy.headline || (show.title || "Production gallery");
  const footline = content.footline || packCopy.footline || "";
  const cellNote = content.note || packCopy.note || "rehearsal shot";
  const gridClass = `photo-grid${item.portrait ? " portrait-safe" : ""}`;
  const cells = page.map(src => galleryFrame(ctx, src, {
    title: titleFromAsset(src),
    note: cellNote,
  })).join("\n        ");
  return `<p class="eyebrow">${eyebrow}</p>
      <h2 class="headline small">${upper(headline)}</h2>
      <div class="${gridClass}">
        ${cells}
      </div>${footline ? `<p class="footline">${footline}</p>` : ""}`;
}

/* Holding-phase helpers (added 15 September 2026). The pack owns the wording;
   the engine owns the clock, computed at render time so the 60-second re-render
   actually advances it.
   - `sub_countdown` substitutes {countdown} with H:MM until the earliest future
     performance's house_opens ("Underdog preshow display starts in 14:27").
   - `sub_final` applies once no future performance remains.
   - A plain `sub` renders as written in either case.
   - performances.json absent or unparseable -> the card renders `message`
     alone; the state is unknown, so guessing at countdown vs final wording
     would risk lying to the foyer.
   `show_when` on a playlist item ("countdown" / "final" / "always") selects
   which items belong to the current case; canRenderSlide applies it so the
   scheduler skips cards meant for the other state. */
function holdingPerformances(ctx) {
  const list = ctx?.performances?.performances;
  return Array.isArray(list) ? list : null;
}

/* The wall clock for holding maths. ctx.now (an ms epoch or a Date)
   overrides it so tools/foyer-pack-render-check.mjs --today can exercise the
   countdown and "run ended" branches on a fixed date; when it is absent,
   behaviour is exactly the wall clock as before. */
function ctxNow(ctx) {
  const value = ctx?.now;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  return Date.now();
}

function performanceMoment(dateText, timeText) {
  const day = parseDate(dateText);
  if (!day || !/^\d{2}:\d{2}$/.test(timeText || "")) {
    return null;
  }
  const [hour, minute] = timeText.split(":").map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0, 0);
}

// Earliest performance whose house_opens is still ahead of right now.
function nextHouseOpen(ctx) {
  const list = holdingPerformances(ctx);
  if (!list) {
    return null;
  }
  const now = ctxNow(ctx);
  let next = null;
  for (const entry of list) {
    const at = performanceMoment(entry?.date, entry?.house_opens);
    if (at && at.getTime() > now && (!next || at < next.at)) {
      next = { performance: entry, at };
    }
  }
  return next;
}

function itemShowWhenApplies(item, ctx) {
  const when = item?.show_when;
  if (!when || when === "always") {
    return true;
  }
  if (!holdingPerformances(ctx)) {
    return false; // cannot tell countdown from final - show neither guess
  }
  const hasNext = Boolean(nextHouseOpen(ctx));
  if (when === "countdown") {
    return hasNext;
  }
  if (when === "final") {
    return !hasNext;
  }
  return true; // unrecognised value: keep the item rather than drop it
}

// Remaining time with units, never a bare H:MM: the gap from bar close to the
// next house opening runs 17 to 47 hours, so "20:00" on a foyer screen at
// midnight reads as a clock time, not a duration. "43m" under an hour,
// "20h 00m" under a day, "1d 22h 30m" beyond. Floored to whole minutes,
// clamped at 0m.
function holdingCountdownText(at, now) {
  const totalMinutes = Math.max(0, Math.floor((at.getTime() - now) / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days) {
    return `${days}d ${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  if (hours) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  return `${minutes}m`;
}

/* ---- HOLDING in three states (C9, October 2026) ---------------------------
   Design: docs/design/2026-09-25-foyer-holding-three-states-design.md.
   The HOLDING phase runs from bar close until PRESHOW. Inside it the engine
   picks one of three states from the clock and the pack - never from when
   HOLDING was pressed, so a reload, an OBS cache refresh or a hand-fired
   cue always lands in the right state:
     wind-down  holding_start -> holding_start + policy.wind_down_minutes
     overnight  everything else - the pre-existing unbranded line (E2)
     wake-up    house_open - policy.wake_up_minutes -> curtain
   A state exists only when the pack opts in twice: policy.<x>_minutes AND at
   least one item carrying holding_state: "<x>". Either half missing means the
   window is empty and the phase stays overnight - so a pack written before
   this feature behaves exactly as it always has. */

const WEEKDAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

/* The windows a holding playlist opens, in minutes. policy.<state>_minutes
   sets the length but an item must also select the state, otherwise the
   window is empty and would only darken the overnight card's surroundings
   for no visible gain. */
export function holdingWindows(playlist) {
  const policy = playlist?.policy || {};
  const items = Array.isArray(playlist?.items) ? playlist.items : [];
  const minutes = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const selects = (state) => items.some(item => item?.holding_state === state);
  return {
    wind_down_minutes: selects("wind-down") ? minutes(policy.wind_down_minutes) : 0,
    wake_up_minutes: selects("wake-up") ? minutes(policy.wake_up_minutes) : 0,
  };
}

/* showday.json step offsets anchor at "curtain": "curtain+225", "curtain-70".
   Returns the signed minute offset, or null when the file or step is absent -
   ruling 2: showday.json is optional. */
function showdayStepOffset(showday, stepId) {
  const steps = Array.isArray(showday?.steps) ? showday.steps : [];
  const step = steps.find(s => s && s.id === stepId && typeof s.at === "string");
  const match = step ? step.at.trim().match(/^curtain\s*([+-])\s*(\d+)$/) : null;
  return match ? (match[1] === "-" ? -1 : 1) * Number(match[2]) : null;
}

/* The three clock times every performance carries for the holding states:
   house_open, curtain, and holding_start (bar_close, else the showday
   `holding` step's curtain offset, else curtain + 210 minutes - the value
   every Underdog night already used). Entries that cannot give house_open
   and curtain are skipped. */
function holdingMoments(ctx) {
  const list = holdingPerformances(ctx);
  if (!list) {
    return null;
  }
  const moments = [];
  for (const entry of list) {
    const houseOpen = performanceMoment(entry?.date, entry?.house_opens);
    const curtain = performanceMoment(entry?.date, entry?.curtain);
    if (!houseOpen || !curtain) {
      continue;
    }
    let holdingStart = performanceMoment(entry?.date, entry?.bar_close);
    if (!holdingStart) {
      const offset = showdayStepOffset(ctx?.showday, "holding") ?? 210;
      holdingStart = new Date(curtain.getTime() + offset * 60000);
    }
    moments.push({ entry, houseOpen, curtain, holdingStart });
  }
  return moments;
}

/* The one pure state function (design section 2). Returns
   { state: "wake-up" | "wind-down" | "overnight", performance, variant,
   moments, windows } - wake-up is checked first so it wins any overlap
   (two shows in one day), and a missing or unreadable performances.json
   fails safe to overnight, which is today's behaviour. */
export function holdingState(ctx) {
  const now = ctxNow(ctx);
  const windows = ctx?.holdingWindows || {};
  const wakeMin = Number(windows.wake_up_minutes) || 0;
  const windMin = Number(windows.wind_down_minutes) || 0;
  const moments = holdingMoments(ctx);
  if (!moments) {
    return { state: "overnight", performance: null, moments: null, windows };
  }
  if (wakeMin > 0) {
    for (const m of moments) {
      const wakeStart = m.houseOpen.getTime() - wakeMin * 60000;
      if (wakeStart <= now && now < m.curtain.getTime()) {
        return { state: "wake-up", performance: m.entry, moments: m, windows };
      }
    }
  }
  if (windMin > 0) {
    for (const m of moments) {
      const start = m.holdingStart.getTime();
      if (start <= now && now < start + windMin * 60000) {
        const isLast = !moments.some(other => (
          other !== m && other.curtain.getTime() > m.curtain.getTime()
        ));
        const variant = m.entry?.dress_rehearsal === true
          ? "dress"
          : (isLast ? "final" : "normal");
        return { state: "wind-down", performance: m.entry, variant, moments: m, windows };
      }
    }
  }
  return { state: "overnight", performance: null, moments: null, windows };
}

/* Item selection by holding_state / variant (design section 6). An item
   with no holding_state applies in every state - that is what keeps old
   packs identical. "overnight" items render in the overnight state only. */
function holdingItemApplies(item, ctx) {
  const want = item?.holding_state;
  if (!want || want === "always") {
    return true;
  }
  const info = holdingState(ctx);
  if (info.state !== want) {
    return false;
  }
  if (want === "wind-down") {
    return (item.variant || "normal") === (info.variant || "normal");
  }
  return true;
}

/* The overnight {countdown} target: the next wake-up start
   (house_open - wake_up_minutes), not house_open itself, because the display
   now genuinely resumes at the wake-up (design section 2). A pack with no
   wake-up window has wakeMin 0, which lands exactly on house_open - the old
   behaviour. */
function nextWakeStart(ctx) {
  const moments = holdingMoments(ctx);
  if (!moments) {
    return null;
  }
  const wakeMin = Number(ctx?.holdingWindows?.wake_up_minutes) || 0;
  const now = ctxNow(ctx);
  let next = null;
  for (const m of moments) {
    const at = new Date(m.houseOpen.getTime() - wakeMin * 60000);
    if (at.getTime() > now && (!next || at.getTime() < next.at.getTime())) {
      next = { performance: m.entry, at };
    }
  }
  return next;
}

function fillHoldingSubText(text, showTitle) {
  if (text == null) {
    return "";
  }
  const out = String(text).replaceAll("{show}", showTitle);
  return showTitle || !out.includes("{show}") ? out : null;
}

function holdingSubLine(item, ctx) {
  if (!holdingPerformances(ctx)) {
    return "";
  }
  const showTitle = plain(ctx?.show?.title || "");
  const next = nextWakeStart(ctx);
  if (next) {
    if (item?.sub_countdown) {
      const filled = fillHoldingSubText(item.sub_countdown, showTitle);
      if (filled === null) {
        return "";
      }
      return filled.replaceAll("{countdown}", holdingCountdownText(next.at, ctxNow(ctx)));
    }
    const sub = fillHoldingSubText(item?.sub, showTitle);
    return sub === null ? "" : sub;
  }
  const finalText = fillHoldingSubText(item?.sub_final ?? item?.sub, showTitle);
  return finalText === null ? "" : finalText;
}

/* ---- wind-down / wake-up formatting helpers (house style: 7.30pm, 5pm,
   never 19:30; "c. 8.30" on estimates; weekday names in full) ---- */

function startOfDayMs(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function daysBetween(fromMs, date) {
  return Math.round((startOfDayMs(date) - startOfDayMs(new Date(fromMs))) / 86400000);
}

/* "19:30" -> "7.30pm"; "17:00" -> "5pm" */
function houseTime(timeText) {
  const m = /^(\d{2}):(\d{2})$/.exec(String(timeText || ""));
  if (!m) {
    return "";
  }
  const suffix = Number(m[1]) >= 12 ? "pm" : "am";
  const hour = Number(m[1]) % 12 || 12;
  return m[2] === "00" ? `${hour}${suffix}` : `${hour}.${m[2]}${suffix}`;
}

/* Timeline style: "19:00" -> "7.00", "20:30" -> "8.30" - 12-hour, no suffix,
   the minutes always shown (mock-ups 08-12). */
function timelineTime(timeText) {
  const m = /^(\d{2}):(\d{2})$/.exec(String(timeText || ""));
  if (!m) {
    return "";
  }
  return `${Number(m[1]) % 12 || 12}.${m[2]}`;
}

function hhmm(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function performanceStartKey(entry) {
  const at = performanceMoment(entry?.date, entry?.curtain)
    || performanceMoment(entry?.date, entry?.house_opens)
    || parseDate(entry?.date);
  return at ? at.getTime() : 0;
}

// The performance after `perf` in the file (which is chronological).
function nextPerformanceAfter(ctx, perf) {
  const list = holdingPerformances(ctx) || [];
  const key = performanceStartKey(perf);
  return list.find(entry => entry !== perf && performanceStartKey(entry) > key) || null;
}

// The first non-dress performance - the night a dress-night card calls
// "Opening night" (D7).
function firstNonDress(ctx) {
  const list = holdingPerformances(ctx) || [];
  return list.find(entry => entry?.dress_rehearsal !== true && performanceStartKey(entry)) || null;
}

/* {next_when}: next day -> "Tomorrow, 7.30pm"; within six days ->
   "Tuesday, 7.30pm" (how the dark Monday reads); otherwise a full date,
   "Saturday 26 September, 7.30pm". */
function formatNextWhen(nowMs, perf) {
  const day = parseDate(perf?.date);
  const time = houseTime(perf?.curtain);
  if (!day || !time) {
    return null;
  }
  const gap = daysBetween(nowMs, day);
  if (gap === 1) {
    return `Tomorrow, ${time}`;
  }
  if (gap > 1 && gap <= 6) {
    return `${WEEKDAYS_FULL[day.getDay()]}, ${time}`;
  }
  return `${WEEKDAYS_FULL[day.getDay()]} ${day.getDate()} ${MONTHS_FULL[day.getMonth()]}, ${time}`;
}

/* {opening_when}: the named landmark keeps its weekday even when it is
   tomorrow - mock-up 06 says "Opening night: Saturday, 7.30pm" for the
   Friday dress, not "Tomorrow". Beyond six days, the full date. */
function formatOpeningWhen(nowMs, perf) {
  const day = parseDate(perf?.date);
  const time = houseTime(perf?.curtain);
  if (!day || !time) {
    return null;
  }
  const gap = daysBetween(nowMs, day);
  if (gap <= 6) {
    return `${WEEKDAYS_FULL[day.getDay()]}, ${time}`;
  }
  return `${WEEKDAYS_FULL[day.getDay()]} ${day.getDate()} ${MONTHS_FULL[day.getMonth()]}, ${time}`;
}

/* {run_end}: "Saturday 3 October" from show.json run_dates.last, falling
   back to the last performance date when the pack carries no run_dates. */
function formatRunEnd(ctx) {
  const last = parseDate(ctx?.show?.run_dates?.last);
  if (last) {
    return `${WEEKDAYS_FULL[last.getDay()]} ${last.getDate()} ${MONTHS_FULL[last.getMonth()]}`;
  }
  const list = holdingPerformances(ctx) || [];
  const latest = list
    .map(entry => parseDate(entry?.date))
    .filter(Boolean)
    .sort((a, b) => b - a)[0];
  return latest
    ? `${WEEKDAYS_FULL[latest.getDay()]} ${latest.getDate()} ${MONTHS_FULL[latest.getMonth()]}`
    : null;
}

/* {next_production_dates}: mock-up 05's "5 - 12 December" - day and month
   names in full, the shared month printed once, years only when they differ. */
function nextProductionDatesText(prod) {
  const first = parseDate(prod?.run_dates?.first);
  const last = parseDate(prod?.run_dates?.last);
  if (first && last && first.getTime() !== last.getTime()) {
    if (first.getFullYear() === last.getFullYear()) {
      if (first.getMonth() === last.getMonth()) {
        return `${first.getDate()} &ndash; ${last.getDate()} ${MONTHS_FULL[first.getMonth()]}`;
      }
      return `${first.getDate()} ${MONTHS_FULL[first.getMonth()]} &ndash; ${last.getDate()} ${MONTHS_FULL[last.getMonth()]}`;
    }
    return `${first.getDate()} ${MONTHS_FULL[first.getMonth()]} ${first.getFullYear()} &ndash; ${last.getDate()} ${MONTHS_FULL[last.getMonth()]} ${last.getFullYear()}`;
  }
  const single = first || last;
  return single
    ? `${single.getDate()} ${MONTHS_FULL[single.getMonth()]} ${single.getFullYear()}`
    : null;
}

/* The placeholder vocabulary of the wind-down cards (design section 3).
   {show} and {next_production} are audience-recognisable names and the
   design paints them in the theme's ACCENT colour (mock-ups 01/04/05) -
   not in .hl-em's emphasis colour, which a pack may map to a dimmer tone
   (Underdog's poster_red sits under the 7:1 accent-as-text floor). They
   come back wrapped in \x01..\x02 sentinels so caps()/upper()/emphasise()
   leave them alone; holdingNames() turns the sentinels into .hold-name
   spans after those passes. A pack author's own braces still take .hl-em.
   Any key that cannot resolve returns null, which drops the card rather
   than paint a literal brace (rule 9). */
const HOLDING_PLACEHOLDERS = /\{(show|next_when|opening_when|run_end|next_production|next_production_dates)\}/g;
const HOLDING_NAME = /\x01([^\x02]+)\x02/g;

function holdingPlaceholderValues(ctx, perf) {
  const showTitle = plain(ctx?.show?.title || "");
  const prod = findProduction(ctx, null, 0);
  const now = ctxNow(ctx);
  return {
    show: showTitle ? `\x01${showTitle}\x02` : null,
    next_when: formatNextWhen(now, nextPerformanceAfter(ctx, perf) || {}),
    opening_when: formatOpeningWhen(now, firstNonDress(ctx) || {}),
    run_end: formatRunEnd(ctx),
    next_production: prod?.title ? `\x01${prod.title}\x02` : null,
    next_production_dates: prod ? nextProductionDatesText(prod) : null,
  };
}

function fillHoldingCopy(text, values) {
  const source = String(text ?? "");
  let failed = false;
  const out = source.replace(HOLDING_PLACEHOLDERS, (match, key) => {
    const value = values[key];
    if (value == null || value === "") {
      failed = true;
      return match;
    }
    return value;
  });
  return failed ? null : out;
}

function holdingNames(html) {
  return String(html ?? "").replace(HOLDING_NAME, '<span class="hold-name">$1</span>');
}

/* Wake-up context line (mock-ups 08-12). Dress rehearsals do not count in
   "Performance N of M" (D5) - numbering counts non-dress entries only, in
   date order. On a dress night the screen says "Rehearsal", never "Dress"
   (D7). */
function wakeUpContext(ctx, perf) {
  const list = holdingPerformances(ctx) || [];
  if (perf?.dress_rehearsal === true) {
    return `<b>Rehearsal</b> tonight`;
  }
  const key = performanceStartKey(perf);
  const isLast = !list.some(entry => performanceStartKey(entry) > key);
  if (isLast) {
    return `<b>Final performance</b> tonight`;
  }
  const nonDress = list.filter(entry => entry?.dress_rehearsal !== true && performanceStartKey(entry));
  const n = nonDress.findIndex(entry => entry === perf) + 1;
  const m = nonDress.length;
  if (perf?.matinee === true) {
    return `<b>Matinee</b> - ${n} of ${m}`;
  }
  return `<b>Performance ${n}</b> of ${m}`;
}

/* The "Tonight" timeline (design section 4): scheduled facts only (D3).
   Interval and end are estimates (c. prefix, muted); a row whose source is
   missing is left out, never guessed. */
function wakeUpTimeline(ctx, perf, moments) {
  const rows = [
    { label: "Doors open", at: moments.houseOpen, est: false },
    { label: "Curtain up", at: moments.curtain, est: false },
  ];
  const intervalAt = performanceMoment(perf?.date, perf?.interval_at_estimated)
    || (showdayStepOffset(ctx?.showday, "interval") != null
      ? new Date(moments.curtain.getTime() + showdayStepOffset(ctx.showday, "interval") * 60000)
      : null);
  if (intervalAt) {
    rows.push({ label: "Interval", at: intervalAt, est: true });
  }
  const finishAt = performanceMoment(perf?.date, perf?.estimated_finish);
  if (finishAt) {
    rows.push({ label: "The end", at: finishAt, est: true });
  }
  rows.push({ label: "Bar closes", at: moments.holdingStart, est: false });
  return rows.sort((a, b) => a.at - b.at);
}

/* The countdown formats (design section 4): whole minutes rounded UP above
   15 minutes (so it never says 0 MIN early), mm:ss ticking in the last 15,
   NOW under "Doors are open" at or after house open. The initial render
   uses the same shapes the 1-second ticker rewrites in place. */
function wakeUpCountdownParts(remainingMs, leadOverride) {
  if (remainingMs <= 0) {
    return { lead: "Doors are open", count: "NOW" };
  }
  const lead = leadOverride || "Doors open in";
  if (remainingMs <= 15 * 60000) {
    const totalSec = Math.ceil(remainingMs / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return { lead, count: `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}` };
  }
  return { lead, count: `${Math.ceil(remainingMs / 60000)}<small>MIN</small>` };
}

/* photo-set (C18, October 2026 - design note docs/design/2026-10-10-foyer-photo-set-design.md):
   1-4 photos shown at their own recorded aspect ratios - nothing is cropped
   at rest, no landscape template letterboxes a portrait. The layout is
   planned from photo-sizes.json (tools/foyer-photo-sizes.py), never from a
   loading image. */

export const PHOTO_SET_LIMIT = 4;
export const PHOTO_SET_GAP_PX = 40;
export const PHOTO_SET_ROW_FLOOR_PX = 380;

// transform-origin for the zoom, constrained to real CSS values so pack
// content can never inject a declaration into the inline style.
const PHOTO_SET_FOCUS_RE =
  /^(left|right|center|top|bottom|\d+(?:\.\d+)?%|\d+(?:\.\d+)?px)(\s+(left|right|center|top|bottom|\d+(?:\.\d+)?%|\d+(?:\.\d+)?px))?$/i;

/* Card geometry at the 1920x1080 design canvas. rowWidth and contentHeight
   follow the decided padding (5% 8%; CSS vertical padding resolves against
   the canvas WIDTH). rowMax is the height a justified row gets below the
   eyebrow + headline.tiny + footline text block - the mock-ups measured
   about 640px, and the expression below reproduces that from the CSS rules
   themselves (34px eyebrow, min(4.2vw,6vh) Anton headline at 0.92
   line-height, min(2.27vw,3.15vh) footline, plus their margins). The DOM
   still caps frames at the real remaining height via
   height: min(--ps-h, 100%), so this figure feeds the width-fit term and
   the render check's floor - it never paints a size on its own. */
export function photoSetGeometry() {
  const rowWidth = 1920 - 2 * 0.08 * 1920;
  const contentHeight = 1080 - 2 * 0.05 * 1920;
  const eyebrow = 34 * 1.2 + 22;              // foyer-small + margin-bottom
  const headline = Math.min(0.042 * 1920, 0.06 * 1080) * 0.92 + 24;
  const footline = Math.min(0.0227 * 1920, 0.0315 * 1080) * 1.2 + 32;
  return {
    rowWidth,
    contentHeight,
    rowMax: contentHeight - eyebrow - headline - footline,
  };
}

/* Pure layout plan, shared with tools/foyer-pack-render-check.mjs: given the
   declared photos and the recorded sizes map, report the layout, the common
   frame height h, the uncapped width-fit height, and which photos could not
   be placed (missing from photo-sizes.json or beyond the four-frame limit).
   photos[0..n].frameW/frameH give each frame's rendered box. */
export function photoSetPlan(photos, sizes) {
  const declared = Array.isArray(photos) ? photos : [];
  const usable = [];
  const missing = [];
  for (const photo of declared.slice(0, PHOTO_SET_LIMIT)) {
    const key = String((photo && (photo.source || photo.poster)) || "");
    const size = key && sizes ? sizes[key] : null;
    const w = Array.isArray(size) ? Number(size[0]) : NaN;
    const h = Array.isArray(size) ? Number(size[1]) : NaN;
    if (w > 0 && h > 0) usable.push({ photo, key, w, h, aspect: w / h });
    else missing.push(photo);
  }
  const plan = {
    photos: usable,
    missing,
    overflow: Math.max(0, declared.length - PHOTO_SET_LIMIT),
    layout: null,
    singleLandscape: false,
    h: 0,
    widthFit: 0,
    rowMax: photoSetGeometry().rowMax,
  };
  if (!usable.length) return plan;
  const allPortrait = usable.every(p => p.h > p.w);
  if (usable.length === 1 && allPortrait) plan.layout = "one-portrait";
  else if (usable.length === 2 && allPortrait) plan.layout = "two-portraits";
  else {
    plan.layout = "row";
    plan.singleLandscape = usable.length === 1;
  }
  const geom = photoSetGeometry();
  if (plan.layout === "row") {
    const sumAspect = usable.reduce((total, p) => total + p.aspect, 0);
    plan.widthFit =
      (geom.rowWidth - PHOTO_SET_GAP_PX * (usable.length - 1)) / sumAspect;
    plan.h = Math.min(geom.rowMax, plan.widthFit);
  } else {
    plan.h = geom.contentHeight;
  }
  for (const p of usable) {
    p.frameW = plan.h * p.aspect;
    p.frameH = plan.h;
  }
  return plan;
}

function photoSetTemplate(item, ctx) {
  const content = item.content || {};
  const id = item.id || item.tag || "photo-set";
  const declared = Array.isArray(content.photos) ? content.photos : [];
  if (!declared.length) {
    console.warn(`photo-set '${id}' carries no photos - skipped.`);
    return null;
  }
  const sizes = (ctx && ctx.photoSizes && ctx.photoSizes.sizes) || {};
  const plan = photoSetPlan(declared, sizes);
  if (plan.overflow) {
    console.warn(`photo-set '${id}' carries ${declared.length} photos - only the first ${PHOTO_SET_LIMIT} are shown.`);
  }
  if (!plan.photos.length) {
    console.warn(`photo-set '${id}' has no recorded sizes in photo-sizes.json (run tools/foyer-photo-sizes.py) - skipped.`);
    return null;
  }
  if (plan.missing.length) {
    const names = plan.missing.map(p => (p && (p.source || p.poster)) || "?").join(", ");
    console.warn(`photo-set '${id}' drops ${plan.missing.length} photo(s) with no recorded size: ${names}.`);
  }
  if (plan.singleLandscape) {
    console.warn(`photo-set '${id}' holds a single landscape photo - the 'feature' template is the better card for it.`);
  }
  const dwell = Math.max(4, Math.min(120, Number(item.dwell_seconds) || 20));
  const eyebrow = content.eyebrow || "";
  const headline = content.headline || titleFromAsset(plan.photos[0].key);
  const body = plan.layout === "one-portrait" ? content.body || "" : "";
  const footline = content.footline || "";
  const framesHtml = plan.photos.map((entry, i) => {
    const photo = entry.photo;
    const alt = photo.alt || titleFromAsset(entry.key);
    const focus = PHOTO_SET_FOCUS_RE.test(String(photo.focus || "").trim())
      ? String(photo.focus).trim()
      : "";
    const style = `--ps-aspect:${entry.w}/${entry.h};--ps-i:${i};${focus ? `--ps-focus:${focus};` : ""}`;
    const fallback = `<strong>${caps(alt) || "PHOTO"}</strong><span>${entry.key.split("/").pop() || "image pending"}</span>`;
    return photo.video
      ? videoFrame(ctx, { video: photo.video, poster: photo.poster, alt, classes: "photo-set-frame", style, fallback })
      : photoFrame(ctx, { src: photo.source, alt, classes: "photo-set-frame", style, fallback });
  }).join("\n        ");
  if (plan.layout !== "row") {
    return `<div class="photo-set photo-set-side" style="--ps-dwell:${dwell}s;">
      <div class="photo-set-text">
        ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ""}
        <h2 class="headline tiny">${upper(headline)}</h2>
        ${body ? `<p class="body" style="max-width:none;">${body}</p>` : ""}
        ${footline ? `<p class="footline">${footline}</p>` : ""}
      </div>
      <div class="photo-set-side-photos">
        ${framesHtml}
      </div>
    </div>`;
  }
  // --ps-h carries the width-fit term only; height: min(--ps-h, 100%) lets
  // the DOM cap the row at the real remaining height above the footline.
  return `<div class="photo-set photo-set-rows" style="--ps-dwell:${dwell}s;">
    <div class="photo-set-head">
      ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ""}
      <h2 class="headline tiny">${upper(headline)}</h2>
    </div>
    <div class="photo-set-row" style="--ps-h:${Math.round(plan.widthFit)}px;">
      ${framesHtml}
    </div>
    ${footline ? `<p class="footline">${footline}</p>` : ""}
  </div>`;
}

export const slideTemplates = {
  // P01 — welcome / tonight
  "welcome": (item, ctx) => {
    const show = ctx.show || {};
    const venue = show.venue || "Criterion Theatre";
    const subtitle = show.subtitle || "";
    const runDates = formatRange(show.run_dates && show.run_dates.first, show.run_dates && show.run_dates.last);
    return `<div class="split-layout">
        <div class="split-text">
          <p class="eyebrow">Tonight at ${venue}</p>
          <h2 class="headline" style="font-size:11vw;">${upper(show.title)}</h2>
          ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ""}
          <p class="author">BY ${caps(show.author)}</p>
          ${runDates ? `<p class="footline" style="margin-top:32px;">${runDates}</p>` : ""}
        </div>
        ${posterFrame(ctx, {
          src: show.image_local,
          alt: `${show.title || ""} poster`,
          fallback: `<strong>${caps(show.title)}</strong><span>Poster asset not yet downloaded.<br>Run <code style="color:var(--cream-2)">download-assets.py</code></span>`,
        })}
      </div>`;
  },

  // P02 — tonight, show info
  "show-info": (item, ctx) => {
    const show = ctx.show || {};
    const content = item.content || {};
    const packCopy = show.foyer_content?.show_info || {};
    const performance = ctx.performance || {};
    const curtain = performance.curtain || show.curtain || "";
    const houseOpens = performance.house_opens || "";
    const intervalAt = performance.interval_at_estimated || "";
    const descriptor = content.descriptor || packCopy.descriptor
      || (show.author || show.director
        ? `A play by ${show.author || ""}${show.director ? ` &mdash; directed by ${show.director}` : ""}`
        : "");
    const hasRuntime = Number(show.running_time_minutes) > 0;
    const hasInterval = Number.isFinite(Number(show.interval_minutes)) && Number(show.interval_minutes) > 0;
    const isDraft = item.review_status === "draft" || content.review_status === "draft";
    const draftBadge = isDraft
      ? `<p class="review-badge">Draft &mdash; ${item.draft_label || content.draft_label || (item.draft_owner ? `for ${item.draft_owner}'s approval` : "for approval")}</p>`
      : "";
    const timingBody = hasRuntime
      ? `<p class="body">
            Running time approximately <b>${minutesToText(show.running_time_minutes)}</b>${
              hasInterval
                ? ` including one <b>${Number(show.interval_minutes)}-minute interval</b>`
                : `, <b>straight through with no interval</b>`
            }${curtain ? `. Curtain at <b>${curtain}</b>` : ""}.
          </p>`
      : `<p class="body">
            Running time and interval are <b>not yet confirmed</b>. Please check back nearer the performance, or ask front-of-house.
          </p>`;
    return `<div class="split-layout">
        <div class="split-text">
          <p class="eyebrow">Tonight's production</p>
          <h2 class="headline medium">${upper(show.title)}</h2>
          ${descriptor ? `<p class="subhead">${descriptor}</p>` : ""}
          ${timingBody}
          <p class="footline">${houseOpens ? `House opens ${houseOpens}` : "House opening time at the box office"}${curtain ? ` <span class="sep">&#8226;</span> Curtain ${curtain}` : ""}${intervalAt ? ` <span class="sep">&#8226;</span> Interval ~${intervalAt}` : ""}</p>
          ${draftBadge}
        </div>
        ${posterFrame(ctx, {
          src: show.image_local,
          alt: "",
          fallback: `<strong>${caps(show.title)}</strong><span>poster</span>`,
        })}
      </div>`;
  },

  // P03 — tonight's cast
  "cast": (item, ctx) => {
    const cast = (ctx.show && ctx.show.cast) || [];
    const rows = cast.map(member => `<div class="cast-row"><span class="cast-role">${member.role}</span><span class="cast-actor">${member.actor}</span></div>`).join("\n          ");
    return `<p class="eyebrow">Tonight's cast</p>
      <h2 class="headline small">${upper("The company")}</h2>
      <div class="two-col">
          ${rows}
      </div>`;
  },

  // P04 — content warnings, rolling top three
  "warning-top3": (item, ctx) => {
    const tops = ((ctx.show && ctx.show.content_warnings) || []).filter(warning => warning.tier === "top");
    const rows = tops.map(warning => `<div class="warning-tag">${warning.headline}</div>
          <div class="warning-detail">${warning.detail}</div>`).join("\n          ");
    return `<p class="eyebrow warn">Content Notice</p>
      <h2 class="headline small">${upper("Before you take your seat")}</h2>
      <div class="warning-list" style="margin-top:18px;">
          ${rows}
      </div>`;
  },

  // P05 — full content advisory (house-open one-shot)
  "warning-full": (item, ctx) => {
    const all = (ctx.show && ctx.show.content_warnings) || [];
    const content = item.content || {};
    const warningsById = new Map(all.map(warning => [warning.id, warning]));
    const selected = Array.isArray(content.warning_ids)
      ? content.warning_ids.map(id => warningsById.get(id)).filter(Boolean)
      : all;
    const half = Math.ceil(selected.length / 2);
    const col1 = selected.slice(0, half).map(warningLine).join("\n            ");
    const col2 = selected.slice(half).map(warningLine).join("\n            ");
    const eyebrow = content.eyebrow || "Full Content Advisory";
    const headline = content.headline || "Content &amp; accessibility";
    return `${warningIcon()}
      <p class="eyebrow warn">${eyebrow}</p>
      <h2 class="headline small">${upper(headline)}</h2>
      <p class="body${content.body ? '' : ' small'}">${content.body || "This production contains the following. Please speak to a member of front-of-house if you have any concerns."}</p>
      <div class="two-col" style="margin-top:14px;">
          <div>
            ${col1}
          </div>
          <div>
            ${col2}
          </div>
      </div>`;
  },

  // P05b — explicit content-advice gap. Does not import warnings from any
  // previous show; simply tells the audience that advice is pending.
  "content-advice-gap": (item, ctx) => {
    const content = item.content || {};
    const draftBadge = item.review_status === "draft"
      ? `<p class="review-badge">Draft &mdash; ${item.draft_label || (item.draft_owner ? `for ${item.draft_owner}'s approval` : "for approval")}</p>`
      : "";
    return `<p class="eyebrow warn">Content notice</p>
      <h2 class="headline small">${upper("Content advice to be confirmed")}</h2>
      <p class="body" style="max-width:none;">${content.body || "Age guidance, themes and other content information for this production have not been confirmed. Please speak to front-of-house if you have any concerns."}</p>
      ${draftBadge}`;
  },

  // P06 — safety: phones, photography, fire exits
  "safety": () => `${phonesOffIcon()}
      <p class="eyebrow">Before curtain</p>
      <h2 class="headline small">${upper("Phones off &mdash; no photography")}</h2>
      <p class="body">
        Please silence your phones completely &mdash; vibrate is loud on stage.
        Photography and recording are not permitted during the performance.
      </p>
      <p class="body" style="color:var(--lavender);">
        Fire exits are clearly marked. In an emergency, follow the staff and leave by the nearest exit.
      </p>`,

  // P07 — about the writer
  "about-writer": aboutWriterTemplate,

  // P07 legacy alias — kept for existing packs.
  "about-ben": aboutWriterTemplate,

  // P08 — about the play
  "about-play": (item, ctx) => {
    const show = ctx.show || {};
    return `<div class="split-layout">
        <div class="split-text">
          <p class="eyebrow">About the play</p>
          <h2 class="headline small">${upper(show.tagline) || upper(show.title)}</h2>
          <p class="body" style="max-width:none;">
            ${show.synopsis || ""}
          </p>
        </div>
        ${posterFrame(ctx, {
          src: show.image_local,
          alt: "",
          fallback: `<strong>${caps(show.title)}</strong><span>poster</span>`,
        })}
      </div>`;
  },

  // P09 — director's note
  "director-quote": (item, ctx) => {
    const show = ctx.show || {};
    const packContent = show.foyer_content?.director || {};
    const itemContent = item.content || {};
    const isDraft = item.review_status === "draft" || itemContent.review_status === "draft";
    const quote = itemContent.quote || packContent.quote || plain(show.tagline) || `Welcome to ${show.title || "tonight's production"}.`;
    const draftOwner = isDraft ? (itemContent.draft_owner || packContent.draft_owner || show.director || "Director") : "";
    const draftLabel = isDraft ? (itemContent.draft_label || packContent.draft_label || `for ${draftOwner}'s approval`) : "";
    const bodyCopy = isDraft
      ? `<p class="body" style="font-style:italic; color:var(--cream); max-width:none;">${quote}</p>`
      : `<p class="body" style="font-style:italic; color:var(--cream); max-width:none;">
            &ldquo;${quote}&rdquo;
          </p>`;
    return `<div class="split-layout">
        <div class="split-text">
          <p class="eyebrow calm">From the director</p>
          <h2 class="headline small outline">${upper("Director's note")}</h2>
          ${bodyCopy}
          <p class="footline">${show.director || "Director"} <span class="sep">&#8226;</span> Director</p>
          ${isDraft ? `<p class="review-badge">Draft — ${draftLabel}</p>` : ""}
        </div>
        ${photoFrame(ctx, {
          src: itemContent.image_local || packContent.image_local,
          alt: show.director || "Director",
          classes: "contain",
          fallback: `<strong>${caps(show.director) || "DIRECTOR"}</strong><span>Director</span>`,
        })}
      </div>`;
  },

  // P09b — Chris Firth publicity-film placeholder. No blank video source;
  // shows an intentional review card until the actual film is supplied.
  "publicity-film-placeholder": (item, ctx) => {
    const content = item.content || {};
    const show = ctx.show || {};
    const phase = content.phase || "Preshow";
    const draftBadge = item.review_status === "draft"
      ? `<p class="review-badge">Draft &mdash; ${item.draft_label || (item.draft_owner ? `for ${item.draft_owner}'s approval` : "for approval")}</p>`
      : "";
    return `<div class="split-layout">
        <div class="split-text">
          <p class="eyebrow">${phase} film</p>
          <h2 class="headline small">${upper("Publicity film")}</h2>
          <p class="body" style="max-width:none;">${content.body || "A short publicity film for Underdog will appear here once Chris Firth supplies the approved footage. No old-show footage or invented running time is used."}</p>
          ${draftBadge}
        </div>
        ${posterFrame(ctx, {
          src: show.image_local,
          alt: `${show.title || "Show"} poster placeholder`,
          classes: "muted",
          fallback: `<strong>${caps(show.title) || "PUBLICITY FILM"}</strong><span>Poster placeholder</span>`,
        })}
      </div>`;
  },

  // P10 — show-specific context/trivia
  "did-you-know": (item, ctx) => {
    const content = item.content || {};
    const trivia = ctx.show?.foyer_content?.trivia || {};
    const headline = content.headline || trivia.headline;
    const body = content.body || trivia.body || ctx.show?.synopsis || "";
    const image_local = content.image_local || trivia.image_local;
    const eyebrow = content.eyebrow || trivia.eyebrow || "Did you know";
    return `<div class="split-layout">
        <div class="split-text">
          <p class="eyebrow">${eyebrow}</p>
          <h2 class="headline small">${upper(headline) || upper(ctx.show?.title)}</h2>
          <p class="body" style="max-width:none;">
            ${body}
          </p>
        </div>
        ${photoFrame(ctx, {
          src: image_local,
          alt: headline || ctx.show?.title || "",
          classes: "contain",
          fallback: `<strong>${caps(ctx.show?.title) || "DID YOU KNOW"}</strong><span>Production context</span>`,
        })}
      </div>`;
  },

  // P10b — venue context
  "did-you-know-criterion": (item, ctx) => {
    const content = item.content || {};
    const venue = ctx.show?.foyer_content?.venue || {};
    const headline = content.headline || venue.headline || ctx.show?.venue || "Our theatre";
    const body = content.body || venue.body || "This production is made possible by the people who support and volunteer at our theatre.";
    const footline = content.footline || venue.footline;
    const image_local = content.image_local || venue.image_local;
    // Configurable so a service card can say what it is. "Did you know" over
    // "Act II will resume shortly" framed an instruction as trivia. 2026-09-10.
    const eyebrow = content.eyebrow || venue.eyebrow || "Did you know";
    const text = `<p class="eyebrow">${eyebrow}</p>
      <h2 class="headline small">${upper(headline)}</h2>
      <p class="body">${body}</p>
      ${footline ? `<p class="footline">${footline}</p>` : ""}`;
    if (!image_local) {
      return text;
    }
    return `<div class="split-layout">
        <div class="split-text">
          ${text}
        </div>
        ${photoFrame(ctx, {
          src: image_local,
          alt: headline,
          classes: "contain",
          fallback: `<strong>${caps(headline)}</strong><span>Our theatre</span>`,
        })}
      </div>`;
  },

  // P11 — immediate next production
  "next-production": (item, ctx) => {
    const prod = findProduction(ctx, item.production_id) || {};
    const runDates = formatRange(prod.run_dates && prod.run_dates.first, prod.run_dates && prod.run_dates.last);
    return `<div class="split-layout sales-card">
        ${particleOverlay(item, ctx, { seed: item.id || "next-production", count: 15 })}
        <div class="split-text">
          <p class="eyebrow calm">Coming up next at ${ctx.show?.venue || "our theatre"}</p>
          <h2 class="headline small cyan">${upper(prod.title || "Coming soon")}</h2>
          <p class="subhead cyan" style="font-size:2.2vw; letter-spacing:3px;">${prod.subtitle || ""}</p>
          <p class="body" style="max-width:none;">
            ${prod.synopsis_short || prod.synopsis_full || ""}
          </p>
          ${runDates ? `<p class="footline">${runDates}</p>` : ""}
          ${bookBlock(prod, ctx)}
        </div>
        ${posterFrame(ctx, {
          src: prod.image_local,
          alt: `${prod.title || "Coming soon"} poster`,
          classes: "cyan",
          fallback: `<strong>${caps(prod.title) || "COMING SOON"}</strong><span>poster pending</span>`,
        })}
      </div>`;
  },

  // P11b — later production
  "next-production-2": (item, ctx) => {
    const prod = findProduction(ctx, item.production_id, 1) || {};
    const credit = [prod.author, prod.adapter ? `adapted by ${prod.adapter}` : null]
      .filter(Boolean)
      .join(", ");
    const director = prod.director ? ` Directed by ${prod.director}.` : "";
    const runDates = formatRange(prod.run_dates && prod.run_dates.first, prod.run_dates && prod.run_dates.last);
    return `<div class="split-layout">
        <div class="split-text">
          <p class="eyebrow calm">And coming later</p>
          <h2 class="headline small cyan">${upper(prod.title || "Coming soon")}</h2>
          <p class="body" style="max-width:none; margin-top:18px;">
            ${prod.synopsis_short || prod.synopsis_full || ""}
          </p>
          <p class="body small" style="color:var(--cream-2);">By ${credit}.${director}</p>
          ${runDates ? `<p class="footline">${runDates}</p>` : ""}
          ${bookBlock(prod, ctx)}
        </div>
        ${posterFrame(ctx, {
          src: prod.image_local,
          alt: `${prod.title || "Coming soon"} poster`,
          classes: "cyan",
          fallback: `<strong>${caps(prod.title) || "COMING SOON"}</strong><span>poster pending</span>`,
        })}
      </div>`;
  },

  // P12 — volunteer call
  "volunteer": (item, ctx) => `<p class="eyebrow">Join us</p>
      <h2 class="headline small">${upper(`Volunteer at ${ctx.show?.venue || "our theatre"}`)}</h2>
      <p class="body">
        ${item.content?.body || ctx.show?.foyer_content?.volunteer?.body || "Speak to the front-of-house team to find out how to take part on stage, backstage, or around the building."}
      </p>
      ${(item.content?.footline || ctx.show?.foyer_content?.volunteer?.footline) ? `<p class="footline">${item.content?.footline || ctx.show.foyer_content.volunteer.footline}</p>` : ""}`,

  // P13 — tickets & walk-ins. Carries the tickets QR beside the price tiers
  // (destination not yet live — keep the "(QR not yet live)" caption).
  "tickets-walkins": (item, ctx) => {
    const prices = (ctx.show && ctx.show.ticket_prices) || {};
    return `<div class="sales-card">
        ${particleOverlay(item, ctx, { seed: item.id || "tickets-walkins", count: 15 })}
        <p class="eyebrow">Tickets &amp; walk-ins</p>
        <h2 class="headline small">${upper(`Tickets from ${prices.under_25 || "&pound;10"}`)}</h2>
        <div class="walkins-grid">
          <div class="walkins-tiers">
            <div class="price-tier secondary">
              <div class="price-label">Standard</div>
              <div class="price-amount">${prices.non_member || "&pound;15"}</div>
            </div>
            <div class="price-tier accent">
              <div class="price-label">Member</div>
              <div class="price-amount">${prices.member || "&pound;12.50"}</div>
            </div>
            <div class="price-tier muted">
              <div class="price-label">Under 25</div>
              <div class="price-amount">${prices.under_25 || "&pound;10"}</div>
            </div>
          </div>
          <div class="walkins-qr">
            <div class="qr-card">
              <img src="${asset(ctx, "assets/images/tickets-qr.png")}" alt="Scan to book tickets" onerror="this.style.display='none'; this.parentElement.innerHTML='<span class=&quot;qr-fallback&quot;>QR</span>'">
            </div>
            <div class="qr-caption">Scan to book</div>
          </div>
        </div>
        <p class="body small" style="margin-top:20px; color:var(--lavender);">
          Ask front-of-house about availability for tonight.
          ${ctx.show?.tickets_url ? `Book online: <b style="color:var(--cream-2);">${ticketUrl(null, ctx)}</b>.` : ""}
        </p>
      </div>`;
  },

  // P13b — preshow ticket-sales anchor when prices/times are not confirmed.
  // No invented stock status or price; points people to front-of-house.
  "ticket-sales-anchor": (item, ctx) => {
    const content = item.content || {};
    const body = content.body || "Tickets for tonight? Ask front-of-house about availability.";
    const footline = content.footline || ctx.show?.venue || "Criterion Theatre";
    return `<div class="sales-card">
        ${particleOverlay(item, ctx, { seed: item.id || "ticket-sales-anchor", count: 15 })}
        <p class="eyebrow">Tickets</p>
        <h2 class="headline small">${upper(body)}</h2>
        <p class="body">Ask a front-of-house team member about availability for tonight's performance. No price or stock status is shown until it is confirmed.</p>
        <p class="footline">${footline}</p>
      </div>`;
  },

  // I01 — interval bar spotlight (carries the real foyer-bar photo)
  "bar-spotlight": (item, ctx) => {
    const show = ctx.show || {};
    const content = item.content || {};
    const packCopy = show.foyer_content?.bar_spotlight || {};
    const eyebrow = content.eyebrow || packCopy.eyebrow || "At the bar tonight";
    const body = content.body || packCopy.body || "Beers, wines, soft drinks and snacks are being served now in the foyer bar.";
    const barImage = content.image_local || packCopy.image_local || "assets/images/bar-foyer.jpg";
    return `<div class="split-layout sales-card">
        ${particleOverlay(item, ctx, { seed: item.id || "bar-spotlight", count: 15 })}
        <div class="split-text">
          <p class="eyebrow">${eyebrow}</p>
          <h2 class="headline medium cyan">${upper("The bar is open")}</h2>
          <p class="body" style="max-width:none;">
            ${body}
          </p>
        </div>
        ${posterFrame(ctx, {
          src: barImage,
          alt: "The Criterion foyer bar",
          classes: "cyan",
          fallback: `<strong>THE BAR</strong><span>foyer bar photo</span>`,
        })}
      </div>`;
  },

  // I01b — interval ice creams. Exact wording supplied by David.
  "ice-cream": (item, ctx) => {
    const content = item.content || {};
    const headline = content.headline || "Interval ice creams";
    const body = content.body || "Ice creams are available in the foyer during the interval.";
    return `<div class="sales-card">
        ${particleOverlay(item, ctx, { seed: item.id || "ice-cream", count: 15 })}
        <p class="eyebrow">During the interval</p>
        <h2 class="headline small cyan">${upper(headline)}</h2>
        <p class="body" style="max-width:none;">${body}</p>
      </div>`;
  },

  // I02 — live interval countdown; nextgen-foyer updates the data fields in place.
  "countdown": (item, ctx) => {
    const countdown = (ctx && ctx.countdown) || { minutes: null, state: "clear" };
    const intervalMinutes = Number(ctx && ctx.countdownWindowMinutes)
      || Number(ctx && ctx.show && ctx.show.interval_minutes)
      || 20;
    const value = countdown.state === "counting"
      ? `${countdown.minutes} MIN`
      : (countdown.state === "now" ? "ACT II" : `~${intervalMinutes} MIN INTERVAL`);
    const caption = countdown.state === "counting"
      ? "Please make your way back to your seats when you hear the bell."
      : (countdown.state === "now"
        ? "Please take your seats. Act II is about to begin."
        : "Please enjoy the interval.");
    const labelClass = countdown.state === "clear" ? " is-label" : "";
    return `<p class="eyebrow">Interval</p>
      <h2 class="headline small cyan">${upper("Act II begins in")}</h2>
      <div class="countdown-display${labelClass}" id="countdown-display">${value}</div>
      <p class="body countdown-caption" id="countdown-caption">${caption}</p>`;
  },

  // I03 — next production, interval treatment
  "next-production-interval": (item, ctx) => {
    const prod = findProduction(ctx, item.production_id) || {};
    const runDates = formatRange(prod.run_dates && prod.run_dates.first, prod.run_dates && prod.run_dates.last);
    return `<div class="split-layout sales-card">
        ${particleOverlay(item, ctx, { seed: item.id || "next-production-interval", count: 15 })}
        <div class="split-text">
          <p class="eyebrow calm">Coming next</p>
          <h2 class="headline small cyan">${upper(prod.title || "Coming soon")}</h2>
          <p class="subhead cyan" style="font-size:var(--foyer-small-size); letter-spacing:3px;">${prod.subtitle || ""}</p>
          <p class="body" style="max-width:none;">
            ${prod.synopsis_short || prod.synopsis_full || ""}
          </p>
          ${runDates ? `<p class="footline">${runDates}</p>` : ""}
          ${bookBlock(prod, ctx)}
        </div>
        ${posterFrame(ctx, {
          src: prod.image_local,
          alt: `${prod.title || "Coming soon"} poster`,
          classes: "cyan",
          fallback: `<strong>${caps(prod.title) || "COMING SOON"}</strong><span>poster pending</span>`,
        })}
      </div>`;
  },

  "criterion-charity": (item, ctx) => {
    const content = item.content || {};
    const packCopy = ctx.show?.foyer_content?.criterion_charity || {};
    const body = content.body || packCopy.body
      || "Every production is made by volunteers, and every ticket helps keep live theatre thriving in Earlsdon.";
    return `<p class="eyebrow">Did you know</p>
      <h2 class="headline small cyan">${upper("The Criterion is a charity")}</h2>
      <p class="body">
        ${body}
      </p>
      <p class="footline">${content.footline || packCopy.footline || "Registered charity 1161430"}</p>`;
  },

  // X01 — postshow bar (carries the real foyer-bar photo, muted frame)
  "bar-stays-open": (item, ctx) => {
    const show = ctx.show || {};
    const content = item.content || {};
    const packCopy = show.foyer_content?.bar || {};
    const barClose = (ctx.performance && ctx.performance.bar_close) || "";
    const hasTime = /^\d{1,2}:\d{2}$/.test(barClose);
    const providedBody = content.body || packCopy.body;
    const bodyCopy = providedBody
      ? String(providedBody).replace(/\{\{bar_close\}\}/g, barClose)
      : (hasTime
        ? `The bar is open until <b>${barClose}</b>. Ask our staff for tonight's last orders.`
        : "The bar stays open after the show. Ask our staff for tonight's last orders.");
    const footline = hasTime
      ? `Tonight <span class="sep">&#8226;</span> ${barClose} close`
      : `Tonight <span class="sep">&#8226;</span> the bar is open`;
    const barImage = content.image_local || packCopy.image_local || "assets/images/bar-foyer.jpg";
    return `<div class="split-layout sales-card">
        ${particleOverlay(item, ctx, { seed: item.id || "bar-stays-open", count: 15 })}
        <div class="split-text">
          <p class="eyebrow calm">Thank you for being with us</p>
          <h2 class="headline small">${upper("The bar stays open")}</h2>
          <p class="body" style="max-width:none;">
            ${bodyCopy}
          </p>
          <p class="footline">${footline}</p>
        </div>
        ${posterFrame(ctx, {
          src: barImage,
          alt: "The Criterion foyer bar",
          classes: "muted",
          fallback: `<strong>THE BAR</strong><span>foyer bar photo</span>`,
        })}
      </div>`;
  },

  // X02 — postshow thanks
  /* Per-item content wins, then the pack's own copy, then a neutral default.
     The previous default was Popcorn's June-2026 heatwave apology, hard-coded
     here: it rendered on every show's postshow regardless of season or company. */
  "thank-you": (item, ctx) => {
    const content = item.content || {};
    const packCopy = ctx.show?.foyer_content?.thank_you || {};
    const eyebrow = content.eyebrow || packCopy.eyebrow || `From everyone at ${ctx.show?.venue || "the theatre"}`;
    const headline = content.headline || packCopy.headline || "Thank you";
    const body = content.body || packCopy.body
      || "For making the journey to Earlsdon, and for giving us your evening.";
    const footline = content.footline || packCopy.footline || "";
    return `<p class="eyebrow calm">${eyebrow}</p>
      <h2 class="headline medium">${upper(headline)}</h2>
      <p class="body">${body}</p>${footline ? `<p class="footline">${footline}</p>` : ""}`;
  },

  "archive-intro": () => `<p class="eyebrow calm">From the theatre archive</p>
      <h2 class="headline medium outline">${upper("From the archives")}</h2>
      <p class="body">Seven decades of first nights, near-disasters and standing ovations &mdash; a few
        favourites from the Criterion's history.</p>`,

  // X03/X06-X10 plus additional archive pool entries
  "archive-memory": (item, ctx) => {
    const content = item.content || {};
    let memory = findMemory(ctx, item.source, item.memory_id);
    // Per-item content can override or stand in for a shared memory record.
    if (!memory && content.production) {
      memory = {
        production: content.production,
        quote: content.quote || "",
        author: content.author || "",
        role: content.role || "",
        image_local: content.image_local || item.source,
      };
    }
    if (!memory) {
      return `<p class="eyebrow calm">From the theatre archive</p>
        <h2 class="headline small outline">${upper("A life in the theatre")}</h2>
        <p class="body">Stories from the actors, makers and volunteers who built this theatre's history.</p>`;
    }
    const year = productionYear(memory.production);
    const title = productionTitle(memory.production);
    const draftBadge = item.review_status === "draft"
      ? `<p class="review-badge">Draft &mdash; ${item.draft_label || (item.draft_owner ? `for ${item.draft_owner}'s approval` : "for approval")}</p>`
      : "";
    return `<div class="archive-vignette">
        <p class="eyebrow calm">From the theatre archive</p>
        <h2 class="headline small outline">${year} &mdash; ${upper(title)}</h2>
        <div class="archive-thumb-wrap">
          <div class="archive-text">
            <p class="body">&ldquo;${memory.quote}&rdquo;</p>
            <p class="archive-attribution"><span class="attr-name">${memory.author}</span> &mdash; ${memory.role}</p>
            ${draftBadge}
          </div>
          ${posterFrame(ctx, {
            src: memory.image_local,
            alt: memory.production,
            classes: "muted contain",
            fallback: `<strong>${year}</strong><span>poster</span>`,
          })}
        </div>
      </div>`;
  },

  // Generic large-image feature slide (image is the point, text is caption).
  "feature": (item, ctx) => featureTemplate(item, ctx),

  // P14 / XP1-XP3 — Popcorn pack alias for the generic feature template.
  "popcorn-feature": (item, ctx) => featureTemplate(item, ctx),

  // Generic animated story montage: pack-authored ordered frames with stable
  // headline, caption, credit and review status. No show-specific filenames here.
  "story-montage": storyMontage,

  // Generic aspect-aware photo card (C18): 1-4 photos at their own recorded
  // shapes from photo-sizes.json - side layouts for portraits, a justified
  // row for three or four. Nothing cropped at rest.
  "photo-set": photoSetTemplate,

  // P16 — rehearsal-photo gallery (preshow). Auto-fills from
  // assets/photos/rehearsal-0N.jpg; styled "photo pending" fallback per cell.
  "production-gallery": productionGallery,

  // X11 — cast-in-performance montage (postshow). Auto-fills from
  // assets/photos/performance-0N.jpg; muted frames + "photo pending" fallback.
  "cast-gallery": castGallery,

  // X05 — immediate next production, postshow treatment
  "next-production-postshow": (item, ctx) => {
    const prod = findProduction(ctx, item.production_id) || {};
    const runDates = formatRange(prod.run_dates && prod.run_dates.first, prod.run_dates && prod.run_dates.last);
    return `<div class="split-layout sales-card">
        ${particleOverlay(item, ctx, { seed: item.id || "next-production-postshow", count: 15 })}
        <div class="split-text">
          <p class="eyebrow calm">Book your next visit</p>
          <h2 class="headline small cyan">${upper(prod.title || "Coming soon")}</h2>
          <p class="subhead" style="color:var(--lavender); font-size:1.9vw;">${prod.subtitle || ""}${prod.author ? ` &mdash; by ${prod.author}` : ""}</p>
          <p class="review-quote">${prod.synopsis_short || ""}</p>
          ${runDates ? `<p class="footline">${runDates}</p>` : ""}
          ${bookBlock(prod, ctx)}
        </div>
        ${posterFrame(ctx, {
          src: prod.image_local,
          alt: `${prod.title || "Coming soon"} poster`,
          classes: "cyan",
          fallback: `<strong>${caps(prod.title) || "COMING SOON"}</strong><span>poster pending</span>`,
        })}
      </div>`;
  },

  // X05b — later production, postshow treatment
  "next-production-christmas": (item, ctx) => {
    const prod = findProduction(ctx, item.production_id, 1) || {};
    const review = (prod.reviews && prod.reviews[0]) || {};
    const runDates = formatRange(prod.run_dates && prod.run_dates.first, prod.run_dates && prod.run_dates.last);
    // The "/" separator between the dates and "Directed by" is the footline's
    // own punctuation, not the old range separator - it stays.
    const directedBy = prod.director ? `Directed by ${prod.director}` : "";
    const footline = [runDates, directedBy].filter(Boolean).join(` <span class="sep">/</span> `);
    return `<div class="split-layout">
        <div class="split-text">
          <p class="eyebrow calm">Coming later at ${ctx.show?.venue || "our theatre"}</p>
          <h2 class="headline small cyan">${upper(prod.title || "Coming soon")}</h2>
          <p class="subhead" style="color:var(--lavender); font-size:var(--foyer-small-size);">${prod.author || ""}${prod.adapter ? ` &mdash; adapted by ${prod.adapter}` : ""}</p>
          <p class="review-quote">&ldquo;${review.quote || prod.synopsis_short || ""}&rdquo;<span class="source">${review.source || ""}</span></p>
          ${footline ? `<p class="footline">${footline}</p>` : ""}
          ${bookBlock(prod, ctx)}
        </div>
        ${posterFrame(ctx, {
          src: prod.image_local,
          alt: `${prod.title || "Coming soon"} poster`,
          classes: "cyan",
          fallback: `<strong>${caps(prod.title) || "COMING SOON"}</strong><span>poster pending</span>`,
        })}
      </div>`;
  },

  // Visiting company profile — reusable for any guest company.
  "company-profile": (item, ctx) => {
    const show = ctx.show || {};
    const vc = ctx.visitingCompany || {};
    const name = upper(vc.name || show.author || "Our guest company");
    const nameCaps = caps(vc.name) || caps(show.author) || "OUR GUEST COMPANY";
    const body = vc.body || (show.author && show.venue
      ? `A visiting production by ${show.author} at ${show.venue}.`
      : `A visiting production at ${show.venue || "Criterion Theatre"}.`);
    const footline = vc.footline || plain(show.tagline) || "";
    return `<div class="split-layout">
        <div class="split-text">
          <p class="eyebrow">Visiting company</p>
          <h2 class="headline small">${name}</h2>
          <p class="body" style="max-width:none;">${body}</p>
          ${footline ? `<p class="footline">${footline}</p>` : ""}
        </div>
        ${posterFrame(ctx, {
          src: vc.logo_local,
          alt: vc.name || "Company logo",
          classes: "contain",
          fallback: `<strong>${nameCaps}</strong><span>Company logo</span>`,
        })}
      </div>`;
  },

  // Visiting company production gallery — capped at six entries, paginable.
  "company-productions": (item, ctx) => {
    const show = ctx.show || {};
    const vc = ctx.visitingCompany || {};
    const name = upper(vc.name || show.author || "Visiting company");
    const allProductions = vc.productions || [];
    const offset = Math.max(0, Number(item.offset) || 0);
    const limit = item.limit != null ? Number(item.limit) : 6;
    if (!allProductions.length) {
      return `<p class="eyebrow">Visiting company</p>
      <h2 class="headline small">${name}</h2>
      ${vc.website ? `<p class="body" style="font-family:'JetBrains Mono',monospace; color:var(--cream-2);">${vc.website}</p>` : ""}`;
    }
    const productions = allProductions.slice(offset, offset + Math.max(0, limit));
    if (!productions.length) {
      return "";
    }
    const content = item.content || {};
    const eyebrow = content.eyebrow || "Productions";
    const footline = content.footline || "";
    const gridClass = `photo-grid${item.portrait ? " portrait-safe" : ""}`;
    const cells = productions.map(p => galleryFrame(ctx, p.image_local, {
      title: p.title,
      note: p.note || "Production image",
    })).join("\n        ");
    return `<p class="eyebrow">${eyebrow}</p>
      <h2 class="headline small">${name}</h2>
      <div class="${gridClass}">
        ${cells}
      </div>${footline ? `<p class="footline">${footline}</p>` : ""}`;
  },

  // Visiting company tour — suppresses itself when no tour data.
  "company-tour": (item, ctx) => {
    const vc = ctx.visitingCompany || {};
    const tour = vc.tour || {};
    const dates = (tour.dates || []).slice(0, 8);
    if (!dates.length) {
      return null;
    }
    let highlighted = false;
    const listItems = dates.map((d) => {
      const isHighlight = !highlighted && d.highlight;
      if (isHighlight) {
        highlighted = true;
      }
      const cls = isHighlight ? ' class="highlight"' : "";
      return `<li${cls}><span class="tour-when">${d.when || ""}</span><span class="tour-venue">${d.venue || ""}</span></li>`;
    }).join("\n        ");
    return `<p class="eyebrow">${caps(tour.intro) || "ON TOUR"}</p>
      <h2 class="headline small">${upper(vc.name || "Visiting company")}</h2>
      <ul class="tour-list">
        ${listItems}
      </ul>
      ${tour.footline ? `<p class="footline">${tour.footline}</p>` : ""}`;
  },

  /* Generic dated list card (C17, October 2026 - written for R15,
     "2027 at the Criterion"). company-tour only reads visiting_company.json,
     forces the company name as headline and sets rows under the 56px floor;
     date-list is the in-house equivalent: pack-authored eyebrow, headline
     (headline_case honoured like the other templates) and rows at the
     running-copy size. Content shape:
       { eyebrow, headline, footline?,
         rows: [ { when, title, highlight? } ] }
     At most six rows - extra rows are dropped with one console warning.
     No rows -> null, so the scheduler skips the item rather than painting
     an empty list (same contract as company-tour). */
  "date-list": (item, ctx) => {
    const content = item.content || {};
    const allRows = Array.isArray(content.rows) ? content.rows : [];
    if (!allRows.length) {
      return null;
    }
    const rows = allRows.slice(0, 6);
    if (allRows.length > rows.length) {
      console.warn(`date-list '${item.id || item.tag || "?"}' carries ${allRows.length} rows - only the first ${rows.length} are shown.`);
    }
    const listItems = rows.map((row) => {
      const cls = row && row.highlight === true ? ' class="highlight"' : "";
      return `<li${cls}><span class="date-list-when">${(row && row.when) || ""}</span><span class="date-list-title">${(row && row.title) || ""}</span></li>`;
    }).join("\n        ");
    const eyebrow = content.eyebrow || "Coming up";
    const headline = content.headline || ctx.show?.venue || "At our theatre";
    const footline = content.footline || "";
    return `<p class="eyebrow">${eyebrow}</p>
      <h2 class="headline small">${upper(headline)}</h2>
      <ul class="date-list">
        ${listItems}
      </ul>
      ${footline ? `<p class="footline">${footline}</p>` : ""}`;
  },

  // Holding card — the overnight state, and deliberately not a display. The
  // foyer screen is visible from the street long after the building is locked,
  // so this renders one small white status line in the top-left of an otherwise
  // black screen: no venue, no show title, no brand mark. A lit, branded screen
  // at two in the morning advertises an empty building. The wording lives in the
  // playlist so it can be changed without touching the engine, and the countdown
  // value is recomputed on every render, so the playlist's re-dwell ticks it.
  // The blackout itself is CSS, on body[data-phase="holding"].
  "holding": (item, ctx) => {
    const line = holdingSubLine(item, ctx) || item?.message || "";
    return `<div class="holding-slide">
        ${line ? `<p class="holding-status">${line}</p>` : ""}
      </div>`;
  },

  // The wind-down state: an audience-facing goodbye card themed like the rest
  // of the foyer. eyebrow/headline/body/footline fill the six holding
  // placeholders; variant "normal" | "final" | "dress" picks which copy
  // applies to the night that just ended. image:"next_production" puts the
  // next production's poster in a split layout - absent or missing it
  // collapses to the text card, never an empty frame (D8).
  "holding-card": (item, ctx) => {
    if (!holdingItemApplies(item, ctx)) {
      return null;
    }
    const info = holdingState(ctx);
    const values = holdingPlaceholderValues(ctx, info.performance);
    const eyebrow = fillHoldingCopy(item.eyebrow, values);
    const headline = fillHoldingCopy(item.headline, values);
    const body = fillHoldingCopy(item.body, values);
    const footline = fillHoldingCopy(item.footline, values);
    if (eyebrow === null || headline === null || body === null || footline === null) {
      return null;
    }
    const textBlock = `${eyebrow ? `<p class="eyebrow">${holdingNames(caps(eyebrow))}</p>` : ""}
        ${headline ? `<h2 class="headline small">${holdingNames(upper(headline))}</h2>` : ""}
        ${headline ? `<div class="holding-rule"></div>` : ""}
        ${body ? `<p class="body">${holdingNames(body)}</p>` : ""}
        ${footline ? `<p class="footline">${holdingNames(caps(footline))}</p>` : ""}`;
    const prodRef = item.production_id
      || (item.production_ref ? String(item.production_ref).replace(/^[^#]*#/, "") : null);
    const prod = item.image === "next_production" ? findProduction(ctx, prodRef, 0) : null;
    const src = prod?.image_local || "";
    if (!src) {
      return `<div class="holding-wind-down">${textBlock}</div>`;
    }
    return `<div class="split-layout holding-wind-down">
        <div class="split-text">
          ${textBlock}
        </div>
        <div class="poster-frame">
          <img src="${asset(ctx, src)}" alt="${prod.title || "Next production"} poster" onerror="this.closest('.holding-wind-down').classList.add('no-image')">
        </div>
      </div>`;
  },

  // The wake-up state: context line, show title, a live countdown to
  // house_open, and the "Tonight" timeline with the next upcoming row
  // highlighted. data-house-open + per-row data-at feed the one-second
  // ticker in nextgen-foyer.html, which rewrites the countdown and the
  // highlight without re-rendering the card.
  "holding-wake-up": (item, ctx) => {
    if (!holdingItemApplies(item, ctx)) {
      return null;
    }
    const info = holdingState(ctx);
    const perf = info.performance;
    const moments = info.moments;
    const showTitle = plain(ctx?.show?.title || "");
    if (!perf || !moments || !showTitle) {
      return null;
    }
    const now = ctxNow(ctx);
    const { lead, count } = wakeUpCountdownParts(
      moments.houseOpen.getTime() - now, item.lead);
    let nextMarked = false;
    const rowsHtml = wakeUpTimeline(ctx, perf, moments).map(row => {
      const isNext = !nextMarked && row.at.getTime() > now;
      if (isNext) {
        nextMarked = true;
      }
      return `<div class="wu-row${isNext ? " next" : ""}" data-at="${row.at.getTime()}"><span class="wu-t${row.est ? " est" : ""}">${row.est ? "c. " : ""}${timelineTime(hhmm(row.at))}</span><span class="wu-w">${row.label}</span></div>`;
    }).join("");
    return `<div class="holding-wake-up" data-house-open="${moments.houseOpen.getTime()}" data-lead="${String(item.lead || "Doors open in").replaceAll('"', "&quot;")}">
        <div class="wu-left">
          <p class="wu-context">${wakeUpContext(ctx, perf)}</p>
          <h2 class="wu-show">${upper(showTitle)}</h2>
          <p class="wu-lead">${lead}</p>
          <p class="wu-count">${count}</p>
        </div>
        <div class="wu-right">
          <h3 class="wu-heading">Tonight</h3>
          ${rowsHtml}
        </div>
      </div>`;
  },
};

// Clearly-marked fallback so an unknown template renders a card, never black.
export function fallbackSlide(item) {
  const key = (item && (item.template || item.tag || item.source)) || "unknown";
  return `<p class="eyebrow alert">Template not found</p>
      <h2 class="headline small">SLIDE UNAVAILABLE</h2>
      <p class="body">No registered template for <b style="color:var(--poster-yellow);">${key}</b>. Check the playlist <code>template</code> key against <code>slide-templates.js</code>.</p>`;
}

export function renderSlideHTML(item, ctx) {
  const template = item && item.template ? slideTemplates[item.template] : null;
  const inner = template ? template(item, ctx) : fallbackSlide(item);
  const kind = item && item.template ? ` data-kind="${item.template}"` : "";
  return `<div class="slide active"${kind}>${inner}</div>`;
}

// A template may declare itself unrenderable for the current data by returning
// null, undefined or an empty string. The scheduler uses this to skip items that
// would otherwise produce an empty card (e.g. a tour slide with no dates).
export function canRenderSlide(item, ctx) {
  if (!itemShowWhenApplies(item, ctx)) {
    return false;
  }
  if (!holdingItemApplies(item, ctx)) {
    return false;
  }
  const template = item && item.template ? slideTemplates[item.template] : null;
  if (!template) {
    return true;
  }
  const result = template(item, ctx);
  return result != null && String(result).trim().length > 0;
}
