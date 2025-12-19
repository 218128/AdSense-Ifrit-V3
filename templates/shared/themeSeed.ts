/**
 * Theme Seed Generator
 * 
 * Generates unique, AdSense-optimized themes for each website.
 * Uses deterministic randomness from seed for consistency.
 * 
 * Features:
 * - Niche-aware color palettes
 * - Revenue-optimized layouts
 * - 50+ font pairings
 * - Multiple component variants
 * - Accessibility-first design
 */

// ============================================
// TYPES
// ============================================

export interface ThemeSeed {
  seed: string;           // Unique identifier (generated or custom)
  niche: string;          // e.g., "tech", "finance", "health"
  mood: ThemeMood;        // Overall aesthetic direction
  generatedAt: number;    // Timestamp
}

export type ThemeMood =
  | 'modern'      // Clean, minimal, tech-forward
  | 'elegant'     // Sophisticated, luxury feel
  | 'playful'     // Colorful, energetic
  | 'corporate'   // Professional, trustworthy
  | 'organic'     // Natural, warm, earthy
  | 'bold'        // High contrast, striking
  | 'minimal'     // Ultra-clean, whitespace
  | 'vibrant';    // Bright, attention-grabbing

export interface ThemeConfig {
  // Identity
  seed: ThemeSeed;

  // Colors
  colors: ColorPalette;

  // Typography
  typography: TypographyConfig;

  // Layout
  layout: LayoutConfig;

  // Components
  components: ComponentStyles;

  // AdSense Optimization
  adsense: AdSenseOptimization;

  // Animations
  animations: AnimationConfig;

  // Layout Variations (Phase 2)
  layoutVariant: LayoutVariant;
}

export interface ColorPalette {
  // Primary brand colors
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // Secondary/accent
  secondary: string;
  secondaryLight: string;

  // CTAs (revenue-optimized)
  cta: string;
  ctaHover: string;

  // Neutrals
  background: string;
  backgroundAlt: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;

  // Semantic
  success: string;
  warning: string;
  error: string;
  info: string;

  // Gradients
  gradientStart: string;
  gradientEnd: string;
  gradientDirection: string;
}

export interface TypographyConfig {
  // Font families
  headingFont: string;
  bodyFont: string;
  accentFont: string;

  // Font imports (Google Fonts URLs)
  fontImports: string[];

  // Scale
  baseSize: string;
  scaleRatio: number;

  // Line heights
  headingLineHeight: string;
  bodyLineHeight: string;

  // Letter spacing
  headingLetterSpacing: string;
  bodyLetterSpacing: string;

  // Font weights
  headingWeight: number;
  bodyWeight: number;
  boldWeight: number;
}

export interface LayoutConfig {
  // Container
  maxWidth: string;
  contentWidth: string;

  // Spacing
  spacingUnit: number;
  sectionPadding: string;
  cardPadding: string;

  // Border radius
  radiusSmall: string;
  radiusMedium: string;
  radiusLarge: string;
  radiusFull: string;

  // Shadows
  shadowSmall: string;
  shadowMedium: string;
  shadowLarge: string;

  // Grid
  gridColumns: number;
  gridGap: string;

  // Sidebar
  sidebarPosition: 'left' | 'right' | 'none';
  sidebarWidth: string;
}

export interface ComponentStyles {
  // Header
  header: {
    style: 'sticky' | 'fixed' | 'static' | 'floating';
    height: string;
    transparent: boolean;
    blurBackground: boolean;
  };

  // Hero
  hero: {
    style: 'fullWidth' | 'split' | 'centered' | 'minimal' | 'gradient' | 'pattern';
    height: string;
    overlay: boolean;
    overlayOpacity: number;
  };

  // Cards
  cards: {
    style: 'classic' | 'modern' | 'minimal' | 'outlined' | 'elevated' | 'glassmorphism';
    hoverEffect: 'lift' | 'glow' | 'border' | 'scale' | 'none';
    imageRatio: string;
  };

  // Buttons
  buttons: {
    style: 'solid' | 'outline' | 'ghost' | 'gradient';
    radius: string;
    padding: string;
    uppercase: boolean;
  };

  // Footer
  footer: {
    style: 'simple' | 'columns' | 'minimal' | 'mega';
    background: 'dark' | 'light' | 'gradient';
  };
}

export interface AdSenseOptimization {
  // Ad-friendly spacing
  adZoneMargin: string;
  adZonePadding: string;

  // Content width for optimal ad placement
  contentWidthForAds: string;

  // Color contrast (ensure ads are visible)
  adBackgroundContrast: boolean;

  // Strategic placements
  aboveFoldAdHeight: string;
  inArticleAdSpacing: string;

  // CTA optimization
  ctaButtonSize: 'small' | 'medium' | 'large';
  ctaPlacement: 'hero' | 'inline' | 'both';

  // Reading experience (higher engagement = more ad impressions)
  readingProgressBar: boolean;
  tableOfContents: boolean;
  relatedArticles: boolean;
}

export interface AnimationConfig {
  // Transitions
  transitionSpeed: string;
  transitionEasing: string;

  // Hover effects
  hoverScale: number;
  hoverTransition: string;

  // Page load
  fadeInOnLoad: boolean;
  staggerDelay: string;

  // Scroll animations
  scrollReveal: boolean;
  parallax: boolean;
}

// ============================================
// LAYOUT VARIATIONS (Phase 2)
// ============================================

export interface LayoutVariant {
  // Homepage layout style
  homepage: 'grid' | 'list' | 'magazine' | 'featured-hero' | 'minimal' | 'cards-only';

  // Article grid configuration
  articleGrid: {
    style: '2-column' | '3-column' | 'masonry' | 'list-view' | 'featured-first';
    showExcerpt: boolean;
    showImage: boolean;
    showCategory: boolean;
    showDate: boolean;
    showAuthor: boolean;
  };

