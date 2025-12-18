/**
 * Tests for Cost Tracker Module
 */

import {
    logUsage,
    getUsageRecords,
    getUsageForPeriod,
    getTodayUsage,
    getSessionUsage,
    getJobUsage,
    getUsageSummary,
    setCreditBalance,
    getCreditBalance,
    getCreditBalances,
    clearUsageRecords,
    exportUsageData
} from '@/lib/costTracker';

// Mock localStorage for testing
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; }
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

describe('Cost Tracker Module', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    describe('logUsage', () => {
        it('should create a usage record', () => {
            const record = logUsage('gemini', 1000, 500);

            expect(record).toHaveProperty('id');
            expect(record).toHaveProperty('provider', 'gemini');
            expect(record).toHaveProperty('inputTokens', 1000);
            expect(record).toHaveProperty('outputTokens', 500);
            expect(record).toHaveProperty('cost');
            expect(record).toHaveProperty('timestamp');
        });

        it('should accept optional metadata', () => {
            const record = logUsage('perplexity', 500, 300, {
                model: 'sonar-pro',
                jobId: 'job123',
                itemType: 'article',
                topic: 'AI trends'
            });

            expect(record.model).toBe('sonar-pro');
            expect(record.jobId).toBe('job123');
            expect(record.itemType).toBe('article');
            expect(record.topic).toBe('AI trends');
        });

        it('should calculate cost based on provider', () => {
            const record = logUsage('gemini', 1000, 500);

            expect(typeof record.cost).toBe('number');
            expect(record.cost).toBeGreaterThanOrEqual(0);
        });

        it('should store records in localStorage', () => {
            logUsage('openai', 100, 50);

            const records = getUsageRecords();
            expect(records.length).toBe(1);
        });
    });

    describe('getUsageRecords', () => {
        it('should return empty array when no records', () => {
            const records = getUsageRecords();

            expect(Array.isArray(records)).toBe(true);
            expect(records.length).toBe(0);
        });

        it('should return all stored records', () => {
            logUsage('gemini', 100, 50);
            logUsage('perplexity', 200, 100);
            logUsage('openai', 300, 150);

            const records = getUsageRecords();
            expect(records.length).toBe(3);
        });
    });

    describe('getUsageForPeriod', () => {
        it('should filter records by time period', () => {
            const now = Date.now();
            logUsage('gemini', 100, 50);

            const records = getUsageForPeriod(now - 60000, now + 60000);
            expect(records.length).toBe(1);
        });

        it('should return empty array for future period', () => {
            logUsage('gemini', 100, 50);

            const futureTime = Date.now() + 100000;
            const records = getUsageForPeriod(futureTime, futureTime + 60000);
            expect(records.length).toBe(0);
        });
    });

    describe('getTodayUsage', () => {
        it('should return records from today', () => {
            logUsage('gemini', 100, 50);

            const records = getTodayUsage();
            expect(records.length).toBe(1);
        });
    });

    describe('getSessionUsage', () => {
        it('should return records from last 24 hours', () => {
            logUsage('gemini', 100, 50);

            const records = getSessionUsage();
            expect(records.length).toBe(1);
        });
    });

    describe('getJobUsage', () => {
        it('should filter records by job ID', () => {
            logUsage('gemini', 100, 50, { jobId: 'job1' });
            logUsage('gemini', 200, 100, { jobId: 'job2' });
            logUsage('gemini', 300, 150, { jobId: 'job1' });

            const records = getJobUsage('job1');
            expect(records.length).toBe(2);
        });

        it('should return empty array for unknown job', () => {
            logUsage('gemini', 100, 50, { jobId: 'job1' });

            const records = getJobUsage('unknown');
            expect(records.length).toBe(0);
        });
    });

    describe('getUsageSummary', () => {
        it('should calculate summary from records', () => {
            logUsage('gemini', 1000, 500);
            logUsage('perplexity', 2000, 1000);

            const summary = getUsageSummary();

            expect(summary.totalRequests).toBe(2);
            expect(summary.totalInputTokens).toBe(3000);
            expect(summary.totalOutputTokens).toBe(1500);
            expect(summary.byProvider.length).toBe(2);
        });

        it('should calculate average cost per request', () => {
            logUsage('gemini', 1000, 500);
            logUsage('gemini', 1000, 500);

            const summary = getUsageSummary();

            expect(summary.avgCostPerRequest).toBeGreaterThanOrEqual(0);
        });

        it('should group by provider', () => {
            logUsage('gemini', 100, 50);
            logUsage('gemini', 100, 50);
            logUsage('perplexity', 100, 50);

            const summary = getUsageSummary();

            const geminiSummary = summary.byProvider.find(p => p.provider === 'gemini');
            expect(geminiSummary?.totalRequests).toBe(2);
        });
    });

    describe('Credit Balance', () => {
        it('should set credit balance', () => {
            setCreditBalance('perplexity', 4.50, 5.00);

            const balance = getCreditBalance('perplexity');
            expect(balance?.remaining).toBe(4.50);
            expect(balance?.total).toBe(5.00);
        });

        it('should get all credit balances', () => {
            setCreditBalance('perplexity', 4.50, 5.00);
            setCreditBalance('openai', 95.00, 100.00);

            const balances = getCreditBalances();
            expect(Object.keys(balances).length).toBe(2);
        });

        it('should return null for unknown provider', () => {
            const balance = getCreditBalance('unknown');
            expect(balance).toBeNull();
        });
    });

    describe('clearUsageRecords', () => {
        it('should clear all records', () => {
            logUsage('gemini', 100, 50);
            logUsage('perplexity', 200, 100);

            clearUsageRecords();

            const records = getUsageRecords();
            expect(records.length).toBe(0);
        });
    });

    describe('exportUsageData', () => {
        it('should export data as JSON string', () => {
            logUsage('gemini', 100, 50);

            const exported = exportUsageData();

            expect(typeof exported).toBe('string');
            const parsed = JSON.parse(exported);
            expect(parsed).toHaveProperty('records');
            expect(parsed).toHaveProperty('credits');
            expect(parsed).toHaveProperty('exportedAt');
        });
    });
});
