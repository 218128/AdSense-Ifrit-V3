/**
 * Usage Store Tests
 * 
 * Tests for the usageStore Zustand store that manages AI usage tracking.
 */

import { act, renderHook } from '@testing-library/react';
import { useUsageStore, logUsageServer, getServerRecords } from '@/stores/usageStore';

describe('usageStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        const { result } = renderHook(() => useUsageStore());
        act(() => {
            result.current.clearUsageRecords();
        });
    });

    describe('logUsage', () => {
        it('should log a usage record with correct fields', () => {
            const { result } = renderHook(() => useUsageStore());

            let record;
            act(() => {
                record = result.current.logUsage('gemini', 1000, 500, {
                    model: 'gemini-pro',
                    jobId: 'job-123',
                    itemType: 'article',
                    topic: 'AI testing',
                });
            });

            expect(record).toBeDefined();
            expect(record.provider).toBe('gemini');
            expect(record.inputTokens).toBe(1000);
            expect(record.outputTokens).toBe(500);
            expect(record.model).toBe('gemini-pro');
            expect(record.jobId).toBe('job-123');
            expect(record.itemType).toBe('article');
            expect(record.topic).toBe('AI testing');
            expect(record.id).toMatch(/^usage_\d+_[a-z0-9]+$/);
            expect(record.cost).toBeGreaterThan(0);
        });

        it('should calculate costs correctly for Gemini', () => {
            const { result } = renderHook(() => useUsageStore());

            let record;
            act(() => {
                // Gemini: $0.075/1M input, $0.30/1M output
                record = result.current.logUsage('gemini', 1_000_000, 1_000_000);
            });

            // Expected: 0.075 + 0.30 = 0.375
            expect(record.cost).toBeCloseTo(0.375, 3);
        });

        it('should calculate costs correctly for DeepSeek', () => {
            const { result } = renderHook(() => useUsageStore());

            let record;
            act(() => {
                // DeepSeek: $0.14/1M input, $0.28/1M output
                record = result.current.logUsage('deepseek', 1_000_000, 1_000_000);
            });

            // Expected: 0.14 + 0.28 = 0.42
            expect(record.cost).toBeCloseTo(0.42, 3);
        });

        it('should accumulate records in store', () => {
            const { result } = renderHook(() => useUsageStore());

            act(() => {
                result.current.logUsage('gemini', 100, 50);
                result.current.logUsage('deepseek', 200, 100);
                result.current.logUsage('openrouter', 300, 150);
            });

            const summary = result.current.getUsageSummary();
            expect(summary.totalRequests).toBe(3);
            expect(summary.totalInputTokens).toBe(600);
            expect(summary.totalOutputTokens).toBe(300);
        });

        it('should limit records to 1000', () => {
            const { result } = renderHook(() => useUsageStore());

            act(() => {
                for (let i = 0; i < 1100; i++) {
                    result.current.logUsage('gemini', 10, 5);
                }
            });

            const summary = result.current.getUsageSummary();
            expect(summary.totalRequests).toBe(1000);
        });
    });

    describe('getUsageSummary', () => {
        it('should return correct summary by provider', () => {
            const { result } = renderHook(() => useUsageStore());

            act(() => {
                result.current.logUsage('gemini', 100, 50);
                result.current.logUsage('gemini', 200, 100);
                result.current.logUsage('deepseek', 300, 150);
            });

            const summary = result.current.getUsageSummary();

            expect(summary.byProvider.length).toBe(2);

            const gemini = summary.byProvider.find(p => p.provider === 'gemini');
            expect(gemini?.totalRequests).toBe(2);
            expect(gemini?.totalInputTokens).toBe(300);

            const deepseek = summary.byProvider.find(p => p.provider === 'deepseek');
            expect(deepseek?.totalRequests).toBe(1);
            expect(deepseek?.totalInputTokens).toBe(300);
        });

        it('should calculate average cost per request', () => {
            const { result } = renderHook(() => useUsageStore());

            act(() => {
                result.current.logUsage('gemini', 1000, 500);
                result.current.logUsage('gemini', 1000, 500);
            });

            const summary = result.current.getUsageSummary();
            expect(summary.avgCostPerRequest).toBe(summary.totalCost / 2);
        });

        it('should handle empty records gracefully', () => {
            const { result } = renderHook(() => useUsageStore());

            const summary = result.current.getUsageSummary();
            expect(summary.totalRequests).toBe(0);
            expect(summary.totalCost).toBe(0);
            expect(summary.avgCostPerRequest).toBe(0);
            expect(summary.byProvider).toEqual([]);
        });
    });

    describe('credit balances', () => {
        it('should set and get credit balance', () => {
            const { result } = renderHook(() => useUsageStore());

            act(() => {
                result.current.setCreditBalance('perplexity', 3.50, 5.00);
            });

            const balance = result.current.getCreditBalance('perplexity');
            expect(balance).not.toBeNull();
            expect(balance?.remaining).toBe(3.50);
            expect(balance?.total).toBe(5.00);
            expect(balance?.provider).toBe('perplexity');
        });

        it('should return null for unknown provider', () => {
            const { result } = renderHook(() => useUsageStore());

            const balance = result.current.getCreditBalance('unknown-provider');
            expect(balance).toBeNull();
        });

        it('should default total to 5.00', () => {
            const { result } = renderHook(() => useUsageStore());

            act(() => {
                result.current.setCreditBalance('perplexity', 4.25);
            });

            const balance = result.current.getCreditBalance('perplexity');
            expect(balance?.total).toBe(5.00);
        });
    });

    describe('clearUsageRecords', () => {
        it('should clear all records', () => {
            const { result } = renderHook(() => useUsageStore());

            act(() => {
                result.current.logUsage('gemini', 100, 50);
                result.current.logUsage('deepseek', 200, 100);
            });

            expect(result.current.getUsageSummary().totalRequests).toBe(2);

            act(() => {
                result.current.clearUsageRecords();
            });

            expect(result.current.getUsageSummary().totalRequests).toBe(0);
        });
    });

    describe('exportUsageData', () => {
        it('should export records as JSON', () => {
            const { result } = renderHook(() => useUsageStore());

            act(() => {
                result.current.logUsage('gemini', 100, 50);
                result.current.setCreditBalance('perplexity', 4.00);
            });

            const exported = result.current.exportUsageData();
            const parsed = JSON.parse(exported);

            expect(parsed).toHaveProperty('records');
            expect(parsed).toHaveProperty('creditBalances');
            expect(parsed).toHaveProperty('exportedAt');
            expect(parsed.records.length).toBe(1);
            expect(parsed.creditBalances.perplexity).toBeDefined();
        });
    });

    describe('time-based filtering', () => {
        it('should filter today usage', () => {
            const { result } = renderHook(() => useUsageStore());

            // Records from today should be included
            act(() => {
                result.current.logUsage('gemini', 100, 50);
            });

            const todayRecords = result.current.getTodayUsage();
            expect(todayRecords.length).toBe(1);
        });

        it('should filter session usage (last 24h)', () => {
            const { result } = renderHook(() => useUsageStore());

            act(() => {
                result.current.logUsage('gemini', 100, 50);
            });

            const sessionRecords = result.current.getSessionUsage();
            expect(sessionRecords.length).toBe(1);
        });
    });

    describe('getJobUsage', () => {
        it('should filter by jobId', () => {
            const { result } = renderHook(() => useUsageStore());

            act(() => {
                result.current.logUsage('gemini', 100, 50, { jobId: 'job-A' });
                result.current.logUsage('gemini', 200, 100, { jobId: 'job-B' });
                result.current.logUsage('gemini', 300, 150, { jobId: 'job-A' });
            });

            const jobARecords = result.current.getJobUsage('job-A');
            expect(jobARecords.length).toBe(2);
            expect(jobARecords.every(r => r.jobId === 'job-A')).toBe(true);
        });
    });
});

describe('logUsageServer', () => {
    it('should create a record without store hook', () => {
        const record = logUsageServer('gemini', 500, 250, {
            model: 'gemini-pro',
            jobId: 'server-job',
        });

        expect(record.provider).toBe('gemini');
        expect(record.inputTokens).toBe(500);
        expect(record.outputTokens).toBe(250);
        expect(record.model).toBe('gemini-pro');
        expect(record.cost).toBeGreaterThan(0);
    });

    it('should accumulate server records', () => {
        logUsageServer('gemini', 100, 50);
        logUsageServer('deepseek', 200, 100);

        const records = getServerRecords();
        expect(records.length).toBeGreaterThanOrEqual(2);
    });
});
