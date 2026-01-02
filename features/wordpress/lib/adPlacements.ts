/**
 * Ad Placement Manager
 * FSD: features/wordpress/lib/adPlacements.ts
 * 
 * Manages strategic ad placement zones for AdSense optimization:
 * - Above-the-fold placement
 * - In-content spacing
 * - Below-content placement
 * - Sidebar positions
 */

// ============================================================================
// Ad Zone Definitions
// ============================================================================

export type AdSize = 'responsive' | 'banner' | 'rectangle' | 'leaderboard' | 'skyscraper';
export type AdPosition = 'after-intro' | 'in-content' | 'above-content' | 'below-content' | 'sidebar';

export interface AdZone {
    id: string;
    name: string;
    position: AdPosition;
    size: AdSize;
    enabled: boolean;
    priority: number;          // Lower = higher priority
    minContentLength?: number; // Min words before showing
    spacing?: number;          // Words between in-content ads
}

/**
 * Default ad zone configuration for AdSense-optimized layouts
 */
export const DEFAULT_AD_ZONES: AdZone[] = [
    {
        id: 'above-fold',
        name: 'Above The Fold',
        position: 'after-intro',
        size: 'responsive',
        enabled: true,
        priority: 1,
        minContentLength: 300,
    },
    {
        id: 'in-content-1',
        name: 'In-Content (First)',
        position: 'in-content',
        size: 'responsive',
        enabled: true,
        priority: 2,
        spacing: 400,           // Words between ads
    },
    {
        id: 'in-content-2',
        name: 'In-Content (Second)',
        position: 'in-content',
        size: 'rectangle',
        enabled: true,
        priority: 3,
        spacing: 400,
    },
    {
        id: 'below-content',
        name: 'Below Content',
        position: 'below-content',
        size: 'responsive',
        enabled: true,
        priority: 4,
    },
    {
        id: 'sidebar-top',
        name: 'Sidebar (Top)',
        position: 'sidebar',
        size: 'rectangle',
        enabled: true,
        priority: 5,
    },
    {
        id: 'sidebar-sticky',
        name: 'Sidebar (Sticky)',
        position: 'sidebar',
        size: 'skyscraper',
        enabled: true,
        priority: 6,
    },
];

// ============================================================================
// Ad Code Templates
// ============================================================================

export interface AdSenseConfig {
    publisherId: string;        // ca-pub-XXXXXXXX
    slots: Record<string, string>;  // Zone ID → Slot ID
}

/**
 * Generate AdSense ad code for a zone
 */
export function generateAdCode(zone: AdZone, config?: AdSenseConfig): string {
    if (!config) {
        // Return placeholder
        return `<!-- Ad Zone: ${zone.name} -->
<div class="ad-placeholder ad-${zone.id}" data-zone="${zone.id}">
  <!-- AdSense code will be inserted here -->
</div>`;
    }

    const slotId = config.slots[zone.id];
    if (!slotId) return '';

    const sizeStyle = getAdSizeStyle(zone.size);

    return `<!-- Ad Zone: ${zone.name} -->
<ins class="adsbygoogle"
     style="${sizeStyle}"
     data-ad-client="${config.publisherId}"
     data-ad-slot="${slotId}"
     data-ad-format="${zone.size === 'responsive' ? 'auto' : 'fluid'}"
     data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>`;
}

/**
 * Get CSS style for ad size
 */
function getAdSizeStyle(size: AdSize): string {
    switch (size) {
        case 'responsive':
            return 'display:block';
        case 'banner':
            return 'display:inline-block;width:728px;height:90px';
        case 'rectangle':
            return 'display:inline-block;width:336px;height:280px';
        case 'leaderboard':
            return 'display:inline-block;width:970px;height:90px';
        case 'skyscraper':
            return 'display:inline-block;width:160px;height:600px';
        default:
            return 'display:block';
    }
}

// ============================================================================
// Content Ad Injection
// ============================================================================

export interface AdInjectionOptions {
    zones: AdZone[];
    config?: AdSenseConfig;
    minWordsBeforeFirstAd?: number;
    minWordsBetweenAds?: number;
    maxAdsPerPage?: number;
}

/**
 * Inject ad placeholders into content
 */
