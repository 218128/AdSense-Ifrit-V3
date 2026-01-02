/**
 * AdSense Compliance Checker
 * FSD: features/campaigns/lib/adsenseCompliance.ts
 * 
 * Ensures content is AdSense-ready:
 * - Policy compliance checks
 * - Content quality validation
 * - Affiliate disclosure injection
 * - Prohibited topic detection
 */

// ============================================================================
// AdSense Policy Definitions
// ============================================================================

/**
 * Topics that violate AdSense policies
 */
const PROHIBITED_TOPICS = [
    // Adult content
    'adult', 'explicit', 'nsfw', 'pornograph',
    // Violence
    'gore', 'graphic violence', 'torture',
    // Dangerous products
    'drugs', 'narcotics', 'tobacco', 'weapons', 'ammunition', 'explosives',
    // Gambling (unlicensed)
    'online casino', 'sports betting', 'poker',
    // Hacking
    'hacking', 'crack software', 'pirated',
    // Hate speech
    'hate speech', 'discrimination', 'racist',
    // Deceptive
    'miracle cure', 'get rich quick', 'guaranteed income',
];

/**
 * Terms that require careful handling
 */
const SENSITIVE_TOPICS = [
    'health', 'medical', 'disease', 'treatment', 'diagnosis',
    'finance', 'investment', 'stocks', 'cryptocurrency',
    'legal', 'lawsuit', 'attorney',
    'political', 'election', 'controversial',
];

// ============================================================================
// Compliance Check Results
// ============================================================================

export interface ComplianceResult {
    isCompliant: boolean;
    score: number;                    // 0-100
    issues: ComplianceIssue[];
    warnings: string[];
    recommendations: string[];
}

export interface ComplianceIssue {
    severity: 'critical' | 'warning' | 'info';
    category: string;
    description: string;
    location?: string;              // Where in content
}

// ============================================================================
// Compliance Checking
// ============================================================================

/**
 * Check content for AdSense compliance
 */
export function checkCompliance(content: string, options: ComplianceOptions = {}): ComplianceResult {
    const opts = {
        checkProhibitedTopics: true,
        checkMinWordCount: true,
        checkAffiliateDisclosure: true,
        minWordCount: 500,
        ...options,
    };

    const issues: ComplianceIssue[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const lowerContent = content.toLowerCase();

    // Check 1: Prohibited topics
    if (opts.checkProhibitedTopics) {
        for (const topic of PROHIBITED_TOPICS) {
            if (lowerContent.includes(topic)) {
                issues.push({
                    severity: 'critical',
                    category: 'Prohibited Content',
                    description: `Contains prohibited topic: "${topic}"`,
                });
                score -= 30;
            }
        }
    }

    // Check 2: Sensitive topics (need YMYL handling)
    for (const topic of SENSITIVE_TOPICS) {
        if (lowerContent.includes(topic)) {
            warnings.push(`Contains sensitive topic "${topic}" - ensure E-E-A-T signals are strong`);
            recommendations.push(`Add expert credentials for ${topic}-related content`);
        }
    }

    // Check 3: Minimum word count
    if (opts.checkMinWordCount && wordCount < opts.minWordCount) {
        issues.push({
            severity: 'warning',
            category: 'Content Quality',
            description: `Content is ${wordCount} words, below recommended ${opts.minWordCount} for AdSense approval`,
        });
        score -= 15;
    }

    // Check 4: Affiliate disclosure (if contains affiliate links)
    const hasAffiliateLinks = /\baffiliate\b|sponsored|partner\s*link/i.test(content);
    if (hasAffiliateLinks && opts.checkAffiliateDisclosure) {
        const hasDisclosure = /disclosure|disclaimer|commission|earn.*link/i.test(content);
        if (!hasDisclosure) {
            issues.push({
                severity: 'warning',
                category: 'Disclosure',
                description: 'Contains affiliate content without visible disclosure',
            });
            score -= 10;
            recommendations.push('Add affiliate disclosure at the top of the article');
        }
    }

    // Check 5: Privacy policy mention (for sites, not individual posts)
    if (opts.checkPrivacyPolicy) {
        const hasPrivacyMention = /privacy\s*policy|data\s*collection/i.test(content);
        if (!hasPrivacyMention) {
            recommendations.push('Ensure site has linked Privacy Policy');
        }
    }

    // Check 6: Thin content indicators
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 50 && !p.startsWith('#'));
    if (paragraphs.length < 3) {
        issues.push({
            severity: 'warning',
            category: 'Content Quality',
            description: 'Content may be considered "thin" - add more substantial paragraphs',
        });
        score -= 10;
    }

    // Check 7: Duplicate content patterns
    if (hasDuplicatePatterns(content)) {
        issues.push({
            severity: 'warning',
            category: 'Content Quality',
            description: 'Content has repetitive patterns that may trigger duplicate detection',
        });
        score -= 10;
    }

    return {
        isCompliant: issues.filter(i => i.severity === 'critical').length === 0,
        score: Math.max(0, score),
        issues,
        warnings,
        recommendations,
    };
}

export interface ComplianceOptions {
    checkProhibitedTopics?: boolean;
    checkMinWordCount?: boolean;
    checkAffiliateDisclosure?: boolean;
    checkPrivacyPolicy?: boolean;
    minWordCount?: number;
}

// ============================================================================
// Content Enhancement for Compliance
// ============================================================================

/**
 * Affiliate disclosure templates
 */
