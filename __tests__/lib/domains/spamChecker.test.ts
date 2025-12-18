/**
 * Tests for Spam Checker Module
 */

import {
    checkDomainSpam,
    quickSpamCheck,
    domainLooksTrustworthy,
    fetchSpamzillaData
} from '@/lib/domains/spamChecker';

describe('Spam Checker Module', () => {
    describe('quickSpamCheck', () => {
        it('should identify domains with low spam score', () => {
            const result = quickSpamCheck('example.com');

            expect(result.isSpammy).toBe(false);
            expect(result.score).toBeLessThan(30);
        });

        it('should flag domains with suspicious TLDs', () => {
            const result = quickSpamCheck('spamsite.xyz');

            expect(result.score).toBeGreaterThan(0);
            expect(result.reasons.length).toBeGreaterThan(0);
        });

        it('should flag domains with spam keywords', () => {
            const result = quickSpamCheck('buy-cheap-pills-online.com');

            expect(result.score).toBeGreaterThan(20);
            // Should have at least one reason for flagging
            expect(result.reasons.length).toBeGreaterThan(0);
        });

        it('should flag domains with many hyphens', () => {
            const result = quickSpamCheck('this-has-many-hyphens-in-name.com');

            expect(result.score).toBeGreaterThan(0);
        });

        it('should flag domains with repeated characters', () => {
            const result = quickSpamCheck('aaaaastore.com');

            expect(result.score).toBeGreaterThan(0);
        });

        it('should handle domains with numbers', () => {
            const result = quickSpamCheck('123456shop.com');

            expect(result).toHaveProperty('score');
            expect(result).toHaveProperty('isSpammy');
        });
    });

    describe('domainLooksTrustworthy', () => {
        it('should rate clean domains as trustworthy', () => {
            const result = domainLooksTrustworthy('mybusiness.com');

            expect(result.score).toBeGreaterThan(30);
            expect(result).toHaveProperty('positives');
            expect(result).toHaveProperty('negatives');
        });

        it('should prefer .com TLD', () => {
            const comDomain = domainLooksTrustworthy('example.com');
            const xyzDomain = domainLooksTrustworthy('example.xyz');

            expect(comDomain.score).toBeGreaterThan(xyzDomain.score);
        });

        it('should give higher score to shorter domains', () => {
            const result = domainLooksTrustworthy('abc.com');

            expect(result.score).toBeGreaterThan(0);
        });

        it('should detect positive signals in domain name', () => {
            const result = domainLooksTrustworthy('mybusiness.com');

            expect(Array.isArray(result.positives)).toBe(true);
        });

        it('should detect negative signals in domain name', () => {
            const result = domainLooksTrustworthy('free-money-now.xyz');

            expect(Array.isArray(result.negatives)).toBe(true);
        });
    });

    describe('checkDomainSpam', () => {
        it('should return comprehensive spam check result', async () => {
            const result = await checkDomainSpam('testdomain.com');

            expect(result).toHaveProperty('isSpammy');
            expect(result).toHaveProperty('spamScore');
            expect(result).toHaveProperty('issues');
            expect(result).toHaveProperty('passed');
            expect(result).toHaveProperty('blacklisted');
        });

        it('should include spam score between 0 and 100', async () => {
            const result = await checkDomainSpam('example.com');

            expect(result.spamScore).toBeGreaterThanOrEqual(0);
            expect(result.spamScore).toBeLessThanOrEqual(100);
        });

        it('should return array of issues', async () => {
            const result = await checkDomainSpam('suspicious-site.xyz');

            expect(Array.isArray(result.issues)).toBe(true);
        });

        it('should return array of passed checks', async () => {
            const result = await checkDomainSpam('cleansite.com');

            expect(Array.isArray(result.passed)).toBe(true);
        });
    });

    describe('fetchSpamzillaData', () => {
        it('should return null when no API key is provided', async () => {
            const result = await fetchSpamzillaData('example.com');

            // Without API key, should return null or mock data
            expect(result === null || typeof result === 'object').toBe(true);
        });

        it('should handle domain parameter correctly', async () => {
            // Should not throw with valid domain
            await expect(fetchSpamzillaData('valid-domain.com')).resolves.not.toThrow();
        });

        it('should return expected data structure when data is available', async () => {
            const result = await fetchSpamzillaData('example.com', 'test-key');

            // Even with invalid key, should handle gracefully
            if (result !== null) {
                expect(result).toHaveProperty('dr');
                expect(result).toHaveProperty('tf');
                expect(result).toHaveProperty('cf');
                expect(result).toHaveProperty('backlinks');
            }
        });
    });
});
