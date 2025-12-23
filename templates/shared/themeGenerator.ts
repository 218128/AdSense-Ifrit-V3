/**
 * Theme Generator
 * 
 * Generates ONLY visual styling CSS:
 * - Color definitions (CSS variables)
 * - Typography (font imports, sizes)
 * - Effects (shadows, animations)
 * 
 * This is SEPARATE from template structure.
 * Template generates base.css (layout/grid/components with var() placeholders)
 * Theme generates theme.css (color/font definitions)
 * Combined on deploy: base + theme = globals.css
 */

import { ThemeConfig, ThemeMood } from './themeSeed';
import { AISiteDecisions } from '@/lib/aiSiteBuilder';

// ============================================
// TYPES
// ============================================

export interface ThemeColors {
    primary: string;
    primaryDark: string;
    secondary: string;
    background: string;
    backgroundAlt: string;
    text: string;
    textMuted: string;
    border: string;
    cta?: string;
    ctaHover?: string;
}

export interface ThemeTypography {
    headingFont: string;
    bodyFont: string;
    monoFont?: string;
}

export interface ThemeShadows {
    sm: string;
    md: string;
    lg: string;
    xl: string;
}

export interface ThemeEffects {
    borderRadius: string;
    transition: string;
    hoverScale?: string;
}

export interface FullTheme {
    colors: ThemeColors;
    typography: ThemeTypography;
    shadows: ThemeShadows;
    effects: ThemeEffects;
}

// ============================================
// FONT PAIRINGS (AI can choose from these)
// ============================================

export const FONT_PAIRINGS: Record<string, ThemeTypography> = {
    modern: {
        headingFont: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        bodyFont: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    },
    classic: {
        headingFont: "'Playfair Display', Georgia, serif",
        bodyFont: "'Lora', Georgia, serif"
    },
    technical: {
        headingFont: "'JetBrains Mono', monospace",
        bodyFont: "'IBM Plex Sans', sans-serif"
    },
    editorial: {
        headingFont: "'Merriweather', Georgia, serif",
        bodyFont: "'Source Sans Pro', sans-serif"
    },
    playful: {
        headingFont: "'Poppins', sans-serif",
        bodyFont: "'Nunito', sans-serif"
    },
    minimal: {
        headingFont: "'DM Sans', sans-serif",
        bodyFont: "'DM Sans', sans-serif"
    },
    corporate: {
        headingFont: "'Roboto', sans-serif",
        bodyFont: "'Open Sans', sans-serif"
    },
    luxury: {
        headingFont: "'Cormorant Garamond', serif",
        bodyFont: "'Montserrat', sans-serif"
    }
};

// ============================================
// COLOR PALETTES (AI can use these or pick custom)
// ============================================

export const MOOD_PALETTES: Record<ThemeMood, ThemeColors> = {
    modern: {
        primary: '#2563eb',
        primaryDark: '#1d4ed8',
        secondary: '#10b981',
        background: '#ffffff',
        backgroundAlt: '#f8fafc',
        text: '#1f2937',
        textMuted: '#6b7280',
        border: '#e5e7eb'
    },
    elegant: {
        primary: '#8b5cf6',
        primaryDark: '#7c3aed',
        secondary: '#f59e0b',
        background: '#fffbeb',
        backgroundAlt: '#fef3c7',
        text: '#1e1b4b',
        textMuted: '#6366f1',
        border: '#e0e7ff'
    },
    playful: {
        primary: '#f97316',
        primaryDark: '#ea580c',
        secondary: '#06b6d4',
        background: '#ffffff',
        backgroundAlt: '#fef3c7',
        text: '#1c1917',
        textMuted: '#78716c',
        border: '#fed7aa'
    },
    corporate: {
        primary: '#1e40af',
        primaryDark: '#1e3a8a',
        secondary: '#059669',
        background: '#ffffff',
        backgroundAlt: '#f0f9ff',
        text: '#0f172a',
        textMuted: '#475569',
        border: '#cbd5e1'
    },
    organic: {
        primary: '#15803d',
        primaryDark: '#166534',
        secondary: '#ca8a04',
        background: '#fefce8',
        backgroundAlt: '#ecfdf5',
        text: '#14532d',
        textMuted: '#4d7c0f',
        border: '#a3e635'
    },
    bold: {
        primary: '#dc2626',
        primaryDark: '#b91c1c',
        secondary: '#0ea5e9',
        background: '#18181b',
        backgroundAlt: '#27272a',
        text: '#fafafa',
        textMuted: '#a1a1aa',
        border: '#3f3f46'
    },
    minimal: {
        primary: '#18181b',
        primaryDark: '#09090b',
        secondary: '#a1a1aa',
        background: '#ffffff',
        backgroundAlt: '#fafafa',
        text: '#18181b',
        textMuted: '#71717a',
        border: '#e4e4e7'
    },
    vibrant: {
        primary: '#e11d48',
        primaryDark: '#be123c',
        secondary: '#7c3aed',
        background: '#ffffff',
        backgroundAlt: '#fdf2f8',
        text: '#1f2937',
        textMuted: '#6b7280',
        border: '#fbcfe8'
    }
};

