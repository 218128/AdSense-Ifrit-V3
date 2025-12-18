/**
 * Spam & Quality Checker
 * 
 * Checks domain for spam indicators, blacklists, and quality signals.
 * Uses free DNS and basic checks, with hooks for Spamzilla integration.
 */

import { createLogger } from '@/lib/utils/logger';

const spamLogger = createLogger('SpamChecker');

// Spam blacklist DNS zones (free to query)
const DNS_BLACKLISTS = [
    'zen.spamhaus.org',
    'bl.spamcop.net',
    'dnsbl.sorbs.net',
    'b.barracudacentral.org',
];

export interface SpamCheckResult {
    isSpammy: boolean;
    spamScore: number;  // 0-100, higher = more spammy
    issues: SpamIssue[];
    passed: SpamCheck[];
    blacklisted: boolean;
    blacklistDetails?: string[];
}

export interface SpamIssue {
    type: 'blacklist' | 'pattern' | 'suspicious-tld' | 'keyword-spam' | 'age' | 'content';
    severity: 'low' | 'medium' | 'high';
    description: string;
}

export interface SpamCheck {
    check: string;
    passed: boolean;
}

// Suspicious TLDs often used for spam
const SUSPICIOUS_TLDS = [
    'xyz', 'top', 'wang', 'win', 'loan', 'work', 'party',
    'gq', 'cf', 'tk', 'ml', 'ga',  // Free TLDs
    'click', 'link', 'download', 'stream',
];

// Keyword patterns that raise spam flags
const SPAM_KEYWORD_PATTERNS = [
    // Pills/Pharma
    { pattern: /viagra|cialis|levitra/i, score: 50, desc: 'Pharma spam keywords' },
    { pattern: /pharmacy|prescription|pills/i, score: 30, desc: 'Pharma-related' },

    // Finance spam
    { pattern: /payday|quickloan|fastcash/i, score: 40, desc: 'Predatory loan keywords' },
    { pattern: /cryptogain|bitcoinprofit/i, score: 35, desc: 'Crypto scam keywords' },

    // Gambling
    { pattern: /casino|poker|betting/i, score: 45, desc: 'Gambling keywords' },

    // Adult
    { pattern: /xxx|porn|adult|escort/i, score: 50, desc: 'Adult content keywords' },

    // General spam
    { pattern: /free.*iphone|congratulation|winner/i, score: 40, desc: 'Scam patterns' },
    { pattern: /buy.*cheap|cheap.*buy|discount.*sale/i, score: 25, desc: 'Spammy commercial' },

    // SEO spam
    { pattern: /seolink|buylinks|pbn/i, score: 45, desc: 'Link spam keywords' },
];

// Structural patterns that indicate quality issues
const STRUCTURAL_ISSUES = [
    { pattern: /^\d+-/, score: 15, desc: 'Starts with numbers' },
    { pattern: /-{2,}/, score: 20, desc: 'Multiple consecutive hyphens' },
    { pattern: /(\w)\1{3,}/, score: 25, desc: 'Repeated characters' },
    { pattern: /^\d{4,}/, score: 20, desc: 'Too many leading numbers' },
    { pattern: /.{25,}\./, score: 15, desc: 'Very long domain name' },
];

/**
 * Check domain against various spam indicators
 */
