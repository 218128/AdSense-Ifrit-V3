/**
 * Tests for trendUtils
 * 
 * Unit tests for TrendScanner helper functions.
 */

import { getSourceColor, formatTimeAgo, CPC_THRESHOLD_HIGH, CPC_THRESHOLD_MEDIUM } from '../trendUtils';

describe('getSourceColor', () => {
    it('returns orange theme for Hacker News', () => {
        expect(getSourceColor('Hacker News')).toContain('orange');
        expect(getSourceColor('hacker news')).toContain('orange');
    });

    it('returns blue theme for Google News', () => {
        expect(getSourceColor('Google News')).toContain('blue');
    });

    it('returns purple theme for Brave Search', () => {
        expect(getSourceColor('Brave Search')).toContain('purple');
    });

    it('returns amber theme for Product Hunt', () => {
        expect(getSourceColor('Product Hunt')).toContain('amber');
    });

    it('returns gray theme for unknown sources', () => {
        expect(getSourceColor('Unknown Source')).toContain('gray');
    });
});

describe('formatTimeAgo', () => {
    it('returns "just now" for dates less than 60 seconds ago', () => {
        const now = new Date();
        expect(formatTimeAgo(now)).toBe('just now');
    });

    it('returns minutes ago for dates less than 1 hour ago', () => {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        expect(formatTimeAgo(fiveMinutesAgo)).toBe('5m ago');
    });

    it('returns hours ago for dates more than 1 hour ago', () => {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        expect(formatTimeAgo(twoHoursAgo)).toBe('2h ago');
    });
});

describe('CPC thresholds', () => {
    it('has HIGH threshold of 50', () => {
        expect(CPC_THRESHOLD_HIGH).toBe(50);
    });

    it('has MEDIUM threshold of 30', () => {
        expect(CPC_THRESHOLD_MEDIUM).toBe(30);
    });
});
