/**
 * SpamZilla CSV Parser
 * 
 * Parses CSV exports from SpamZilla with full column mapping.
 * Supports 3 filter presets: Gold Standard, Safe to Relax, Maximum Volume
 */

// SpamZilla CSV columns (27 total)
const SPAMZILLA_COLUMNS = [
    'Name', 'Source', 'TF', 'CF', 'Majestic BL', 'Majestic RD',
    'Majestic Topics', 'Majestic Languages', 'Site Languages',
    'Moz DA', 'Moz PA', 'Age', 'SZ Redirects', 'SZ Parked',
    'SZ Active History', 'SZ Score', 'SZ Drops', 'Google Index',
    'SEM Traffic', 'SEM Rank', 'SEM Keywords', 'Out Links Internal',
    'Out Links External', 'Out Domains External', 'Date Added', 'Price', 'Expires'
] as const;

export interface SpamZillaDomain {
    // Core
    domain: string;
    tld: string;
    source: string;

    // Majestic Metrics
    trustFlow: number;
    citationFlow: number;
    tfCfRatio: number;
    backlinks: number;
    referringDomains: number;
    majesticTopics?: string;

    // Moz Metrics
    domainAuthority: number;
    pageAuthority: number;

    // SpamZilla Metrics
    szScore: number;           // 0-100, lower = cleaner
    szDrops: number;           // Previous drops
    szActiveHistory: number;   // Years of real content
    szRedirects: number;
    szParked: number;

    // Other Metrics
    age: number;               // Domain age in years
    googleIndex: boolean;
    semTraffic: number;
    semKeywords: number;

    // Auction Info
    price?: string;
    auctionSource?: string;
    expires?: string;

    // Calculated
    qualityTier: 'gold' | 'silver' | 'bronze' | 'avoid';
    adsenseReady: boolean;
}

export interface SpamZillaImportResult {
    domains: SpamZillaDomain[];
    preset: 'gold' | 'safe-relax' | 'max-volume' | 'custom';
    stats: {
        total: number;
        adsenseReady: number;
        avgTF: number;
        avgSZ: number;
        avgDA: number;
    };
}

/**
 * Parse SpamZilla CSV content
 */
export function parseSpamZillaCSV(csvContent: string, filename?: string): SpamZillaImportResult {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
        return { domains: [], preset: 'custom', stats: { total: 0, adsenseReady: 0, avgTF: 0, avgSZ: 0, avgDA: 0 } };
    }

    // Parse header
    const headers = parseCSVLine(lines[0]);

    // Verify it's a SpamZilla export
    if (!headers.includes('TF') || !headers.includes('SZ Score')) {
        throw new Error('Not a valid SpamZilla CSV export. Missing TF or SZ Score columns.');
    }

    // Detect preset from filename
    const preset = detectPreset(filename || '');

    // Parse domains
    const domains: SpamZillaDomain[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length < 5) continue; // Skip incomplete rows

        const domain = parseSpamZillaDomain(headers, values);
        if (domain) {
            domains.push(domain);
        }
    }

    // Calculate stats
    const stats = calculateStats(domains);

    return { domains, preset, stats };
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());

    return result;
}

/**
 * Detect filter preset from filename
 */
export function detectPresetFromFilename(filename: string): string {
    const lower = filename.toLowerCase();

    if (lower.includes('gold') || lower.includes('adsensegold')) return 'Gold Standard';
    if (lower.includes('safetorelax') || lower.includes('safe-to-relax') || lower.includes('safe_to_relax') || lower.includes('relaxed')) return 'Safe to Relax';
    if (lower.includes('maximumvolume') || lower.includes('maximum-volume') || lower.includes('max-volume') || lower.includes('max-vol')) return 'Maximum Volume';

    return 'Custom';
}

// Internal version for parsing
function detectPreset(filename: string): 'gold' | 'safe-relax' | 'max-volume' | 'custom' {
    const lower = filename.toLowerCase();

    if (lower.includes('gold')) return 'gold';
    if (lower.includes('safetorelax') || lower.includes('safe-to-relax') || lower.includes('safe_to_relax')) return 'safe-relax';
    if (lower.includes('maximumvolume') || lower.includes('maximum-volume') || lower.includes('max-volume')) return 'max-volume';

    return 'custom';
}

/**
 * Parse a single domain from CSV row
 */
