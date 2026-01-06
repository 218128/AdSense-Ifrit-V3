/**
 * Citation Validator
 * FSD: lib/contentQuality/citationValidator.ts
 * 
 * Extracts and validates citations from content,
 * scoring source quality for E-E-A-T Expertise dimension.
 */

import type {
    SourceCitation,
    CitationAnalysis,
    SourceQualityTier
} from './types';

// ============================================================================
// Domain Authority Lists
// ============================================================================

/**
 * Authoritative domains (.gov, .edu, major publications)
 */
const AUTHORITATIVE_DOMAINS = [
    // Government
    '.gov', '.gov.uk', '.gov.au', '.gov.ca',
    // Education
    '.edu', '.ac.uk', '.edu.au',
    // Major authorities
    'who.int', 'cdc.gov', 'nih.gov', 'fda.gov',
    'nature.com', 'science.org', 'ncbi.nlm.nih.gov',
    'harvard.edu', 'stanford.edu', 'mit.edu', 'oxford.ac.uk',
];

/**
 * Reputable domains (major publications, industry leaders)
 */
const REPUTABLE_DOMAINS = [
    // Major news
    'nytimes.com', 'washingtonpost.com', 'bbc.com', 'reuters.com',
    'theguardian.com', 'bloomberg.com', 'forbes.com', 'wsj.com',
    // Tech
    'techcrunch.com', 'wired.com', 'theverge.com', 'arstechnica.com',
    'zdnet.com', 'cnet.com',
    // Reference
    'wikipedia.org', 'britannica.com', 'investopedia.com',
    // Major brands
    'google.com', 'microsoft.com', 'apple.com', 'amazon.com',
    'github.com', 'stackoverflow.com',
];

/**
 * Known problematic domains (misinformation, low quality)
 */
const PROBLEMATIC_DOMAINS = [
    // Add known problematic sources
    // This is a simplified list - real implementation should use APIs
];

// ============================================================================
// Citation Extraction
// ============================================================================

/**
 * Extract citations/sources from HTML content
 */
export function extractCitations(html: string): SourceCitation[] {
    const citations: SourceCitation[] = [];
    let idCounter = 0;

    // Extract hyperlinks
    const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
    let match;

    while ((match = linkPattern.exec(html)) !== null) {
        const url = match[1];
        const anchorText = match[2].trim();

        // Skip internal links (# or relative paths without domain)
        if (url.startsWith('#') || (!url.includes('://') && !url.startsWith('//'))) {
            continue;
        }

        // Skip common non-citation links
        if (/\.(jpg|jpeg|png|gif|svg|pdf)$/i.test(url)) {
            continue;
        }

        let domain: string | undefined;
        try {
            const urlObj = new URL(url);
            domain = urlObj.hostname.replace('www.', '');
        } catch {
            // Invalid URL
            continue;
        }

        // Find context (surrounding text)
        const position = match.index;
        const contextStart = Math.max(0, position - 100);
        const contextEnd = Math.min(html.length, position + 200);
        const context = html
            .substring(contextStart, contextEnd)
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        // Determine position in article
        const textBefore = html.substring(0, position).replace(/<[^>]+>/g, '');
        const totalText = html.replace(/<[^>]+>/g, '');
        const relativePosition = textBefore.length / totalText.length;

        let positionLabel: SourceCitation['position'] = 'body';
        if (relativePosition < 0.15) positionLabel = 'intro';
        else if (relativePosition > 0.85) positionLabel = 'conclusion';

        citations.push({
            id: `cite_${++idCounter}`,
            text: anchorText,
            url,
            domain,
            anchorText,
            context,
            qualityTier: classifyDomain(domain),
            authorityScore: calculateDomainAuthority(domain),
            verified: true, // URL exists - actual verification needs HTTP check
            position: positionLabel,
        });
    }

    // Also extract non-linked references
    const text = html.replace(/<[^>]+>/g, ' ');
    const referencePatterns = [
        /according to ([^,.\n]+)/gi,
        /cited by ([^,.\n]+)/gi,
        /research (?:from|by) ([^,.\n]+)/gi,
        /study (?:from|by|in) ([^,.\n]+)/gi,
        /source:\s*([^,.\n]+)/gi,
    ];

    for (const pattern of referencePatterns) {
        let refMatch;
        while ((refMatch = pattern.exec(text)) !== null) {
            const sourceName = refMatch[1].trim();

            // Skip if too short or too long
            if (sourceName.length < 3 || sourceName.length > 100) continue;

            // Check if already captured via link
            if (citations.some(c => c.text.toLowerCase().includes(sourceName.toLowerCase()))) {
                continue;
            }

            citations.push({
                id: `cite_${++idCounter}`,
                text: sourceName,
                context: refMatch[0],
                verified: false, // Cannot verify without URL
                verificationError: 'No URL provided',
                position: 'body',
            });
        }
    }

    return citations;
}

