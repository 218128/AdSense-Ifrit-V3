/**
 * Usage Store - Zustand state management for AI usage tracking
 * 
 * Centralizes state for:
 * - AI usage records (tokens, costs)
 * - Credit balances (Perplexity Pro, etc.)
 * - Per-provider statistics
 * 
 * Follows same pattern as settingsStore.ts
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============ TYPES ============

export interface UsageRecord {
    id: string;
    provider: string;
    model?: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    timestamp: number;
    jobId?: string;
    itemType?: string;
    topic?: string;
}

export interface ProviderUsageSummary {
    provider: string;
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
}

export interface UsageSummary {
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
    byProvider: ProviderUsageSummary[];
    avgCostPerRequest: number;
}

export interface CreditBalance {
    provider: string;
    remaining: number;
    total: number;
    updatedAt: number;
}

// ============ STORE INTERFACE ============

interface UsageStore {
    // State
    records: UsageRecord[];
    creditBalances: Record<string, CreditBalance>;

    // Actions
    logUsage: (
        provider: string,
        inputTokens: number,
        outputTokens: number,
        options?: {
            model?: string;
            jobId?: string;
            itemType?: string;
            topic?: string;
        }
    ) => UsageRecord;

    getUsageSummary: (records?: UsageRecord[]) => UsageSummary;
    getTodayUsage: () => UsageRecord[];
    getSessionUsage: () => UsageRecord[];
    getJobUsage: (jobId: string) => UsageRecord[];

    setCreditBalance: (provider: string, remaining: number, total?: number) => void;
    getCreditBalance: (provider: string) => CreditBalance | null;
    deductCredit: (provider: string, amount: number) => void;

    clearUsageRecords: () => void;
    exportUsageData: () => string;
}

// ============ COST CALCULATION ============

// Provider pricing (per 1M tokens)
const PROVIDER_PRICING: Record<string, { input: number; output: number; name: string }> = {
    gemini: { input: 0.075, output: 0.30, name: 'Google Gemini' },
    deepseek: { input: 0.14, output: 0.28, name: 'DeepSeek' },
    openrouter: { input: 0.50, output: 1.50, name: 'OpenRouter' },
    perplexity: { input: 0.20, output: 0.20, name: 'Perplexity' },
    vercel: { input: 0.15, output: 0.60, name: 'Vercel AI' },
};

function calculateCost(provider: string, inputTokens: number, outputTokens: number): number {
    const pricing = PROVIDER_PRICING[provider.toLowerCase()];
    if (!pricing) return 0;

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
}

// ============ STORE IMPLEMENTATION ============

export const useUsageStore = create<UsageStore>()(
    persist(
        (set, get) => ({
            // ============ STATE ============
            records: [],
            creditBalances: {},

            // ============ ACTIONS ============

            logUsage: (provider, inputTokens, outputTokens, options) => {
                const cost = calculateCost(provider, inputTokens, outputTokens);

                const record: UsageRecord = {
                    id: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    provider,
                    model: options?.model,
                    inputTokens,
                    outputTokens,
                    cost,
                    timestamp: Date.now(),
                    jobId: options?.jobId,
                    itemType: options?.itemType,
                    topic: options?.topic,
                };

                set((state) => ({
                    // Keep only last 1000 records
                    records: [...state.records, record].slice(-1000),
                }));

                return record;
            },

            getUsageSummary: (recordsArg) => {
                const data = recordsArg ?? get().records;
                const byProvider: Record<string, ProviderUsageSummary> = {};

                let totalRequests = 0;
                let totalInputTokens = 0;
                let totalOutputTokens = 0;
                let totalCost = 0;

                for (const record of data) {
                    totalRequests++;
                    totalInputTokens += record.inputTokens;
                    totalOutputTokens += record.outputTokens;
                    totalCost += record.cost;

                    if (!byProvider[record.provider]) {
                        byProvider[record.provider] = {
                            provider: record.provider,
                            totalRequests: 0,
                            totalInputTokens: 0,
                            totalOutputTokens: 0,
                            totalCost: 0,
                        };
                    }

                    byProvider[record.provider].totalRequests++;
                    byProvider[record.provider].totalInputTokens += record.inputTokens;
                    byProvider[record.provider].totalOutputTokens += record.outputTokens;
                    byProvider[record.provider].totalCost += record.cost;
                }

                return {
                    totalRequests,
                    totalInputTokens,
                    totalOutputTokens,
                    totalCost,
                    byProvider: Object.values(byProvider),
                    avgCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
                };
            },

            getTodayUsage: () => {
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);
                const startTime = startOfDay.getTime();

                return get().records.filter((r) => r.timestamp >= startTime);
            },

            getSessionUsage: () => {
                const sessionStart = Date.now() - 24 * 60 * 60 * 1000; // Last 24 hours
                return get().records.filter((r) => r.timestamp >= sessionStart);
            },

            getJobUsage: (jobId) => {
                return get().records.filter((r) => r.jobId === jobId);
            },

            setCreditBalance: (provider, remaining, total = 5.0) => {
                set((state) => ({
                    creditBalances: {
                        ...state.creditBalances,
                        [provider]: {
                            provider,
                            remaining,
                            total,
                            updatedAt: Date.now(),
                        },
                    },
                }));
            },

            getCreditBalance: (provider) => {
                return get().creditBalances[provider] || null;
            },

            deductCredit: (provider, amount) => {
                const current = get().creditBalances[provider];
                if (!current) return;

                const newRemaining = Math.max(0, current.remaining - amount);
                set((state) => ({
                    creditBalances: {
                        ...state.creditBalances,
                        [provider]: {
                            ...current,
                            remaining: newRemaining,
                            updatedAt: Date.now(),
                        },
                    },
                }));
            },

            clearUsageRecords: () => {
                set({ records: [] });
            },

            exportUsageData: () => {
                const { records, creditBalances } = get();
                return JSON.stringify(
                    {
                        records,
                        creditBalances,
                        exportedAt: new Date().toISOString(),
                    },
                    null,
                    2
                );
            },
        }),
        {
            name: 'ifrit-usage-store',
        }
    )
);

// ============ STANDALONE HELPERS FOR SERVER-SIDE ============
// These can be called from API routes where hooks can't be used

let serverRecords: UsageRecord[] = [];

export function logUsageServer(
    provider: string,
    inputTokens: number,
    outputTokens: number,
    options?: {
        model?: string;
        jobId?: string;
        itemType?: string;
        topic?: string;
    }
): UsageRecord {
    const cost = calculateCost(provider, inputTokens, outputTokens);

    const record: UsageRecord = {
        id: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        provider,
        model: options?.model,
        inputTokens,
        outputTokens,
        cost,
        timestamp: Date.now(),
        jobId: options?.jobId,
        itemType: options?.itemType,
        topic: options?.topic,
    };

    // Store in memory for server-side (will be synced to client store)
    serverRecords = [...serverRecords, record].slice(-1000);

    return record;
}

export function getServerRecords(): UsageRecord[] {
    return serverRecords;
}
