/**
 * Ifrit Feature Catalog
 * 
 * This file documents ALL available features that AI can use when building websites.
 * No scores or recommendations - AI decides based on profile data and the goal:
 * "Maximize AdSense revenue"
 * 
 * The catalog is designed to be read by external AI (via TEMPLATE_GUIDE.md)
 * or used programmatically by the decision engine.
 */

// ============================================
// TEMPLATES
// ============================================

export const TEMPLATES = {
    'niche-authority-blog': {
        description: 'Focused single-topic blog with deep content',
        characteristics: ['Single niche focus', 'Long-form articles', 'Expert positioning'],
        layout: 'Content-first with sidebar optional',
        adZones: ['Above fold', 'In-article', 'Sidebar', 'After content'],
    },
    'topical-magazine': {
        description: 'Multi-category publication with magazine feel',
        characteristics: ['Multiple topics', 'Visual-heavy', 'News-style updates'],
        layout: 'Grid-based with featured hero',
        adZones: ['Above fold', 'In-feed', 'Between sections', 'Footer'],
    },
    'expert-hub': {
        description: 'Authority site with pillar content structure',
        characteristics: ['Pillar pages', 'Topic clusters', 'Research-focused'],
        layout: 'Clean, data-focused, minimal distractions',
        adZones: ['Above fold', 'In-article', 'Related content section'],
    },
} as const;

// ============================================
// HOMEPAGE LAYOUTS
// ============================================

export const HOMEPAGE_LAYOUTS = {
    'grid': {
        description: 'Article cards in 2-3 column grid',
        characteristics: ['Shows many articles', 'Equal visual weight', 'Quick scanning'],
    },
    'magazine': {
        description: 'Featured article with supporting grid',
        characteristics: ['Highlights best content', 'Visual hierarchy', 'Editorial feel'],
    },
    'featured-hero': {
        description: 'Large hero section with featured article',
        characteristics: ['Strong first impression', 'Single focus', 'High engagement'],
    },
    'list': {
        description: 'Vertical list of articles',
        characteristics: ['Content-dense', 'Fast loading', 'Traditional blog feel'],
    },
    'minimal': {
        description: 'Clean, whitespace-heavy design',
        characteristics: ['Premium feel', 'Focus on content', 'Less distraction'],
    },
    'cards-only': {
        description: 'Full grid of equal cards',
        characteristics: ['Maximum content visibility', 'No hierarchy', 'Discovery-focused'],
    },
} as const;

// ============================================
// ARTICLE GRID STYLES
// ============================================

export const ARTICLE_GRID_STYLES = {
    '2-column': {
        description: 'Two columns of article cards',
        characteristics: ['Larger cards', 'More detail visible', 'Desktop-optimized'],
    },
    '3-column': {
        description: 'Three columns of article cards',
        characteristics: ['More articles visible', 'Compact cards', 'Content-heavy'],
    },
    'masonry': {
        description: 'Pinterest-style variable height grid',
        characteristics: ['Dynamic layout', 'Visual interest', 'Image-friendly'],
    },
    'list-view': {
        description: 'Horizontal list items',
        characteristics: ['More text visible', 'Fast scanning', 'Traditional'],
    },
    'featured-first': {
        description: 'Large first card, grid for rest',
        characteristics: ['Highlights newest/best', 'Visual hierarchy', 'Editorial'],
    },
} as const;

// ============================================
// HEADER STYLES
// ============================================

export const HEADER_STYLES = {
    'centered': {
        description: 'Logo and nav centered',
        characteristics: ['Balanced', 'Brand-focused', 'Magazine-like'],
    },
    'left-aligned': {
        description: 'Logo left, nav right',
        characteristics: ['Traditional', 'Professional', 'Familiar'],
    },
    'split': {
        description: 'Logo center, nav split left/right',
        characteristics: ['Unique', 'Modern', 'Symmetric'],
    },
    'mega-menu': {
        description: 'Expandable navigation with sections',
        characteristics: ['Content-rich', 'Category showcase', 'Discovery'],
    },
    'minimal': {
        description: 'Simple logo and hamburger menu',
        characteristics: ['Clean', 'Mobile-first', 'Distraction-free'],
    },
} as const;

// ============================================
// FOOTER STYLES
// ============================================

export const FOOTER_STYLES = {
    'multi-column': {
        description: '3-4 columns with links and info',
        characteristics: ['Comprehensive', 'SEO value', 'Navigation aid'],
    },
    'simple': {
        description: 'Single row with essential links',
        characteristics: ['Clean', 'Fast', 'Minimal'],
    },
    'mega': {
        description: 'Large footer with newsletter, social, recent posts',
        characteristics: ['Engagement-focused', 'SEO-rich', 'Brand building'],
    },
    'minimal': {
        description: 'Just copyright and privacy link',
        characteristics: ['Ultra-clean', 'Content-focused', 'Modern'],
    },
    'centered': {
        description: 'All content centered',
        characteristics: ['Balanced', 'Simple', 'Professional'],
    },
} as const;

// ============================================
// CARD STYLES
// ============================================