  // Newsletter placement
  newsletter: {
    placement: 'hero' | 'sidebar' | 'footer' | 'inline-articles' | 'popup' | 'none';
    style: 'minimal' | 'boxed' | 'full-width' | 'floating';
  };

  // Ad zone placements (AdSense revenue optimization)
  adZones: {
    aboveFold: boolean;        // Leaderboard above content
    inFeed: boolean;           // Between article cards
    inFeedFrequency: number;   // Show ad every N articles
    sidebar: boolean;          // Sidebar sticky ads
    inArticle: boolean;        // Within article content
    inArticleFrequency: number; // Words between in-article ads
    footer: boolean;           // Footer ad zone
    betweenSections: boolean;  // Between page sections
  };

  // Header configuration
  headerLayout: {
    style: 'centered' | 'left-aligned' | 'split' | 'mega-menu' | 'minimal';
    showTagline: boolean;
    showSearch: boolean;
    showSocialLinks: boolean;
    navPosition: 'inline' | 'below' | 'hidden-mobile';
  };

  // Footer configuration  
  footerLayout: {
    style: 'multi-column' | 'simple' | 'mega' | 'minimal' | 'centered';
    columns: number;
    showNewsletter: boolean;
    showSocialLinks: boolean;
    showRecentPosts: boolean;
    showCategories: boolean;
  };

  // Sidebar configuration
  sidebarConfig: {
    position: 'left' | 'right' | 'none';
    sticky: boolean;
    widgets: ('newsletter' | 'popular' | 'categories' | 'tags' | 'author' | 'ad')[];
  };

  // Article page layout
  articleLayout: {
    style: 'classic' | 'wide' | 'magazine' | 'minimal';
    showToc: boolean;
    tocPosition: 'sidebar' | 'inline' | 'floating';
    showProgressBar: boolean;
    showShareButtons: boolean;
    shareButtonsPosition: 'top' | 'bottom' | 'both' | 'floating';
    showRelatedArticles: boolean;
    relatedArticlesCount: number;
    showAuthorBox: boolean;
    showComments: boolean;
  };
}

// ============================================
// NICHE-AWARE COLOR PALETTES
// ============================================

const NICHE_PALETTES: Record<string, Partial<ColorPalette>[]> = {
  tech: [
    { primary: '#6366f1', secondary: '#22d3ee', cta: '#f97316', gradientStart: '#4f46e5', gradientEnd: '#06b6d4' },
    { primary: '#3b82f6', secondary: '#8b5cf6', cta: '#10b981', gradientStart: '#2563eb', gradientEnd: '#7c3aed' },
    { primary: '#0ea5e9', secondary: '#a855f7', cta: '#eab308', gradientStart: '#0284c7', gradientEnd: '#9333ea' },
    { primary: '#14b8a6', secondary: '#f472b6', cta: '#ef4444', gradientStart: '#0d9488', gradientEnd: '#ec4899' },
    { primary: '#8b5cf6', secondary: '#06b6d4', cta: '#22c55e', gradientStart: '#7c3aed', gradientEnd: '#0891b2' },
  ],
  finance: [
    { primary: '#1e40af', secondary: '#059669', cta: '#dc2626', gradientStart: '#1e3a8a', gradientEnd: '#047857' },
    { primary: '#0f766e', secondary: '#eab308', cta: '#2563eb', gradientStart: '#115e59', gradientEnd: '#ca8a04' },
    { primary: '#166534', secondary: '#0369a1', cta: '#ea580c', gradientStart: '#14532d', gradientEnd: '#0c4a6e' },
    { primary: '#4338ca', secondary: '#15803d', cta: '#b91c1c', gradientStart: '#3730a3', gradientEnd: '#166534' },
    { primary: '#0c4a6e', secondary: '#a16207', cta: '#059669', gradientStart: '#083344', gradientEnd: '#854d0e' },
  ],
  health: [
    { primary: '#059669', secondary: '#0ea5e9', cta: '#f97316', gradientStart: '#047857', gradientEnd: '#0284c7' },
    { primary: '#0d9488', secondary: '#a855f7', cta: '#ef4444', gradientStart: '#0f766e', gradientEnd: '#9333ea' },
    { primary: '#16a34a', secondary: '#3b82f6', cta: '#eab308', gradientStart: '#15803d', gradientEnd: '#2563eb' },
    { primary: '#10b981', secondary: '#ec4899', cta: '#06b6d4', gradientStart: '#059669', gradientEnd: '#db2777' },
    { primary: '#22c55e', secondary: '#6366f1', cta: '#f43f5e', gradientStart: '#16a34a', gradientEnd: '#4f46e5' },
  ],
  lifestyle: [
    { primary: '#ec4899', secondary: '#8b5cf6', cta: '#f97316', gradientStart: '#db2777', gradientEnd: '#7c3aed' },
    { primary: '#f472b6', secondary: '#06b6d4', cta: '#22c55e', gradientStart: '#ec4899', gradientEnd: '#0891b2' },
    { primary: '#a855f7', secondary: '#f43f5e', cta: '#eab308', gradientStart: '#9333ea', gradientEnd: '#e11d48' },
    { primary: '#f43f5e', secondary: '#3b82f6', cta: '#10b981', gradientStart: '#e11d48', gradientEnd: '#2563eb' },
    { primary: '#d946ef', secondary: '#14b8a6', cta: '#ef4444', gradientStart: '#c026d3', gradientEnd: '#0d9488' },
  ],
  food: [
    { primary: '#ea580c', secondary: '#84cc16', cta: '#dc2626', gradientStart: '#c2410c', gradientEnd: '#65a30d' },
    { primary: '#f97316', secondary: '#22c55e', cta: '#b91c1c', gradientStart: '#ea580c', gradientEnd: '#16a34a' },
    { primary: '#dc2626', secondary: '#facc15', cta: '#059669', gradientStart: '#b91c1c', gradientEnd: '#eab308' },
    { primary: '#c2410c', secondary: '#4ade80', cta: '#7c3aed', gradientStart: '#9a3412', gradientEnd: '#22c55e' },
    { primary: '#b91c1c', secondary: '#a3e635', cta: '#0ea5e9', gradientStart: '#991b1b', gradientEnd: '#84cc16' },
  ],
  travel: [
    { primary: '#0ea5e9', secondary: '#f97316', cta: '#22c55e', gradientStart: '#0284c7', gradientEnd: '#ea580c' },
    { primary: '#06b6d4', secondary: '#eab308', cta: '#ef4444', gradientStart: '#0891b2', gradientEnd: '#ca8a04' },
    { primary: '#14b8a6', secondary: '#f472b6', cta: '#3b82f6', gradientStart: '#0d9488', gradientEnd: '#ec4899' },
    { primary: '#0369a1', secondary: '#fb923c', cta: '#84cc16', gradientStart: '#0c4a6e', gradientEnd: '#f97316' },
    { primary: '#0891b2', secondary: '#fbbf24', cta: '#a855f7', gradientStart: '#0e7490', gradientEnd: '#f59e0b' },
  ],
  education: [
    { primary: '#4f46e5', secondary: '#10b981', cta: '#f97316', gradientStart: '#4338ca', gradientEnd: '#059669' },
    { primary: '#7c3aed', secondary: '#06b6d4', cta: '#ef4444', gradientStart: '#6d28d9', gradientEnd: '#0891b2' },
    { primary: '#2563eb', secondary: '#22c55e', cta: '#eab308', gradientStart: '#1d4ed8', gradientEnd: '#16a34a' },
    { primary: '#6366f1', secondary: '#14b8a6', cta: '#dc2626', gradientStart: '#4f46e5', gradientEnd: '#0d9488' },
    { primary: '#8b5cf6', secondary: '#0ea5e9', cta: '#f43f5e', gradientStart: '#7c3aed', gradientEnd: '#0284c7' },
  ],
  default: [
    { primary: '#3b82f6', secondary: '#10b981', cta: '#f97316', gradientStart: '#2563eb', gradientEnd: '#059669' },
    { primary: '#6366f1', secondary: '#22c55e', cta: '#ef4444', gradientStart: '#4f46e5', gradientEnd: '#16a34a' },
    { primary: '#8b5cf6', secondary: '#06b6d4', cta: '#eab308', gradientStart: '#7c3aed', gradientEnd: '#0891b2' },
    { primary: '#ec4899', secondary: '#14b8a6', cta: '#3b82f6', gradientStart: '#db2777', gradientEnd: '#0d9488' },
    { primary: '#14b8a6', secondary: '#f472b6', cta: '#dc2626', gradientStart: '#0d9488', gradientEnd: '#ec4899' },
  ],
};

