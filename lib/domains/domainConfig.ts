/**
 * Domain Configuration System
 * 
 * Manages multiple blog domains from a single Ifrit instance.
 * Each domain can have its own AdSense configuration and niche focus.
 */

export interface AdsenseConfig {
    publisherId: string;
    leaderboardSlot?: string;
    articleSlot?: string;
    multiplexSlot?: string;
}

export interface DomainConfig {
    id: string;
    name: string;                    // Display name e.g., "Finance Blog"
    url: string;                     // e.g., "https://financeinsights.com"
    niche: string;                   // e.g., "Personal Finance"
    adsenseConfig: AdsenseConfig;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface DomainsState {
    domains: DomainConfig[];
    defaultDomainId?: string;
}

const STORAGE_KEY = 'ifrit_domains';

/**
 * Generate a unique ID for a domain
 */
function generateId(): string {
    return `domain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all configured domains from localStorage
 */
export function getDomains(): DomainConfig[] {
    if (typeof window === 'undefined') return [];

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];

        const state: DomainsState = JSON.parse(stored);
        return state.domains || [];
    } catch {
        return [];
    }
}

/**
 * Get a specific domain by ID
 */
export function getDomainById(id: string): DomainConfig | undefined {
    const domains = getDomains();
    return domains.find(d => d.id === id);
}

/**
 * Get the default domain
 */
export function getDefaultDomain(): DomainConfig | undefined {
    if (typeof window === 'undefined') return undefined;

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return undefined;

        const state: DomainsState = JSON.parse(stored);
        if (state.defaultDomainId) {
            return state.domains.find(d => d.id === state.defaultDomainId);
        }
        return state.domains[0];
    } catch {
        return undefined;
    }
}

/**
 * Save domains to localStorage
 */
function saveDomains(state: DomainsState): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Add a new domain configuration
 */
export function addDomain(config: Omit<DomainConfig, 'id' | 'createdAt' | 'updatedAt'>): DomainConfig {
    const domains = getDomains();

    const newDomain: DomainConfig = {
        ...config,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const state: DomainsState = {
        domains: [...domains, newDomain],
        defaultDomainId: domains.length === 0 ? newDomain.id : undefined
    };

    saveDomains(state);
    return newDomain;
}

/**
 * Update an existing domain
 */
export function updateDomain(id: string, updates: Partial<DomainConfig>): DomainConfig | null {
    const domains = getDomains();
    const index = domains.findIndex(d => d.id === id);

    if (index === -1) return null;

    const updatedDomain: DomainConfig = {
        ...domains[index],
        ...updates,
        id, // Prevent ID from being changed
        updatedAt: new Date().toISOString()
    };

    domains[index] = updatedDomain;

    saveDomains({ domains });
    return updatedDomain;
}

/**
 * Delete a domain
 */
export function deleteDomain(id: string): boolean {
    const domains = getDomains();
    const filtered = domains.filter(d => d.id !== id);

    if (filtered.length === domains.length) return false;

    saveDomains({ domains: filtered });
    return true;
}

/**
 * Set the default domain
 */
export function setDefaultDomain(id: string): void {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const state: DomainsState = JSON.parse(stored);
    state.defaultDomainId = id;
    saveDomains(state);
}

/**
 * Get domains by niche
 */
export function getDomainsByNiche(niche: string): DomainConfig[] {
    const domains = getDomains();
    return domains.filter(d =>
        d.niche.toLowerCase().includes(niche.toLowerCase()) ||
        niche.toLowerCase().includes(d.niche.toLowerCase())
    );
}

/**
 * Find the best domain for a given topic
 */
export function getBestDomainForTopic(topic: string): DomainConfig | undefined {
    const domains = getDomains().filter(d => d.isActive);

    if (domains.length === 0) return undefined;
    if (domains.length === 1) return domains[0];

    // Simple keyword matching for niche
    const topicLower = topic.toLowerCase();

    for (const domain of domains) {
        const nicheKeywords = domain.niche.toLowerCase().split(/\s+/);
        for (const keyword of nicheKeywords) {
            if (topicLower.includes(keyword)) {
                return domain;
            }
        }
    }

    // Return first active domain as fallback
    return domains[0];
}

/**
 * Available niches for domain configuration
 */
export const AVAILABLE_NICHES = [
    'Personal Finance',
    'Investing & Crypto',
    'Insurance',
    'Legal Services',
    'Technology & SaaS',
    'Cybersecurity',
    'Health & Wellness',
    'Real Estate',
    'Education',
    'Travel',
    'Home & DIY',
    'Business & Marketing',
    'General'
];
