/**
 * Domain Profiler Utilities
 * 
 * Extracted from API route for testability.
 * Contains domain name segmentation and profile generation logic.
 */

// Common words for domain segmentation
const COMMON_WORDS = [
    'access', 'commerce', 'neo', 'splice', 'tech', 'web', 'net', 'cloud',
    'digital', 'smart', 'hub', 'zone', 'pro', 'max', 'plus', 'online',
    'shop', 'store', 'market', 'trade', 'buy', 'sell', 'deal', 'best',
    'top', 'first', 'prime', 'elite', 'super', 'mega', 'ultra', 'hyper',
    'home', 'house', 'land', 'world', 'global', 'local', 'city', 'town',
    'blog', 'news', 'info', 'guide', 'tips', 'help', 'learn', 'how',
    'health', 'fit', 'life', 'style', 'beauty', 'food', 'cook', 'recipe',
    'travel', 'trip', 'tour', 'fly', 'hotel', 'book', 'rent', 'car',
    'money', 'cash', 'pay', 'fund', 'invest', 'save', 'loan', 'credit',
    'game', 'play', 'fun', 'sport', 'team', 'win', 'score', 'bet',
    'photo', 'video', 'music', 'art', 'design', 'create', 'make', 'build',
    'soft', 'ware', 'app', 'code', 'dev', 'data', 'api', 'server',
    'real', 'estate', 'property', 'agent', 'broker',
    'biker', 'hut', 'gator', 'homes', 'lander', 'children', 'museum',
    'fitness', 'cooking', 'recipes', 'outdoor', 'gear', 'tools'
];

/**
 * Segment a domain name into meaningful words
 */
export function segmentDomainName(domain: string): string[] {
    // Remove TLD
    const name = domain.split('.')[0];

    // Handle hyphenated: "my-domain" -> ["my", "domain"]
    if (name.includes('-')) {
        return name.split('-').filter(Boolean);
    }

    // Dictionary-based segmentation for compound words
    const words: string[] = [];
    let remaining = name.toLowerCase();

    while (remaining.length > 0) {
        let found = false;

        // Try longest match first
        for (let len = Math.min(remaining.length, 12); len >= 2; len--) {
            const candidate = remaining.substring(0, len);
            if (COMMON_WORDS.includes(candidate)) {
                words.push(candidate);
                remaining = remaining.substring(len);
                found = true;
                break;
            }
        }

        if (!found) {
            if (remaining.length <= 3) {
                words.push(remaining);
                break;
            } else {
                words.push(remaining.substring(0, 3));
                remaining = remaining.substring(3);
            }
        }
    }

    return words.filter(w => w.length > 1);
}

/**
 * Generate a niche guess based on domain words
 */
export function guessNiche(words: string[]): string {
    const nicheMap: Record<string, string[]> = {
        'E-commerce': ['shop', 'store', 'market', 'commerce', 'buy', 'sell', 'trade', 'deal'],
        'Technology': ['tech', 'app', 'code', 'dev', 'api', 'server', 'digital', 'smart', 'software'],
        'Finance': ['money', 'cash', 'fund', 'invest', 'loan', 'credit', 'pay', 'save', 'finance'],
        'Health & Fitness': ['health', 'fit', 'fitness', 'life', 'style', 'beauty'],
        'Food & Cooking': ['food', 'cook', 'cooking', 'recipe', 'recipes'],
        'Travel': ['travel', 'trip', 'tour', 'fly', 'hotel', 'rent', 'car'],
        'Real Estate': ['real', 'estate', 'property', 'homes', 'house', 'agent', 'broker'],
        'Gaming': ['game', 'play', 'fun', 'sport', 'team', 'win', 'score'],
        'Creative': ['photo', 'video', 'music', 'art', 'design', 'create', 'make', 'build'],
        'Education': ['learn', 'guide', 'tips', 'how', 'help', 'info', 'blog', 'news'],
        'Outdoor': ['outdoor', 'gear', 'biker', 'hut', 'tour', 'trip']
    };

    for (const [niche, keywords] of Object.entries(nicheMap)) {
        if (words.some(w => keywords.includes(w))) {
            return niche;
        }
    }

    return 'General';
}

/**
 * Generate primary keywords from domain words
 */
export function generatePrimaryKeywords(words: string[], niche: string): string[] {
    const base = words.join(' ');
    const keywords = [
        base,
        `best ${base}`,
        `${base} guide`,
        `${base} tips`,
        `top ${base}`
    ];

    // Add niche-specific modifiers
    if (niche.includes('commerce') || niche.includes('Shop')) {
        keywords.push(`${base} reviews`, `buy ${base}`, `cheap ${base}`);
    } else if (niche.includes('Tech')) {
        keywords.push(`${base} software`, `${base} tools`, `${base} app`);
    } else if (niche.includes('Health')) {
        keywords.push(`${base} benefits`, `healthy ${base}`, `${base} routine`);
    }

    return keywords.slice(0, 5);
}

/**
 * Generate question keywords for FAQ content
 */
export function generateQuestionKeywords(words: string[]): string[] {
    const base = words.join(' ');
    return [
        `what is ${base}`,
        `how to ${base}`,
        `why ${base}`,
        `when to ${base}`,
        `where to find ${base}`
    ];
}

/**
 * Generate suggested article topics
 */
export function generateSuggestedTopics(words: string[], niche: string): string[] {
    const base = words.join(' ').charAt(0).toUpperCase() + words.join(' ').slice(1);

    return [
        `Complete Guide to ${base}`,
        `Top 10 ${base} Tips for Beginners`,
        `${base}: What You Need to Know`,
        `How to Get Started with ${base}`,
        `${base} vs Alternatives: Full Comparison`
    ];
}

export interface DomainProfileResult {
    domain: string;
    words: string[];
    niche: string;
    primaryKeywords: string[];
    questionKeywords: string[];
    suggestedTopics: string[];
}

/**
 * Generate a complete domain profile from a domain name
 */
export function generateDomainProfile(domain: string): DomainProfileResult {
    const words = segmentDomainName(domain);
    const niche = guessNiche(words);

    return {
        domain,
        words,
        niche,
        primaryKeywords: generatePrimaryKeywords(words, niche),
        questionKeywords: generateQuestionKeywords(words),
        suggestedTopics: generateSuggestedTopics(words, niche)
    };
}
