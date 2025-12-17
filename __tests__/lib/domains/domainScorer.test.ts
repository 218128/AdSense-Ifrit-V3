/**
 * Domain Scorer Tests
 * 
 * Tests for domain scoring logic.
 */

import {
    scoreDomain,
    parseDomain,
    quickQualityCheck,
    DomainMetrics
} from '@/lib/domains/domainScorer';

describe('Domain Scorer', () => {
    describe('parseDomain', () => {
        it('should parse .com domain', () => {
            const result = parseDomain('example.com');
            expect(result.name).toBe('example');
            expect(result.tld).toBe('com'); // TLD without dot
            expect(result.length).toBe('example'.length);
        });

        it('should parse .co.uk domain', () => {
            const result = parseDomain('example.co.uk');
            expect(result.name).toBe('example.co'); // parseDomain splits on last dot
            expect(result.tld).toBe('uk');
        });

        it('should parse .io domain', () => {
            const result = parseDomain('startup.io');
            expect(result.name).toBe('startup');
            expect(result.tld).toBe('io'); // TLD without dot
        });
    });

    describe('quickQualityCheck', () => {
        it('should pass quality check for clean .com domain', () => {
            const result = quickQualityCheck('finance.com');
            expect(result.pass).toBe(true);
        });

        it('should fail for spam TLD', () => {
            const result = quickQualityCheck('domain.xyz');
            expect(result.pass).toBe(false);
            expect(result.reason).toContain('TLD');
        });

        it('should fail for suspiciously long domain', () => {
            const result = quickQualityCheck('this-is-a-very-long-domain-name-that-should-fail.com');
            expect(result.pass).toBe(false);
        });
    });

    describe('scoreDomain', () => {
        it('should score a premium .com domain highly', () => {
            const metrics: DomainMetrics = {
                domain: 'finance.com',
                tld: '.com',
                length: 7,
                domainRating: 50,
                domainAge: 10,
                backlinks: 1000,
            };

            const score = scoreDomain(metrics, 'finance');

            expect(score.overall).toBeGreaterThan(50);
            expect(score.recommendation).toMatch(/buy/i);
        });

        it('should score a spammy domain low', () => {
            const metrics: DomainMetrics = {
                domain: 'cheap-casino-payday-loans.xyz',
                tld: '.xyz',
                length: 28,
                domainRating: 5,
                domainAge: 0,
                backlinks: 10,
            };

            const score = scoreDomain(metrics);

            expect(score.overall).toBeLessThan(30);
            expect(['high', 'critical']).toContain(score.riskLevel); // Very spammy = high or critical
        });

        it('should include risks for adult content history', () => {
            const metrics: DomainMetrics = {
                domain: 'example.com',
                tld: '.com',
                length: 7,
            };

            const wayback = {
                hasHistory: true,
                wasAdult: true,
            };

            const score = scoreDomain(metrics, undefined, wayback);

            expect(score.risks.length).toBeGreaterThan(0);
            expect(score.risks.some(r => r.type === 'adult')).toBe(true);
        });

        it('should estimate domain value', () => {
            const metrics: DomainMetrics = {
                domain: 'tech.io',
                tld: '.io',
                length: 4,
                domainRating: 40,
                referringDomains: 500,
            };

            const score = scoreDomain(metrics, 'tech');

            expect(score.estimatedValue).toBeGreaterThan(0);
        });
    });
});
