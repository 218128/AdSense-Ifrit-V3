/**
 * Plugin Monitor
 * FSD: features/wordpress/lib/pluginMonitor.ts
 * 
 * Monitors WordPress plugin health and reports status to users.
 * Ifrit monitors → Reports status → User fixes problems
 */

import type { WPSite } from '../model/wpSiteTypes';
import type { DetectedFeatures, PluginInfo } from '../hooks/pluginSyncTypes';

// ============================================================================
// Types
// ============================================================================

export type PluginCategory = 'seo' | 'ads' | 'legal' | 'performance' | 'security' | 'analytics';

export type HealthSeverity = 'ok' | 'warning' | 'error';

export interface PluginHealthCheck {
    category: PluginCategory;
    categoryLabel: string;
    status: 'active' | 'inactive' | 'not-installed' | 'misconfigured';
    severity: HealthSeverity;
    message: string;
    pluginName?: string;
    action?: {
        label: string;
        type: 'install' | 'activate' | 'configure' | 'external-link';
        pluginSlug?: string;
        url?: string;
    };
}

export interface SiteHealthReport {
    siteId: string;
    siteName: string;
    overallStatus: HealthSeverity;
    readyToPublish: boolean;
    checks: PluginHealthCheck[];
    summary: string;
    lastChecked: number;
}

// ============================================================================
// Required Plugins by Category
// ============================================================================

export const REQUIRED_PLUGINS: Record<PluginCategory, {
    name: string;
    slugPatterns: string[];
    required: boolean;
    description: string;
}> = {
    seo: {
        name: 'SEO Plugin',
        slugPatterns: ['rank-math', 'yoast', 'seo', 'all-in-one-seo'],
        required: true,
        description: 'Optimizes content for search engines',
    },
    ads: {
        name: 'Ad Management',
        slugPatterns: ['ad-inserter', 'advanced-ads', 'adsense-plugin', 'quick-adsense'],
        required: false, // Optional but recommended
        description: 'Manages AdSense ad placements',
    },
    legal: {
        name: 'Cookie Consent',
        slugPatterns: ['complianz', 'cookieyes', 'cookie-notice', 'gdpr'],
        required: true,
        description: 'GDPR/Cookie compliance banner',
    },
    performance: {
        name: 'Cache Plugin',
        slugPatterns: ['litespeed', 'wp-rocket', 'w3-total-cache', 'wp-super-cache', 'cache-enabler'],
        required: true,
        description: 'Page caching for speed',
    },
    security: {
        name: 'Security Plugin',
        slugPatterns: ['wordfence', 'sucuri', 'ithemes-security', 'all-in-one-security'],
        required: false,
        description: 'Protects against attacks',
    },
    analytics: {
        name: 'Analytics',
        slugPatterns: ['site-kit', 'google-analytics', 'monsterinsights', 'analytify'],
        required: false,
        description: 'Traffic and performance tracking',
    },
};

// ============================================================================
// Health Check Functions
// ============================================================================

/**
 * Check if a plugin category is satisfied by the installed plugins
 */