// ============================================================================
// Domain Classification
// ============================================================================

/**
 * Classify a domain into quality tiers
 */
export function classifyDomain(domain: string): SourceQualityTier {
    const lowerDomain = domain.toLowerCase();

    // Check authoritative
    if (AUTHORITATIVE_DOMAINS.some(d => lowerDomain.endsWith(d) || lowerDomain === d.replace(/^\./, ''))) {
        return 'authoritative';
    }

    // Check reputable
    if (REPUTABLE_DOMAINS.some(d => lowerDomain === d || lowerDomain.endsWith('.' + d))) {
        return 'reputable';
    }

    // Check problematic
    if (PROBLEMATIC_DOMAINS.some(d => lowerDomain === d || lowerDomain.endsWith('.' + d))) {
        return 'problematic';
    }

    // Use heuristics for unknown domains

    // TLD-based scoring
    if (lowerDomain.endsWith('.edu') || lowerDomain.endsWith('.gov')) {
        return 'authoritative';
    }
    if (lowerDomain.endsWith('.org')) {
        return 'reputable'; // Orgs are generally trustworthy
    }

    // Default to standard
    return 'standard';
}

/**
 * Calculate domain authority score (0-100)
 * Simplified version - real implementation would use Moz/Ahrefs API
 */
export function calculateDomainAuthority(domain: string): number {
    const tier = classifyDomain(domain);

    switch (tier) {
        case 'authoritative':
            return 90 + Math.random() * 10; // 90-100
        case 'reputable':
            return 70 + Math.random() * 15; // 70-85
        case 'standard':
            return 40 + Math.random() * 25; // 40-65
        case 'low':
            return 20 + Math.random() * 15; // 20-35
        case 'problematic':
            return Math.random() * 15;      // 0-15
        default:
            return 50;
    }
}

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Analyze citations and produce summary
 */
export function analyzeCitations(citations: SourceCitation[], wordCount: number): CitationAnalysis {
    const byTier: Record<SourceQualityTier, number> = {
        authoritative: 0,
        reputable: 0,
        standard: 0,
        low: 0,
        problematic: 0,
    };

    let verified = 0;
    let failed = 0;
    let totalAuthority = 0;
    let hasExternal = false;
    let hasInternal = false;

    for (const citation of citations) {
        if (citation.qualityTier) {
            byTier[citation.qualityTier]++;
        }

        if (citation.verified) {
            verified++;
        } else {
            failed++;
        }

        if (citation.authorityScore) {
            totalAuthority += citation.authorityScore;
        }

        if (citation.url) {
            if (citation.url.startsWith('/') || citation.url.includes(citation.domain || '')) {
                hasInternal = true;
            } else {
                hasExternal = true;
            }
        }
    }

    return {
        total: citations.length,
        verified,
        failed,
        byTier,
        density: wordCount > 0 ? (citations.length / wordCount) * 1000 : 0,
        averageAuthority: citations.length > 0
            ? Math.round(totalAuthority / citations.length)
            : 0,
        hasExternalLinks: hasExternal,
        hasInternalLinks: hasInternal,
    };
}

/**
 * Validate citations (check URLs are accessible)
 * Note: This is a stub - actual implementation would make HTTP requests
 */
export async function validateCitations(
    citations: SourceCitation[]
): Promise<SourceCitation[]> {
    // In a real implementation, this would:
    // 1. Make HEAD requests to each URL
    // 2. Check for 200 responses
    // 3. Optionally verify the source contains the cited claim

    // For now, we just return citations as-is with URL-based verification
    return citations.map(citation => ({
        ...citation,
        verified: citation.url ? true : false,
        verificationError: citation.url ? undefined : 'No URL to verify',
    }));
}

/**
 * Get citation quality recommendations
 */
export function getCitationRecommendations(analysis: CitationAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.total < 3) {
        recommendations.push('Add more citations - aim for at least 3-5 authoritative sources');
    }

    if (analysis.byTier.authoritative === 0) {
        recommendations.push('Include at least one authoritative source (.gov, .edu, or major institution)');
    }

    if (analysis.density < 1) {
        recommendations.push('Citation density is low - add more sources throughout the content');
    }

    if (analysis.byTier.problematic > 0) {
        recommendations.push('Remove or replace citations from low-quality or problematic sources');
    }

    if (!analysis.hasExternalLinks) {
        recommendations.push('Add external links to authoritative sources to build credibility');
    }

    if (analysis.averageAuthority < 50) {
        recommendations.push('Improve source quality - cite more authoritative domains');
    }

    return recommendations;
}
