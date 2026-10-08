import { getActiveShow } from "./show-resolver.js";

const THEME_DEFAULTS = {
  "--colour-primary": "#1D4D4F",
  "--colour-primary-text": "#F3EFD2",
  "--colour-accent": "#6BA5C4",
  "--colour-background": "#02101E",
  "--colour-background-text": "#F3EFD2",
  "--font-headline": "'Oswald', sans-serif",
  "--font-body": "'Inter', sans-serif",
  "--watermark-image": "none",
  "--watermark-opacity": "0.12",
};

function applyThemeTokens(theme, brandingBase) {
  const root = document.documentElement;
  const colours = theme?.colours || {};
  const fonts = theme?.fonts || {};
  const watermark = theme?.watermark || {};
  const tokens = {
    "--colour-primary": colours.primary || THEME_DEFAULTS["--colour-primary"],
    "--colour-primary-text": colours.primary_text || THEME_DEFAULTS["--colour-primary-text"],
    "--colour-accent": colours.accent || THEME_DEFAULTS["--colour-accent"],
    "--colour-background": colours.background || THEME_DEFAULTS["--colour-background"],
    "--colour-background-text": colours.background_text || THEME_DEFAULTS["--colour-background-text"],
    "--font-headline": fonts.headline ? `'${fonts.headline}', sans-serif` : THEME_DEFAULTS["--font-headline"],
    "--font-body": fonts.body ? `'${fonts.body}', sans-serif` : THEME_DEFAULTS["--font-body"],
    "--watermark-image": watermark.image ? `url('${brandingBase}/${watermark.image}')` : THEME_DEFAULTS["--watermark-image"],
    "--watermark-opacity": String(watermark.opacity ?? THEME_DEFAULTS["--watermark-opacity"]),
  };

  Object.entries(tokens).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // Map the named Neon Noir palette onto the slide custom properties used by
  // the FOY-01 live-HTML templates. Each is optional; style.css ships sane
  // defaults under body.nextgen-foyer so a missing token never blanks a slide.
  const NEON_TOKEN_MAP = {
    "--ink": "ink",
    "--ink-2": "ink_2",
    "--ink-3": "ink_3",
    "--neon-magenta": "neon_magenta",
    "--neon-cyan": "neon_cyan",
    "--neon-violet": "neon_violet",
    "--poster-yellow": "poster_yellow",
    "--poster-red": "poster_red",
    "--cream": "cream",
    "--cream-2": "cream_2",
    "--lavender": "lavender",
    "--white": "white",
    "--dim": "dim",
  };
  // Set on <body> so these beat the body.nextgen-foyer defaults in style.css
  // (an inline style wins over a stylesheet rule of the same specificity).
  const neonTarget = document.body || root;
  Object.entries(NEON_TOKEN_MAP).forEach(([cssVar, colourKey]) => {
    if (colours[colourKey]) {
      neonTarget.style.setProperty(cssVar, colours[colourKey]);
    }
  });
}

export async function loadTheme() {
  const activeShow = await getActiveShow();
  if (!activeShow?.paths?.branding) {
    return null;
  }
  const response = await fetch(`${activeShow.paths.branding}/theme.json?t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) {
    return null;
  }
  const theme = await response.json();
  applyThemeTokens(theme, activeShow.paths.branding);
  return theme;
}
