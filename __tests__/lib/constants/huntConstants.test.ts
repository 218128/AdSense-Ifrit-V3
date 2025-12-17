/**
 * Hunt Constants Tests
 * 
 * Tests to ensure constants are properly defined.
 */

import {
    HUNT_STORAGE_KEYS,
    PAGINATION,
    PREMIUM_TLDS,
    RISKY_TLDS,
    NICHE_KEYWORDS,
    REGISTRARS,
    SCORE_THRESHOLDS,
    HUNT_API_ENDPOINTS,
} from '@/lib/constants/huntConstants';

describe('Hunt Constants', () => {
    describe('Storage Keys', () => {
        it('should have all required storage keys', () => {
            expect(HUNT_STORAGE_KEYS.ANALYZE_QUEUE).toBeDefined();
            expect(HUNT_STORAGE_KEYS.PURCHASE_QUEUE).toBeDefined();
            expect(HUNT_STORAGE_KEYS.WATCHLIST).toBeDefined();
            expect(HUNT_STORAGE_KEYS.FLIP_PROJECTS).toBeDefined();
        });

        it('should have unique storage key values', () => {
            const values = Object.values(HUNT_STORAGE_KEYS);
            const unique = new Set(values);
            expect(unique.size).toBe(values.length);
        });
    });

    describe('TLD Classifications', () => {
        it('should include .com in premium TLDs', () => {
            expect(PREMIUM_TLDS).toContain('.com');
        });

        it('should include .xyz in risky TLDs', () => {
            expect(RISKY_TLDS).toContain('.xyz');
        });

        it('should not overlap premium and risky TLDs', () => {
            const overlap = PREMIUM_TLDS.filter(tld => RISKY_TLDS.includes(tld));
            expect(overlap).toHaveLength(0);
        });
    });

    describe('Niches', () => {
        it('should have finance niche keywords', () => {
            expect(NICHE_KEYWORDS.finance).toBeDefined();
            expect(NICHE_KEYWORDS.finance.length).toBeGreaterThan(0);
        });

        it('should have tech niche keywords', () => {
            expect(NICHE_KEYWORDS.tech).toBeDefined();
            expect(NICHE_KEYWORDS.tech).toContain('software');
        });
    });

    describe('Registrars', () => {
        it('should have at least 3 registrars', () => {
            expect(REGISTRARS.length).toBeGreaterThanOrEqual(3);
        });

        it('should have valid URL templates', () => {
            REGISTRARS.forEach(registrar => {
                expect(registrar.urlTemplate).toMatch(/^https:\/\//);
            });
        });
    });

    describe('Scoring', () => {
        it('should have logical score thresholds', () => {
            expect(SCORE_THRESHOLDS.EXCELLENT).toBeGreaterThan(SCORE_THRESHOLDS.GOOD);
            expect(SCORE_THRESHOLDS.GOOD).toBeGreaterThan(SCORE_THRESHOLDS.FAIR);
            expect(SCORE_THRESHOLDS.FAIR).toBeGreaterThan(SCORE_THRESHOLDS.POOR);
        });
    });

    describe('API Endpoints', () => {
        it('should have all domain API endpoints', () => {
            expect(HUNT_API_ENDPOINTS.ANALYZE).toBe('/api/domains/analyze');
            expect(HUNT_API_ENDPOINTS.BLACKLIST).toBe('/api/domains/blacklist');
        });
    });
});
