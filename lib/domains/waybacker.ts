/**
 * Wayback Machine Integration
 * 
 * Checks domain history using Archive.org's free Wayback Machine API.
 * Detects spam, adult content, gambling, and PBN indicators.
 */

import { WaybackData } from './domainScorer';

const WAYBACK_API = 'https://archive.org/wayback/available';
const CDX_API = 'https://web.archive.org/cdx/search/cdx';

// Patterns indicating problematic content
const ADULT_PATTERNS = [
    /porn/i, /xxx/i, /adult/i, /sex/i, /nude/i, /escort/i,
    /webcam.*girl/i, /dating.*hook/i, /erotic/i
];

const CASINO_PATTERNS = [
    /casino/i, /poker/i, /gambling/i, /bet365/i, /slots/i,
    /blackjack/i, /roulette/i, /sportsbet/i, /betting/i,
    /온라인.*카지노/i, /คาสิโน/i  // Korean/Thai gambling
];

const SPAM_PATTERNS = [
    /viagra/i, /cialis/i, /pharma/i, /pills.*cheap/i,
    /payday.*loan/i, /fast.*cash/i, /weight.*loss.*miracle/i,
    /make.*money.*fast/i, /work.*from.*home.*easy/i,
    /buy.*followers/i, /free.*iphone/i, /congratulations.*won/i
];

const PBN_PATTERNS = [
    /powered.*by.*wordpress/i,
    /just.*another.*wordpress/i,
    /hello.*world/i,  // Default WP post
    /sample.*page/i,  // Default WP page
    /lorem.*ipsum/i,
    /this.*domain.*is.*for.*sale/i,
    /domain.*parking/i,
    /under.*construction/i
];

export interface WaybackSnapshot {
    timestamp: string;
    url: string;
    status: string;
    digest: string;
}

/**
 * Check if a domain has Wayback Machine history
 */
export async function checkWaybackAvailability(domain: string): Promise<{
    available: boolean;
    url?: string;
    timestamp?: string;
}> {
    try {
        const response = await fetch(
            `${WAYBACK_API}?url=${encodeURIComponent(domain)}`
        );

        if (!response.ok) {
            return { available: false };
        }

        const data = await response.json();

        if (data.archived_snapshots?.closest) {
            return {
                available: true,
                url: data.archived_snapshots.closest.url,
                timestamp: data.archived_snapshots.closest.timestamp
            };
        }

        return { available: false };
    } catch (error) {
        console.error('Wayback availability check failed:', error);
        return { available: false };
    }
}

/**
 * Get snapshot list for a domain from Wayback CDX API
 */
export async function getWaybackSnapshots(
    domain: string,
    limit: number = 50
): Promise<WaybackSnapshot[]> {
    try {
        const url = `${CDX_API}?url=${encodeURIComponent(domain)}&output=json&limit=${limit}&fl=timestamp,original,statuscode,digest`;

        const response = await fetch(url);

        if (!response.ok) {
            return [];
        }

        const data = await response.json();

        // First row is headers
        if (!Array.isArray(data) || data.length < 2) {
            return [];
        }

        // Skip header row, map to objects
        return data.slice(1).map((row: string[]) => ({
            timestamp: row[0],
            url: row[1],
            status: row[2],
            digest: row[3]
        }));
    } catch (error) {
        console.error('Wayback snapshots fetch failed:', error);
        return [];
    }
}

/**
 * Fetch content from a specific Wayback snapshot
 */