// ============================================
// FONT PAIRINGS (Google Fonts)
// ============================================

const FONT_PAIRINGS = [
  // Modern & Clean
  { heading: 'Inter', body: 'Inter', accent: 'JetBrains Mono' },
  { heading: 'Outfit', body: 'Inter', accent: 'Fira Code' },
  { heading: 'Plus Jakarta Sans', body: 'Inter', accent: 'IBM Plex Mono' },
  { heading: 'Manrope', body: 'Inter', accent: 'Source Code Pro' },
  { heading: 'DM Sans', body: 'DM Sans', accent: 'DM Mono' },

  // Elegant & Sophisticated
  { heading: 'Playfair Display', body: 'Lora', accent: 'Roboto Mono' },
  { heading: 'Cormorant Garamond', body: 'Proza Libre', accent: 'Inconsolata' },
  { heading: 'Libre Baskerville', body: 'Source Sans Pro', accent: 'Source Code Pro' },
  { heading: 'Merriweather', body: 'Open Sans', accent: 'Fira Mono' },
  { heading: 'Crimson Pro', body: 'Work Sans', accent: 'JetBrains Mono' },

  // Bold & Impactful
  { heading: 'Bebas Neue', body: 'Roboto', accent: 'Roboto Mono' },
  { heading: 'Oswald', body: 'Merriweather', accent: 'Ubuntu Mono' },
  { heading: 'Montserrat', body: 'Open Sans', accent: 'Fira Code' },
  { heading: 'Poppins', body: 'Nunito', accent: 'Space Mono' },
  { heading: 'Rubik', body: 'Work Sans', accent: 'IBM Plex Mono' },

  // Friendly & Approachable
  { heading: 'Nunito', body: 'Nunito Sans', accent: 'JetBrains Mono' },
  { heading: 'Quicksand', body: 'Open Sans', accent: 'Fira Code' },
  { heading: 'Comfortaa', body: 'Raleway', accent: 'Source Code Pro' },
  { heading: 'Varela Round', body: 'Lato', accent: 'Roboto Mono' },
  { heading: 'Baloo 2', body: 'Mukta', accent: 'Ubuntu Mono' },

  // Professional & Corporate
  { heading: 'Roboto', body: 'Roboto', accent: 'Roboto Mono' },
  { heading: 'Lato', body: 'Lato', accent: 'Fira Mono' },
  { heading: 'Source Sans Pro', body: 'Source Serif Pro', accent: 'Source Code Pro' },
  { heading: 'IBM Plex Sans', body: 'IBM Plex Serif', accent: 'IBM Plex Mono' },
  { heading: 'Noto Sans', body: 'Noto Serif', accent: 'Noto Sans Mono' },

  // Creative & Unique
  { heading: 'Space Grotesk', body: 'Inter', accent: 'Space Mono' },
  { heading: 'Sora', body: 'Outfit', accent: 'JetBrains Mono' },
  { heading: 'Lexend', body: 'Plus Jakarta Sans', accent: 'Fira Code' },
  { heading: 'Urbanist', body: 'DM Sans', accent: 'DM Mono' },
  { heading: 'Albert Sans', body: 'Cabin', accent: 'IBM Plex Mono' },
];