export async function checkDomainSpam(domain: string): Promise<SpamCheckResult> {
    const issues: SpamIssue[] = [];
    const passed: SpamCheck[] = [];
    let spamScore = 0;

    // 1. Check TLD
    const tld = domain.split('.').pop()?.toLowerCase() || '';
    if (SUSPICIOUS_TLDS.includes(tld)) {
        issues.push({
            type: 'suspicious-tld',
            severity: 'medium',
            description: `Suspicious TLD: .${tld}`
        });
        spamScore += 20;
    } else {
        passed.push({ check: 'TLD reputation', passed: true });
    }

    // 2. Check keyword patterns
    for (const { pattern, score, desc } of SPAM_KEYWORD_PATTERNS) {
        if (pattern.test(domain)) {
            issues.push({
                type: 'keyword-spam',
                severity: score >= 40 ? 'high' : 'medium',
                description: desc
            });
            spamScore += score;
        }
    }

    if (!issues.some(i => i.type === 'keyword-spam')) {
        passed.push({ check: 'No spam keywords', passed: true });
    }

    // 3. Check structural issues
    const domainWithoutTld = domain.replace(/\.[^.]+$/, '');
    for (const { pattern, score, desc } of STRUCTURAL_ISSUES) {
        if (pattern.test(domainWithoutTld)) {
            issues.push({
                type: 'pattern',
                severity: 'low',
                description: desc
            });
            spamScore += score;
        }
    }

    if (!issues.some(i => i.type === 'pattern')) {
        passed.push({ check: 'Clean domain structure', passed: true });
    }

    // 4. Check against DNS blacklists (via server-side API)
    let blacklisted = false;
    const blacklistDetails: string[] = [];

    try {
        // Call the server-side blacklist API
        const response = await fetch(`/api/domains/blacklist?domain=${encodeURIComponent(domain)}`);
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.result) {
                blacklisted = data.result.listed;
                if (blacklisted) {
                    for (const detail of data.result.details) {
                        if (detail.listed) {
                            blacklistDetails.push(`${detail.name} (${detail.returnCode})`);
                            issues.push({
                                type: 'blacklist',
                                severity: 'high',
                                description: `Listed on ${detail.name}`
                            });
                        }
                    }
                    spamScore += 50; // Major penalty for blacklisted domains
                }
            }
        }
    } catch (error) {
        spamLogger.warn(`Blacklist check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    passed.push({ check: 'DNS blacklist check', passed: !blacklisted });

    // 5. Calculate final score
    spamScore = Math.min(100, spamScore);

    return {
        isSpammy: spamScore >= 40,
        spamScore,
        issues,
        passed,
        blacklisted,
        blacklistDetails: blacklistDetails.length > 0 ? blacklistDetails : undefined
    };
}

/**
 * Quick spam check (just pattern matching, no DNS)
 */
export function quickSpamCheck(domain: string): {
    isSpammy: boolean;
    score: number;
    reasons: string[];
} {
    let score = 0;
    const reasons: string[] = [];

    // TLD check
    const tld = domain.split('.').pop()?.toLowerCase() || '';
    if (SUSPICIOUS_TLDS.includes(tld)) {
        score += 20;
        reasons.push(`Suspicious TLD (.${tld})`);
    }

    // Keyword check
    for (const { pattern, score: patternScore, desc } of SPAM_KEYWORD_PATTERNS) {
        if (pattern.test(domain)) {
            score += patternScore;
            reasons.push(desc);
            break;  // Only count first match for quick check
        }
    }

    // Structure check
    for (const { pattern, score: patternScore, desc } of STRUCTURAL_ISSUES) {
        if (pattern.test(domain)) {
            score += patternScore;
            reasons.push(desc);
        }
    }

    return {
        isSpammy: score >= 40,
        score: Math.min(100, score),
        reasons
    };
}

/**
 * Check if domain looks trustworthy based on patterns
 */
export function domainLooksTrustworthy(domain: string): {
    trustworthy: boolean;
    score: number;  // 0-100
    positives: string[];
    negatives: string[];
} {
    let score = 50;  // Start neutral
    const positives: string[] = [];
    const negatives: string[] = [];

    const parts = domain.split('.');
    const tld = parts.pop() || '';
    const name = parts.join('.');

    // Good TLD
    if (['com', 'org', 'net'].includes(tld)) {
        score += 15;
        positives.push('Premium TLD');
    } else if (['io', 'co', 'ai', 'dev', 'app'].includes(tld)) {
        score += 10;
        positives.push('Modern TLD');
    } else if (SUSPICIOUS_TLDS.includes(tld)) {
        score -= 20;
        negatives.push('Low-trust TLD');
    }

    // Length
    if (name.length <= 8) {
        score += 15;
        positives.push('Short domain');
    } else if (name.length <= 12) {
        score += 5;
    } else if (name.length > 20) {
        score -= 15;
        negatives.push('Very long domain');
    }

    // No numbers
    if (!/\d/.test(name)) {
        score += 10;
        positives.push('No numbers');
    } else if (/\d{4,}/.test(name)) {
        score -= 10;
        negatives.push('Many numbers');
    }

    // No hyphens
    if (!name.includes('-')) {
        score += 10;
        positives.push('No hyphens');
    } else if ((name.match(/-/g) || []).length > 1) {
        score -= 15;
        negatives.push('Multiple hyphens');
    }

    // Real word detection (basic)
    const commonWords = ['app', 'tech', 'hub', 'pro', 'guide', 'help', 'how', 'best', 'top', 'tips'];
    for (const word of commonWords) {
        if (name.includes(word)) {
            score += 5;
            positives.push('Contains recognizable word');
            break;
        }
    }

    return {
        trustworthy: score >= 60,
        score: Math.max(0, Math.min(100, score)),
        positives,
        negatives
    };
}

/**
 * Spamzilla integration placeholder
 * Can be extended later with actual API integration
 */
export interface SpamzillaData {
    dr: number;
    tf: number;
    cf: number;
    backlinks: number;
    referringDomains: number;
    spamScore: number;
    organicTraffic: number;
    topicalTrust: Record<string, number>;
}

export async function fetchSpamzillaData(domain: string, apiKey?: string): Promise<SpamzillaData | null> {
    if (!apiKey) {
        // Return null if no API key - user can add later
        return null;
    }

    // Placeholder for Spamzilla API integration
    // API docs: https://spamzilla.io/api
    try {
        // const response = await fetch(`https://api.spamzilla.io/v1/domain/${domain}`, {
        //     headers: { 'Authorization': `Bearer ${apiKey}` }
        // });
        // return await response.json();

        return null;  // Not implemented yet
    } catch (error) {
        spamLogger.warn(`Spamzilla API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return null;
    }
}
