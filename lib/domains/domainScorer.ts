/**
 * Domain Scorer
 * 
 * Scores domains based on multiple factors for acquisition decisions.
 * Uses free APIs initially, extensible to add Spamzilla/Moz/Ahrefs later.
 */

export interface DomainMetrics {
    // Basic info
    domain: string;
    tld: string;
    length: number;

    // Authority metrics (from external sources)
    domainRating?: number;       // DR (Ahrefs-style, 0-100)
    domainAuthority?: number;    // DA (Moz-style, 0-100)
    trustFlow?: number;          // TF (Majestic-style, 0-100)
    citationFlow?: number;       // CF (Majestic-style, 0-100)

    // Backlink data
    backlinks?: number;
    referringDomains?: number;
    qualityBacklinks?: number;

    // Age & history
    domainAge?: number;          // Years
    createdDate?: string;
    expiredDate?: string;

    // Indexing
    isIndexed?: boolean;
    indexedPages?: number;

    // Email
    hasMX?: boolean;
    emailDeliverabilityScore?: number;

    // Source of data
    dataSource?: 'spamzilla' | 'free-api' | 'manual' | 'estimated';
}

export interface DomainScore {
    overall: number;             // 0-100 final score

    // Component scores
    authority: number;           // Based on DR/DA/TF/CF
    trustworthiness: number;     // TF/CF ratio, spam indicators
    relevance: number;           // Niche match (if provided)
    emailPotential: number;      // Email deliverability readiness
    flipPotential: number;       // Estimated resale value factor
    nameQuality: number;         // Domain name characteristics