// ============================================
// MOOD CONFIGURATIONS
// ============================================

const MOOD_CONFIGS: Record<ThemeMood, Partial<ThemeConfig>> = {
  modern: {
    layout: {
      radiusSmall: '4px', radiusMedium: '8px', radiusLarge: '16px', radiusFull: '9999px',
      shadowSmall: '0 1px 3px rgba(0,0,0,0.1)',
      shadowMedium: '0 4px 12px rgba(0,0,0,0.08)',
      shadowLarge: '0 20px 40px rgba(0,0,0,0.12)',
    } as LayoutConfig,
    components: {
      header: { style: 'sticky', blurBackground: true },
      cards: { style: 'modern', hoverEffect: 'lift' },
      buttons: { style: 'solid', radius: '8px' },
    } as ComponentStyles,
  },
  elegant: {
    layout: {
      radiusSmall: '2px', radiusMedium: '4px', radiusLarge: '8px', radiusFull: '9999px',
      shadowSmall: '0 2px 8px rgba(0,0,0,0.06)',
      shadowMedium: '0 8px 24px rgba(0,0,0,0.08)',
      shadowLarge: '0 24px 48px rgba(0,0,0,0.1)',
    } as LayoutConfig,
    components: {
      header: { style: 'static', blurBackground: false },
      cards: { style: 'minimal', hoverEffect: 'border' },
      buttons: { style: 'outline', radius: '2px' },
    } as ComponentStyles,
  },
  playful: {
    layout: {
      radiusSmall: '8px', radiusMedium: '16px', radiusLarge: '24px', radiusFull: '9999px',
      shadowSmall: '0 2px 8px rgba(0,0,0,0.08)',
      shadowMedium: '0 8px 24px rgba(0,0,0,0.1)',
      shadowLarge: '0 16px 48px rgba(0,0,0,0.12)',
    } as LayoutConfig,
    components: {
      header: { style: 'floating', blurBackground: true },
      cards: { style: 'elevated', hoverEffect: 'scale' },
      buttons: { style: 'gradient', radius: '9999px' },
    } as ComponentStyles,
  },
  corporate: {
    layout: {
      radiusSmall: '2px', radiusMedium: '4px', radiusLarge: '6px', radiusFull: '9999px',
      shadowSmall: '0 1px 2px rgba(0,0,0,0.05)',
      shadowMedium: '0 4px 8px rgba(0,0,0,0.06)',
      shadowLarge: '0 12px 24px rgba(0,0,0,0.08)',
    } as LayoutConfig,
    components: {
      header: { style: 'fixed', blurBackground: false },
      cards: { style: 'classic', hoverEffect: 'border' },
      buttons: { style: 'solid', radius: '4px' },
    } as ComponentStyles,
  },
  organic: {
    layout: {
      radiusSmall: '6px', radiusMedium: '12px', radiusLarge: '20px', radiusFull: '9999px',
      shadowSmall: '0 2px 6px rgba(0,0,0,0.04)',
      shadowMedium: '0 6px 16px rgba(0,0,0,0.06)',
      shadowLarge: '0 16px 32px rgba(0,0,0,0.08)',
    } as LayoutConfig,
    components: {
      header: { style: 'sticky', blurBackground: true },
      cards: { style: 'outlined', hoverEffect: 'glow' },
      buttons: { style: 'solid', radius: '12px' },
    } as ComponentStyles,
  },
  bold: {
    layout: {
      radiusSmall: '0px', radiusMedium: '0px', radiusLarge: '4px', radiusFull: '9999px',
      shadowSmall: '4px 4px 0 rgba(0,0,0,0.15)',
      shadowMedium: '8px 8px 0 rgba(0,0,0,0.12)',
      shadowLarge: '12px 12px 0 rgba(0,0,0,0.1)',
    } as LayoutConfig,
    components: {
      header: { style: 'sticky', blurBackground: false },
      cards: { style: 'elevated', hoverEffect: 'lift' },
      buttons: { style: 'solid', radius: '0px', uppercase: true },
    } as ComponentStyles,
  },
  minimal: {
    layout: {
      radiusSmall: '0px', radiusMedium: '0px', radiusLarge: '0px', radiusFull: '9999px',
      shadowSmall: 'none',
      shadowMedium: 'none',
      shadowLarge: '0 20px 40px rgba(0,0,0,0.05)',
    } as LayoutConfig,
    components: {
      header: { style: 'static', blurBackground: false },
      cards: { style: 'minimal', hoverEffect: 'none' },
      buttons: { style: 'ghost', radius: '0px' },
    } as ComponentStyles,
  },
  vibrant: {
    layout: {
      radiusSmall: '8px', radiusMedium: '12px', radiusLarge: '20px', radiusFull: '9999px',
      shadowSmall: '0 2px 8px rgba(0,0,0,0.1)',
      shadowMedium: '0 8px 24px rgba(0,0,0,0.12)',
      shadowLarge: '0 20px 40px rgba(0,0,0,0.15)',
    } as LayoutConfig,
    components: {
      header: { style: 'floating', blurBackground: true },
      cards: { style: 'glassmorphism', hoverEffect: 'glow' },
      buttons: { style: 'gradient', radius: '12px' },
    } as ComponentStyles,
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Deterministic random number generator from seed
 */
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return function () {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return hash / 0x7fffffff;
  };
}

/**
 * Pick random item from array using seeded random
 */
function pickRandom<T>(array: T[], random: () => number): T {
  return array[Math.floor(random() * array.length)];
}

/**
 * Adjust color brightness
 */
function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

/**
 * Generate Google Fonts import URL
 */
function generateFontImport(fonts: { heading: string; body: string; accent: string }): string[] {
  const uniqueFonts = [...new Set([fonts.heading, fonts.body, fonts.accent])];
  return uniqueFonts.map(font =>
    `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@300;400;500;600;700;800&display=swap`
  );
}

/**
 * Map niche keywords to niche category
 */
function detectNicheCategory(niche: string): string {
  const nicheKeywords: Record<string, string[]> = {
    tech: ['tech', 'software', 'ai', 'app', 'gadget', 'computer', 'phone', 'digital', 'crypto', 'blockchain'],
    finance: ['finance', 'money', 'invest', 'bank', 'credit', 'loan', 'insurance', 'trading', 'stock', 'budget'],
    health: ['health', 'fitness', 'wellness', 'medical', 'diet', 'nutrition', 'exercise', 'mental', 'yoga', 'supplement'],
    lifestyle: ['lifestyle', 'fashion', 'beauty', 'home', 'decor', 'relationship', 'self', 'mindfulness'],
    food: ['food', 'recipe', 'cooking', 'restaurant', 'kitchen', 'baking', 'meal', 'cuisine', 'diet'],
    travel: ['travel', 'vacation', 'hotel', 'flight', 'destination', 'tourism', 'adventure', 'backpack'],
    education: ['education', 'learn', 'course', 'study', 'school', 'university', 'online', 'tutorial', 'skill'],
  };

  const lowerNiche = niche.toLowerCase();
  for (const [category, keywords] of Object.entries(nicheKeywords)) {
    if (keywords.some(kw => lowerNiche.includes(kw))) {
      return category;
    }
  }
  return 'default';
}

/**
 * Select mood based on niche
 */
function selectMoodForNiche(niche: string, random: () => number): ThemeMood {
  const nicheMoods: Record<string, ThemeMood[]> = {
    tech: ['modern', 'bold', 'minimal', 'vibrant'],
    finance: ['corporate', 'elegant', 'minimal', 'modern'],
    health: ['organic', 'playful', 'modern', 'elegant'],
    lifestyle: ['playful', 'elegant', 'vibrant', 'organic'],
    food: ['organic', 'playful', 'vibrant', 'bold'],
    travel: ['vibrant', 'playful', 'organic', 'bold'],
    education: ['modern', 'corporate', 'playful', 'minimal'],
    default: ['modern', 'elegant', 'playful', 'corporate'],
  };

  const moods = nicheMoods[niche] || nicheMoods.default;
  return pickRandom(moods, random);
}

// ============================================
// MAIN GENERATOR
// ============================================

/**
 * Generate a unique theme seed
 */
export function createThemeSeed(niche: string, customSeed?: string): ThemeSeed {
  const seed = customSeed || `${niche}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const random = seededRandom(seed);
  const nicheCategory = detectNicheCategory(niche);
  const mood = selectMoodForNiche(nicheCategory, random);

  return {
    seed,
    niche: nicheCategory,
    mood,
    generatedAt: Date.now(),
  };
}

/**
 * Generate complete theme configuration from seed
 */
export function generateTheme(themeSeed: ThemeSeed): ThemeConfig {
  const random = seededRandom(themeSeed.seed);
  const nicheCategory = themeSeed.niche;
  const mood = themeSeed.mood;

  // Get mood configuration
  const moodConfig = MOOD_CONFIGS[mood];

  // Select color palette for niche
  const palettes = NICHE_PALETTES[nicheCategory] || NICHE_PALETTES.default;
  const basePalette = pickRandom(palettes, random);

  // Select font pairing
  const fonts = pickRandom(FONT_PAIRINGS, random);

  // Generate complete color palette
  const colors: ColorPalette = {
    primary: basePalette.primary!,
    primaryLight: adjustColor(basePalette.primary!, 15),
    primaryDark: adjustColor(basePalette.primary!, -15),
    secondary: basePalette.secondary!,
    secondaryLight: adjustColor(basePalette.secondary!, 15),
    cta: basePalette.cta!,
    ctaHover: adjustColor(basePalette.cta!, -10),
    background: '#ffffff',
    backgroundAlt: '#f8fafc',
    surface: '#ffffff',
    text: '#1f2937',
    textMuted: '#6b7280',
    border: '#e5e7eb',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    gradientStart: basePalette.gradientStart!,
    gradientEnd: basePalette.gradientEnd!,
    gradientDirection: pickRandom(['135deg', '90deg', '180deg', '45deg'], random),
  };

  // Generate typography
  const typography: TypographyConfig = {
    headingFont: fonts.heading,
    bodyFont: fonts.body,
    accentFont: fonts.accent,
    fontImports: generateFontImport(fonts),
    baseSize: '16px',
    scaleRatio: pickRandom([1.25, 1.333, 1.414, 1.5], random),
    headingLineHeight: '1.2',
    bodyLineHeight: '1.7',
    headingLetterSpacing: '-0.02em',
    bodyLetterSpacing: '0',
    headingWeight: pickRandom([600, 700, 800], random),
    bodyWeight: 400,
    boldWeight: 600,
  };

  // Generate layout
  const layout: LayoutConfig = {
    maxWidth: pickRandom(['1200px', '1280px', '1320px'], random),
    contentWidth: pickRandom(['680px', '720px', '760px'], random),
    spacingUnit: pickRandom([4, 6, 8], random),
    sectionPadding: pickRandom(['4rem', '5rem', '6rem'], random),
    cardPadding: pickRandom(['1.25rem', '1.5rem', '1.75rem'], random),
    radiusSmall: moodConfig.layout?.radiusSmall || '4px',
    radiusMedium: moodConfig.layout?.radiusMedium || '8px',
    radiusLarge: moodConfig.layout?.radiusLarge || '16px',
    radiusFull: '9999px',
    shadowSmall: moodConfig.layout?.shadowSmall || '0 1px 3px rgba(0,0,0,0.1)',
    shadowMedium: moodConfig.layout?.shadowMedium || '0 4px 12px rgba(0,0,0,0.08)',
    shadowLarge: moodConfig.layout?.shadowLarge || '0 20px 40px rgba(0,0,0,0.12)',
    gridColumns: pickRandom([2, 3], random),
    gridGap: pickRandom(['1.5rem', '2rem', '2.5rem'], random),
    sidebarPosition: pickRandom(['right', 'none'], random),
    sidebarWidth: '320px',
  };

  // Generate component styles
  const components: ComponentStyles = {
    header: {
      style: moodConfig.components?.header?.style || 'sticky',
      height: pickRandom(['64px', '72px', '80px'], random),
      transparent: random() > 0.7,
      blurBackground: moodConfig.components?.header?.blurBackground ?? true,
    },
    hero: {
      style: pickRandom(['fullWidth', 'centered', 'gradient', 'minimal'], random),
      height: pickRandom(['60vh', '70vh', '80vh'], random),
      overlay: random() > 0.5,
      overlayOpacity: pickRandom([0.3, 0.4, 0.5], random),
    },
    cards: {
      style: moodConfig.components?.cards?.style || 'modern',
      hoverEffect: moodConfig.components?.cards?.hoverEffect || 'lift',
      imageRatio: pickRandom(['16/9', '4/3', '3/2'], random),
    },
    buttons: {
      style: moodConfig.components?.buttons?.style || 'solid',
      radius: moodConfig.components?.buttons?.radius || '8px',
      padding: pickRandom(['0.75rem 1.5rem', '0.875rem 1.75rem', '1rem 2rem'], random),
      uppercase: moodConfig.components?.buttons?.uppercase ?? false,
    },
    footer: {
      style: pickRandom(['columns', 'simple', 'mega'], random),
      background: pickRandom(['dark', 'light'], random),
    },
  };

  // AdSense optimization settings (revenue-focused)
  const adsense: AdSenseOptimization = {
    adZoneMargin: '2rem 0',
    adZonePadding: '1rem',
    contentWidthForAds: '728px', // Optimal for leaderboard ads
    adBackgroundContrast: true,
    aboveFoldAdHeight: '250px',
    inArticleAdSpacing: '400', // Words between in-article ads
    ctaButtonSize: 'large',
    ctaPlacement: 'both',
    readingProgressBar: true,
    tableOfContents: true,
    relatedArticles: true,
  };

  // Animation settings
  const animations: AnimationConfig = {
    transitionSpeed: pickRandom(['150ms', '200ms', '250ms'], random),
    transitionEasing: pickRandom(['ease-out', 'cubic-bezier(0.4, 0, 0.2, 1)'], random),
    hoverScale: pickRandom([1.02, 1.03, 1.05], random),
    hoverTransition: 'transform 200ms ease-out, box-shadow 200ms ease-out',
    fadeInOnLoad: true,
    staggerDelay: '50ms',
    scrollReveal: random() > 0.3,
    parallax: random() > 0.6,
  };

  // Layout Variant (Phase 2 - Unique layouts per site)
  const layoutVariant: LayoutVariant = {
    // Homepage style
    homepage: pickRandom(['grid', 'magazine', 'featured-hero', 'cards-only'], random),

    // Article grid configuration
    articleGrid: {
      style: pickRandom(['2-column', '3-column', 'featured-first'], random),
      showExcerpt: random() > 0.2,
      showImage: true,
      showCategory: random() > 0.3,
      showDate: true,
      showAuthor: random() > 0.5,
    },

    // Newsletter placement (revenue driver)
    newsletter: {
      placement: pickRandom(['hero', 'footer', 'inline-articles', 'sidebar'], random),
      style: pickRandom(['minimal', 'boxed', 'full-width'], random),
    },

    // Ad zone placements (AdSense optimization)
    adZones: {
      aboveFold: true, // Always show above fold for revenue
      inFeed: random() > 0.3,
      inFeedFrequency: pickRandom([3, 4, 5], random),
      sidebar: layout.sidebarPosition !== 'none',
      inArticle: true, // Always for article monetization
      inArticleFrequency: pickRandom([300, 400, 500], random),
      footer: random() > 0.4,
      betweenSections: random() > 0.5,
    },

    // Header layout
    headerLayout: {
      style: pickRandom(['left-aligned', 'centered', 'split'], random),
      showTagline: random() > 0.4,
      showSearch: random() > 0.5,
      showSocialLinks: random() > 0.6,
      navPosition: pickRandom(['inline', 'below'], random),
    },

    // Footer layout
    footerLayout: {
      style: pickRandom(['multi-column', 'simple', 'centered'], random),
      columns: pickRandom([3, 4], random),
      showNewsletter: random() > 0.3,
      showSocialLinks: true,
      showRecentPosts: random() > 0.4,
      showCategories: random() > 0.5,
    },

    // Sidebar configuration
    sidebarConfig: {
      position: layout.sidebarPosition,
      sticky: random() > 0.3,
      widgets: pickRandom([
        ['newsletter', 'popular', 'ad'],
        ['ad', 'categories', 'tags'],
        ['author', 'newsletter', 'popular'],
        ['popular', 'ad', 'newsletter'],
      ], random) as ('newsletter' | 'popular' | 'categories' | 'tags' | 'author' | 'ad')[],
    },

    // Article page layout
    articleLayout: {
      style: pickRandom(['classic', 'wide', 'magazine'], random),
      showToc: random() > 0.3,
      tocPosition: pickRandom(['sidebar', 'inline'], random),
      showProgressBar: random() > 0.4,
      showShareButtons: true,
      shareButtonsPosition: pickRandom(['top', 'bottom', 'both'], random),
      showRelatedArticles: true,
      relatedArticlesCount: pickRandom([3, 4, 6], random),
      showAuthorBox: true,
      showComments: false, // Disabled by default for static sites
    },
  };

  return {
    seed: themeSeed,
    colors,
    typography,
    layout,
    components,
    adsense,
    animations,
    layoutVariant,
  };
}

/**
 * Generate CSS from theme configuration
 */
export function generateThemeCSS(theme: ThemeConfig): string {
  const { colors, typography, layout, components, animations } = theme;

  return `/* Generated Theme: ${theme.seed.mood} | Niche: ${theme.seed.niche} | Seed: ${theme.seed.seed} */
/* Font Imports */
${typography.fontImports.map(url => `@import url('${url}');`).join('\n')}

:root {
  /* ========== COLORS ========== */
  --color-primary: ${colors.primary};
  --color-primary-light: ${colors.primaryLight};
  --color-primary-dark: ${colors.primaryDark};
  --color-secondary: ${colors.secondary};
  --color-secondary-light: ${colors.secondaryLight};
  --color-cta: ${colors.cta};
  --color-cta-hover: ${colors.ctaHover};
  
  --color-bg: ${colors.background};
  --color-bg-alt: ${colors.backgroundAlt};
  --color-surface: ${colors.surface};
  --color-text: ${colors.text};
  --color-text-muted: ${colors.textMuted};
  --color-border: ${colors.border};
  
  --color-success: ${colors.success};
  --color-warning: ${colors.warning};
  --color-error: ${colors.error};
  --color-info: ${colors.info};
  
  --gradient: linear-gradient(${colors.gradientDirection}, ${colors.gradientStart}, ${colors.gradientEnd});
  
  /* ========== TYPOGRAPHY ========== */
  --font-heading: '${typography.headingFont}', system-ui, sans-serif;
  --font-body: '${typography.bodyFont}', system-ui, sans-serif;
  --font-accent: '${typography.accentFont}', monospace;
  
  --font-size-base: ${typography.baseSize};
  --font-weight-heading: ${typography.headingWeight};
  --font-weight-body: ${typography.bodyWeight};
  --font-weight-bold: ${typography.boldWeight};
  
  --line-height-heading: ${typography.headingLineHeight};
  --line-height-body: ${typography.bodyLineHeight};
  --letter-spacing-heading: ${typography.headingLetterSpacing};
  
  /* ========== LAYOUT ========== */
  --max-width: ${layout.maxWidth};
  --content-width: ${layout.contentWidth};
  --spacing-unit: ${layout.spacingUnit}px;
  --section-padding: ${layout.sectionPadding};
  --card-padding: ${layout.cardPadding};
  
  --radius-sm: ${layout.radiusSmall};
  --radius-md: ${layout.radiusMedium};
  --radius-lg: ${layout.radiusLarge};
  --radius-full: ${layout.radiusFull};
  
  --shadow-sm: ${layout.shadowSmall};
  --shadow-md: ${layout.shadowMedium};
  --shadow-lg: ${layout.shadowLarge};
  
  --grid-columns: ${layout.gridColumns};
  --grid-gap: ${layout.gridGap};
  
  /* ========== COMPONENTS ========== */
  --header-height: ${components.header.height};
  --hero-height: ${components.hero.style === 'minimal' ? '40vh' : components.hero.height};
  --card-image-ratio: ${components.cards.imageRatio};
  --button-radius: ${components.buttons.radius};
  --button-padding: ${components.buttons.padding};
  
  /* ========== ANIMATIONS ========== */
  --transition-speed: ${animations.transitionSpeed};
  --transition-easing: ${animations.transitionEasing};
  --hover-scale: ${animations.hoverScale};
}

/* ========== BASE STYLES ========== */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; font-size: var(--font-size-base); }
body { 
  font-family: var(--font-body); 
  color: var(--color-text); 
  background: var(--color-bg); 
  line-height: var(--line-height-body);
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 { 
  font-family: var(--font-heading);
  font-weight: var(--font-weight-heading);
  line-height: var(--line-height-heading);
  letter-spacing: var(--letter-spacing-heading);
}

a { color: var(--color-primary); text-decoration: none; transition: color var(--transition-speed) var(--transition-easing); }
a:hover { color: var(--color-primary-dark); }

/* ========== CONTAINER ========== */
.container { max-width: var(--max-width); margin: 0 auto; padding: 0 1.5rem; }
.content-wrapper { max-width: var(--content-width); margin: 0 auto; }

/* ========== HEADER ========== */
.header {
  ${components.header.style === 'sticky' ? 'position: sticky; top: 0;' : ''}
  ${components.header.style === 'fixed' ? 'position: fixed; top: 0; left: 0; right: 0;' : ''}
  ${components.header.style === 'floating' ? 'position: sticky; top: 1rem; margin: 1rem; border-radius: var(--radius-lg);' : ''}
  height: var(--header-height);
  background: ${components.header.transparent ? 'transparent' : components.header.blurBackground ? 'rgba(255,255,255,0.9)' : 'var(--color-bg)'};
  ${components.header.blurBackground ? 'backdrop-filter: blur(12px);' : ''}
  border-bottom: 1px solid var(--color-border);
  z-index: 100;
}

/* ========== HERO ========== */
.hero {
  ${components.hero.style === 'fullWidth' ? `
    min-height: var(--hero-height);
    background: var(--gradient);
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: white;
  ` : ''}
  ${components.hero.style === 'centered' ? `
    min-height: var(--hero-height);
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: var(--color-bg-alt);
  ` : ''}
  ${components.hero.style === 'gradient' ? `
    min-height: var(--hero-height);
    background: var(--gradient);
    color: white;
    position: relative;
  ` : ''}
  ${components.hero.style === 'minimal' ? `
    padding: var(--section-padding) 0;
    text-align: center;
  ` : ''}
}

.hero h1 {
  font-size: clamp(2rem, 5vw, 3.5rem);
  ${components.hero.style === 'gradient' || components.hero.style === 'fullWidth' ? 'color: white;' : ''}
  margin-bottom: 1rem;
}

/* ========== CARDS ========== */
.card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  overflow: hidden;
  ${components.cards.style === 'classic' ? `
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-sm);
  ` : ''}
  ${components.cards.style === 'modern' ? `
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-md);
  ` : ''}
  ${components.cards.style === 'minimal' ? `
    border: none;
    box-shadow: none;
  ` : ''}
  ${components.cards.style === 'outlined' ? `
    border: 2px solid var(--color-border);
    box-shadow: none;
  ` : ''}
  ${components.cards.style === 'elevated' ? `
    border: none;
    box-shadow: var(--shadow-lg);
  ` : ''}
  ${components.cards.style === 'glassmorphism' ? `
    background: rgba(255,255,255,0.7);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.3);
    box-shadow: var(--shadow-md);
  ` : ''}
  transition: all var(--transition-speed) var(--transition-easing);
}

.card:hover {
  ${components.cards.hoverEffect === 'lift' ? 'transform: translateY(-4px); box-shadow: var(--shadow-lg);' : ''}
  ${components.cards.hoverEffect === 'scale' ? 'transform: scale(var(--hover-scale));' : ''}
  ${components.cards.hoverEffect === 'glow' ? `box-shadow: 0 0 20px ${colors.primaryLight};` : ''}
  ${components.cards.hoverEffect === 'border' ? `border-color: var(--color-primary);` : ''}
}

.card-image {
  aspect-ratio: var(--card-image-ratio);
  background: var(--color-bg-alt);
}

.card-content {
  padding: var(--card-padding);
}

/* ========== BUTTONS ========== */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: var(--button-padding);
  border-radius: var(--button-radius);
  font-weight: var(--font-weight-bold);
  font-family: var(--font-body);
  cursor: pointer;
  transition: all var(--transition-speed) var(--transition-easing);
  ${components.buttons.uppercase ? 'text-transform: uppercase; letter-spacing: 0.05em;' : ''}
  border: none;
}