export const AFFILIATE_DISCLOSURES = {
    short: `*This article contains affiliate links. We may earn a commission at no extra cost to you.*`,

    medium: `**Disclosure:** This post contains affiliate links. If you make a purchase through these links, we may earn a small commission at no additional cost to you. This helps support our work and allows us to continue creating helpful content.`,

    full: `**Affiliate Disclosure**

This page contains affiliate links to products and services we recommend. If you purchase through these links, we may receive a small commission at no extra cost to you. 

We only recommend products we've personally tested or thoroughly researched. Our opinions are our own and not influenced by any partnerships.

For more information, see our [privacy policy](/privacy) and [disclosure page](/disclosure).`,
};

/**
 * Inject affiliate disclosure if needed
 */
export function injectAffiliateDisclosure(
    content: string,
    style: 'short' | 'medium' | 'full' = 'medium'
): string {
    const disclosure = AFFILIATE_DISCLOSURES[style];

    // Check if disclosure already exists
    if (/disclosure|disclaimer/i.test(content.slice(0, 500))) {
        return content;
    }

    // Insert after title
    return content.replace(/^(#\s+.+\n+)/, `$1${disclosure}\n\n`);
}

// ============================================================================
// Quality Score for AdSense Approval
// ============================================================================

export interface QualityScore {
    overall: number;               // 0-100
    contentDepth: number;          // Word count, sections
    originality: number;           // Estimated uniqueness
    engagement: number;            // Questions, calls to action
    formatting: number;            // Headers, lists, images
    eeat: number;                  // Author signals, expertise
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

/**
 * Calculate quality score for AdSense approval readiness
 */
export function calculateQualityScore(content: string): QualityScore {
    const wordCount = content.split(/\s+/).length;
    const headers = (content.match(/^#{1,3}\s+/gm) || []).length;
    const lists = (content.match(/^[-*]\s+/gm) || []).length;
    const questions = (content.match(/\?/g) || []).length;
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 50).length;

    // Content Depth (word count + structure)
    let contentDepth = Math.min(100, (wordCount / 2000) * 60 + (headers / 5) * 20 + (paragraphs / 10) * 20);

    // Originality (simplified - real check would use external API)
    // Check for unique phrases, personal anecdotes
    const personalPhrases = (content.match(/\b(I|my|we|our)\b/gi) || []).length;
    const originality = Math.min(100, 50 + personalPhrases * 2);

    // Engagement
    const engagement = Math.min(100, questions * 5 + (lists / 2) * 5);

    // Formatting
    const formatting = Math.min(100, headers * 10 + lists * 2);

    // E-E-A-T signals
    const hasAuthor = /author|by\s+\w+/i.test(content);
    const hasCredentials = /expert|years?\s+(of\s+)?experience|specialist/i.test(content);
    const hasSources = /according\s+to|research\s+shows|study|source/i.test(content);
    const eeat = (hasAuthor ? 30 : 0) + (hasCredentials ? 40 : 0) + (hasSources ? 30 : 0);

    const overall = Math.round(
        contentDepth * 0.3 +
        originality * 0.25 +
        engagement * 0.15 +
        formatting * 0.15 +
        eeat * 0.15
    );

    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (overall >= 80) grade = 'A';
    else if (overall >= 65) grade = 'B';
    else if (overall >= 50) grade = 'C';
    else if (overall >= 35) grade = 'D';
    else grade = 'F';

    return {
        overall,
        contentDepth: Math.round(contentDepth),
        originality: Math.round(originality),
        engagement: Math.round(engagement),
        formatting: Math.round(formatting),
        eeat: Math.round(eeat),
        grade,
    };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check for duplicate/repetitive content patterns
 */
function hasDuplicatePatterns(content: string): boolean {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);

    // Check for repeated sentence structures
    const seen = new Set<string>();
    let duplicates = 0;

    for (const sentence of sentences) {
        // Normalize to check structure
        const normalized = sentence
            .trim()
            .toLowerCase()
            .replace(/\d+/g, 'N')
            .replace(/\b\w{8,}\b/g, 'WORD');

        if (seen.has(normalized)) {
            duplicates++;
        }
        seen.add(normalized);
    }

    // More than 10% duplicate patterns is concerning
    return duplicates / sentences.length > 0.1;
}

// ============================================================================
// Pre-flight Check for Publishing
// ============================================================================

export interface PrePublishCheck {
    ready: boolean;
    blockers: string[];
    warnings: string[];
    score: number;
}

/**
 * Pre-publish check before sending to WordPress
 */
export function prePublishCheck(content: string): PrePublishCheck {
    const compliance = checkCompliance(content);
    const quality = calculateQualityScore(content);

    const blockers: string[] = [];
    const warnings: string[] = [];

    // Critical blockers
    if (!compliance.isCompliant) {
        blockers.push('Content violates AdSense policies');
    }
    if (quality.overall < 40) {
        blockers.push('Content quality too low for AdSense approval');
    }
    if (content.split(/\s+/).length < 300) {
        blockers.push('Content too short - minimum 300 words recommended');
    }

    // Warnings
    warnings.push(...compliance.warnings);
    if (quality.eeat < 30) {
        warnings.push('Add author credentials for better E-E-A-T signals');
    }
    if (quality.formatting < 40) {
        warnings.push('Improve formatting with more headers and lists');
    }

    return {
        ready: blockers.length === 0,
        blockers,
        warnings,
        score: Math.round((compliance.score + quality.overall) / 2),
    };
}
