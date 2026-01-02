/**
 * Keyword Rotation
 * FSD: features/campaigns/lib/keywordRotation.ts
 * 
 * Round-robin and weighted keyword selection for campaigns.
 * Ensures even distribution across keywords.
 */

// ============================================================================
// Types
// ============================================================================

export interface Keyword {
    id: string;
    text: string;
    weight: number;     // Priority weight (higher = more frequent)
    usage: number;      // Times used
    lastUsed?: Date;
    enabled: boolean;
}

export interface KeywordRotator {
    id: string;
    name: string;
    keywords: Keyword[];
    mode: RotationMode;
    state: RotatorState;
}

export type RotationMode =
    | 'sequential'    // Round-robin in order
    | 'random'        // Random selection
    | 'weighted'      // Weight-based probability
    | 'least-used'    // Pick least used keyword
    | 'exhaust-first' // Use each keyword once before repeating

export interface RotatorState {
    currentIndex: number;
    exhaustedKeywords: string[];  // For exhaust-first mode
    history: { keyword: string; timestamp: Date }[];
}

export interface RotationResult {
    keyword: Keyword;
    reason: string;
    nextKeyword?: Keyword;
}

// ============================================================================
// Core Rotator
// ============================================================================

/**
 * Create a new keyword rotator
 */
export function createRotator(
    name: string,
    keywords: string[],
    mode: RotationMode = 'sequential'
): KeywordRotator {
    return {
        id: `rotator_${Date.now()}`,
        name,
        keywords: keywords.map((text, i) => ({
            id: `kw_${i}`,
            text,
            weight: 1,
            usage: 0,
            enabled: true,
        })),
        mode,
        state: {
            currentIndex: 0,
            exhaustedKeywords: [],
            history: [],
        },
    };
}

/**
 * Get next keyword from rotator
 */
export function getNextKeyword(rotator: KeywordRotator): RotationResult | null {
    const enabledKeywords = rotator.keywords.filter(k => k.enabled);

    if (enabledKeywords.length === 0) {
        return null;
    }

    let selected: Keyword;
    let reason: string;

    switch (rotator.mode) {
        case 'sequential':
            ({ selected, reason } = selectSequential(rotator, enabledKeywords));
            break;
        case 'random':
            ({ selected, reason } = selectRandom(enabledKeywords));
            break;
        case 'weighted':
            ({ selected, reason } = selectWeighted(enabledKeywords));
            break;
        case 'least-used':
            ({ selected, reason } = selectLeastUsed(enabledKeywords));
            break;
        case 'exhaust-first':
            ({ selected, reason } = selectExhaustFirst(rotator, enabledKeywords));
            break;
        default:
            ({ selected, reason } = selectSequential(rotator, enabledKeywords));
    }

    // Update state
    selected.usage++;
    selected.lastUsed = new Date();
    rotator.state.history.push({
        keyword: selected.text,
        timestamp: new Date(),
    });

    // Keep history trimmed
    if (rotator.state.history.length > 1000) {
        rotator.state.history = rotator.state.history.slice(-500);
    }

    // Peek at next keyword
    const nextKeyword = peekNextKeyword(rotator);

    return { keyword: selected, reason, nextKeyword };
}

/**
 * Peek at what the next keyword would be without selecting it
 */
export function peekNextKeyword(rotator: KeywordRotator): Keyword | undefined {
    const enabledKeywords = rotator.keywords.filter(k => k.enabled);
    if (enabledKeywords.length === 0) return undefined;

    switch (rotator.mode) {
        case 'sequential': {
            const nextIndex = (rotator.state.currentIndex + 1) % enabledKeywords.length;
            return enabledKeywords[nextIndex];
        }
        case 'least-used':
            return [...enabledKeywords].sort((a, b) => a.usage - b.usage)[0];
        default:
            return undefined; // Cannot predict random/weighted
    }
}

// ============================================================================
// Selection Strategies
// ============================================================================

function selectSequential(
    rotator: KeywordRotator,
    keywords: Keyword[]
): { selected: Keyword; reason: string } {
    const index = rotator.state.currentIndex % keywords.length;
    rotator.state.currentIndex = (index + 1) % keywords.length;

    return {
        selected: keywords[index],
        reason: `Sequential: position ${index + 1} of ${keywords.length}`,
    };
}