export function injectAdPlacements(content: string, options: AdInjectionOptions): string {
    const opts = {
        minWordsBeforeFirstAd: 150,
        minWordsBetweenAds: 300,
        maxAdsPerPage: 4,
        ...options,
    };

    const enabledZones = opts.zones.filter(z => z.enabled).sort((a, b) => a.priority - b.priority);
    let result = content;
    let adsInserted = 0;

    // Split into paragraphs
    const paragraphs = result.split(/\n\n+/);
    let wordCount = 0;
    let lastAdPosition = -opts.minWordsBeforeFirstAd;

    const processedParagraphs = paragraphs.map((para, idx) => {
        // Skip headers
        if (para.startsWith('#')) {
            return para;
        }

        const paraWords = para.split(/\s+/).length;
        wordCount += paraWords;

        // Check if we should insert an ad after this paragraph
        const readyForAd = wordCount - lastAdPosition >= opts.minWordsBetweenAds;
        const hasRoom = adsInserted < opts.maxAdsPerPage;
        const inContentZone = enabledZones.find(z =>
            z.position === 'in-content' &&
            (!z.minContentLength || wordCount >= z.minContentLength)
        );

        if (readyForAd && hasRoom && inContentZone && idx > 0) {
            const adCode = generateAdCode(inContentZone, opts.config);
            adsInserted++;
            lastAdPosition = wordCount;
            return para + '\n\n' + adCode;
        }

        return para;
    });

    result = processedParagraphs.join('\n\n');

    // Add above-fold ad after intro
    const aboveFoldZone = enabledZones.find(z => z.position === 'after-intro');
    if (aboveFoldZone && adsInserted < opts.maxAdsPerPage) {
        const adCode = generateAdCode(aboveFoldZone, opts.config);
        // Insert after first paragraph that isn't a heading
        result = result.replace(
            /^(#[^\n]+\n+)([^#][^\n]+)/m,
            `$1$2\n\n${adCode}`
        );
    }

    // Add below-content ad
    const belowContentZone = enabledZones.find(z => z.position === 'below-content');
    if (belowContentZone && adsInserted < opts.maxAdsPerPage) {
        const adCode = generateAdCode(belowContentZone, opts.config);
        result = result + '\n\n' + adCode;
    }

    return result;
}

// ============================================================================
// Page Layout with Ad Zones
// ============================================================================

export interface PageLayout {
    main: string;           // Main content with in-content ads
    sidebar: string[];      // Sidebar ad codes
    header: string;         // Header ad (if applicable)
    footer: string;         // Footer ad
}

/**
 * Generate full page layout with ad zones
 */
export function generatePageLayout(content: string, options: AdInjectionOptions): PageLayout {
    const enabledZones = options.zones.filter(z => z.enabled);

    // Main content with in-content ads
    const main = injectAdPlacements(content, options);

    // Sidebar ads
    const sidebarZones = enabledZones.filter(z => z.position === 'sidebar');
    const sidebar = sidebarZones.map(zone => generateAdCode(zone, options.config));

    // Header ad (leaderboard)
    const headerZone = enabledZones.find(z => z.position === 'above-content');
    const header = headerZone ? generateAdCode(headerZone, options.config) : '';

    // Footer ad
    const footerZone = enabledZones.find(z => z.position === 'below-content');
    const footer = footerZone ? generateAdCode(footerZone, options.config) : '';

    return { main, sidebar, header, footer };
}

// ============================================================================
// Mobile Ad Optimization
// ============================================================================

export interface MobileAdConfig {
    useStickyFooter: boolean;
    reduceInContentAds: boolean;  // Fewer ads for mobile
    responsiveOnly: boolean;       // Only use responsive sizes
}

/**
 * Get mobile-optimized ad zones
 */
export function getMobileOptimizedZones(
    zones: AdZone[],
    config: MobileAdConfig = { useStickyFooter: true, reduceInContentAds: true, responsiveOnly: true }
): AdZone[] {
    let mobileZones = zones
        .filter(z => z.enabled)
        .map(z => ({
            ...z,
            size: config.responsiveOnly ? 'responsive' as AdSize : z.size,
        }));

    // Reduce in-content ads for mobile
    if (config.reduceInContentAds) {
        const inContentCount = mobileZones.filter(z => z.position === 'in-content').length;
        if (inContentCount > 1) {
            // Keep only first in-content ad
            let kept = 0;
            mobileZones = mobileZones.filter(z => {
                if (z.position === 'in-content') {
                    kept++;
                    return kept === 1;
                }
                return true;
            });
        }
    }

    // Add sticky footer for mobile
    if (config.useStickyFooter) {
        mobileZones.push({
            id: 'mobile-sticky',
            name: 'Mobile Sticky Footer',
            position: 'below-content',
            size: 'responsive',
            enabled: true,
            priority: 10,
        });
    }

    return mobileZones;
}

// ============================================================================
// Export Default Configuration
// ============================================================================

export { DEFAULT_AD_ZONES as adZones };