export async function getSnapshotContent(
    domain: string,
    timestamp: string
): Promise<string | null> {
    try {
        const url = `https://web.archive.org/web/${timestamp}id_/${domain}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Ifrit Domain Checker/1.0'
            }
        });

        if (!response.ok) {
            return null;
        }

        const html = await response.text();

        // Return first 10000 chars for analysis
        return html.slice(0, 10000);
    } catch (error) {
        console.error('Snapshot content fetch failed:', error);
        return null;
    }
}

/**
 * Analyze content for problematic patterns
 */
export function analyzeContent(content: string): {
    isAdult: boolean;
    isCasino: boolean;
    isSpam: boolean;
    isPBN: boolean;
    detectedPatterns: string[];
} {
    const detectedPatterns: string[] = [];

    const checkPatterns = (patterns: RegExp[], type: string): boolean => {
        for (const pattern of patterns) {
            if (pattern.test(content)) {
                detectedPatterns.push(`${type}: ${pattern.source}`);
                return true;
            }
        }
        return false;
    };

    return {
        isAdult: checkPatterns(ADULT_PATTERNS, 'adult'),
        isCasino: checkPatterns(CASINO_PATTERNS, 'casino'),
        isSpam: checkPatterns(SPAM_PATTERNS, 'spam'),
        isPBN: checkPatterns(PBN_PATTERNS, 'pbn'),
        detectedPatterns
    };
}

/**
 * Full domain history check
 */
export async function checkDomainHistory(domain: string): Promise<WaybackData> {
    const result: WaybackData = {
        hasHistory: false
    };

    try {
        // 1. Check if any snapshots exist
        const availability = await checkWaybackAvailability(domain);

        if (!availability.available) {
            return result;
        }

        result.hasHistory = true;

        // 2. Get snapshot list
        const snapshots = await getWaybackSnapshots(domain, 20);

        if (snapshots.length === 0) {
            return result;
        }

        // Parse timestamps
        const timestamps = snapshots.map(s => s.timestamp);
        result.firstCaptureDate = formatWaybackDate(timestamps[timestamps.length - 1]);
        result.lastCaptureDate = formatWaybackDate(timestamps[0]);
        result.totalCaptures = snapshots.length;

        // 3. Sample a few snapshots for content analysis
        // Check first, last, and a middle snapshot
        const samplesToCheck = [
            snapshots[0],  // Latest
            snapshots[Math.floor(snapshots.length / 2)],  // Middle
            snapshots[snapshots.length - 1]  // Oldest
        ].filter(Boolean);

        for (const snapshot of samplesToCheck) {
            const content = await getSnapshotContent(domain, snapshot.timestamp);

            if (content) {
                const analysis = analyzeContent(content);

                if (analysis.isAdult) result.wasAdult = true;
                if (analysis.isCasino) result.wasCasino = true;
                if (analysis.isSpam) result.hadSpam = true;
                if (analysis.isPBN) result.wasPBN = true;

                // Store sample for display
                if (!result.sampleContent) {
                    result.sampleContent = extractTextSample(content);
                }
            }

            // Small delay to be nice to Archive.org
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        return result;
    } catch (error) {
        console.error('Domain history check failed:', error);
        return result;
    }
}

/**
 * Quick history check (just availability, no content analysis)
 */
export async function quickHistoryCheck(domain: string): Promise<{
    hasHistory: boolean;
    firstCapture?: string;
    snapshotCount?: number;
}> {
    try {
        const snapshots = await getWaybackSnapshots(domain, 5);

        if (snapshots.length === 0) {
            return { hasHistory: false };
        }

        return {
            hasHistory: true,
            firstCapture: formatWaybackDate(snapshots[snapshots.length - 1].timestamp),
            snapshotCount: snapshots.length
        };
    } catch {
        return { hasHistory: false };
    }
}

/**
 * Format Wayback timestamp to readable date
 */
function formatWaybackDate(timestamp: string): string {
    // Wayback format: YYYYMMDDHHmmss
    if (!timestamp || timestamp.length < 8) return 'Unknown';

    const year = timestamp.slice(0, 4);
    const month = timestamp.slice(4, 6);
    const day = timestamp.slice(6, 8);

    return `${year}-${month}-${day}`;
}

/**
 * Extract readable text sample from HTML
 */
function extractTextSample(html: string): string {
    // Very basic HTML stripping
    const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Return first 500 chars
    return text.slice(0, 500);
}

/**
 * Estimate domain age from Wayback data
 */
export function estimateAgeFromWayback(waybackData: WaybackData): number | undefined {
    if (!waybackData.firstCaptureDate) return undefined;

    try {
        const firstDate = new Date(waybackData.firstCaptureDate);
        const now = new Date();
        const years = (now.getTime() - firstDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        return Math.round(years * 10) / 10;  // Round to 1 decimal
    } catch {
        return undefined;
    }
}
