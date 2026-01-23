/**
 * WordPress Site Service
 * FSD: features/wordpress/lib/wpSiteService.ts
 * 
 * SoC: Business logic extracted from wpSiteStore.ts
 * Responsibility: Cross-feature operations and data transformations for WP Sites
 */

import type { DomainProfile } from '@/lib/domains/types';
import type { WPSite } from '../model/wpSiteTypes';

// ============================================================================
// Types
// ============================================================================

export interface WPSiteProfileData {
    niche: string;
    primaryKeywords: string[];
    secondaryKeywords: string[];
    questionKeywords: string[];
    suggestedTopics: string[];
    notes?: string;
    sourceDomain: string;
    loadedFromHuntAt: number;
}

export interface LoadHuntProfileResult {
    success: boolean;
    profileData?: WPSiteProfileData;
    niche?: string;
    error?: string;
}

export interface SiteHealthCheck {
    isReachable: boolean;
    responseTime: number;
    apiStatus: 'connected' | 'disconnected' | 'error';
    lastChecked: number;
}

// ============================================================================
// Hunt Profile Loading Service
// ============================================================================

/**
 * Load Hunt profile data for a domain.
 * Pure function - returns data without interacting with store.
 * 
 * @param domain - The domain to find Hunt profile for
 * @returns Profile data if found, or error
 */
export async function loadHuntProfileForDomain(domain: string): Promise<LoadHuntProfileResult> {
    try {
        // Dynamic import to avoid circular deps
        const { getOwnedDomains } = await import('@/features/hunt');
        const ownedDomains = getOwnedDomains();
        const huntDomain = ownedDomains.find(d => d.domain === domain);

        if (!huntDomain?.profile) {
            return {
                success: false,
                error: `No Hunt profile found for ${domain}`,
            };
        }

        const profile = huntDomain.profile;

        // Transform Hunt profile to WP Site profile data
        const profileData: WPSiteProfileData = {
            niche: profile.niche || 'General',
            primaryKeywords: profile.primaryKeywords || [],
            secondaryKeywords: profile.secondaryKeywords || [],
            questionKeywords: profile.questionKeywords || [],
            suggestedTopics: profile.suggestedTopics || [],
            notes: profile.notes,
            sourceDomain: domain,
            loadedFromHuntAt: Date.now(),
        };

        return {
            success: true,
            profileData,
            niche: profile.niche,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to load Hunt profile',
        };
    }
}

/**
 * Transform a DomainProfile directly to WPSiteProfileData
 * Use when profile is already available (no need to fetch from Hunt)
 */
export function transformProfileToSiteData(
    profile: DomainProfile,
    sourceDomain: string
): WPSiteProfileData {
    return {
        niche: profile.niche || 'General',
        primaryKeywords: profile.primaryKeywords || [],
        secondaryKeywords: profile.secondaryKeywords || [],
        questionKeywords: profile.questionKeywords || [],
        suggestedTopics: profile.suggestedTopics || [],
        notes: profile.notes,
        sourceDomain,
        loadedFromHuntAt: Date.now(),
    };
}

// ============================================================================
// Site Validation & Health Checks
// ============================================================================

/**
 * Validate WordPress site URL format
 */
export function validateSiteUrl(url: string): { valid: boolean; normalized?: string; error?: string } {
    try {
        // Remove trailing slashes and normalize
        let normalized = url.trim().replace(/\/+$/, '');

        // Add protocol if missing
        if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
            normalized = `https://${normalized}`;
        }

        const parsed = new URL(normalized);

        // Basic domain validation
        if (!parsed.hostname.includes('.')) {
            return { valid: false, error: 'Invalid domain format' };
        }

        return { valid: true, normalized };
    } catch {
        return { valid: false, error: 'Invalid URL format' };
    }
}

/**
 * Check if a site has all essential pages for AdSense
 */
