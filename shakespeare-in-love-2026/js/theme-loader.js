import { getActiveShow } from "./show-resolver.js";

// Complete house tokens mean a missing show token never reveals a previous
// production's palette or artwork.
export const HOUSE_THEME = Object.freeze({
  schema_version: 1,
  colours: { ground: "#02101E", accent: "#C7A45A", secondary: "#6BA5C4", text: "#F3EFD2", muted_text: "#C7BE9E" },
  fonts: { headline: "Oswald", body: "Inter" },
  headline_case: "upper",
  watermark: { image: "assets/criterion-roof-mark-outline.svg", opacity: 0.12, position: "bottom-right" },
  texture: { image: null, opacity: 0 },
  // The house default for `marks` is none (foyer-surfaces.md rule 6): a
  // pack without the key renders exactly as before.
  marks: {},
  poster_frame: "mat",
  phase_intensity: { preshow: 1, interval: 0.9, postshow: 0.65, holding: 0.4 },
  motion: { photos: true, particles: false },
});

const APPROVED_FONTS = new Set([
  "Anton",
  "Bebas Neue",
  "IM Fell English",
  "Inter",
  "JetBrains Mono",
  "Oswald",
  "Rye",
]);
const FONT_GENERIC_FALLBACKS = {
  "Anton": "sans-serif",
  "Bebas Neue": "sans-serif",
  "IM Fell English": "serif",
  "Inter": "sans-serif",
  "JetBrains Mono": "monospace",
  "Oswald": "sans-serif",
  "Rye": "serif",
};
const POSTER_FRAMES = new Set(["mat", "mount", "flush"]);
const HEADLINE_CASES = new Set(["upper", "as_written"]);

/* Theme `marks` (C23): small motif images hung off engine anchor points
   (the SiL heart before the eyebrow, the ink-dot full stop after the
   title). `colour` names a theme colour token and resolves to its value;
   an unknown name falls back to `text` with one console warning, and a
   mark with no image is dropped with one warning. Warn-once per distinct
   fault, the warnedClips pattern in slide-templates.js. */
const MARK_COLOUR_TOKENS = new Set(["secondary", "text", "accent", "muted_text"]);
const warnedMarks = new Set();

function warnMarkOnce(message) {
  if (warnedMarks.has(message)) {
    return;
  }
  warnedMarks.add(message);
  console.warn(message);
}

function markImageUrl(image, brandingBase) {
  const file = String(image || "");
  if (!file) return "";
  if (file.startsWith("assets/")) return file;
  return brandingBase ? `${brandingBase.replace(/\/+$/, "")}/${file}` : file;
}

function normalizeMarks(marks, colours, brandingBase) {
  const out = {};
  for (const [key, mark] of Object.entries(marks || {})) {
    if (!mark || typeof mark !== "object") {
      continue;
    }
    if (!mark.image) {
      warnMarkOnce(`Theme mark '${key}' names no image - the mark is skipped.`);
      continue;
    }
    let colourName = mark.colour || "text";
    if (!MARK_COLOUR_TOKENS.has(colourName)) {
      warnMarkOnce(`Theme mark '${key}' names unknown colour '${mark.colour}' - falling back to 'text'.`);
      colourName = "text";
    }
    out[key] = {
      image: String(mark.image),
      url: markImageUrl(mark.image, brandingBase),
      colour: colours[colourName] || colours.text,
      templates: Array.isArray(mark.templates) ? mark.templates.map(String) : [],
    };
  }
  return out;
}

/* A mark image that does not serve draws nothing - a CSS mask with a dead
   URL paints empty, never a broken-image box - but it must not go quietly:
   drop it here, one console warning each, so the card carries no empty
   span and the missing file is visible in the log. */
export async function verifyMarkImages(marks) {
  const entries = Object.entries(marks || {});
  if (!entries.length) {
    return {};
  }
  const checked = await Promise.all(entries.map(async ([key, mark]) => {
    try {
      const response = await fetch(mark.url, { method: "HEAD", cache: "no-store" });
      if (response.ok) {
        return [key, mark];
      }
    } catch (error) {
      // fall through to the warn below
    }
    warnMarkOnce(`Theme mark '${key}' image '${mark.image}' did not serve - the mark is skipped.`);
    return null;
  }));
  return Object.fromEntries(checked.filter(Boolean));
}

function fontToken(value, fallback) {
  if (!APPROVED_FONTS.has(value)) {
    return fallback;
  }
  return `'${value}', ${FONT_GENERIC_FALLBACKS[value] || "sans-serif"}`;
}
function assetUrl(image, brandingBase, fallback) {
  if (!image) return fallback;
  return image.startsWith("assets/") ? `url('${image}')` : `url('${brandingBase}/${image}')`;
}

