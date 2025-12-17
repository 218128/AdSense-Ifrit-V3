/**
 * Tests for CPC Intelligence Module
 */

import {
    analyzeCPC,
    suggestHighCPCAlternatives,
    getHighCPCNiches
} from '@/lib/modules/cpcIntelligence';

describe('CPC Intelligence Module', () => {
    describe('analyzeCPC', () => {
        it('should classify insurance keywords as very_high CPC', () => {
            const result = analyzeCPC('best life insurance policies');

            expect(result.primaryNiche).toBe('Insurance');
            expect(result.primaryCPC).toBe('very_high');
            expect(result.isHighCPC).toBe(true);
        });

        it('should classify finance keywords as very_high CPC', () => {
            const result = analyzeCPC('high yield savings account comparison');

            expect(result.primaryNiche).toBe('Personal Finance');
            expect(result.primaryCPC).toBe('very_high');
            expect(result.isHighCPC).toBe(true);
        });

        it('should classify VPN keywords as high CPC', () => {
            const result = analyzeCPC('best vpn for privacy');

            expect(result.primaryNiche).toBe('Cybersecurity & VPNs');
            expect(result.primaryCPC).toBe('high');
        });

        it('should detect commercial intent and boost score', () => {
            const withIntent = analyzeCPC('best crm software review');
            const withoutIntent = analyzeCPC('crm software');

            expect(withIntent.score).toBeGreaterThan(withoutIntent.score);
        });

        it('should handle unknown keywords with low CPC', () => {
            const result = analyzeCPC('random topic xyz');

            expect(result.isHighCPC).toBe(false);
            expect(result.score).toBeLessThan(50);
        });

        it('should generate recommendations based on score', () => {
            const highCPC = analyzeCPC('best insurance review comparison');
            const lowCPC = analyzeCPC('random blog topic');

            // High CPC keywords get positive recommendations (✅ or 🔥)
            expect(highCPC.recommendation).toMatch(/[✅🔥]/);
            expect(lowCPC.recommendation).toContain('📝'); // Lower CPC gets informational icon
        });
    });

    describe('suggestHighCPCAlternatives', () => {
        it('should suggest adding "best" prefix', () => {
            const suggestions = suggestHighCPCAlternatives('vpn service');

            expect(suggestions).toContain('best vpn service');
        });

        it('should suggest adding "review" suffix', () => {
            const suggestions = suggestHighCPCAlternatives('crm software');

            expect(suggestions).toContain('crm software review');
        });

        it('should suggest adding current year', () => {
            const currentYear = new Date().getFullYear();
            const suggestions = suggestHighCPCAlternatives('hosting provider');

            expect(suggestions.some(s => s.includes(String(currentYear)))).toBe(true);
        });

        it('should not duplicate existing modifiers', () => {
            const suggestions = suggestHighCPCAlternatives('best vpn review');

            expect(suggestions).not.toContain('best best vpn review');
            expect(suggestions).not.toContain('best vpn review review');
        });
    });

    describe('getHighCPCNiches', () => {
        it('should return only high and very_high CPC niches', () => {
            const niches = getHighCPCNiches();

            expect(niches.length).toBeGreaterThan(0);
            niches.forEach(niche => {
                expect(['$30-80', '$30-60', '$20-45', '$15-40', '$10-35', '$10-30', '$15-35', '$12-30'])
                    .toContain(niche.cpcRange);
            });
        });

        it('should include Insurance as top niche', () => {
            const niches = getHighCPCNiches();

            expect(niches.some(n => n.niche === 'Insurance')).toBe(true);
        });

        it('should include sample keywords for each niche', () => {
            const niches = getHighCPCNiches();

            niches.forEach(niche => {
                expect(niche.keywords.length).toBeGreaterThan(0);
            });
        });
    });
});
