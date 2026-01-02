/**
 * PageSpeed Insights Integration
 * FSD: lib/quality/pageSpeedInsights.ts
 * 
 * Fetches Core Web Vitals from Google PageSpeed Insights API.
 */

// ============================================================================
// Types
// ============================================================================

export interface CoreWebVitals {
    lcp: number;    // Largest Contentful Paint (ms)
    fid: number;    // First Input Delay (ms)
    cls: number;    // Cumulative Layout Shift
    fcp: number;    // First Contentful Paint (ms)
    ttfb: number;   // Time to First Byte (ms)
}

export interface PageSpeedResult {
    success: boolean;
    url: string;
    strategy: 'mobile' | 'desktop';
    score: number;  // 0-100
    vitals: CoreWebVitals;
    passed: {
        lcp: boolean;
        fid: boolean;
        cls: boolean;
    };
    adsenseReady: boolean;
    error?: string;
}

// ============================================================================
// Thresholds (Google's recommendations)
// ============================================================================

const THRESHOLDS = {
    lcp: 2500,    // Good: < 2.5s
    fid: 100,     // Good: < 100ms
    cls: 0.1,     // Good: < 0.1
    fcp: 1800,    // Good: < 1.8s
    ttfb: 600,    // Good: < 600ms
};

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch PageSpeed Insights for a URL
 * Note: Requires Google PageSpeed Insights API key for higher rate limits
 * Free tier: 400 queries/day without API key
 */
export async function fetchPageSpeedInsights(
    url: string,
    strategy: 'mobile' | 'desktop' = 'mobile',
    apiKey?: string
): Promise<PageSpeedResult> {
    try {
        // Validate URL
        if (!url.startsWith('http')) {
            url = `https://${url}`;
        }

        // Build API URL
        let apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}`;
        if (apiKey) {
            apiUrl += `&key=${apiKey}`;
        }

        const response = await fetch(apiUrl);

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            return {
                success: false,
                url,
                strategy,
                score: 0,
                vitals: { lcp: 0, fid: 0, cls: 0, fcp: 0, ttfb: 0 },
                passed: { lcp: false, fid: false, cls: false },
                adsenseReady: false,
                error: error.error?.message || `API error: ${response.status}`,
            };
        }

        const data = await response.json();

        // Extract Lighthouse score
        const score = Math.round((data.lighthouseResult?.categories?.performance?.score || 0) * 100);

        // Extract Core Web Vitals from audits
        const audits = data.lighthouseResult?.audits || {};

        const lcp = audits['largest-contentful-paint']?.numericValue || 0;
        const fid = audits['max-potential-fid']?.numericValue || audits['first-input-delay']?.numericValue || 0;
        const cls = audits['cumulative-layout-shift']?.numericValue || 0;
        const fcp = audits['first-contentful-paint']?.numericValue || 0;
        const ttfb = audits['server-response-time']?.numericValue || 0;

        const vitals: CoreWebVitals = { lcp, fid, cls, fcp, ttfb };

        // Check against thresholds
        const passed = {
            lcp: lcp <= THRESHOLDS.lcp,
            fid: fid <= THRESHOLDS.fid,
            cls: cls <= THRESHOLDS.cls,
        };

        // AdSense readiness (needs good Core Web Vitals and score 50+)
        const adsenseReady = passed.lcp && passed.cls && score >= 50;

        return {
            success: true,
            url,
            strategy,
            score,
            vitals,
            passed,
            adsenseReady,
        };

    } catch (error) {
        return {
            success: false,
            url,
            strategy,
            score: 0,
            vitals: { lcp: 0, fid: 0, cls: 0, fcp: 0, ttfb: 0 },
            passed: { lcp: false, fid: false, cls: false },
            adsenseReady: false,
            error: error instanceof Error ? error.message : 'Network error',
        };
    }
}

/**
 * Format milliseconds to human-readable string
 */
export function formatTime(ms: number): string {
    if (ms >= 1000) {
        return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${Math.round(ms)}ms`;
}

/**
 * Get status color for metric
 */
export function getMetricStatus(metric: keyof CoreWebVitals, value: number): 'good' | 'needs-improvement' | 'poor' {
    const threshold = THRESHOLDS[metric];
    if (value <= threshold) return 'good';
    if (value <= threshold * 2) return 'needs-improvement';
    return 'poor';
}