export function normalizeTheme(theme = {}, brandingBase = "") {
  const colours = theme.colours || {};
  const resolvedColours = {
    ground: colours.ground || colours.gradient || colours.background || colours.ink || HOUSE_THEME.colours.ground,
    accent: colours.accent || colours.poster_yellow || HOUSE_THEME.colours.accent,
    secondary: colours.secondary || colours.neon_cyan || colours.primary || HOUSE_THEME.colours.secondary,
    text: colours.text || colours.background_text || colours.primary_text || colours.cream || HOUSE_THEME.colours.text,
    muted_text: colours.muted_text || colours.cream_2 || colours.lavender || HOUSE_THEME.colours.muted_text,
  };
  return {
    schemaVersion: theme.schema_version === 1 ? 1 : HOUSE_THEME.schema_version,
    colours: resolvedColours,
    fonts: { headline: theme.fonts?.headline || HOUSE_THEME.fonts.headline, body: theme.fonts?.body || HOUSE_THEME.fonts.body },
    watermark: { ...HOUSE_THEME.watermark, ...(theme.watermark || {}) },
    texture: { ...HOUSE_THEME.texture, ...(theme.texture || {}) },
    posterFrame: POSTER_FRAMES.has(theme.poster_frame) ? theme.poster_frame : HOUSE_THEME.poster_frame,
    headlineCase: HEADLINE_CASES.has(theme.headline_case) ? theme.headline_case : HOUSE_THEME.headline_case,
    phaseIntensity: { ...HOUSE_THEME.phase_intensity, ...(theme.phase_intensity || {}) },
    motion: { ...HOUSE_THEME.motion, ...(theme.motion || {}) },
    marks: normalizeMarks(theme.marks, resolvedColours, brandingBase),
  };
}

export function applyThemeTokens(theme, brandingBase = "") {
  const root = document.documentElement;
  const resolved = normalizeTheme(theme, brandingBase);
  const tokens = {
    "--colour-background": resolved.colours.ground,
    "--colour-primary": resolved.colours.secondary,
    "--colour-primary-text": resolved.colours.text,
    "--colour-accent": resolved.colours.accent,
    "--colour-background-text": resolved.colours.text,
    "--ink": resolved.colours.ground,
    "--ink-2": resolved.colours.ground,
    "--ink-3": resolved.colours.ground,
    "--neon-magenta": resolved.colours.accent,
    "--neon-cyan": resolved.colours.secondary,
    "--poster-yellow": resolved.colours.accent,
    "--cream": resolved.colours.text,
    "--cream-2": resolved.colours.muted_text,
    "--lavender": resolved.colours.muted_text,
    "--font-headline": fontToken(resolved.fonts.headline, "'Oswald', sans-serif"),
    "--font-body": fontToken(resolved.fonts.body, "'Inter', sans-serif"),
    "--watermark-image": assetUrl(resolved.watermark.image, brandingBase, "url('assets/criterion-roof-mark-outline.svg')"),
    "--watermark-opacity": String(resolved.watermark.opacity),
    "--texture-image": assetUrl(resolved.texture.image, brandingBase, "none"),
    "--texture-opacity": String(resolved.texture.opacity),
    "--phase-intensity-preshow": String(resolved.phaseIntensity.preshow),
    "--phase-intensity-interval": String(resolved.phaseIntensity.interval),
    "--phase-intensity-postshow": String(resolved.phaseIntensity.postshow),
    "--phase-intensity-holding": String(resolved.phaseIntensity.holding),
  };
  Object.entries(tokens).forEach(([key, value]) => root.style.setProperty(key, value));
  // Legacy show packs retain their signed-off palette names. They are scoped
  // show data, not engine defaults, so Popcorn can still render historically.
  const legacyPalette = {
    "--ink": "ink", "--ink-2": "ink_2", "--ink-3": "ink_3",
    "--neon-magenta": "neon_magenta", "--neon-cyan": "neon_cyan",
    "--neon-violet": "neon_violet", "--poster-yellow": "poster_yellow",
    "--poster-red": "poster_red", "--cream": "cream", "--cream-2": "cream_2",
    "--lavender": "lavender", "--white": "white", "--dim": "dim",
  };
  Object.entries(legacyPalette).forEach(([token, key]) => {
    if (theme.colours?.[key]) root.style.setProperty(token, theme.colours[key]);
  });
  root.dataset.posterFrame = resolved.posterFrame;
  root.dataset.headlineCase = resolved.headlineCase;
  root.dataset.watermarkPosition = resolved.watermark.position;
  root.dataset.themeSchema = String(resolved.schemaVersion);
  return resolved;
}

export async function loadTheme() {
  const activeShow = await getActiveShow();
  let resolved = applyThemeTokens(HOUSE_THEME);
  if (!activeShow?.paths?.branding) return resolved;
  try {
    const response = await fetch(`${activeShow.paths.branding}/theme.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return resolved;
    const theme = await response.json();
    resolved = applyThemeTokens(theme, activeShow.paths.branding);
    resolved.marks = await verifyMarkImages(resolved.marks);
    return resolved;
  } catch (error) {
    console.warn("Theme unavailable; using Criterion house theme:", error);
    return resolved;
  }
}