    // Risk assessment
    risks: DomainRisk[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';

    // Recommendations
    recommendation: 'strong-buy' | 'buy' | 'consider' | 'avoid';
    reasons: string[];

    // Estimated values
    estimatedValue: number;      // USD
    estimatedMonthlyRevenue: number;  // If monetized
}

export interface DomainRisk {
    type: 'spam' | 'adult' | 'casino' | 'pbn' | 'penalty' | 'trademark' | 'expired-links' | 'low-quality';
    severity: 'warning' | 'serious' | 'critical';
    description: string;
}

// Niche categories for relevance scoring
export const NICHE_KEYWORDS: Record<string, string[]> = {
    finance: ['finance', 'money', 'invest', 'loan', 'credit', 'bank', 'mortgage', 'insurance', 'wealth', 'stock', 'crypto', 'bitcoin'],
    technology: ['tech', 'software', 'app', 'digital', 'cyber', 'cloud', 'ai', 'data', 'code', 'dev', 'hosting', 'vpn', 'saas'],
    health: ['health', 'medical', 'wellness', 'fitness', 'diet', 'nutrition', 'supplement', 'doctor', 'hospital', 'pharma'],
    legal: ['law', 'legal', 'attorney', 'lawyer', 'court', 'justice', 'claim', 'injury'],
    ecommerce: ['shop', 'store', 'buy', 'deal', 'discount', 'price', 'sale', 'mall', 'market'],
    travel: ['travel', 'trip', 'tour', 'hotel', 'flight', 'vacation', 'destination', 'booking'],
    education: ['learn', 'edu', 'course', 'study', 'school', 'training', 'tutorial', 'guide'],
    gaming: ['game', 'gaming', 'play', 'esport', 'console', 'pc', 'mobile'],
};

// Spam indicator patterns
const SPAM_PATTERNS = [
    /casino/i, /poker/i, /gambling/i, /bet365/i, /slots/i,
    /viagra/i, /cialis/i, /pharma/i, /pills/i,
    /xxx/i, /porn/i, /adult/i, /sex/i,
    /payday/i, /loan.*fast/i,
    /cheap.*buy/i, /buy.*cheap/i,
];

// Premium TLDs that add value
const PREMIUM_TLDS = ['.com', '.net', '.org', '.io', '.ai', '.co'];
const GOOD_TLDS = ['.info', '.biz', '.dev', '.app', '.tech', '.guide', '.review'];

/**
 * Score a domain based on available metrics
 */
export function scoreDomain(
    metrics: DomainMetrics,
    targetNiche?: string,
    waybbackData?: WaybackData,
    additionalChecks?: AdditionalChecks
): DomainScore {
    const risks: DomainRisk[] = [];
    const reasons: string[] = [];

    // 1. Check for critical red flags first
    const criticalRisks = checkCriticalRisks(metrics, waybbackData);
    if (criticalRisks.length > 0) {
        return {
            overall: 0,
            authority: 0,
            trustworthiness: 0,
            relevance: 0,
            emailPotential: 0,
            flipPotential: 0,
            nameQuality: 0,
            risks: criticalRisks,
            riskLevel: 'critical',
            recommendation: 'avoid',
            reasons: criticalRisks.map(r => r.description),
            estimatedValue: 0,
            estimatedMonthlyRevenue: 0,
        };
    }

    // 2. Calculate authority score (0-100)
    const authority = calculateAuthorityScore(metrics);
    if (authority >= 40) reasons.push(`Strong authority (${authority})`);
    else if (authority >= 25) reasons.push(`Decent authority (${authority})`);
    else if (authority < 15) risks.push({
        type: 'low-quality',
        severity: 'warning',
        description: 'Low domain authority'
    });

    // 3. Calculate trustworthiness (0-100)
    const trustworthiness = calculateTrustScore(metrics);
    if (trustworthiness < 30) risks.push({
        type: 'low-quality',
        severity: 'warning',
        description: 'Low trust metrics'
    });

    // 4. Calculate relevance to target niche (0-100)
    const relevance = targetNiche ? calculateRelevanceScore(metrics.domain, targetNiche) : 50;
    if (relevance >= 70) reasons.push(`Highly relevant to ${targetNiche}`);

    // 5. Calculate name quality (0-100)
    const nameQuality = calculateNameQuality(metrics);
    if (nameQuality >= 70) reasons.push('Excellent domain name');

    // 6. Calculate email potential (0-100)
    const emailPotential = calculateEmailPotential(metrics);
    if (emailPotential >= 70) reasons.push('Good email deliverability potential');

    // 7. Calculate flip potential (0-100)
    const flipPotential = calculateFlipPotential(metrics, authority, nameQuality);
    if (flipPotential >= 70) reasons.push('High resale potential');

    // 8. Add any additional risks from history
    if (waybbackData?.hadSpam) {
        risks.push({
            type: 'spam',
            severity: 'serious',
            description: 'Wayback shows spam content history'
        });
    }

    // 9. Calculate overall score (weighted average)
    const overall = Math.round(
        authority * 0.30 +
        trustworthiness * 0.20 +
        relevance * 0.15 +
        nameQuality * 0.15 +
        emailPotential * 0.10 +
        flipPotential * 0.10
    );

    // 10. Determine risk level
    const seriousRisks = risks.filter(r => r.severity === 'serious').length;
    const warningRisks = risks.filter(r => r.severity === 'warning').length;
    const riskLevel = seriousRisks >= 2 ? 'high' : seriousRisks >= 1 ? 'medium' : warningRisks >= 2 ? 'medium' : 'low';

    // 11. Make recommendation
    let recommendation: DomainScore['recommendation'];
    if (overall >= 75 && riskLevel === 'low') recommendation = 'strong-buy';
    else if (overall >= 55 && riskLevel !== 'high') recommendation = 'buy';
    else if (overall >= 35 && riskLevel !== 'high') recommendation = 'consider';
    else recommendation = 'avoid';

    // 12. Estimate value
    const estimatedValue = estimateDomainValue(metrics, overall, nameQuality);
    const estimatedMonthlyRevenue = estimateMonthlyRevenue(metrics, overall);

    return {
        overall,
        authority,
        trustworthiness,
        relevance,
        emailPotential,
        flipPotential,
        nameQuality,
        risks,
        riskLevel,
        recommendation,
        reasons,
        estimatedValue,
        estimatedMonthlyRevenue,
    };
}

/**
 * Check for critical risks that immediately disqualify a domain
 */
function checkCriticalRisks(metrics: DomainMetrics, wayback?: WaybackData): DomainRisk[] {
    const risks: DomainRisk[] = [];

    // Check domain name for spam patterns
    for (const pattern of SPAM_PATTERNS) {
        if (pattern.test(metrics.domain)) {
            risks.push({
                type: 'spam',
                severity: 'critical',
                description: `Domain name matches spam pattern: ${pattern}`
            });
        }
    }

    // Check wayback history
    if (wayback?.wasAdult) {
        risks.push({ type: 'adult', severity: 'critical', description: 'Previous adult content detected' });
    }
    if (wayback?.wasCasino) {
        risks.push({ type: 'casino', severity: 'critical', description: 'Previous gambling content detected' });
    }
    if (wayback?.wasPBN) {
        risks.push({ type: 'pbn', severity: 'critical', description: 'Was part of a Private Blog Network' });
    }

    // Check if deindexed
    if (metrics.isIndexed === false) {
        risks.push({ type: 'penalty', severity: 'critical', description: 'Domain not indexed by Google (possible penalty)' });
    }

    return risks;
}

/**
 * Calculate authority score from available metrics
 */
function calculateAuthorityScore(metrics: DomainMetrics): number {
    // If we have actual metrics, use them
    if (metrics.domainRating !== undefined) return metrics.domainRating;
    if (metrics.domainAuthority !== undefined) return metrics.domainAuthority;

    // Estimate from backlink data if available
    if (metrics.referringDomains !== undefined) {
        // Rough estimation: log scale
        if (metrics.referringDomains > 1000) return 60;
        if (metrics.referringDomains > 500) return 50;
        if (metrics.referringDomains > 100) return 35;
        if (metrics.referringDomains > 50) return 25;
        if (metrics.referringDomains > 20) return 18;
        if (metrics.referringDomains > 10) return 12;
        return 8;
    }

    // If we have trust flow, use that
    if (metrics.trustFlow !== undefined) return metrics.trustFlow;

    // Default estimate based on domain age
    if (metrics.domainAge !== undefined) {
        if (metrics.domainAge > 10) return 25;
        if (metrics.domainAge > 5) return 18;
        if (metrics.domainAge > 2) return 12;
        return 8;
    }

    return 10; // Default low score if no data
}

/**
 * Calculate trust score
 */
function calculateTrustScore(metrics: DomainMetrics): number {
    // TF/CF ratio is a good indicator
    if (metrics.trustFlow !== undefined && metrics.citationFlow !== undefined && metrics.citationFlow > 0) {
        const ratio = metrics.trustFlow / metrics.citationFlow;
        if (ratio > 0.8) return 85;
        if (ratio > 0.6) return 70;
        if (ratio > 0.4) return 55;
        if (ratio > 0.2) return 35;
        return 20;
    }

    // Use TF alone if available
    if (metrics.trustFlow !== undefined) return metrics.trustFlow;

    // Estimate from quality backlinks ratio
    if (metrics.qualityBacklinks !== undefined && metrics.backlinks !== undefined && metrics.backlinks > 0) {
        const ratio = metrics.qualityBacklinks / metrics.backlinks;
        return Math.round(ratio * 100);
    }

    return 50; // Neutral if no data
}

/**
 * Calculate relevance to target niche
 */
function calculateRelevanceScore(domain: string, targetNiche: string): number {
    const niche = targetNiche.toLowerCase();
    const keywords = NICHE_KEYWORDS[niche] || [];

    if (keywords.length === 0) return 50; // No match data

    const domainLower = domain.toLowerCase();

    // Exact keyword match in domain
    for (const keyword of keywords) {
        if (domainLower.includes(keyword)) {
            return 90; // High relevance
        }
    }

    // Check TLD relevance
    if (niche === 'technology' && (domain.endsWith('.io') || domain.endsWith('.ai') || domain.endsWith('.dev'))) {
        return 70;
    }
    if (niche === 'ecommerce' && domain.endsWith('.store')) {
        return 70;
    }

    return 30; // Low relevance
}

/**
 * Calculate domain name quality
 */
function calculateNameQuality(metrics: DomainMetrics): number {
    let score = 50;

    // Length scoring
    if (metrics.length <= 6) score += 20;
    else if (metrics.length <= 10) score += 15;
    else if (metrics.length <= 15) score += 5;
    else if (metrics.length > 20) score -= 15;

    // TLD scoring
    if (PREMIUM_TLDS.includes(`.${metrics.tld}`)) score += 20;
    else if (GOOD_TLDS.includes(`.${metrics.tld}`)) score += 10;
    else score -= 10;

    // No numbers or hyphens
    const domainWithoutTld = metrics.domain.replace(`.${metrics.tld}`, '');
    if (!/\d/.test(domainWithoutTld)) score += 5;
    else score -= 10;

    if (!domainWithoutTld.includes('-')) score += 5;
    else score -= 15;

    // Single word bonus
    if (domainWithoutTld.length > 3 && !/[A-Z]/.test(domainWithoutTld.slice(1))) {
        score += 5;
    }

    return Math.min(100, Math.max(0, score));
}

/**
 * Calculate email deliverability potential
 */
function calculateEmailPotential(metrics: DomainMetrics): number {
    let score = 50;

    // Already has MX records
    if (metrics.hasMX === true) score += 20;
    else if (metrics.hasMX === false) score += 5; // Fresh slate

    // Domain age helps with email reputation
    if (metrics.domainAge !== undefined) {
        if (metrics.domainAge > 5) score += 20;
        else if (metrics.domainAge > 2) score += 10;
    }

    // Premium TLD better for email
    if (PREMIUM_TLDS.includes(`.${metrics.tld}`)) score += 15;

    // Existing deliverability score if available
    if (metrics.emailDeliverabilityScore !== undefined) {
        return metrics.emailDeliverabilityScore;
    }

    return Math.min(100, score);
}

/**
 * Calculate resale (flip) potential
 */
function calculateFlipPotential(metrics: DomainMetrics, authority: number, nameQuality: number): number {
    let score = 0;

    // Authority contributes to flip value
    score += authority * 0.4;

    // Name quality is crucial for flipping
    score += nameQuality * 0.4;

    // Short domains flip well
    if (metrics.length <= 8) score += 15;
    else if (metrics.length <= 12) score += 5;

    // .com is king for flipping
    if (metrics.tld === 'com') score += 10;

    return Math.min(100, Math.round(score));
}

/**
 * Estimate domain market value
 */
function estimateDomainValue(metrics: DomainMetrics, overallScore: number, nameQuality: number): number {
    // Base value from score
    let value = overallScore * 10; // $0-1000 base

    // Premium name multiplier
    if (nameQuality >= 80) value *= 3;
    else if (nameQuality >= 60) value *= 1.5;

    // Authority multiplier
    const authority = metrics.domainRating || metrics.domainAuthority || 10;
    if (authority >= 50) value *= 4;
    else if (authority >= 30) value *= 2;
    else if (authority >= 20) value *= 1.3;

    // TLD multiplier
    if (metrics.tld === 'com') value *= 1.5;
    else if (metrics.tld === 'io' || metrics.tld === 'ai') value *= 1.3;

    // Cap at reasonable range
    return Math.min(10000, Math.max(10, Math.round(value)));
}

/**
 * Estimate monthly revenue potential
 */
function estimateMonthlyRevenue(metrics: DomainMetrics, overallScore: number): number {
    // Very rough estimate based on authority and score
    const authority = metrics.domainRating || metrics.domainAuthority || 10;

    // Higher authority = more organic traffic potential
    // Assume $0.50 RPM for AdSense, 1% CTR
    const estimatedTraffic = authority * 50; // Very rough
    const estimatedRPM = 3; // $3 per 1000 pageviews

    return Math.round((estimatedTraffic * estimatedRPM) / 1000 * 30);
}

/**
 * Wayback Machine data structure
 */
export interface WaybackData {
    hasHistory: boolean;
    firstCaptureDate?: string;
    lastCaptureDate?: string;
    totalCaptures?: number;
    wasAdult?: boolean;
    wasCasino?: boolean;
    wasSpam?: boolean;
    wasPBN?: boolean;
    hadSpam?: boolean;
    sampleContent?: string;
}

/**
 * Additional checks structure (for future integrations)
 */
export interface AdditionalChecks {
    spamzillaScore?: number;
    mozData?: {
        da: number;
        pa: number;
        spamScore: number;
    };
    ahrefsData?: {
        dr: number;
        organicTraffic: number;
        backlinks: number;
    };
}

/**
 * Parse domain into parts
 */
export function parseDomain(domain: string): { name: string; tld: string; length: number } {
    const parts = domain.split('.');
    const tld = parts.pop() || '';
    const name = parts.join('.');

    return {
        name,
        tld,
        length: name.length
    };
}

/**
 * Quick domain quality check (for bulk filtering)
 */
export function quickQualityCheck(domain: string): { pass: boolean; reason?: string } {
    // Check for spam patterns
    for (const pattern of SPAM_PATTERNS) {
        if (pattern.test(domain)) {
            return { pass: false, reason: 'Spam pattern detected' };
        }
    }

    // Check length
    const { length, tld } = parseDomain(domain);
    if (length > 30) {
        return { pass: false, reason: 'Too long' };
    }

    // Check TLD
    if (!PREMIUM_TLDS.includes(`.${tld}`) && !GOOD_TLDS.includes(`.${tld}`)) {
        return { pass: false, reason: 'Poor TLD' };
    }

    // Too many hyphens
    if ((domain.match(/-/g) || []).length > 1) {
        return { pass: false, reason: 'Too many hyphens' };
    }

    // Too many numbers
    if ((domain.match(/\d/g) || []).length > 4) {
        return { pass: false, reason: 'Too many numbers' };
    }

    return { pass: true };
}