function selectRandom(keywords: Keyword[]): { selected: Keyword; reason: string } {
    const index = Math.floor(Math.random() * keywords.length);
    return {
        selected: keywords[index],
        reason: 'Random selection',
    };
}

function selectWeighted(keywords: Keyword[]): { selected: Keyword; reason: string } {
    const totalWeight = keywords.reduce((sum, k) => sum + k.weight, 0);
    let random = Math.random() * totalWeight;

    for (const keyword of keywords) {
        random -= keyword.weight;
        if (random <= 0) {
            return {
                selected: keyword,
                reason: `Weighted: ${keyword.weight}/${totalWeight} (${Math.round(keyword.weight / totalWeight * 100)}%)`,
            };
        }
    }

    return {
        selected: keywords[keywords.length - 1],
        reason: 'Weighted fallback',
    };
}

function selectLeastUsed(keywords: Keyword[]): { selected: Keyword; reason: string } {
    const sorted = [...keywords].sort((a, b) => a.usage - b.usage);
    const selected = sorted[0];

    return {
        selected,
        reason: `Least used: ${selected.usage} times (lowest among ${keywords.length})`,
    };
}

function selectExhaustFirst(
    rotator: KeywordRotator,
    keywords: Keyword[]
): { selected: Keyword; reason: string } {
    // Find keywords not yet exhausted in this cycle
    const available = keywords.filter(
        k => !rotator.state.exhaustedKeywords.includes(k.id)
    );

    if (available.length === 0) {
        // Reset cycle
        rotator.state.exhaustedKeywords = [];
        return selectExhaustFirst(rotator, keywords);
    }

    const index = Math.floor(Math.random() * available.length);
    const selected = available[index];
    rotator.state.exhaustedKeywords.push(selected.id);

    return {
        selected,
        reason: `Exhaust-first: ${keywords.length - available.length + 1} of ${keywords.length} in cycle`,
    };
}

// ============================================================================
// Rotator Management
// ============================================================================

/**
 * Add keyword to rotator
 */
export function addKeyword(rotator: KeywordRotator, text: string, weight = 1): Keyword {
    const keyword: Keyword = {
        id: `kw_${Date.now()}`,
        text,
        weight,
        usage: 0,
        enabled: true,
    };
    rotator.keywords.push(keyword);
    return keyword;
}

/**
 * Remove keyword from rotator
 */
export function removeKeyword(rotator: KeywordRotator, keywordId: string): boolean {
    const index = rotator.keywords.findIndex(k => k.id === keywordId);
    if (index >= 0) {
        rotator.keywords.splice(index, 1);
        return true;
    }
    return false;
}

/**
 * Update keyword weight
 */
export function setKeywordWeight(
    rotator: KeywordRotator,
    keywordId: string,
    weight: number
): boolean {
    const keyword = rotator.keywords.find(k => k.id === keywordId);
    if (keyword) {
        keyword.weight = Math.max(0, weight);
        return true;
    }
    return false;
}

/**
 * Enable/disable keyword
 */
export function toggleKeyword(
    rotator: KeywordRotator,
    keywordId: string,
    enabled?: boolean
): boolean {
    const keyword = rotator.keywords.find(k => k.id === keywordId);
    if (keyword) {
        keyword.enabled = enabled ?? !keyword.enabled;
        return true;
    }
    return false;
}

/**
 * Reset rotator state
 */
export function resetRotator(rotator: KeywordRotator): void {
    rotator.state = {
        currentIndex: 0,
        exhaustedKeywords: [],
        history: [],
    };
    for (const keyword of rotator.keywords) {
        keyword.usage = 0;
        keyword.lastUsed = undefined;
    }
}

/**
 * Get usage statistics
 */
export function getRotatorStats(rotator: KeywordRotator): {
    totalUsage: number;
    distribution: Record<string, number>;
    leastUsed: Keyword | undefined;
    mostUsed: Keyword | undefined;
} {
    const totalUsage = rotator.keywords.reduce((sum, k) => sum + k.usage, 0);
    const distribution: Record<string, number> = {};

    for (const keyword of rotator.keywords) {
        distribution[keyword.text] = keyword.usage;
    }

    const sorted = [...rotator.keywords].sort((a, b) => a.usage - b.usage);

    return {
        totalUsage,
        distribution,
        leastUsed: sorted[0],
        mostUsed: sorted[sorted.length - 1],
    };
}
