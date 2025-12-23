/**
 * Domain API Functions
 * 
 * Centralized API calls for domain-related operations.
 * Separates HTTP logic from UI components.
 */

import type {
    DomainItem,
    ParseResult,
    FreeSearchResponse,
    ProfileGenerateResponse,
    AnalysisResult
} from './types';

// ============ DOMAIN IMPORT ============

/**
 * Parse domains from text input
 */
export async function parseDomains(text: string): Promise<ParseResult> {
    const response = await fetch('/api/domains/free-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parse', domains: text }),
    });
    return response.json();
}

/**
 * Fetch domains from free sources (expiredomains.io)
 */
export async function fetchFreeDomains(keywords?: string): Promise<FreeSearchResponse> {
    const params = new URLSearchParams();
    if (keywords?.trim()) {
        params.set('keywords', keywords);
    }
    const response = await fetch(`/api/domains/free-search?${params.toString()}`);
    return response.json();
}

/**
 * Fetch domains from premium API (Spamzilla)
 */
export async function fetchPremiumDomains(apiKey: string, keywords?: string): Promise<FreeSearchResponse> {
    const params = new URLSearchParams();
    if (keywords?.trim()) {
        params.set('keywords', keywords);
    }
    const response = await fetch(`/api/domains/search?${params.toString()}`, {
        headers: {
            'x-spamzilla-key': apiKey,
        }
    });
    return response.json();
}

// ============ DOMAIN ANALYSIS ============

/**
 * Analyze a domain for acquisition potential
 */
export async function analyzeDomain(domain: string, targetNiche?: string): Promise<AnalysisResult> {
    const response = await fetch('/api/domains/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            domain: domain.trim(),
            targetNiche: targetNiche || undefined,
        }),
    });
    return response.json();
}

/**
 * Enrich domains with Spamzilla data
 */
export async function enrichDomains(domains: string[], apiKey: string): Promise<{
    success: boolean;
    domains?: DomainItem[];
    error?: string;
}> {
    const response = await fetch('/api/domains/enrich', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-spamzilla-key': apiKey,
        },
        body: JSON.stringify({ domains }),
    });
    return response.json();
}

// ============ DOMAIN PROFILE ============

/**
 * Generate keyword profile for a domain
 */
export async function generateProfile(
    domain: string,
    spamzillaData?: {
        trustFlow?: number;
        citationFlow?: number;
        domainAuthority?: number;
        age?: number;
        szScore?: number;
    },
    apiKey?: string
): Promise<ProfileGenerateResponse> {
    const response = await fetch('/api/domain-profiles/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            domain,
            spamzillaData,
            saveProfile: false,
            apiKey
        })
    });
    return response.json();
}

/**
 * Save a domain profile
 */
export async function saveProfile(profile: {
    domain: string;
    niche: string;
    primaryKeywords: string[];
    secondaryKeywords: string[];
    questionKeywords: string[];
    suggestedTopics: string[];
}): Promise<{ success: boolean; error?: string }> {
    const response = await fetch('/api/domain-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...profile,
            researchedAt: Date.now(),
            notes: 'Auto-generated from domain name analysis'
        })
    });
    return response.json();
}

// ============ BLACKLIST CHECK ============

/**
 * Check if a domain is blacklisted
 */
export async function checkBlacklist(domain: string): Promise<{
    success: boolean;
    blacklisted: boolean;
    lists?: string[];
    error?: string;
}> {
    const response = await fetch('/api/domains/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
    });
    return response.json();
}
