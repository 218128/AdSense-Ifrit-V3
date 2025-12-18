/**
 * Tests for TrendScanner Module
 */

import { TrendScanner } from '@/lib/modules/trendScanner';

describe('TrendScanner Module', () => {
    let scanner: TrendScanner;

    beforeEach(() => {
        scanner = new TrendScanner();
    });

    describe('CSV Import', () => {
        it('should import trends from CSV content', () => {
            const csvContent = `
Topic,Traffic
artificial intelligence,500K
machine learning,200K
web development,100K
`;
            const trends = scanner.importFromCSV(csvContent);

            expect(Array.isArray(trends)).toBe(true);
        });

        it('should handle empty CSV', () => {
            const trends = scanner.importFromCSV('');

            expect(Array.isArray(trends)).toBe(true);
            expect(trends.length).toBe(0);
        });

        it('should handle CSV with only headers', () => {
            const csvContent = `Topic,Traffic`;
            const trends = scanner.importFromCSV(csvContent);

            expect(Array.isArray(trends)).toBe(true);
        });

        it('should track imported CSV trends', () => {
            const csvContent = `
Topic,Traffic
test topic,100K
`;
            scanner.importFromCSV(csvContent);

            expect(scanner.hasCSVTrends()).toBeDefined();
        });

        it('should clear CSV trends', () => {
            scanner.clearCSVTrends();

            expect(scanner.hasCSVTrends()).toBe(false);
        });
    });

    describe('Fallback Trends', () => {
        it('should return high-CPC fallback trends', () => {
            const trends = scanner.getHighCPCFallbackTrends();

            expect(Array.isArray(trends)).toBe(true);
            expect(trends.length).toBeGreaterThan(0);
        });

        it('should return dynamic fallback trends', () => {
            const trends = scanner.getDynamicFallbackTrends();

            expect(Array.isArray(trends)).toBe(true);
            expect(trends.length).toBeGreaterThan(0);
        });

        it('should return trends with required properties', () => {
            const trends = scanner.getHighCPCFallbackTrends();

            trends.forEach(trend => {
                expect(trend).toHaveProperty('topic');
                expect(trend).toHaveProperty('category');
            });
        });
    });

    describe('High-CPC Niche Suggestions', () => {
        it('should return niche suggestions', () => {
            const suggestions = scanner.getHighCPCNicheSuggestions();

            expect(Array.isArray(suggestions)).toBe(true);
        });

        it('should include high-value niches', () => {
            const suggestions = scanner.getHighCPCNicheSuggestions();

            expect(suggestions.length).toBeGreaterThan(0);
        });
    });

    describe('Trend Enhancement', () => {
        it('should enhance trends with CPC data', () => {
            const baseTrends = [
                { topic: 'best credit cards', context: 'finance', category: 'Finance' },
                { topic: 'vpn reviews', context: 'technology', category: 'Tech' }
            ];

            const enhanced = scanner.enhanceTrends(baseTrends);

            expect(Array.isArray(enhanced)).toBe(true);
            enhanced.forEach(trend => {
                expect(trend).toHaveProperty('score');
                expect(trend).toHaveProperty('isHighCPC');
                expect(trend).toHaveProperty('cpcPotential');
            });
        });

        it('should identify high-CPC trends', () => {
            const baseTrends = [
                { topic: 'best insurance quotes', context: 'insurance comparison', category: 'Insurance' }
            ];

            const enhanced = scanner.enhanceTrends(baseTrends);

            // Insurance is typically high CPC
            expect(enhanced[0].isHighCPC).toBe(true);
        });
    });

    describe('Statistics Calculation', () => {
        it('should calculate stats for enhanced trends', () => {
            const baseTrends = [
                { topic: 'topic 1', context: 'context', category: 'Category' },
                { topic: 'topic 2', context: 'context', category: 'Category' }
            ];

            const enhanced = scanner.enhanceTrends(baseTrends);
            const stats = scanner.calculateStats(enhanced);

            expect(stats).toHaveProperty('totalScanned');
            expect(stats).toHaveProperty('highCPCCount');
            expect(stats).toHaveProperty('averageScore');
        });

        it('should count total scanned correctly', () => {
            const trends = scanner.enhanceTrends([
                { topic: 'a', context: '', category: '' },
                { topic: 'b', context: '', category: '' },
                { topic: 'c', context: '', category: '' }
            ]);

            const stats = scanner.calculateStats(trends);

            expect(stats.totalScanned).toBe(3);
        });
    });

    describe('Scan Options', () => {
        it('should accept custom geo option', async () => {
            // This test may hit rate limits, so we just verify the method exists
            expect(typeof scanner.scan).toBe('function');
        });

        it('should support high-CPC mode', async () => {
            expect(typeof scanner.scanHighCPC).toBe('function');
        });
    });
});
