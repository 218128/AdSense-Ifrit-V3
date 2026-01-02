/**
 * AdSense Readiness Checker
 * FSD: features/wordpress/lib/adsenseChecker.ts
 * 
 * Validates WordPress sites against AdSense approval requirements.
 * Provides actionable recommendations for approval.
 */

import type {
    WPSite,
    AdSenseCheck,
    AdSenseReadinessReport,
} from '../model/wpSiteTypes';

// ============================================================================
// Constants
// ============================================================================

/** Minimum articles required for AdSense approval */
const MIN_ARTICLES = 15;

/** Minimum average word count per article */
const MIN_AVG_WORD_COUNT = 500;

/** Recommended average word count for better approval chances */
const RECOMMENDED_AVG_WORD_COUNT = 1000;

// ============================================================================
// Individual Checks
// ============================================================================

/**
 * Check if site has minimum articles
 */
function checkMinimumArticles(site: WPSite): AdSenseCheck {
    const articleCount = site.publishedArticleCount ?? site.articleCount ?? 0;
    const passed = articleCount >= MIN_ARTICLES;
    return {
        name: 'Minimum Articles',
        passed,
        required: true,
        message: passed
            ? `${articleCount} articles published (minimum: ${MIN_ARTICLES})`
            : `Only ${articleCount} articles. Need at least ${MIN_ARTICLES} for AdSense approval.`,
    };
}

/**
 * Check average word count
 */
function checkWordCount(site: WPSite): AdSenseCheck {
    const articleCount = site.publishedArticleCount ?? site.articleCount ?? 0;
    const totalWords = site.totalWordCount ?? 0;
    const avgWordCount = articleCount > 0 && totalWords
        ? Math.round(totalWords / articleCount)
        : 0;

    const passed = avgWordCount >= MIN_AVG_WORD_COUNT;

    return {
        name: 'Content Quality (Word Count)',
        passed,
        required: true,
        message: passed
            ? `Average ${avgWordCount} words per article (minimum: ${MIN_AVG_WORD_COUNT})`
            : `Average ${avgWordCount} words is too low. Aim for ${RECOMMENDED_AVG_WORD_COUNT}+ words per article.`,
    };
}

/**
 * Check About page
 */
function checkAboutPage(site: WPSite): AdSenseCheck {
    const hasPage = site.hasAboutPage ?? false;
    return {
        name: 'About Page',
        passed: hasPage,
        required: true,
        message: hasPage
            ? 'About page exists'
            : 'Missing About page. Create an About page explaining who you are and what the site offers.',
    };
}

/**
 * Check Contact page
 */
function checkContactPage(site: WPSite): AdSenseCheck {
    const hasPage = site.hasContactPage ?? false;
    return {
        name: 'Contact Page',
        passed: hasPage,
        required: true,
        message: hasPage
            ? 'Contact page exists'
            : 'Missing Contact page. Add a Contact page with a form or email address.',
    };
}

/**
 * Check Privacy Policy
 */
function checkPrivacyPolicy(site: WPSite): AdSenseCheck {
    const hasPage = site.hasPrivacyPolicy ?? false;
    return {
        name: 'Privacy Policy',
        passed: hasPage,
        required: true,
        message: hasPage
            ? 'Privacy Policy exists'
            : 'Missing Privacy Policy. Required for AdSense - must disclose data collection and cookie usage.',
    };
}

/**
 * Check Terms of Service
 */
function checkTermsOfService(site: WPSite): AdSenseCheck {
    const hasPage = site.hasTermsOfService ?? false;
    return {
        name: 'Terms of Service',
        passed: hasPage,
        required: true,
        message: hasPage
            ? 'Terms of Service exists'
            : 'Missing Terms of Service. Strongly recommended for AdSense approval.',
    };
}

/**
 * Check SSL/HTTPS
 */
function checkSSL(site: WPSite): AdSenseCheck {
    const passed = site.sslEnabled ?? site.url.startsWith('https://');
    return {
        name: 'SSL/HTTPS',
        passed,
        required: true,
        message: passed
            ? 'Site uses HTTPS'
            : 'Site is not using HTTPS. SSL is required for AdSense.',
    };
}

/**
 * Check ads.txt configuration
 */
function checkAdsTxt(site: WPSite): AdSenseCheck {
    const configured = site.adsTxtConfigured ?? false;
    return {
        name: 'ads.txt Configuration',
        passed: configured,
        required: false,
        message: configured
            ? 'ads.txt is configured'
            : 'ads.txt not configured. Add after AdSense approval to authorize ad networks.',
    };
}

/**
 * Check SEO plugin
 */
function checkSEOPlugin(site: WPSite): AdSenseCheck {
    const passed = site.seoPluginActive === true;
    return {
        name: 'SEO Plugin',
        passed,
        required: false,
        message: passed
            ? 'SEO plugin active (Rank Math/Yoast)'
            : 'No SEO plugin detected. Install Rank Math or Yoast SEO for better search visibility.',
    };
}

/**
 * Check site connectivity
 */
function checkConnectivity(site: WPSite): AdSenseCheck {
    const passed = site.status === 'connected';
    return {
        name: 'Site Connectivity',
        passed,
        required: true,
        message: passed
            ? 'Site is connected and accessible'
            : `Site status: ${site.status}. Ensure site is live and accessible.`,
    };
}

// ============================================================================
// Main Checker Function
// ============================================================================

/**
 * Run all AdSense readiness checks for a site
 */