export function checkEssentialPages(site: WPSite): {
    complete: boolean;
    missing: string[];
    score: number;
} {
    const checks = [
        { key: 'hasAboutPage', name: 'About' },
        { key: 'hasContactPage', name: 'Contact' },
        { key: 'hasPrivacyPolicy', name: 'Privacy Policy' },
        { key: 'hasTermsOfService', name: 'Terms of Service' },
        { key: 'hasDisclaimer', name: 'Disclaimer' },
    ] as const;

    const missing: string[] = [];
    let found = 0;

    for (const check of checks) {
        if (site[check.key]) {
            found++;
        } else {
            missing.push(check.name);
        }
    }

    return {
        complete: missing.length === 0,
        missing,
        score: Math.round((found / checks.length) * 100),
    };
}

/**
 * Calculate AdSense readiness score
 */
export function calculateAdsenseReadiness(site: WPSite): {
    score: number;
    status: 'ready' | 'almost' | 'needs-work';
    issues: string[];
} {
    const issues: string[] = [];
    let score = 0;

    // Check connection status
    if (site.status === 'connected') {
        score += 20;
    } else {
        issues.push('Site not connected');
    }

    // Check essential pages
    const pages = checkEssentialPages(site);
    score += pages.score * 0.4; // 40% weight
    if (!pages.complete) {
        issues.push(`Missing pages: ${pages.missing.join(', ')}`);
    }

    // Check article count
    if ((site.articleCount || 0) >= 30) {
        score += 20;
    } else if ((site.articleCount || 0) >= 15) {
        score += 10;
        issues.push('Needs more content (30+ articles recommended)');
    } else {
        issues.push('Insufficient content (currently less than 15 articles)');
    }

    // Check niche definition (now stored in profileData)
    if (site.profileData?.niche) {
        score += 10;
    } else {
        issues.push('No niche defined');
    }

    // Check profile data
    if (site.profileData?.primaryKeywords?.length) {
        score += 10;
    }

    score = Math.min(100, Math.round(score));

    return {
        score,
        status: score >= 80 ? 'ready' : score >= 50 ? 'almost' : 'needs-work',
        issues,
    };
}

// ============================================================================
// Site Statistics
// ============================================================================

/**
 * Calculate site statistics from articles
 */
export function calculateSiteStats(articles: Array<{ wordCount?: number; status?: string }>): {
    articleCount: number;
    publishedCount: number;
    draftCount: number;
    totalWordCount: number;
    averageWordCount: number;
} {
    const publishedArticles = articles.filter(a => a.status === 'publish');
    const draftArticles = articles.filter(a => a.status === 'draft');
    const totalWords = articles.reduce((sum, a) => sum + (a.wordCount || 0), 0);

    return {
        articleCount: articles.length,
        publishedCount: publishedArticles.length,
        draftCount: draftArticles.length,
        totalWordCount: totalWords,
        averageWordCount: articles.length > 0 ? Math.round(totalWords / articles.length) : 0,
    };
}

/**
 * Get recommended actions for a site
 */
export function getRecommendedActions(site: WPSite): Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    reason: string;
}> {
    const actions: Array<{ priority: 'high' | 'medium' | 'low'; action: string; reason: string }> = [];

    // Connection issues
    if (site.status !== 'connected') {
        actions.push({
            priority: 'high',
            action: 'Test connection',
            reason: 'Site is not connected to WordPress API',
        });
    }

    // Missing essential pages
    const pages = checkEssentialPages(site);
    if (!pages.complete) {
        actions.push({
            priority: 'high',
            action: `Create missing pages: ${pages.missing.join(', ')}`,
            reason: 'Required for AdSense approval',
        });
    }

    // Low content
    if ((site.articleCount || 0) < 15) {
        actions.push({
            priority: 'high',
            action: 'Publish more content',
            reason: `Only ${site.articleCount || 0} articles - need at least 15-30`,
        });
    }

    // No profile data
    if (!site.profileData) {
        actions.push({
            priority: 'medium',
            action: 'Load Hunt profile or configure keywords',
            reason: 'Keyword data helps with content strategy',
        });
    }

    // Old sync
    if (site.syncedAt && Date.now() - site.syncedAt > 7 * 24 * 60 * 60 * 1000) {
        actions.push({
            priority: 'low',
            action: 'Re-sync site metadata',
            reason: 'Categories and tags may be outdated',
        });
    }

    return actions;
}
