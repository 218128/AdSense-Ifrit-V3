/**
 * Domain Configuration Tests
 * 
 * Tests for the domain configuration system that manages
 * multiple blog domains from a single Ifrit instance.
 */

import {
    getDomains,
    getDomainById,
    getDefaultDomain,
    addDomain,
    updateDomain,
    deleteDomain,
    setDefaultDomain,
    getDomainsByNiche,
    getBestDomainForTopic,
    AVAILABLE_NICHES,
    DomainConfig,
    AdsenseConfig
} from '@/lib/domains/domainConfig';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
        get length() {
            return Object.keys(store).length;
        },
        key: (index: number) => Object.keys(store)[index] ?? null
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

describe('Domain Configuration System', () => {
    const STORAGE_KEY = 'ifrit_domains';

    // Sample AdSense config
    const sampleAdsenseConfig: AdsenseConfig = {
        publisherId: 'ca-pub-1234567890',
        leaderboardSlot: '1234567890',
        articleSlot: '0987654321'
    };

    // Sample domain config (without id, createdAt, updatedAt)
    const sampleDomainInput = {
        name: 'Finance Blog',
        url: 'https://financeblog.com',
        niche: 'Personal Finance',
        adsenseConfig: sampleAdsenseConfig,
        isActive: true
    };

    beforeEach(() => {
        localStorageMock.clear();
    });

    describe('getDomains()', () => {
        it('should return empty array when no domains are stored', () => {
            const domains = getDomains();
            expect(domains).toEqual([]);
        });

        it('should return domains from localStorage', () => {
            const mockDomain: DomainConfig = {
                id: 'domain_123',
                ...sampleDomainInput,
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z'
            };
            localStorageMock.setItem(STORAGE_KEY, JSON.stringify({
                domains: [mockDomain]
            }));

            const domains = getDomains();
            expect(domains).toHaveLength(1);
            expect(domains[0].name).toBe('Finance Blog');
        });

        it('should handle malformed JSON gracefully', () => {
            localStorageMock.setItem(STORAGE_KEY, 'invalid-json');
            const domains = getDomains();
            expect(domains).toEqual([]);
        });
    });

    describe('addDomain()', () => {
        it('should add a new domain with generated id and timestamps', () => {
            const domain = addDomain(sampleDomainInput);

            expect(domain.id).toMatch(/^domain_\d+_/);
            expect(domain.name).toBe('Finance Blog');
            expect(domain.createdAt).toBeDefined();
            expect(domain.updatedAt).toBeDefined();
        });

        it('should set first domain as default', () => {
            addDomain(sampleDomainInput);
            const defaultDomain = getDefaultDomain();
            expect(defaultDomain?.name).toBe('Finance Blog');
        });

        it('should preserve existing domains when adding new one', () => {
            addDomain(sampleDomainInput);
            addDomain({
                ...sampleDomainInput,
                name: 'Tech Blog',
                niche: 'Technology'
            });

            const domains = getDomains();
            expect(domains).toHaveLength(2);
        });
    });

    describe('getDomainById()', () => {
        it('should return domain when id matches', () => {
            const added = addDomain(sampleDomainInput);
            const found = getDomainById(added.id);
            expect(found?.name).toBe('Finance Blog');
        });

        it('should return undefined when id does not match', () => {
            addDomain(sampleDomainInput);
            const found = getDomainById('non-existent-id');
            expect(found).toBeUndefined();
        });
    });

    describe('getDefaultDomain()', () => {
        it('should return undefined when no domains exist', () => {
            const defaultDomain = getDefaultDomain();
            expect(defaultDomain).toBeUndefined();
        });

        it('should return first domain when no default is set', () => {
            addDomain(sampleDomainInput);
            addDomain({
                ...sampleDomainInput,
                name: 'Tech Blog'
            });

            const defaultDomain = getDefaultDomain();
            expect(defaultDomain?.name).toBe('Finance Blog');
        });

        it('should return explicitly set default domain', () => {
            addDomain(sampleDomainInput);
            const techDomain = addDomain({
                ...sampleDomainInput,
                name: 'Tech Blog'
            });

            setDefaultDomain(techDomain.id);
            const defaultDomain = getDefaultDomain();
            expect(defaultDomain?.name).toBe('Tech Blog');
        });
    });

    describe('updateDomain()', () => {
        it('should update domain fields', () => {
            const domain = addDomain(sampleDomainInput);
            const updated = updateDomain(domain.id, { name: 'Updated Finance Blog' });

            expect(updated?.name).toBe('Updated Finance Blog');
            expect(updated?.niche).toBe('Personal Finance'); // unchanged
        });

        it('should update the updatedAt timestamp', () => {
            const domain = addDomain(sampleDomainInput);
            const updated = updateDomain(domain.id, { name: 'Updated Name' });

            // Check that updatedAt is a valid ISO date string
            expect(updated?.updatedAt).toBeDefined();
            expect(new Date(updated!.updatedAt).toISOString()).toBe(updated?.updatedAt);
        });

        it('should return null for non-existent domain', () => {
            const updated = updateDomain('non-existent', { name: 'New Name' });
            expect(updated).toBeNull();
        });

        it('should prevent id from being changed', () => {
            const domain = addDomain(sampleDomainInput);
            const originalId = domain.id;

            // @ts-expect-error - Testing that id cannot be changed
            const updated = updateDomain(domain.id, { id: 'new-id', name: 'Updated' });
            expect(updated?.id).toBe(originalId);
        });
    });

    describe('deleteDomain()', () => {
        it('should delete existing domain', () => {
            const domain = addDomain(sampleDomainInput);
            const result = deleteDomain(domain.id);

            expect(result).toBe(true);
            expect(getDomains()).toHaveLength(0);
        });

        it('should return false for non-existent domain', () => {
            addDomain(sampleDomainInput);
            const result = deleteDomain('non-existent-id');
            expect(result).toBe(false);
        });

        it('should not affect other domains', () => {
            const domain1 = addDomain(sampleDomainInput);
            const domain2 = addDomain({
                ...sampleDomainInput,
                name: 'Tech Blog'
            });

            deleteDomain(domain1.id);
            const remaining = getDomains();
            expect(remaining).toHaveLength(1);
            expect(remaining[0].id).toBe(domain2.id);
        });
    });

    describe('setDefaultDomain()', () => {
        it('should set the default domain', () => {
            addDomain(sampleDomainInput);
            const techDomain = addDomain({
                ...sampleDomainInput,
                name: 'Tech Blog'
            });

            setDefaultDomain(techDomain.id);

            const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY) || '{}');
            expect(stored.defaultDomainId).toBe(techDomain.id);
        });
    });

    describe('getDomainsByNiche()', () => {
        it('should filter domains by niche', () => {
            addDomain(sampleDomainInput);
            addDomain({
                ...sampleDomainInput,
                name: 'Tech Blog',
                niche: 'Technology & SaaS'
            });
            addDomain({
                ...sampleDomainInput,
                name: 'Investing Blog',
                niche: 'Personal Finance'
            });

            const financeDomains = getDomainsByNiche('Finance');
            expect(financeDomains).toHaveLength(2);
        });

        it('should be case insensitive', () => {
            addDomain(sampleDomainInput);

            const domains = getDomainsByNiche('PERSONAL FINANCE');
            expect(domains).toHaveLength(1);
        });

        it('should return empty array when no match', () => {
            addDomain(sampleDomainInput);

            const domains = getDomainsByNiche('Gaming');
            expect(domains).toHaveLength(0);
        });
    });

    describe('getBestDomainForTopic()', () => {
        it('should return matching domain for topic', () => {
            addDomain(sampleDomainInput);
            addDomain({
                ...sampleDomainInput,
                name: 'Tech Blog',
                niche: 'Technology & SaaS'
            });

            const best = getBestDomainForTopic('best investment strategies');
            expect(best?.niche).toBe('Personal Finance');
        });

        it('should return first active domain as fallback', () => {
            addDomain(sampleDomainInput);
            addDomain({
                ...sampleDomainInput,
                name: 'Tech Blog',
                niche: 'Technology'
            });

            const best = getBestDomainForTopic('random unrelated topic');
            expect(best?.name).toBe('Finance Blog');
        });

        it('should only consider active domains', () => {
            addDomain({ ...sampleDomainInput, isActive: false });
            const techDomain = addDomain({
                ...sampleDomainInput,
                name: 'Tech Blog',
                niche: 'Technology',
                isActive: true
            });

            const best = getBestDomainForTopic('finance strategies');
            expect(best?.id).toBe(techDomain.id);
        });

        it('should return undefined when no domains exist', () => {
            const best = getBestDomainForTopic('any topic');
            expect(best).toBeUndefined();
        });
    });

    describe('AVAILABLE_NICHES', () => {
        it('should contain common niches', () => {
            expect(AVAILABLE_NICHES).toContain('Personal Finance');
            expect(AVAILABLE_NICHES).toContain('Technology & SaaS');
            expect(AVAILABLE_NICHES).toContain('Cybersecurity');
            expect(AVAILABLE_NICHES).toContain('General');
        });

        it('should have at least 10 niches', () => {
            expect(AVAILABLE_NICHES.length).toBeGreaterThanOrEqual(10);
        });
    });
});
