// Single-tenant theming. The active skin is chosen at build/deploy time via the
// NEXT_PUBLIC_THEME env var (default "emox"). The brand is always "Declutter" — the
// theme only changes the visual language (accent colour, page tint, corner radius,
// hero treatment), and it applies to EVERY page through CSS variables + shared
// components, not just the landing page.

export type ThemeKey = "emox" | "belo-fur" | "lefore";

export type ThemeTokens = {
  /** primary accent (buttons, logo mark, active states, links) */
  brand: string;
  brandForeground: string;
  /** subtle accent surface (chips, hovers) */
  brandSoft: string;
  /** page background tint */
  background: string;
  foreground: string;
  /** card / panel surface */
  surface: string;
  /** focus ring */
  ring: string;
  /** base corner radius */
  radius: string;
};

export const THEMES: Record<ThemeKey, ThemeTokens> = {
  // Default: clean, high-contrast marketplace.
  emox: {
    brand: "#0b0b0f",
    brandForeground: "#ffffff",
    brandSoft: "#f4f4f5",
    background: "#fafafa",
    foreground: "#09090b",
    surface: "#ffffff",
    ring: "#0b0b0f",
    radius: "0.85rem"
  },
  // Warm editorial furniture store: coffee accent, cream page, sharp corners.
  "belo-fur": {
    brand: "#6f4e37",
    brandForeground: "#faf7f2",
    brandSoft: "#efe7dd",
    background: "#f4efe7",
    foreground: "#241c16",
    surface: "#ffffff",
    ring: "#6f4e37",
    radius: "0.2rem"
  },
  // Premium movement studio: deep slate accent, cool page, soft rounded corners.
  lefore: {
    brand: "#111827",
    brandForeground: "#f8fafc",
    brandSoft: "#e2e8f0",
    background: "#edeef1",
    foreground: "#0f172a",
    surface: "#ffffff",
    ring: "#111827",
    radius: "1.4rem"
  }
};

export const DEFAULT_THEME: ThemeKey = "emox";

export function getActiveTheme(): ThemeKey {
  const raw = process.env.NEXT_PUBLIC_THEME?.trim();
  if (raw && raw in THEMES) return raw as ThemeKey;
  return DEFAULT_THEME;
}

/** CSS custom properties for the active theme, applied to <body> in the root layout. */
export function themeCssVars(theme: ThemeKey = getActiveTheme()): Record<string, string> {
  const t = THEMES[theme];
  return {
    "--brand": t.brand,
    "--brand-foreground": t.brandForeground,
    "--brand-soft": t.brandSoft,
    "--background": t.background,
    "--foreground": t.foreground,
    "--surface": t.surface,
    "--ring": t.ring,
    "--radius": t.radius
  };
}
