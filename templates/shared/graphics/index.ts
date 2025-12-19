/**
 * Site Graphics Generator
 * 
 * Generates branded graphics for websites:
 * - SVG/PNG Logo from site name + theme colors
 * - Favicon (multiple sizes)
 * - Open Graph social sharing images
 * - Apple touch icons
 * 
 * Uses SVG generation as primary (no API needed).
 * Can optionally integrate with AI image services.
 */

import { ThemeConfig } from '../themeSeed';

// ============================================
// TYPES
// ============================================

export interface SiteGraphics {
    // Core branding
    logo: {
        svg: string;           // Vector logo
        dataUrl: string;       // Base64 for embedding
    };

    // Favicon set
    favicon: {
        svg: string;           // Vector favicon
        ico16: string;         // 16x16 base64
        ico32: string;         // 32x32 base64
        ico48: string;         // 48x48 base64
    };

    // Social/SEO
    ogImage: {
        svg: string;           // Template SVG
        dataUrl: string;       // 1200x630 base64
    };

    // PWA icons
    icons: {
        apple180: string;      // Apple touch icon
        icon192: string;       // PWA icon
        icon512: string;       // PWA splash
    };

    // Metadata
    generatedAt: number;
    themeColors: {
        primary: string;
        secondary: string;
        background: string;
    };
}

// ============================================
// LOGO GENERATION
// ============================================

/**
 * Generate text-based SVG logo
 */
