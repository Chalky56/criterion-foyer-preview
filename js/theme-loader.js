import { getActiveShow } from "./show-resolver.js";

// Complete house tokens mean a missing show token never reveals a previous
// production's palette or artwork.
export const HOUSE_THEME = Object.freeze({
  schema_version: 1,
  colours: { ground: "#02101E", accent: "#C7A45A", secondary: "#6BA5C4", text: "#F3EFD2", muted_text: "#C7BE9E" },
  fonts: { headline: "Oswald", body: "Inter" },
  watermark: { image: "assets/criterion-roof-mark-outline.svg", opacity: 0.12, position: "bottom-right" },
  texture: { image: null, opacity: 0 },
  poster_frame: "mat",
  phase_intensity: { preshow: 1, interval: 0.9, postshow: 0.65 },
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

export function normalizeTheme(theme = {}) {
  const colours = theme.colours || {};
  return {
    schemaVersion: theme.schema_version === 1 ? 1 : HOUSE_THEME.schema_version,
    colours: {
      ground: colours.ground || colours.gradient || colours.background || colours.ink || HOUSE_THEME.colours.ground,
      accent: colours.accent || colours.poster_yellow || HOUSE_THEME.colours.accent,
      secondary: colours.secondary || colours.neon_cyan || colours.primary || HOUSE_THEME.colours.secondary,
      text: colours.text || colours.background_text || colours.primary_text || colours.cream || HOUSE_THEME.colours.text,
      muted_text: colours.muted_text || colours.cream_2 || colours.lavender || HOUSE_THEME.colours.muted_text,
    },
    fonts: { headline: theme.fonts?.headline || HOUSE_THEME.fonts.headline, body: theme.fonts?.body || HOUSE_THEME.fonts.body },
    watermark: { ...HOUSE_THEME.watermark, ...(theme.watermark || {}) },
    texture: { ...HOUSE_THEME.texture, ...(theme.texture || {}) },
    posterFrame: POSTER_FRAMES.has(theme.poster_frame) ? theme.poster_frame : HOUSE_THEME.poster_frame,
    phaseIntensity: { ...HOUSE_THEME.phase_intensity, ...(theme.phase_intensity || {}) },
  };
}

export function applyThemeTokens(theme, brandingBase = "") {
  const root = document.documentElement;
  const resolved = normalizeTheme(theme);
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
  root.dataset.watermarkPosition = resolved.watermark.position;
  root.dataset.themeSchema = String(resolved.schemaVersion);
  return resolved;
}

export async function loadTheme() {
  const activeShow = await getActiveShow();
  applyThemeTokens(HOUSE_THEME);
  if (!activeShow?.paths?.branding) return HOUSE_THEME;
  try {
    const response = await fetch(`${activeShow.paths.branding}/theme.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return HOUSE_THEME;
    const theme = await response.json();
    applyThemeTokens(theme, activeShow.paths.branding);
    return theme;
  } catch (error) {
    console.warn("Theme unavailable; using Criterion house theme:", error);
    return HOUSE_THEME;
  }
}
