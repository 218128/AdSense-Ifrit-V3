/**
 * V4 Prompt Cache Manager (Simplified)
 * 
 * Note: Gemini 2.5+ models have automatic IMPLICIT caching.
 * If your requests share common prefixes, you get automatic cost savings.
 * 
 * This module tracks cache usage locally for statistics display.
 * The actual caching is handled automatically by the Gemini API.
 * 
 * For explicit caching, use the Vertex AI SDK (different from @google/genai).
 */

interface CacheEntry {
    type: 'persona' | 'template' | 'eeat';
    contentHash: string;
    firstUsed: number;
    lastUsed: number;
    hitCount: number;
}

// In-memory cache tracking (persists to localStorage)
const CACHE_STORAGE_KEY = 'ifrit_v4_cache_tracking';

/**
 * Simple hash function for content
 */
function hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

/**
 * Get all tracked caches from storage
 */
export function getActiveCaches(): CacheEntry[] {
    if (typeof window === 'undefined') return [];

    const stored = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!stored) return [];

    try {
        return JSON.parse(stored);
    } catch {
        return [];
    }
}

/**
 * Track cache usage (for implicit caching stats)
 */
export function trackCacheUsage(
    type: CacheEntry['type'],
    content: string
): { contentHash: string; isRepeat: boolean } {
    if (typeof window === 'undefined') {
        return { contentHash: hashContent(content), isRepeat: false };
    }

    const contentHash = hashContent(content);
    const caches = getActiveCaches();

    const existing = caches.find(c => c.type === type && c.contentHash === contentHash);

    if (existing) {
        // Update hit count
        existing.hitCount += 1;
        existing.lastUsed = Date.now();
        localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(caches));
        console.log(`[CacheManager] Cache hit for ${type}: ${contentHash} (${existing.hitCount} hits)`);
        return { contentHash, isRepeat: true };
    }

    // New cache entry
    caches.push({
        type,
        contentHash,
        firstUsed: Date.now(),
        lastUsed: Date.now(),
        hitCount: 1
    });
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(caches));
    console.log(`[CacheManager] New cache tracked for ${type}: ${contentHash}`);

    return { contentHash, isRepeat: false };
}

/**
 * Clear old cache entries (older than 24 hours)
 */
export function clearExpiredCaches(): number {
    if (typeof window === 'undefined') return 0;

    const stored = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!stored) return 0;

    try {
        const caches: CacheEntry[] = JSON.parse(stored);
        const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
        const active = caches.filter(c => c.lastUsed > cutoff);
        const removed = caches.length - active.length;

        localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(active));

        if (removed > 0) {
            console.log(`[CacheManager] Cleared ${removed} old cache entries`);
        }

        return removed;
    } catch {
        return 0;
    }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
    totalCaches: number;
    totalHits: number;
    byType: Record<string, number>;
    estimatedSavings: string;
} {
    const caches = getActiveCaches();

    const byType: Record<string, number> = {};
    let totalHits = 0;

    for (const cache of caches) {
        byType[cache.type] = (byType[cache.type] || 0) + 1;
        totalHits += cache.hitCount - 1; // First use isn't a "hit"
    }

    // Estimate savings: repeated prompts save ~50% on average
    const estimatedSavings = totalHits > 0
        ? `~${Math.round(totalHits * 0.5 * 100)}% potential savings`
        : 'No cache hits yet';

    return {
        totalCaches: caches.length,
        totalHits: Math.max(0, totalHits),
        byType,
        estimatedSavings
    };
}

/**
 * Pre-built cache content for common use cases
 * 
 * TIP: Place these at the START of your prompts to maximize
 * implicit cache hits with Gemini 2.5+ models.
 */
export const CACHE_TEMPLATES = {
    EEAT_GUIDELINES: `You are an AI writing assistant focused on creating content that demonstrates E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness).

EXPERIENCE: Include first-hand experience, personal anecdotes, and real-world examples.
EXPERTISE: Demonstrate deep knowledge, use industry terminology correctly, cite facts accurately.
AUTHORITATIVENESS: Reference authoritative sources, present balanced viewpoints, acknowledge limitations.
TRUSTWORTHINESS: Be accurate, cite sources, use clear language, avoid clickbait or sensationalism.

Always aim for:
- Factual accuracy over claims
- Balanced perspectives
- Clear source attribution
- Professional tone
- User-focused value`,

    SEO_OPTIMIZATION: `You are an SEO optimization assistant. Apply these best practices:

1. TITLE: Include primary keyword naturally, keep under 60 characters
2. META DESCRIPTION: 150-160 characters, include keyword, clear CTA
3. HEADINGS: Use H2/H3 hierarchy, include related keywords
4. CONTENT: 
   - Primary keyword in first 100 words
   - Related keywords throughout (LSI)
   - Answer user intent directly
   - Include FAQ section
5. INTERNAL LINKING: Suggest relevant article connections
6. SCHEMA: Recommend appropriate schema types

Avoid keyword stuffing - prioritize readability.`,

    ARTICLE_STRUCTURE: `You are creating a comprehensive article. Follow this structure:

1. **Frontmatter** (YAML):
   - title, date, description, author

2. **Introduction** (150-200 words):
   - Hook the reader
   - State the problem/topic
   - Preview what they'll learn

3. **Main Content** (multiple H2 sections):
   - Each section 300-500 words
   - Use H3 for subtopics
   - Include examples, data, comparisons

4. **Practical Elements**:
   - Bullet points for lists
   - Tables for comparisons
   - Blockquotes for key insights
   - Code blocks if technical

5. **FAQ Section** (5-8 questions):
   - Common user questions
   - Concise, helpful answers

6. **Conclusion** (100-150 words):
   - Summarize key points
   - Clear call-to-action
   - Encourage engagement`
};