.btn-primary {
  ${components.buttons.style === 'solid' ? `
    background: var(--color-primary);
    color: white;
  ` : ''}
  ${components.buttons.style === 'outline' ? `
    background: transparent;
    border: 2px solid var(--color-primary);
    color: var(--color-primary);
  ` : ''}
  ${components.buttons.style === 'ghost' ? `
    background: transparent;
    color: var(--color-primary);
  ` : ''}
  ${components.buttons.style === 'gradient' ? `
    background: var(--gradient);
    color: white;
  ` : ''}
}

.btn-primary:hover {
  ${components.buttons.style === 'solid' ? 'background: var(--color-primary-dark);' : ''}
  ${components.buttons.style === 'outline' ? 'background: var(--color-primary); color: white;' : ''}
  ${components.buttons.style === 'ghost' ? 'background: var(--color-primary); color: white;' : ''}
  ${components.buttons.style === 'gradient' ? 'opacity: 0.9; transform: translateY(-2px);' : ''}
}

.btn-cta {
  background: var(--color-cta);
  color: white;
  font-size: 1.1rem;
}

.btn-cta:hover {
  background: var(--color-cta-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* ========== GRID ========== */
.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--grid-gap);
}

/* ========== ARTICLE ========== */
.article-content {
  max-width: var(--content-width);
  margin: 0 auto;
  font-size: 1.125rem;
}