export function generateTextLogo(
    siteName: string,
    primaryColor: string,
    secondaryColor: string,
    style: 'modern' | 'elegant' | 'bold' | 'minimal' = 'modern'
): string {
    const initials = getInitials(siteName);
    const fullName = siteName;

    // Style configurations
    const styles = {
        modern: {
            font: "'Inter', 'Segoe UI', sans-serif",
            weight: 700,
            iconRadius: 8,
            useGradient: true,
        },
        elegant: {
            font: "'Playfair Display', Georgia, serif",
            weight: 600,
            iconRadius: 4,
            useGradient: false,
        },
        bold: {
            font: "'Bebas Neue', 'Impact', sans-serif",
            weight: 800,
            iconRadius: 0,
            useGradient: true,
        },
        minimal: {
            font: "'Inter', 'Helvetica Neue', sans-serif",
            weight: 500,
            iconRadius: 12,
            useGradient: false,
        },
    };

    const config = styles[style];
    const gradientId = `logo-gradient-${Date.now()}`;

    return `<svg viewBox="0 0 240 48" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${config.useGradient ? `
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${primaryColor}"/>
      <stop offset="100%" style="stop-color:${secondaryColor}"/>
    </linearGradient>
    ` : ''}
  </defs>
  
  <!-- Icon/Badge -->
  <rect x="2" y="6" width="36" height="36" rx="${config.iconRadius}" 
        fill="${config.useGradient ? `url(#${gradientId})` : primaryColor}"/>
  <text x="20" y="32" text-anchor="middle" 
        font-family="${config.font}" font-size="18" font-weight="${config.weight}" 
        fill="white">${initials}</text>
  
  <!-- Site name -->
  <text x="48" y="32" font-family="${config.font}" font-size="20" font-weight="${config.weight}" 
        fill="${primaryColor}">${fullName}</text>
</svg>`;
}

/**
 * Generate icon-only logo (for favicons)
 */
export function generateIconLogo(
    siteName: string,
    primaryColor: string,
    secondaryColor: string,
    size: number = 48
): string {
    const initials = getInitials(siteName);
    const radius = Math.round(size / 6);
    const fontSize = Math.round(size * 0.45);
    const textY = Math.round(size * 0.65);
    const gradientId = `icon-gradient-${Date.now()}`;

    return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${primaryColor}"/>
      <stop offset="100%" style="stop-color:${secondaryColor}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#${gradientId})"/>
  <text x="${size / 2}" y="${textY}" text-anchor="middle" 
        font-family="'Inter', 'Segoe UI', sans-serif" 
        font-size="${fontSize}" font-weight="700" 
        fill="white">${initials}</text>
</svg>`;
}

/**
 * Generate Open Graph image template
 */
export function generateOgImage(
    siteName: string,
    tagline: string,
    primaryColor: string,
    secondaryColor: string,
    backgroundGradient: boolean = true
): string {
    const gradientId = `og-gradient-${Date.now()}`;

    return `<svg viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${primaryColor}"/>
      <stop offset="100%" style="stop-color:${secondaryColor}"/>
    </linearGradient>
    <pattern id="og-pattern" patternUnits="userSpaceOnUse" width="60" height="60">
      <circle cx="30" cy="30" r="1.5" fill="white" fill-opacity="0.1"/>
    </pattern>
  </defs>
  
  <!-- Background -->
  ${backgroundGradient
            ? `<rect width="1200" height="630" fill="url(#${gradientId})"/>`
            : `<rect width="1200" height="630" fill="${primaryColor}"/>`
        }
  <rect width="1200" height="630" fill="url(#og-pattern)"/>
  
  <!-- Content card -->
  <rect x="60" y="100" width="1080" height="430" rx="24" fill="white" fill-opacity="0.95"/>
  
  <!-- Logo area -->
  <rect x="100" y="140" width="80" height="80" rx="16" fill="url(#${gradientId})"/>
  <text x="140" y="195" text-anchor="middle" 
        font-family="'Inter', sans-serif" font-size="36" font-weight="700" 
        fill="white">${getInitials(siteName)}</text>
  
  <!-- Site name -->
  <text x="200" y="200" font-family="'Inter', sans-serif" font-size="48" font-weight="700" 
        fill="#1f2937">${siteName}</text>
  
  <!-- Tagline -->
  <text x="100" y="320" font-family="'Inter', sans-serif" font-size="32" font-weight="400" 
        fill="#6b7280">${truncateText(tagline, 60)}</text>
  
  <!-- Decorative line -->
  <rect x="100" y="400" width="200" height="4" rx="2" fill="url(#${gradientId})"/>
  
  <!-- URL hint -->
  <text x="100" y="480" font-family="'Inter', sans-serif" font-size="24" font-weight="500" 
        fill="${primaryColor}">Read more →</text>
</svg>`;
}

/**
 * Generate article-specific OG image
 */
export function generateArticleOgImage(
    siteName: string,
    articleTitle: string,
    primaryColor: string,
    secondaryColor: string
): string {
    const gradientId = `article-og-gradient-${Date.now()}`;

    return `<svg viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${primaryColor}"/>
      <stop offset="100%" style="stop-color:${secondaryColor}"/>
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" fill="#ffffff"/>
  
  <!-- Top accent bar -->
  <rect width="1200" height="8" fill="url(#${gradientId})"/>
  
  <!-- Site branding -->
  <rect x="60" y="40" width="50" height="50" rx="10" fill="url(#${gradientId})"/>
  <text x="85" y="75" text-anchor="middle" 
        font-family="'Inter', sans-serif" font-size="24" font-weight="700" 
        fill="white">${getInitials(siteName)}</text>
  <text x="130" y="75" font-family="'Inter', sans-serif" font-size="24" font-weight="600" 
        fill="${primaryColor}">${siteName}</text>
  
  <!-- Article title -->
  <foreignObject x="60" y="150" width="1080" height="300">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Inter', sans-serif; font-size: 56px; font-weight: 700; color: #1f2937; line-height: 1.2;">
      ${truncateText(articleTitle, 80)}
    </div>
  </foreignObject>
  
  <!-- Bottom accent -->
  <rect x="60" y="500" width="120" height="4" rx="2" fill="url(#${gradientId})"/>
  <text x="60" y="560" font-family="'Inter', sans-serif" font-size="20" fill="#6b7280">
    Read the full article →
  </text>
</svg>`;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get initials from site name (max 2 characters)
 */
function getInitials(name: string): string {
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Truncate text with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

/**
 * Convert SVG to data URL
 */
export function svgToDataUrl(svg: string): string {
    const encoded = encodeURIComponent(svg)
        .replace(/'/g, '%27')
        .replace(/"/g, '%22');
    return `data:image/svg+xml,${encoded}`;
}

/**
 * Convert SVG to base64 data URL
 */
export function svgToBase64(svg: string): string {
    if (typeof Buffer !== 'undefined') {
        return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    }
    // Fallback for browser
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// ============================================
// MAIN GENERATOR
// ============================================

/**
 * Generate all site graphics from theme
 */
export function generateSiteGraphics(
    siteName: string,
    tagline: string,
    theme: ThemeConfig
): SiteGraphics {
    const { colors } = theme;
    const style = mapMoodToLogoStyle(theme.seed.mood);

    // Generate logo
    const logoSvg = generateTextLogo(siteName, colors.primary, colors.secondary, style);

    // Generate icon for favicons
    const iconSvg = generateIconLogo(siteName, colors.primary, colors.secondary, 48);
    const icon16 = generateIconLogo(siteName, colors.primary, colors.secondary, 16);
    const icon32 = generateIconLogo(siteName, colors.primary, colors.secondary, 32);

    // Generate OG image
    const ogSvg = generateOgImage(siteName, tagline, colors.primary, colors.secondary);

    // Generate PWA icons
    const icon192 = generateIconLogo(siteName, colors.primary, colors.secondary, 192);
    const icon512 = generateIconLogo(siteName, colors.primary, colors.secondary, 512);
    const apple180 = generateIconLogo(siteName, colors.primary, colors.secondary, 180);

    return {
        logo: {
            svg: logoSvg,
            dataUrl: svgToDataUrl(logoSvg),
        },
        favicon: {
            svg: iconSvg,
            ico16: svgToBase64(icon16),
            ico32: svgToBase64(icon32),
            ico48: svgToBase64(iconSvg),
        },
        ogImage: {
            svg: ogSvg,
            dataUrl: svgToDataUrl(ogSvg),
        },
        icons: {
            apple180: svgToBase64(apple180),
            icon192: svgToBase64(icon192),
            icon512: svgToBase64(icon512),
        },
        generatedAt: Date.now(),
        themeColors: {
            primary: colors.primary,
            secondary: colors.secondary,
            background: colors.background,
        },
    };
}

/**
 * Map theme mood to logo style
 */
function mapMoodToLogoStyle(mood: string): 'modern' | 'elegant' | 'bold' | 'minimal' {
    const moodMap: Record<string, 'modern' | 'elegant' | 'bold' | 'minimal'> = {
        modern: 'modern',
        elegant: 'elegant',
        playful: 'bold',
        corporate: 'minimal',
        organic: 'elegant',
        bold: 'bold',
        minimal: 'minimal',
        vibrant: 'modern',
    };
    return moodMap[mood] || 'modern';
}

/**
 * Generate graphics file outputs for template
 */
export function generateGraphicsFiles(
    siteName: string,
    tagline: string,
    theme: ThemeConfig
): Array<{ path: string; content: string }> {
    const graphics = generateSiteGraphics(siteName, tagline, theme);

    return [
        // Logo files
        {
            path: 'public/logo.svg',
            content: graphics.logo.svg
        },

        // Favicon files
        {
            path: 'public/favicon.svg',
            content: graphics.favicon.svg
        },

        // OG image template
        {
            path: 'public/og-image.svg',
            content: graphics.ogImage.svg
        },

        // PWA icons (SVG, can be converted to PNG on deploy)
        {
            path: 'public/icon-192.svg',
            content: generateIconLogo(siteName, theme.colors.primary, theme.colors.secondary, 192)
        },
        {
            path: 'public/icon-512.svg',
            content: generateIconLogo(siteName, theme.colors.primary, theme.colors.secondary, 512)
        },
        {
            path: 'public/apple-touch-icon.svg',
            content: generateIconLogo(siteName, theme.colors.primary, theme.colors.secondary, 180)
        },

        // Graphics metadata
        {
            path: 'public/graphics.json',
            content: JSON.stringify({
                generatedAt: graphics.generatedAt,
                themeColors: graphics.themeColors,
                files: [
                    'logo.svg',
                    'favicon.svg',
                    'og-image.svg',
                    'icon-192.svg',
                    'icon-512.svg',
                    'apple-touch-icon.svg'
                ]
            }, null, 2)
        }
    ];
}