export function checkAdSenseReadiness(site: WPSite): AdSenseReadinessReport {
    // Run all checks
    const allChecks = [
        checkMinimumArticles(site),
        checkWordCount(site),
        checkAboutPage(site),
        checkContactPage(site),
        checkPrivacyPolicy(site),
        checkTermsOfService(site),
        checkSSL(site),
        checkConnectivity(site),
        checkSEOPlugin(site),
        checkAdsTxt(site),
    ];

    // Separate required and optional
    const requiredChecks = allChecks.filter(c => c.required);
    const optionalChecks = allChecks.filter(c => !c.required);

    // Calculate scores
    const requiredPassed = requiredChecks.filter(c => c.passed).length;
    const optionalPassed = optionalChecks.filter(c => c.passed).length;

    // Required checks have more weight
    const requiredScore = (requiredPassed / requiredChecks.length) * 80;
    const optionalScore = (optionalPassed / optionalChecks.length) * 20;
    const score = Math.round(requiredScore + optionalScore);

    // Ready only if all required checks pass
    const ready = requiredChecks.every(c => c.passed);

    // Generate recommendations for failed checks
    const recommendations = allChecks
        .filter(c => !c.passed)
        .sort((a, b) => (a.required === b.required ? 0 : a.required ? -1 : 1)) // Required first
        .map(c => c.message);

    // Build the structured checks object
    const checks = {
        hasMinimumArticles: checkMinimumArticles(site).passed,
        articleWordCountOk: checkWordCount(site).passed,
        hasOriginalContent: true, // We assume content is original
        hasAboutPage: site.hasAboutPage ?? false,
        hasContactPage: site.hasContactPage ?? false,
        hasPrivacyPolicy: site.hasPrivacyPolicy ?? false,
        hasTermsOfService: site.hasTermsOfService ?? false,
        sslEnabled: site.sslEnabled ?? site.url.startsWith('https://'),
        mobileResponsive: true, // Assume WP themes are responsive
        fastLoadSpeed: true, // Would need PageSpeed API to check
        seoPluginActive: site.seoPluginActive === true,
        hasXmlSitemap: site.seoPluginActive === true, // SEO plugins create sitemaps
        adsTxtReady: site.adsTxtConfigured ?? false,
    };

    return {
        ready,
        score,
        checks,
        recommendations,
    };
}

// ============================================================================
// Quick Status Helpers
// ============================================================================

/**
 * Get a quick readiness status for display
 */
export function getReadinessStatus(site: WPSite): {
    status: 'ready' | 'almost' | 'not-ready';
    label: string;
    color: string;
} {
    const report = checkAdSenseReadiness(site);

    if (report.ready) {
        return { status: 'ready', label: 'Ready to Apply', color: 'green' };
    } else if (report.score >= 60) {
        return { status: 'almost', label: 'Almost Ready', color: 'yellow' };
    } else {
        return { status: 'not-ready', label: 'Not Ready', color: 'red' };
    }
}

/**
 * Get the most critical missing item
 */
export function getCriticalMissing(site: WPSite): string | null {
    const articleCount = site.publishedArticleCount ?? site.articleCount ?? 0;

    // Check in priority order
    if (!site.hasPrivacyPolicy) return 'Privacy Policy required';
    if (!site.hasAboutPage) return 'About page required';
    if (!site.hasContactPage) return 'Contact page required';
    if (articleCount < MIN_ARTICLES) {
        return `Need ${MIN_ARTICLES - articleCount} more articles`;
    }
    if (!site.sslEnabled && !site.url.startsWith('https://')) {
        return 'SSL/HTTPS required';
    }
    return null;
}

/**
 * Get progress percentage to AdSense approval
 */
export function getApprovalProgress(site: WPSite): {
    percentage: number;
    articlesProgress: number;
    pagesProgress: number;
    technicalProgress: number;
} {
    // Articles progress (0-100)
    const articleCount = site.publishedArticleCount ?? site.articleCount ?? 0;
    const articlesProgress = Math.min(100, Math.round((articleCount / MIN_ARTICLES) * 100));

    // Essential pages progress (0-100)
    const pagesCount = [
        site.hasAboutPage,
        site.hasContactPage,
        site.hasPrivacyPolicy,
        site.hasTermsOfService,
    ].filter(Boolean).length;
    const pagesProgress = Math.round((pagesCount / 4) * 100);

    // Technical progress (0-100)
    const technicalItems = [
        site.sslEnabled || site.url.startsWith('https://'),
        site.status === 'connected',
        site.seoPluginActive,
    ].filter(Boolean).length;
    const technicalProgress = Math.round((technicalItems / 3) * 100);

    // Overall (weighted average)
    const percentage = Math.round(
        (articlesProgress * 0.5) + (pagesProgress * 0.35) + (technicalProgress * 0.15)
    );

    return {
        percentage,
        articlesProgress,
        pagesProgress,
        technicalProgress,
    };
}

// ============================================================================
// Essential Pages Generator (placeholder for AI generation)
// ============================================================================

/**
 * Get list of missing essential pages
 */
export function getMissingEssentialPages(site: WPSite): string[] {
    const missing: string[] = [];

    if (!site.hasAboutPage) missing.push('about');
    if (!site.hasContactPage) missing.push('contact');
    if (!site.hasPrivacyPolicy) missing.push('privacy');
    if (!site.hasTermsOfService) missing.push('terms');
    if (!site.hasDisclaimer) missing.push('disclaimer');

    return missing;
}

/**
 * Check if site needs attention before AdSense application
 */
export function needsAttention(site: WPSite): boolean {
    const report = checkAdSenseReadiness(site);
    return !report.ready || report.score < 80;
}
