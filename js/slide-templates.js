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

function asset(ctx, path) {
  if (!path) {
    return "";
  }
  const base = (ctx && ctx.foyerPackBase) ? ctx.foyerPackBase.replace(/\/$/, "") : "";
  return `${base}/${String(path).replace(/^\//, "")}`;
}

function upper(value) {
  return String(value || "").toUpperCase();
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

function formatRange(first, last) {
  const start = formatDay(first);
  const endDate = parseDate(last);
  const year = endDate ? endDate.getFullYear() : "";
  return `${start} <span class="sep">/</span> ${formatDay(last)} ${year}`.trim();
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

function findProduction(ctx, id, index = 0) {
  const list = (ctx && ctx.nextProductions && ctx.nextProductions.productions) || [];
  return (id ? list.find(prod => prod.id === id) : null) || list[index] || null;
}

function findMemory(ctx, source) {
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
  const memoryId = sourceToMemory[source];
  return list.find(memory => memory.id === memoryId || memory.image_local === source) || null;
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

// Generic large-image-with-caption feature slide.
// The image is the hero; the text is a caption. Landscape sources are
// presented landscape (no portrait poster letterboxing). `popcorn-feature`
// is a thin alias for backward compatibility with the existing Popcorn pack.
function featureTemplate(item, ctx) {
  const show = ctx.show || {};
  const content = item.content || {};
  const titleFromFile = titleFromAsset(item.source) || "Feature";
  const title = content.headline || titleFromFile;
  const featureKey = titleFromFile.toLowerCase().replace(/\s+/g, "-");
  const showContent = show.foyer_content?.features?.[featureKey] || {};
  const eyebrow = content.eyebrow || showContent.eyebrow || "From tonight's production";
  const body = content.body || showContent.body || show.synopsis || "";
  const footline = content.footline || showContent.footline || "Production feature";
  return `<div class="feature-layout">
      <div class="feature-hero">
        ${posterFrame(ctx, {
          src: item.source,
          alt: `${title} image`,
          classes: "feature feature-hero contain",
          fallback: `<strong>${upper(title)}</strong><span>${eyebrow}</span>`,
        })}
      </div>
      <div class="feature-caption">
        <p class="eyebrow calm">${eyebrow}</p>
        <h2 class="headline small" style="color:var(--poster-yellow);">${upper(title)}</h2>
        <p class="body" style="max-width:none;">${body}</p>
        <p class="footline">${footline}</p>
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
          <h2 class="headline small">${upper(show.author) || "THE WRITER"}</h2>
          <p class="body" style="max-width:none;">
            ${body}
          </p>
          ${footline ? `<p class="footline">${footline}</p>` : ""}
        </div>
        ${posterFrame(ctx, {
          src: image_local,
          alt: show.author || "",
          classes: "contain",
          fallback: `<strong>${upper(show.author) || "WRITER"}</strong><span>Photo pending</span>`,
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
    const count = Number(item.fallback_count) || 3;
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
  return posterFrame(ctx, {
    src,
    alt: title || "",
    classes: `contain${muted ? " muted" : ""}`.trim(),
    fallback: `<strong>${upper(title) || "PHOTO"}</strong><span>${note || "production image"}</span>`,
  });
}

function castGallery(item, ctx) {
  const show = ctx.show || {};
  const content = item.content || {};
  const sources = gallerySources(item, n => `assets/photos/performance-0${n}.jpg`);
  const page = paginateSources(sources, { offset: item.offset, limit: item.limit != null ? item.limit : 3 });
  if (!page.length) {
    return "";
  }
  const eyebrow = content.eyebrow || "Tonight's company";
  const headline = content.headline || (show.title ? `The cast of ${show.title}` : "TONIGHT'S COMPANY");
  const footline = content.footline || "";
  const gridClass = `photo-grid${item.portrait ? " portrait-safe" : ""}`;
  const cells = page.map(src => galleryFrame(ctx, src, {
    title: titleFromAsset(src),
    note: "cast in performance",
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
  const sources = gallerySources(item, n => `assets/photos/rehearsal-0${n}.jpg`);
  const page = paginateSources(sources, { offset: item.offset, limit: item.limit != null ? item.limit : 3 });
  if (!page.length) {
    return "";
  }
  const eyebrow = content.eyebrow || "In rehearsal";
  const headline = content.headline || (show.title ? `Inside the rehearsal room` : "IN REHEARSAL");
  const footline = content.footline || "";
  const gridClass = `photo-grid${item.portrait ? " portrait-safe" : ""}`;
  const cells = page.map(src => galleryFrame(ctx, src, {
    title: titleFromAsset(src),
    note: "rehearsal shot",
  })).join("\n        ");
  return `<p class="eyebrow">${eyebrow}</p>
      <h2 class="headline small">${upper(headline)}</h2>
      <div class="${gridClass}">
        ${cells}
      </div>${footline ? `<p class="footline">${footline}</p>` : ""}`;
}

export const slideTemplates = {
  // P01 — welcome / tonight
  "welcome": (item, ctx) => {
    const show = ctx.show || {};
    const venue = show.venue || "Criterion Theatre";
    return `<div class="split-layout">
        <div class="split-text">
          <p class="eyebrow">Tonight at ${venue}</p>
          <h2 class="headline" style="font-size:11vw; letter-spacing:6px;">${upper(show.title)}</h2>
          <p class="author" style="font-family:'Bebas Neue',sans-serif; font-size:2.3vw; color:var(--neon-cyan); letter-spacing:8px; text-shadow:var(--glow-cyan); margin-top:-6px;">BY ${upper(show.author)}</p>
          <p class="footline" style="margin-top:32px;">${formatRange(show.run_dates && show.run_dates.first, show.run_dates && show.run_dates.last)}</p>
        </div>
        ${posterFrame(ctx, {
          src: show.image_local,
          alt: `${show.title || ""} poster`,
          fallback: `<strong>${upper(show.title)}</strong><span>Poster asset not yet downloaded.<br>Run <code style="color:var(--neon-cyan)">download-assets.py</code></span>`,
        })}
      </div>`;
  },

  // P02 — tonight, show info
  "show-info": (item, ctx) => {
    const show = ctx.show || {};
    const performance = ctx.performance || {};
    const curtain = performance.curtain || show.curtain || "";
    const houseOpens = performance.house_opens || "";
    const intervalAt = performance.interval_at_estimated || "";
    return `<div class="split-layout">
        <div class="split-text">
          <p class="eyebrow">Tonight's production</p>
          <h2 class="headline medium">${upper(show.title)}</h2>
          <p class="subhead">A play by ${show.author || ""} &mdash; directed by ${show.director || ""}</p>
          <p class="body">
            Running time approximately <b>${minutesToText(show.running_time_minutes)}</b>${
              Number(show.interval_minutes) > 0
                ? ` including one <b>${Number(show.interval_minutes)}-minute interval</b>`
                : `, <b>straight through with no interval</b>`
            }${curtain ? `. Curtain at <b>${curtain}</b>` : ""}.
          </p>
          <p class="footline">${houseOpens ? `House opens ${houseOpens}` : "House opening time at the box office"}${curtain ? ` <span class="sep">&#8226;</span> Curtain ${curtain}` : ""}${intervalAt ? ` <span class="sep">&#8226;</span> Interval ~${intervalAt}` : ""}</p>
        </div>
        ${posterFrame(ctx, {
          src: show.image_local,
          alt: "",
          fallback: `<strong>${upper(show.title)}</strong><span>poster</span>`,
        })}
      </div>`;
  },

  // P03 — tonight's cast
  "cast": (item, ctx) => {
    const cast = (ctx.show && ctx.show.cast) || [];
    const rows = cast.map(member => `<div class="cast-row"><span class="cast-role">${member.role}</span><span class="cast-actor">${member.actor}</span></div>`).join("\n          ");
    return `<p class="eyebrow">Tonight's cast</p>
      <h2 class="headline small">THE COMPANY</h2>
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
      <h2 class="headline small">BEFORE YOU TAKE YOUR SEAT</h2>
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
    const headline = content.headline || "CONTENT &amp; ACCESSIBILITY";
    return `<p class="eyebrow warn">${eyebrow}</p>
      <h2 class="headline small">${headline}</h2>
      <p class="body small">This production contains the following. Please speak to a member of front-of-house if you have any concerns.</p>
      <div class="two-col" style="margin-top:14px;">
          <div>
            ${col1}
          </div>
          <div>
            ${col2}
          </div>
      </div>`;
  },

  // P06 — safety: phones, photography, fire exits
  "safety": () => `<p class="eyebrow">Before curtain</p>
      <h2 class="headline small">PHONES OFF &mdash; NO PHOTOGRAPHY</h2>
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
          fallback: `<strong>${upper(show.title)}</strong><span>poster</span>`,
        })}
      </div>`;
  },

  // P09 — director's note
  "director-quote": (item, ctx) => {
    const show = ctx.show || {};
    const content = show.foyer_content?.director || {};
    return `<div class="split-layout">
        <div class="split-text">
          <p class="eyebrow calm">From the director</p>
          <h2 class="headline small outline">DIRECTOR'S NOTE</h2>
          <p class="body" style="font-style:italic; color:var(--cream); max-width:none;">
            &ldquo;${content.quote || show.tagline || `Welcome to ${show.title || "tonight's production"}.`}&rdquo;
          </p>
          <p class="footline">${show.director || "Director"} <span class="sep">&#8226;</span> Director</p>
        </div>
        ${posterFrame(ctx, {
          src: content.image_local,
          alt: show.director || "Director",
          classes: "contain",
          fallback: `<strong>${upper(show.director) || "DIRECTOR"}</strong><span>Director</span>`,
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
    return `<div class="split-layout">
        <div class="split-text">
          <p class="eyebrow">Did you know</p>
          <h2 class="headline small">${upper(headline) || upper(ctx.show?.title)}</h2>
          <p class="body" style="max-width:none;">
            ${body}
          </p>
        </div>
        ${posterFrame(ctx, {
          src: image_local,
          alt: headline || ctx.show?.title || "",
          classes: "contain",
          fallback: `<strong>${upper(ctx.show?.title) || "DID YOU KNOW"}</strong><span>Production context</span>`,
        })}
      </div>`;
  },

  // P10b — venue context
  "did-you-know-criterion": (item, ctx) => {
    const content = item.content || {};
    const venue = ctx.show?.foyer_content?.venue || {};
    const headline = content.headline || venue.headline || ctx.show?.venue || "OUR THEATRE";
    const body = content.body || venue.body || "This production is made possible by the people who support and volunteer at our theatre.";
    const footline = content.footline || venue.footline;
    const image_local = content.image_local || venue.image_local;
    const text = `<p class="eyebrow">Did you know</p>
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
        ${posterFrame(ctx, {
          src: image_local,
          alt: headline,
          classes: "contain",
          fallback: `<strong>${upper(headline)}</strong><span>Our theatre</span>`,
        })}
      </div>`;
  },

  // P11 — immediate next production
  "next-production": (item, ctx) => {
    const prod = findProduction(ctx, item.production_id) || {};
    return `<div class="split-layout">
        <div class="split-text">
          <p class="eyebrow calm">Coming up next at ${ctx.show?.venue || "our theatre"}</p>
          <h2 class="headline small cyan">${upper(prod.title) || "COMING SOON"}</h2>
          <p class="subhead cyan" style="font-size:2.2vw; letter-spacing:3px;">${prod.subtitle || ""}</p>
          <p class="body" style="max-width:none;">
            ${prod.synopsis_short || prod.synopsis_full || ""}
          </p>
          <p class="footline">${formatRange(prod.run_dates && prod.run_dates.first, prod.run_dates && prod.run_dates.last)}</p>
          ${bookBlock(prod, ctx)}
        </div>
        ${posterFrame(ctx, {
          src: prod.image_local,
          alt: `${prod.title || "Coming soon"} poster`,
          classes: "cyan",
          fallback: `<strong>${upper(prod.title) || "COMING SOON"}</strong><span>poster pending</span>`,
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
    return `<div class="split-layout">
        <div class="split-text">
          <p class="eyebrow calm">And coming later</p>
          <h2 class="headline small cyan">${upper(prod.title) || "COMING SOON"}</h2>
          <p class="body" style="max-width:none; margin-top:18px;">
            ${prod.synopsis_short || prod.synopsis_full || ""}
          </p>
          <p class="body small" style="color:var(--cream-2);">By ${credit}.${director}</p>
          <p class="footline">${formatRange(prod.run_dates && prod.run_dates.first, prod.run_dates && prod.run_dates.last)}</p>
          ${bookBlock(prod, ctx)}
        </div>
        ${posterFrame(ctx, {
          src: prod.image_local,
          alt: `${prod.title || "Coming soon"} poster`,
          classes: "cyan",
          fallback: `<strong>${upper(prod.title) || "COMING SOON"}</strong><span>poster pending</span>`,
        })}
      </div>`;
  },

  // P12 — volunteer call
  "volunteer": (item, ctx) => `<p class="eyebrow">Join us</p>
      <h2 class="headline small">VOLUNTEER AT ${upper(ctx.show?.venue) || "OUR THEATRE"}</h2>
      <p class="body">
        ${ctx.show?.foyer_content?.volunteer?.body || "Speak to the front-of-house team to find out how to take part on stage, backstage, or around the building."}
      </p>
      ${ctx.show?.foyer_content?.volunteer?.footline ? `<p class="footline">${ctx.show.foyer_content.volunteer.footline}</p>` : ""}`,

  // P13 — tickets & walk-ins. Carries the tickets QR beside the price tiers
  // (destination not yet live — keep the "(QR not yet live)" caption).
  "tickets-walkins": (item, ctx) => {
    const prices = (ctx.show && ctx.show.ticket_prices) || {};
    return `<p class="eyebrow">Tickets &amp; walk-ins</p>
      <h2 class="headline small">TICKETS FROM ${prices.under_25 || "&pound;10"}</h2>
      <div style="display:flex; gap:4%; align-items:center; max-width:94%; margin-top:18px;">
        <div style="flex:1 1 auto; display:grid; grid-template-columns: 1fr 1fr 1fr; gap:3%;">
          <div style="border:1.5px solid var(--neon-cyan); padding:18px 14px; border-radius:3px; background:rgba(0,229,255,0.06);">
            <div style="font-family:'JetBrains Mono',monospace; font-size:min(1.15vw,1.6vh); color:var(--neon-cyan); letter-spacing:3px; text-transform:uppercase;">Standard</div>
            <div style="font-family:'Anton',sans-serif; font-size:4.2vw; color:var(--white); letter-spacing:2px; margin-top:4px;">${prices.non_member || "&pound;15"}</div>
          </div>
          <div style="border:1.5px solid var(--neon-magenta); padding:18px 14px; border-radius:3px; background:rgba(255,26,117,0.06);">
            <div style="font-family:'JetBrains Mono',monospace; font-size:min(1.15vw,1.6vh); color:var(--neon-magenta); letter-spacing:3px; text-transform:uppercase;">Member</div>
            <div style="font-family:'Anton',sans-serif; font-size:4.2vw; color:var(--white); letter-spacing:2px; margin-top:4px;">${prices.member || "&pound;12.50"}</div>
          </div>
          <div style="border:1.5px solid var(--poster-yellow); padding:18px 14px; border-radius:3px; background:rgba(255,212,52,0.06);">
            <div style="font-family:'JetBrains Mono',monospace; font-size:min(1.15vw,1.6vh); color:var(--poster-yellow); letter-spacing:3px; text-transform:uppercase;">Under 25</div>
            <div style="font-family:'Anton',sans-serif; font-size:4.2vw; color:var(--white); letter-spacing:2px; margin-top:4px;">${prices.under_25 || "&pound;10"}</div>
          </div>
        </div>
        <div style="flex:0 0 auto; text-align:center;">
          <div style="width:11vw; max-width:170px; aspect-ratio:1/1; background:#FFFFFF; border:2px solid var(--neon-cyan); border-radius:6px; box-shadow:var(--glow-cyan); padding:6%; display:flex; align-items:center; justify-content:center;">
            <img src="${asset(ctx, "assets/images/tickets-qr.png")}" alt="Scan to book tickets" style="width:100%; height:100%; object-fit:contain;" onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=&quot;font-family:Anton,sans-serif;color:#111;letter-spacing:2px;&quot;>QR</span>';">
          </div>
          <div style="font-family:'JetBrains Mono',monospace; font-size:min(1.05vw,1.5vh); color:var(--neon-cyan); letter-spacing:2px; margin-top:9px; text-transform:uppercase;">Scan to book</div>
        </div>
      </div>
      <p class="body small" style="margin-top:20px; color:var(--lavender);">
        Tonight's house is available unless otherwise announced. Walk-ins welcome at the box office.
        ${ctx.show?.tickets_url ? `Book online: <b style="color:var(--neon-cyan);">${ticketUrl(null, ctx)}</b>.` : ""}
      </p>`;
  },

  // I01 — interval bar spotlight (carries the real foyer-bar photo)
  "bar-spotlight": (item, ctx) => `<div class="split-layout">
        <div class="split-text">
          <p class="eyebrow">At the bar tonight</p>
          <h2 class="headline medium cyan">THE BAR IS OPEN</h2>
          <p class="body" style="max-width:none;">
            Beers, wines, soft drinks and snacks are being served now in the foyer bar.
            Please head back to your seats when the bell sounds.
          </p>
        </div>
        ${posterFrame(ctx, {
          src: "assets/images/bar-foyer.jpg",
          alt: "The Criterion foyer bar",
          classes: "cyan",
          fallback: `<strong>THE BAR</strong><span>foyer bar photo</span>`,
        })}
      </div>`,

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
      <h2 class="headline small cyan">ACT II BEGINS IN</h2>
      <div class="countdown-display${labelClass}" id="countdown-display">${value}</div>
      <p class="body countdown-caption" id="countdown-caption">${caption}</p>`;
  },

  // I03 — next production, interval treatment
  "next-production-interval": (item, ctx) => {
    const prod = findProduction(ctx, item.production_id) || {};
    return `<div class="split-layout">
        <div class="split-text">
          <p class="eyebrow calm">Coming next</p>
          <h2 class="headline small cyan">${upper(prod.title) || "COMING SOON"}</h2>
          <p class="subhead cyan" style="font-size:1.7vw; letter-spacing:3px;">${prod.subtitle || ""}</p>
          <p class="body" style="max-width:none;">
            ${prod.synopsis_short || prod.synopsis_full || ""}
          </p>
          <p class="footline">${formatRange(prod.run_dates && prod.run_dates.first, prod.run_dates && prod.run_dates.last)}</p>
          ${bookBlock(prod, ctx)}
        </div>
        ${posterFrame(ctx, {
          src: prod.image_local,
          alt: `${prod.title || "Coming soon"} poster`,
          classes: "cyan",
          fallback: `<strong>${upper(prod.title) || "COMING SOON"}</strong><span>poster pending</span>`,
        })}
      </div>`;
  },

  "criterion-charity": () => `<p class="eyebrow">Did you know</p>
      <h2 class="headline small cyan">THE CRITERION IS A CHARITY</h2>
      <p class="body">
        Every production is made by volunteers, and every ticket helps keep live theatre thriving in Earlsdon.
      </p>
      <p class="footline">Registered charity 1161430</p>`,

  // X01 — postshow bar (carries the real foyer-bar photo, muted frame)
  "bar-stays-open": (item, ctx) => {
    const barClose = (ctx.performance && ctx.performance.bar_close) || "";
    const hasTime = /^\d{1,2}:\d{2}$/.test(barClose);
    const bodyCopy = hasTime
      ? `The bar is open until <b>${barClose}</b>. Stay a while &mdash; have a drink, talk it over,
            and say hello to the cast.`
      : `The bar stays open after the show &mdash; ask our staff for tonight's last orders. Stay a while,
            have a drink, talk it over, and say hello to the cast.`;
    const footline = hasTime
      ? `Tonight <span class="sep">&#8226;</span> ${barClose} close`
      : `Tonight <span class="sep">&#8226;</span> the bar is open`;
    return `<div class="split-layout">
        <div class="split-text">
          <p class="eyebrow calm">Thank you for being with us</p>
          <h2 class="headline small">THE BAR STAYS OPEN</h2>
          <p class="body" style="max-width:none;">
            ${bodyCopy}
          </p>
          <p class="footline">${footline}</p>
        </div>
        ${posterFrame(ctx, {
          src: "assets/images/bar-foyer.jpg",
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
    const headline = content.headline || packCopy.headline || "THANK YOU";
    const body = content.body || packCopy.body
      || "For making the journey to Earlsdon, and for giving us your evening.";
    const footline = content.footline || packCopy.footline || "";
    return `<p class="eyebrow calm">${eyebrow}</p>
      <h2 class="headline medium">${upper(headline)}</h2>
      <p class="body">${body}</p>${footline ? `<p class="footline">${footline}</p>` : ""}`;
  },

  "archive-intro": () => `<p class="eyebrow calm">From the theatre archive</p>
      <h2 class="headline medium outline">FROM THE ARCHIVES</h2>
      <p class="body">Seven decades of first nights, near-disasters and standing ovations &mdash; a few
        favourites from the Criterion's history.</p>`,

  // X03/X06-X10 plus additional archive pool entries
  "archive-memory": (item, ctx) => {
    const memory = findMemory(ctx, item.source);
    if (!memory) {
      return `<p class="eyebrow calm">From the theatre archive</p>
        <h2 class="headline small outline">A LIFE IN THE THEATRE</h2>
        <p class="body">Stories from the actors, makers and volunteers who built this theatre's history.</p>`;
    }
    const year = productionYear(memory.production);
    const title = productionTitle(memory.production);
    return `<p class="eyebrow calm">From the theatre archive</p>
      <h2 class="headline small outline">${year} &mdash; ${upper(title)}</h2>
      <div class="archive-thumb-wrap">
        <div class="archive-text">
          <p class="body">&ldquo;${memory.quote}&rdquo;</p>
          <p class="archive-attribution"><span class="attr-name">${memory.author}</span> &mdash; ${memory.role}</p>
        </div>
        ${posterFrame(ctx, {
          src: memory.image_local,
          alt: memory.production,
          classes: "muted contain",
          fallback: `<strong>${year}</strong><span>poster</span>`,
        })}
      </div>`;
  },

  // Generic large-image feature slide (image is the point, text is caption).
  "feature": (item, ctx) => featureTemplate(item, ctx),

  // P14 / XP1-XP3 — Popcorn pack alias for the generic feature template.
  "popcorn-feature": (item, ctx) => featureTemplate(item, ctx),

  // P16 — rehearsal-photo gallery (preshow). Auto-fills from
  // assets/photos/rehearsal-0N.jpg; styled "photo pending" fallback per cell.
  "production-gallery": productionGallery,

  // X11 — cast-in-performance montage (postshow). Auto-fills from
  // assets/photos/performance-0N.jpg; muted frames + "photo pending" fallback.
  "cast-gallery": castGallery,

  // X05 — immediate next production, postshow treatment
  "next-production-postshow": (item, ctx) => {
    const prod = findProduction(ctx, item.production_id) || {};
    return `<div class="split-layout">
        <div class="split-text">
          <p class="eyebrow calm">Book your next visit</p>
          <h2 class="headline small cyan">${upper(prod.title) || "COMING SOON"}</h2>
          <p class="subhead" style="color:var(--lavender); font-size:1.9vw;">${prod.subtitle || ""}${prod.author ? ` &mdash; by ${prod.author}` : ""}</p>
          <p class="review-quote">${prod.synopsis_short || ""}</p>
          <p class="footline">${formatRange(prod.run_dates && prod.run_dates.first, prod.run_dates && prod.run_dates.last)}</p>
          ${bookBlock(prod, ctx)}
        </div>
        ${posterFrame(ctx, {
          src: prod.image_local,
          alt: `${prod.title || "Coming soon"} poster`,
          classes: "cyan",
          fallback: `<strong>${upper(prod.title) || "COMING SOON"}</strong><span>poster pending</span>`,
        })}
      </div>`;
  },

  // X05b — later production, postshow treatment
  "next-production-christmas": (item, ctx) => {
    const prod = findProduction(ctx, item.production_id, 1) || {};
    const review = (prod.reviews && prod.reviews[0]) || {};
    return `<div class="split-layout">
        <div class="split-text">
          <p class="eyebrow calm">Coming later at ${ctx.show?.venue || "our theatre"}</p>
          <h2 class="headline small cyan">${upper(prod.title) || "COMING SOON"}</h2>
          <p class="subhead" style="color:var(--lavender); font-size:1.6vw;">${prod.author || ""}${prod.adapter ? ` &mdash; adapted by ${prod.adapter}` : ""}</p>
          <p class="review-quote">&ldquo;${review.quote || prod.synopsis_short || ""}&rdquo;<span class="source">${review.source || ""}</span></p>
          <p class="footline">${formatRange(prod.run_dates && prod.run_dates.first, prod.run_dates && prod.run_dates.last)} <span class="sep">/</span> Directed by ${prod.director || ""}</p>
          ${bookBlock(prod, ctx)}
        </div>
        ${posterFrame(ctx, {
          src: prod.image_local,
          alt: `${prod.title || "Coming soon"} poster`,
          classes: "cyan",
          fallback: `<strong>${upper(prod.title) || "COMING SOON"}</strong><span>poster pending</span>`,
        })}
      </div>`;
  },

  // Visiting company profile — reusable for any guest company.
  "company-profile": (item, ctx) => {
    const show = ctx.show || {};
    const vc = ctx.visitingCompany || {};
    const name = upper(vc.name) || upper(show.author) || "OUR GUEST COMPANY";
    const body = vc.body || (show.author && show.venue
      ? `A visiting production by ${show.author} at ${show.venue}.`
      : `A visiting production at ${show.venue || "Criterion Theatre"}.`);
    const footline = vc.footline || show.tagline || "";
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
          fallback: `<strong>${name}</strong><span>Company logo</span>`,
        })}
      </div>`;
  },

  // Visiting company production gallery — capped at six entries, paginable.
  "company-productions": (item, ctx) => {
    const show = ctx.show || {};
    const vc = ctx.visitingCompany || {};
    const name = upper(vc.name) || upper(show.author) || "VISITING COMPANY";
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
    return `<p class="eyebrow">${upper(tour.intro) || "ON TOUR"}</p>
      <h2 class="headline small">${upper(vc.name) || "VISITING COMPANY"}</h2>
      <ul class="tour-list">
        ${listItems}
      </ul>
      ${tour.footline ? `<p class="footline">${tour.footline}</p>` : ""}`;
  },

  // Holding card — blank the foyer during a performance.
  "holding": (item, ctx) => {
    const show = ctx.show || {};
    const message = item?.message || "Performance in progress";
    const sub = item?.sub || "";
    return `<div class="holding-slide">
        <p class="eyebrow">${show.venue || "Criterion Theatre"}</p>
        <h2 class="headline small">${upper(show.title) || "TONIGHT"}</h2>
        <p class="holding-message">${message}</p>
        ${sub ? `<p class="holding-sub">${sub}</p>` : ""}
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
  const template = item && item.template ? slideTemplates[item.template] : null;
  if (!template) {
    return true;
  }
  const result = template(item, ctx);
  return result != null && String(result).trim().length > 0;
}