// ============================================
// THEME CSS GENERATOR
// ============================================

/**
 * Generate theme CSS (colors, fonts, effects)
 * This is the VISUAL layer - no structural CSS here
 */
export function generateThemeCSS(
    colors: ThemeColors,
    typography: ThemeTypography,
    mood?: ThemeMood
): string {
    // Default shadows and effects
    const shadows: ThemeShadows = {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
    };

    const effects: ThemeEffects = {
        borderRadius: '0.75rem',
        transition: 'all 0.3s ease',
        hoverScale: 'translateY(-4px)'
    };

    return `
/* ============================================
   THEME LAYER - Visual Styling Only
   Generated by Ifrit Theme Generator
   ============================================ */

/* Color Definitions */
:root {
  --color-primary: ${colors.primary};
  --color-primary-dark: ${colors.primaryDark};
  --color-secondary: ${colors.secondary};
  --color-bg: ${colors.background};
  --color-bg-alt: ${colors.backgroundAlt};
  --color-text: ${colors.text};
  --color-text-muted: ${colors.textMuted};
  --color-border: ${colors.border};
  ${colors.cta ? `--color-cta: ${colors.cta};` : ''}
  ${colors.ctaHover ? `--color-cta-hover: ${colors.ctaHover};` : ''}
}

/* Typography */
:root {
  --font-heading: ${typography.headingFont};
  --font-body: ${typography.bodyFont};
  ${typography.monoFont ? `--font-mono: ${typography.monoFont};` : ''}
}

/* Shadows */
:root {
  --shadow-sm: ${shadows.sm};
  --shadow-md: ${shadows.md};
  --shadow-lg: ${shadows.lg};
  --shadow-xl: ${shadows.xl};
}

/* Effects */
:root {
  --radius: ${effects.borderRadius};
  --transition: ${effects.transition};
}

/* Theme Mood: ${mood || 'custom'} */
`.trim();
}

/**
 * Generate theme CSS from AI decisions
 * Maps AI decisions to actual colors and fonts
 */
export function generateThemeCSSFromAI(decisions: AISiteDecisions): string {
    // Get mood from typographyMood or colorApproach
    const mood = (decisions.typographyMood?.value || 'modern') as ThemeMood;
    const colorApproach = (decisions.colorApproach?.value || mood) as ThemeMood;

    // Get base palette from mood
    const palette = MOOD_PALETTES[colorApproach] || MOOD_PALETTES.modern;

    // Get font pairing from typography mood
    const fonts = FONT_PAIRINGS[mood] || FONT_PAIRINGS.modern;

    return generateThemeCSS(palette, fonts, mood);
}

/**
 * Generate theme CSS from ThemeConfig (themeSeed system)
 */
export function generateThemeCSSFromConfig(config: ThemeConfig): string {
    const colors: ThemeColors = {
        primary: config.colors.primary,
        primaryDark: config.colors.primaryDark,
        secondary: config.colors.secondary,
        background: config.colors.background,
        backgroundAlt: config.colors.backgroundAlt,
        text: config.colors.text,
        textMuted: config.colors.textMuted,
        border: config.colors.border,
        cta: config.colors.cta,
        ctaHover: config.colors.ctaHover
    };

    const typography: ThemeTypography = {
        headingFont: config.typography.headingFont,
        bodyFont: config.typography.bodyFont,
        monoFont: config.typography.accentFont
    };

    return generateThemeCSS(colors, typography, config.seed.mood);
}

/**
 * Default theme for when no AI decisions or config exists
 */
export function generateDefaultThemeCSS(): string {
    return generateThemeCSS(
        MOOD_PALETTES.modern,
        FONT_PAIRINGS.modern,
        'modern'
    );
}