export const CARD_STYLES = {
    'classic': {
        description: 'Image top, title, excerpt, meta',
        characteristics: ['Traditional', 'Familiar', 'Clear hierarchy'],
    },
    'modern': {
        description: 'Clean lines, subtle shadows, hover effects',
        characteristics: ['Contemporary', 'Engaging', 'Interactive'],
    },
    'minimal': {
        description: 'No borders, subtle dividers',
        characteristics: ['Clean', 'Content-focused', 'Elegant'],
    },
    'outlined': {
        description: 'Border with no background',
        characteristics: ['Light', 'Airy', 'Scannable'],
    },
    'elevated': {
        description: 'Strong shadow, lifted appearance',
        characteristics: ['Depth', 'Interactive feel', 'Modern'],
    },
    'glassmorphism': {
        description: 'Frosted glass effect with blur',
        characteristics: ['Trendy', 'Unique', 'Visual interest'],
    },
} as const;

// ============================================
// BUTTON STYLES
// ============================================

export const BUTTON_STYLES = {
    'solid': {
        description: 'Filled background color',
        characteristics: ['High visibility', 'Clear CTA', 'Traditional'],
    },
    'outline': {
        description: 'Border only, transparent background',
        characteristics: ['Subtle', 'Secondary actions', 'Light'],
    },
    'ghost': {
        description: 'Text only, no border or background',
        characteristics: ['Minimal', 'Tertiary actions', 'Clean'],
    },
    'gradient': {
        description: 'Gradient background fill',
        characteristics: ['Eye-catching', 'Modern', 'Premium'],
    },
} as const;

// ============================================
// NEWSLETTER PLACEMENTS
// ============================================

export const NEWSLETTER_PLACEMENTS = {
    'hero': {
        description: 'Prominent section at top of page',
        characteristics: ['High visibility', 'Above fold', 'Primary CTA'],
    },
    'sidebar': {
        description: 'Sticky sidebar widget',
        characteristics: ['Persistent', 'Non-intrusive', 'Always visible'],
    },
    'footer': {
        description: 'Section above footer',
        characteristics: ['End of journey', 'Natural pause', 'High intent'],
    },
    'inline-articles': {
        description: 'Between article cards in grid',
        characteristics: ['Contextual', 'Integrated', 'Discovery'],
    },
    'popup': {
        description: 'Modal overlay on scroll/exit',
        characteristics: ['Attention-grabbing', 'Interruptive', 'High conversion'],
    },
    'none': {
        description: 'No newsletter signup',
        characteristics: ['Clean', 'No email collection', 'Content-only'],
    },
} as const;

// ============================================
// AD ZONE PLACEMENTS (AdSense)
// ============================================

export const AD_ZONE_OPTIONS = {
    aboveFold: {
        description: 'Leaderboard ad above main content',
        placement: 'Top of page, after header',
        adFormat: 'Leaderboard (728x90) or Responsive',
        considerations: ['High viewability', 'First impression impact', 'Can affect bounce rate'],
    },
    inFeed: {
        description: 'Native ads between article cards',
        placement: 'Every N articles in grid',
        adFormat: 'In-feed native or Display',
        considerations: ['Blends with content', 'Good engagement', 'Non-intrusive'],
    },
    sidebar: {
        description: 'Sticky ad in sidebar',
        placement: 'Right or left sidebar, sticky on scroll',
        adFormat: 'Medium Rectangle (300x250) or Skyscraper',
        considerations: ['Always visible', 'Desktop only', 'High impressions'],
    },
    inArticle: {
        description: 'Ads within article content',
        placement: 'Every N words/paragraphs',
        adFormat: 'In-article or Display',
        considerations: ['High engagement', 'Context relevant', 'Can affect reading flow'],
    },
    footer: {
        description: 'Ad zone above footer',
        placement: 'After main content, before footer',
        adFormat: 'Leaderboard or Large Rectangle',
        considerations: ['End of content journey', 'High intent users', 'Lower viewability'],
    },
    betweenSections: {
        description: 'Ads between page sections',
        placement: 'Between homepage sections',
        adFormat: 'Responsive or Large Banner',
        considerations: ['Natural break point', 'Good visibility', 'Section divider'],
    },
} as const;

// ============================================
// ARTICLE PAGE LAYOUTS
// ============================================

export const ARTICLE_LAYOUTS = {
    'classic': {
        description: 'Traditional blog post layout',
        characteristics: ['Header → Content → Author → Related', 'Sidebar optional'],
    },
    'wide': {
        description: 'Full-width content, no sidebar',
        characteristics: ['Maximum reading width', 'Immersive', 'Long-form friendly'],
    },
    'magazine': {
        description: 'Large featured image, pull quotes, sections',
        characteristics: ['Editorial feel', 'Visual breaks', 'Premium content'],
    },
    'minimal': {
        description: 'Clean, focused reading experience',
        characteristics: ['Distraction-free', 'Typography-focused', 'Fast'],
    },
} as const;

// ============================================
// TRUST/E-E-A-T SIGNALS
// ============================================