function parseSpamZillaDomain(headers: string[], values: string[]): SpamZillaDomain | null {
    const getValue = (columnName: string): string => {
        const idx = headers.findIndex(h => h.toLowerCase().replace(/"/g, '').trim() === columnName.toLowerCase());
        return idx >= 0 && idx < values.length ? values[idx].replace(/"/g, '').trim() : '';
    };

    const getNumber = (columnName: string): number => {
        const val = getValue(columnName);
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
    };

    const domainName = getValue('Name');
    if (!domainName) return null;

    // Extract TLD
    const parts = domainName.split('.');
    const tld = parts.length > 1 ? parts[parts.length - 1] : 'com';

    // Parse metrics
    const trustFlow = getNumber('TF');
    const citationFlow = getNumber('CF');
    const tfCfRatio = citationFlow > 0 ? trustFlow / citationFlow : 0;

    const szScore = getNumber('SZ Score');
    const age = getNumber('Age');
    const domainAuthority = getNumber('Moz DA');

    // Determine quality tier using Gold Standard criteria
    const qualityTier = determineQualityTier(trustFlow, tfCfRatio, szScore, domainAuthority, age);

    // Determine AdSense readiness
    const adsenseReady = qualityTier !== 'avoid' &&
        szScore <= 20 &&
        trustFlow >= 8 &&
        domainAuthority >= 10 &&
        tfCfRatio >= 0.3;

    return {
        domain: domainName,
        tld,
        source: getValue('Source'),

        // Majestic
        trustFlow,
        citationFlow,
        tfCfRatio: Math.round(tfCfRatio * 100) / 100,
        backlinks: getNumber('Majestic BL'),
        referringDomains: getNumber('Majestic RD'),
        majesticTopics: getValue('Majestic Topics') || undefined,

        // Moz
        domainAuthority,
        pageAuthority: getNumber('Moz PA'),

        // SpamZilla
        szScore,
        szDrops: getNumber('SZ Drops'),
        szActiveHistory: getNumber('SZ Active History') || getNumber('SZ A/History'),
        szRedirects: getNumber('SZ Redirects'),
        szParked: getNumber('SZ Parked'),

        // Other
        age,
        googleIndex: getValue('Google Index') === '1' || getValue('Google Index').toLowerCase() === 'yes',
        semTraffic: getNumber('SEM Traffic'),
        semKeywords: getNumber('SEM Keywords'),

        // Auction
        price: getValue('Price') || undefined,
        auctionSource: getValue('Source') || undefined,
        expires: getValue('Expires') || undefined,

        // Calculated
        qualityTier,
        adsenseReady,
    };
}

/**
 * Determine quality tier based on Gold Standard criteria
 * Exported for testing
 */
export function determineQualityTier(
    domainOrTf: SpamZillaDomain | number,
    tfCfRatioOrNothing?: number,
    szScore?: number,
    da?: number,
    age?: number
): 'gold' | 'silver' | 'bronze' | 'avoid' {
    // Handle SpamZillaDomain object input
    let tf: number, tfCfRatio: number, sz: number, domainAuthority: number, domainAge: number;

    if (typeof domainOrTf === 'object') {
        tf = domainOrTf.trustFlow;
        tfCfRatio = domainOrTf.tfCfRatio;
        sz = domainOrTf.szScore;
        domainAuthority = domainOrTf.domainAuthority;
        domainAge = domainOrTf.age || 0;
    } else {
        tf = domainOrTf;
        tfCfRatio = tfCfRatioOrNothing || 0;
        sz = szScore || 0;
        domainAuthority = da || 0;
        domainAge = age || 0;
    }

    // AVOID: Critical failures
    if (sz > 20) return 'avoid';
    if (tfCfRatio < 0.3 && tf > 0) return 'avoid';
    if (tf < 5) return 'avoid';

    // GOLD: Meets all Gold Standard criteria
    // TF >= 10, TF:CF >= 0.4, SZ <= 15, DA >= 15, Age >= 3
    if (tf >= 10 && tfCfRatio >= 0.4 && sz <= 15 && domainAuthority >= 15 && domainAge >= 3) {
        return 'gold';
    }

    // SILVER: Meets Safe to Relax criteria
    // TF >= 8, TF:CF >= 0.35, SZ <= 18, DA >= 12, Age >= 2
    if (tf >= 8 && tfCfRatio >= 0.35 && sz <= 18 && domainAuthority >= 12 && domainAge >= 2) {
        return 'silver';
    }

    // BRONZE: Meets Maximum Volume criteria
    // TF >= 5, TF:CF >= 0.3, SZ <= 20, DA >= 10
    if (tf >= 5 && tfCfRatio >= 0.3 && sz <= 20 && domainAuthority >= 10) {
        return 'bronze';
    }

    return 'avoid';
}

/**
 * Calculate aggregate stats
 */
function calculateStats(domains: SpamZillaDomain[]) {
    if (domains.length === 0) {
        return { total: 0, adsenseReady: 0, avgTF: 0, avgSZ: 0, avgDA: 0 };
    }

    const total = domains.length;
    const adsenseReady = domains.filter(d => d.adsenseReady).length;
    const avgTF = Math.round(domains.reduce((sum, d) => sum + d.trustFlow, 0) / total);
    const avgSZ = Math.round(domains.reduce((sum, d) => sum + d.szScore, 0) / total);
    const avgDA = Math.round(domains.reduce((sum, d) => sum + d.domainAuthority, 0) / total);

    return { total, adsenseReady, avgTF, avgSZ, avgDA };
}

/**
 * Get preset display info
 */
export function getPresetInfo(preset: string): { name: string; color: string; icon: string } {
    switch (preset) {
        case 'gold':
            return { name: 'Gold Standard', color: 'bg-yellow-100 text-yellow-800', icon: '🥇' };
        case 'safe-relax':
            return { name: 'Safe to Relax', color: 'bg-blue-100 text-blue-800', icon: '🛡️' };
        case 'max-volume':
            return { name: 'Maximum Volume', color: 'bg-purple-100 text-purple-800', icon: '📊' };
        default:
            return { name: 'Custom Filter', color: 'bg-gray-100 text-gray-800', icon: '⚙️' };
    }
}

/**
 * Get quality tier display info
 */
export function getTierInfo(tier: string): { name: string; color: string; emoji: string } {
    switch (tier) {
        case 'gold':
            return { name: 'Gold', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', emoji: '🥇' };
        case 'silver':
            return { name: 'Silver', color: 'bg-gray-100 text-gray-700 border-gray-300', emoji: '🥈' };
        case 'bronze':
            return { name: 'Bronze', color: 'bg-orange-100 text-orange-800 border-orange-300', emoji: '🥉' };
        default:
            return { name: 'Avoid', color: 'bg-red-100 text-red-700 border-red-300', emoji: '⛔' };
    }
}
