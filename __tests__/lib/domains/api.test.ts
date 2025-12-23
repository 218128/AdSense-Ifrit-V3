/**
 * Tests for Domain API Functions
 */

import {
    parseDomains,
    fetchFreeDomains,
    fetchPremiumDomains,
    analyzeDomain,
    enrichDomains,
    generateProfile,
    saveProfile,
    checkBlacklist
} from '@/lib/domains/api';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Domain API', () => {
    beforeEach(() => {
        mockFetch.mockClear();
    });

    describe('parseDomains', () => {
        it('should POST to /api/domains/free-search with parse action', async () => {
            mockFetch.mockResolvedValueOnce({
                json: () => Promise.resolve({
                    success: true,
                    domains: [
                        { domain: 'example.com', tld: 'com' },
                        { domain: 'test.net', tld: 'net' }
                    ],
                    count: 2
                })
            });

            const result = await parseDomains('example.com\ntest.net');

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith('/api/domains/free-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'parse', domains: 'example.com\ntest.net' })
            });
            expect(result.success).toBe(true);
            expect(result.domains).toHaveLength(2);
        });

        it('should handle parse errors', async () => {
            mockFetch.mockResolvedValueOnce({
                json: () => Promise.resolve({
                    success: false,
                    error: 'Invalid input'
                })
            });

            const result = await parseDomains('');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid input');
        });
    });

    describe('fetchFreeDomains', () => {
        it('should GET from /api/domains/free-search without keywords', async () => {
            mockFetch.mockResolvedValueOnce({
                json: () => Promise.resolve({
                    success: true,
                    domains: [],
                    source: 'expiredomains.io'
                })
            });

            await fetchFreeDomains();

            expect(mockFetch).toHaveBeenCalledWith('/api/domains/free-search?');
        });

        it('should include keywords in query params', async () => {
            mockFetch.mockResolvedValueOnce({
                json: () => Promise.resolve({
                    success: true,
                    domains: [],
                    source: 'expiredomains.io'
                })
            });

            await fetchFreeDomains('vpn services');

            expect(mockFetch).toHaveBeenCalledWith('/api/domains/free-search?keywords=vpn+services');
        });
    });

    describe('fetchPremiumDomains', () => {
        it('should include API key in header', async () => {
            mockFetch.mockResolvedValueOnce({
                json: () => Promise.resolve({ success: true, domains: [] })
            });

            await fetchPremiumDomains('test-api-key', 'tech');

            expect(mockFetch).toHaveBeenCalledWith(
                '/api/domains/search?keywords=tech',
                expect.objectContaining({
                    headers: { 'x-spamzilla-key': 'test-api-key' }
                })
            );
        });
    });

    describe('analyzeDomain', () => {
        it('should POST domain and niche to analyze endpoint', async () => {
            mockFetch.mockResolvedValueOnce({
                json: () => Promise.resolve({
                    success: true,
                    domain: 'example.com',
                    score: { overall: 75 }
                })
            });

            const result = await analyzeDomain('example.com', 'technology');

            expect(mockFetch).toHaveBeenCalledWith('/api/domains/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    domain: 'example.com',
                    targetNiche: 'technology'
                })
            });
            expect(result.success).toBe(true);
        });

        it('should work without niche', async () => {
            mockFetch.mockResolvedValueOnce({
                json: () => Promise.resolve({ success: true })
            });

            await analyzeDomain('example.com');

            expect(mockFetch).toHaveBeenCalledWith('/api/domains/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    domain: 'example.com',
                    targetNiche: undefined
                })
            });
        });
    });

    describe('enrichDomains', () => {
        it('should POST domains with API key', async () => {
            mockFetch.mockResolvedValueOnce({
                json: () => Promise.resolve({ success: true, domains: [] })
            });

            await enrichDomains(['a.com', 'b.com'], 'key123');

            expect(mockFetch).toHaveBeenCalledWith('/api/domains/enrich', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-spamzilla-key': 'key123'
                },
                body: JSON.stringify({ domains: ['a.com', 'b.com'] })
            });
        });
    });

    describe('generateProfile', () => {
        it('should POST domain with spamzilla data and API key', async () => {
            mockFetch.mockResolvedValueOnce({
                json: () => Promise.resolve({
                    success: true,
                    profile: {
                        domain: 'example.com',
                        niche: 'technology',
                        primaryKeywords: ['tech', 'software']
                    }
                })
            });

            const result = await generateProfile(
                'example.com',
                { trustFlow: 25, domainAuthority: 30 },
                'gemini-key'
            );

            expect(mockFetch).toHaveBeenCalledWith('/api/domain-profiles/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    domain: 'example.com',
                    spamzillaData: { trustFlow: 25, domainAuthority: 30 },
                    saveProfile: false,
                    apiKey: 'gemini-key'
                })
            });
            expect(result.success).toBe(true);
        });
    });

    describe('saveProfile', () => {
        it('should POST profile with timestamp', async () => {
            const now = Date.now();
            jest.spyOn(Date, 'now').mockReturnValue(now);

            mockFetch.mockResolvedValueOnce({
                json: () => Promise.resolve({ success: true })
            });

            await saveProfile({
                domain: 'test.com',
                niche: 'tech',
                primaryKeywords: ['a'],
                secondaryKeywords: ['b'],
                questionKeywords: ['c'],
                suggestedTopics: ['d']
            });

            expect(mockFetch).toHaveBeenCalledWith('/api/domain-profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: expect.stringContaining('"researchedAt"')
            });
        });
    });

    describe('checkBlacklist', () => {
        it('should POST domain to blacklist endpoint', async () => {
            mockFetch.mockResolvedValueOnce({
                json: () => Promise.resolve({
                    success: true,
                    blacklisted: false
                })
            });

            const result = await checkBlacklist('clean-domain.com');

            expect(mockFetch).toHaveBeenCalledWith('/api/domains/blacklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain: 'clean-domain.com' })
            });
            expect(result.blacklisted).toBe(false);
        });
    });
});
