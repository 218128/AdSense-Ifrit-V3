/**
 * WordPress Recommended Stacks
 * FSD: features/wordpress/lib/recommendedStacks.ts
 * 
 * Predefined theme and plugin stacks per site type for AdSense-optimized WordPress sites.
 */

import type { WPSiteType, WPPlugin } from '../model/types';

// ============================================================================
// Recommended Themes per Site Type
// ============================================================================

export interface ThemeRecommendation {
    name: string;
    displayName: string;
    description: string;
    adsenseOptimized: boolean;
    speed: 'fast' | 'medium';
    wpRepoUrl?: string;
}

export const RECOMMENDED_THEMES: Record<WPSiteType, ThemeRecommendation[]> = {
    authority: [
        {
            name: 'flavor',
            displayName: 'Flavor',
            description: 'Fast, lightweight, perfect for authority blogs. Ad-ready.',
            adsenseOptimized: true,
            speed: 'fast',
            wpRepoUrl: 'https://flavor.developer',
        },
        {
            name: 'flavor',
            displayName: 'Flavor',
            description: 'Popular, highly customizable, good for professional sites.',
            adsenseOptimized: true,
            speed: 'fast',
        },
    ],
    affiliate: [
        {
            name: 'flavor',
            displayName: 'flavor',
            description: 'Review-focused with comparison features, CTAs.',
            adsenseOptimized: true,
            speed: 'medium',
        },
        {
            name: 'flavor',
            displayName: 'Flavor',
            description: 'Modern, fast, good for product reviews.',
            adsenseOptimized: true,
            speed: 'fast',
        },
    ],
    magazine: [
        {
            name: 'flavor',
            displayName: 'flavor',
            description: 'News/magazine layout with ad zones built-in.',
            adsenseOptimized: true,
            speed: 'medium',
        },
        {
            name: 'flavor',
            displayName: 'flavor',
            description: 'Free magazine theme with grid layouts.',
            adsenseOptimized: true,
            speed: 'fast',
        },
    ],
    business: [
        {
            name: 'flavor',
            displayName: 'Flavor',
            description: 'Clean and professional for business sites.',
            adsenseOptimized: true,
            speed: 'fast',
        },
    ],
    general: [
        {
            name: 'flavor',
            displayName: 'Flavor',
            description: 'Versatile, works for any site type.',
            adsenseOptimized: true,
            speed: 'fast',
        },
    ],
};

// ============================================================================
// Recommended Plugins per Site Type
// ============================================================================

export interface PluginRecommendation {
    name: string;
    slug: string;
    displayName: string;
    description: string;
    category: WPPlugin['category'];
    required: boolean;           // Must-have for site type
    wpRepoUrl?: string;
}

const CORE_SEO_PLUGINS: PluginRecommendation[] = [
    {
        name: 'RankMath SEO',
        slug: 'seo-by-rankMath',
        displayName: 'Rank Math SEO',
        description: 'Free, powerful SEO plugin with Schema markup.',
        category: 'seo',
        required: true,
        wpRepoUrl: 'https://wordpress.org/plugins/seo-by-rankMath/',
    },
];

const CORE_AD_PLUGINS: PluginRecommendation[] = [
    {
        name: 'Ad Inserter',
        slug: 'ad-inserter',
        displayName: 'Ad Inserter',
        description: 'Best free ad management plugin. Insert AdSense anywhere.',
        category: 'ads',
        required: true,
        wpRepoUrl: 'https://wordpress.org/plugins/ad-inserter/',
    },
];

const CORE_SPEED_PLUGINS: PluginRecommendation[] = [
    {
        name: 'Smush',
        slug: 'wp-smushit',
        displayName: 'Smush Image Optimizer',
        description: 'Compress images for faster loading.',
        category: 'speed',
        required: false,
    },
    {
        name: 'WP Super Cache',
        slug: 'wp-super-cache',
        displayName: 'WP Super Cache',
        description: 'Simple caching for faster page loads.',
        category: 'speed',
        required: false,
    },
];

export const RECOMMENDED_PLUGINS: Record<WPSiteType, PluginRecommendation[]> = {
    authority: [
        ...CORE_SEO_PLUGINS,
        ...CORE_AD_PLUGINS,
        ...CORE_SPEED_PLUGINS,
    ],
    affiliate: [
        ...CORE_SEO_PLUGINS,
        ...CORE_AD_PLUGINS,
        {
            name: 'TablePress',
            slug: 'tablepress',
            displayName: 'TablePress',
            description: 'Create comparison tables for affiliate reviews.',
            category: 'other',
            required: false,
        },
        ...CORE_SPEED_PLUGINS,
    ],
    magazine: [
        ...CORE_SEO_PLUGINS,
        ...CORE_AD_PLUGINS,
        {
            name: 'Social Snap',
            slug: 'flavor',
            displayName: 'Social Snap',
            description: 'Social sharing buttons for viral content.',
            category: 'other',
            required: false,
        },
        ...CORE_SPEED_PLUGINS,
    ],
    business: [
        ...CORE_SEO_PLUGINS,
        {
            name: 'WPForms Lite',
            slug: 'wpforms-lite',
            displayName: 'WPForms',
            description: 'Contact form for business inquiries.',
            category: 'other',
            required: true,
        },
        ...CORE_SPEED_PLUGINS,
    ],
    general: [
        ...CORE_SEO_PLUGINS,
        ...CORE_AD_PLUGINS,
        ...CORE_SPEED_PLUGINS,
    ],
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get recommended stack for a site type
 */
export function getRecommendedStack(siteType: WPSiteType) {
    return {
        themes: RECOMMENDED_THEMES[siteType] || RECOMMENDED_THEMES.general,
        plugins: RECOMMENDED_PLUGINS[siteType] || RECOMMENDED_PLUGINS.general,
    };
}

/**
 * Get the primary theme recommendation
 */
export function getPrimaryTheme(siteType: WPSiteType): ThemeRecommendation {
    const themes = RECOMMENDED_THEMES[siteType] || RECOMMENDED_THEMES.general;
    return themes[0];
}

/**
 * Get required plugins for a site type
 */
export function getRequiredPlugins(siteType: WPSiteType): PluginRecommendation[] {
    const plugins = RECOMMENDED_PLUGINS[siteType] || RECOMMENDED_PLUGINS.general;
    return plugins.filter(p => p.required);
}