export const TRUST_SIGNALS = {
    authorBox: {
        description: 'Author bio section with credentials',
        purpose: 'Establishes expertise (E-E-A-T)',
    },
    authorCredentials: {
        description: 'Detailed qualifications and experience',
        purpose: 'Demonstrates authority for YMYL content',
    },
    datePublished: {
        description: 'Clear publication and update dates',
        purpose: 'Shows freshness, builds trust',
    },
    trustBadges: {
        description: 'Visual trust indicators',
        purpose: 'Quick credibility signals',
    },
    tableOfContents: {
        description: 'Jump links for article sections',
        purpose: 'Improves UX, shows depth',
    },
    readingProgressBar: {
        description: 'Visual progress indicator',
        purpose: 'Engagement tracking, completion motivation',
    },
    relatedArticles: {
        description: 'Suggested content at end',
        purpose: 'Reduces bounce, increases pageviews',
    },
} as const;

// ============================================
// TYPOGRAPHY (MOOD-BASED)
// ============================================

export const TYPOGRAPHY_MOODS = {
    'modern': {
        fonts: ['Inter', 'Outfit', 'Plus Jakarta Sans', 'DM Sans'],
        characteristics: ['Clean', 'Tech-friendly', 'Readable'],
    },
    'elegant': {
        fonts: ['Playfair Display', 'Cormorant Garamond', 'Libre Baskerville'],
        characteristics: ['Sophisticated', 'Luxury', 'Traditional'],
    },
    'bold': {
        fonts: ['Bebas Neue', 'Oswald', 'Montserrat', 'Poppins'],
        characteristics: ['Impactful', 'Strong', 'Attention-grabbing'],
    },
    'friendly': {
        fonts: ['Nunito', 'Quicksand', 'Comfortaa', 'Varela Round'],
        characteristics: ['Approachable', 'Warm', 'Casual'],
    },
    'professional': {
        fonts: ['Roboto', 'Lato', 'Source Sans Pro', 'IBM Plex Sans'],
        characteristics: ['Corporate', 'Trustworthy', 'Neutral'],
    },
} as const;

// ============================================
// COLOR PALETTES (NICHE-AWARE)
// ============================================

export const NICHE_COLOR_ASSOCIATIONS = {
    tech: {
        palettes: ['Blue/Cyan', 'Indigo/Purple', 'Teal/Emerald'],
        reasoning: 'Tech associations, innovation, trust',
    },
    finance: {
        palettes: ['Navy/Gold', 'Green/Slate', 'Blue/Gray'],
        reasoning: 'Trust, money, stability, professionalism',
    },
    health: {
        palettes: ['Green/Teal', 'Blue/Emerald', 'Soft pastels'],
        reasoning: 'Nature, wellness, calm, medical trust',
    },
    lifestyle: {
        palettes: ['Pink/Purple', 'Coral/Rose', 'Vibrant mixed'],
        reasoning: 'Personality, expression, engagement',
    },
    food: {
        palettes: ['Orange/Red', 'Warm earth tones', 'Green/Orange'],
        reasoning: 'Appetite, freshness, warmth',
    },
    travel: {
        palettes: ['Blue/Orange', 'Teal/Coral', 'Sky/Sand'],
        reasoning: 'Sky, sea, adventure, warmth',
    },
    education: {
        palettes: ['Blue/Purple', 'Indigo/Teal', 'Traditional blue'],
        reasoning: 'Trust, knowledge, academia',
    },
} as const;

// ============================================
// SEASONAL/EVENT GRAPHICS
// ============================================

export const SEASONAL_EVENTS = {
    'black-friday': {
        months: [11], // November
        graphics: 'Sale banners, dark theme accents',
    },
    'christmas': {
        months: [12], // December
        graphics: 'Holiday themed headers, festive colors',
    },
    'new-year': {
        months: [1], // January
        graphics: 'Fresh start themes, celebratory',
    },
    'ramadan': {
        months: [3, 4], // Varies
        graphics: 'Moon/star motifs, evening themes',
    },
    'summer': {
        months: [6, 7, 8],
        graphics: 'Bright colors, vacation themes',
    },
} as const;

// ============================================
// EXPORT ALL FOR AI CONSUMPTION
// ============================================

export const FEATURE_CATALOG = {
    templates: TEMPLATES,
    homepageLayouts: HOMEPAGE_LAYOUTS,
    articleGridStyles: ARTICLE_GRID_STYLES,
    headerStyles: HEADER_STYLES,
    footerStyles: FOOTER_STYLES,
    cardStyles: CARD_STYLES,
    buttonStyles: BUTTON_STYLES,
    newsletterPlacements: NEWSLETTER_PLACEMENTS,
    adZoneOptions: AD_ZONE_OPTIONS,
    articleLayouts: ARTICLE_LAYOUTS,
    trustSignals: TRUST_SIGNALS,
    typographyMoods: TYPOGRAPHY_MOODS,
    nicheColorAssociations: NICHE_COLOR_ASSOCIATIONS,
    seasonalEvents: SEASONAL_EVENTS,
};

export type FeatureCatalog = typeof FEATURE_CATALOG;