function checkCategory(
    category: PluginCategory,
    plugins: PluginInfo[],
    detectedFeatures: DetectedFeatures | null
): PluginHealthCheck {
    const config = REQUIRED_PLUGINS[category];

    // Check detected features first (more reliable)
    let isActive = false;
    let pluginName: string | undefined;

    if (detectedFeatures) {
        switch (category) {
            case 'seo':
                isActive = detectedFeatures.hasRankMath || detectedFeatures.hasYoast;
                pluginName = detectedFeatures.hasRankMath ? 'Rank Math' : detectedFeatures.hasYoast ? 'Yoast SEO' : undefined;
                break;
            case 'legal':
                isActive = detectedFeatures.hasComplianz;
                pluginName = detectedFeatures.hasComplianz ? 'Complianz GDPR' : undefined;
                break;
            case 'performance':
                isActive = detectedFeatures.hasCachePlugin;
                pluginName = 'Cache Plugin';
                break;
            case 'security':
                isActive = detectedFeatures.hasSecurityPlugin;
                pluginName = 'Security Plugin';
                break;
            case 'analytics':
                isActive = detectedFeatures.hasSiteKit;
                pluginName = detectedFeatures.hasSiteKit ? 'Site Kit by Google' : undefined;
                break;
        }
    }

    // Fallback: check plugin list
    if (!isActive && plugins.length > 0) {
        const matchingPlugin = plugins.find(p =>
            config.slugPatterns.some(pattern =>
                p.slug.toLowerCase().includes(pattern.toLowerCase())
            ) && p.active
        );

        if (matchingPlugin) {
            isActive = true;
            pluginName = matchingPlugin.name;
        }
    }

    // Build the health check result
    const categoryLabel = config.name;

    if (isActive) {
        return {
            category,
            categoryLabel,
            status: 'active',
            severity: 'ok',
            message: `${pluginName || categoryLabel} active`,
            pluginName,
        };
    }

    // Not active - determine severity
    const severity: HealthSeverity = config.required ? 'error' : 'warning';
    const recommendedSlug = config.slugPatterns[0];

    return {
        category,
        categoryLabel,
        status: 'not-installed',
        severity,
        message: `No ${categoryLabel.toLowerCase()} detected`,
        action: {
            label: `Install ${config.name}`,
            type: 'install',
            pluginSlug: recommendedSlug,
        },
    };
}

/**
 * Generate full health report for a site
 */
export function checkSiteHealth(
    site: WPSite,
    plugins: PluginInfo[] = [],
    detectedFeatures: DetectedFeatures | null = null
): SiteHealthReport {
    const checks: PluginHealthCheck[] = [];

    // Check each category
    const categories: PluginCategory[] = ['seo', 'legal', 'performance', 'ads', 'analytics', 'security'];

    for (const category of categories) {
        checks.push(checkCategory(category, plugins, detectedFeatures));
    }

    // Determine overall status
    const hasErrors = checks.some(c => c.severity === 'error');
    const hasWarnings = checks.some(c => c.severity === 'warning');

    const overallStatus: HealthSeverity = hasErrors ? 'error' : hasWarnings ? 'warning' : 'ok';

    // Generate summary
    const okCount = checks.filter(c => c.severity === 'ok').length;
    const errorCount = checks.filter(c => c.severity === 'error').length;
    const warningCount = checks.filter(c => c.severity === 'warning').length;

    let summary: string;
    if (overallStatus === 'ok') {
        summary = 'All plugins healthy - ready to publish!';
    } else if (errorCount > 0) {
        summary = `Fix ${errorCount} critical issue${errorCount > 1 ? 's' : ''} before publishing`;
    } else {
        summary = `${okCount} OK, ${warningCount} recommended improvement${warningCount > 1 ? 's' : ''}`;
    }

    return {
        siteId: site.id,
        siteName: site.name,
        overallStatus,
        readyToPublish: !hasErrors,
        checks,
        summary,
        lastChecked: Date.now(),
    };
}

/**
 * Quick check: is site ready to publish?
 */
export function isReadyToPublish(
    site: WPSite,
    plugins: PluginInfo[] = [],
    detectedFeatures: DetectedFeatures | null = null
): { ready: boolean; blockers: string[] } {
    const report = checkSiteHealth(site, plugins, detectedFeatures);

    const blockers = report.checks
        .filter(c => c.severity === 'error')
        .map(c => c.message);

    return {
        ready: report.readyToPublish,
        blockers,
    };
}

/**
 * Get category icon
 */
export function getCategoryIcon(category: PluginCategory): string {
    const icons: Record<PluginCategory, string> = {
        seo: '🔍',
        ads: '💰',
        legal: '⚖️',
        performance: '⚡',
        security: '🔒',
        analytics: '📊',
    };
    return icons[category];
}

/**
 * Get severity styling
 */
export function getSeverityStyle(severity: HealthSeverity): {
    bg: string;
    text: string;
    icon: '✅' | '⚠️' | '❌';
} {
    switch (severity) {
        case 'ok':
            return { bg: 'bg-green-50', text: 'text-green-700', icon: '✅' };
        case 'warning':
            return { bg: 'bg-amber-50', text: 'text-amber-700', icon: '⚠️' };
        case 'error':
            return { bg: 'bg-red-50', text: 'text-red-700', icon: '❌' };
    }
}