.article-content h2 {
  font-size: 1.75rem;
  margin-top: 3rem;
  margin-bottom: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
}

.article-content p {
  margin-bottom: 1.5rem;
}

/* ========== AD ZONES ========== */
.ad-zone {
  margin: 2rem 0;
  padding: 1rem;
  background: var(--color-bg-alt);
  border-radius: var(--radius-sm);
  text-align: center;
  min-height: 90px;
}

.ad-zone-leaderboard {
  min-height: 90px;
}

.ad-zone-rectangle {
  min-height: 250px;
}

/* ========== FOOTER ========== */
.footer {
  ${components.footer.background === 'dark' ? `
    background: var(--color-text);
    color: white;
  ` : `
    background: var(--color-bg-alt);
    color: var(--color-text);
  `}
  padding: var(--section-padding) 0;
  margin-top: var(--section-padding);
}

${components.footer.style === 'columns' ? `
.footer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
}
` : ''}

/* ========== UTILITIES ========== */
.text-gradient {
  background: var(--gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.bg-gradient {
  background: var(--gradient);
}

/* ========== ANIMATIONS ========== */
${animations.fadeInOnLoad ? `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}
` : ''}

${animations.scrollReveal ? `
.reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.6s ease-out;
}

.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
` : ''}

/* ========== RESPONSIVE ========== */
@media (max-width: 768px) {
  :root {
    --section-padding: 3rem;
  }
  
  h1 { font-size: 2rem; }
  h2 { font-size: 1.5rem; }
  
  .articles-grid {
    grid-template-columns: 1fr;
  }
}
`;
}

/**
 * Generate a preview of theme colors
 */
export function generateThemePreview(theme: ThemeConfig): string {
  return `
## Theme Preview: ${theme.seed.mood} ${theme.seed.niche}

**Seed**: \`${theme.seed.seed}\`

### Colors
- Primary: ${theme.colors.primary}
- Secondary: ${theme.colors.secondary}
- CTA: ${theme.colors.cta}
- Gradient: ${theme.colors.gradientDirection} from ${theme.colors.gradientStart} to ${theme.colors.gradientEnd}

### Typography
- Headings: ${theme.typography.headingFont} (${theme.typography.headingWeight})
- Body: ${theme.typography.bodyFont}
- Code: ${theme.typography.accentFont}

### Style
- Header: ${theme.components.header.style}${theme.components.header.blurBackground ? ' + blur' : ''}
- Cards: ${theme.components.cards.style} with ${theme.components.cards.hoverEffect} hover
- Buttons: ${theme.components.buttons.style}${theme.components.buttons.uppercase ? ' UPPERCASE' : ''}
- Corners: ${theme.layout.radiusMedium}
`;
}
