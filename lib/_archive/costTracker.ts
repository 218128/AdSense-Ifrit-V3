/**
 * AI Cost Tracker
 * 
 * Tracks token usage and costs for AI provider calls.
 * Stores data in localStorage for persistence across sessions.
 */

import { calculateCost } from './providerPricing';

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
    records: UsageRecord[];
}

export interface CreditBalance {
    provider: string;
    remaining: number;
    total: number;
    updatedAt: number;
}

const STORAGE_KEY = 'ai_usage_records';
const CREDITS_KEY = 'ai_credits';

/**
 * Log a usage record
 */
export function logUsage(
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
        topic: options?.topic
    };

    // Save to storage
    const records = getUsageRecords();
    records.push(record);

    // Keep only last 1000 records
    const trimmedRecords = records.slice(-1000);

    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedRecords));
    }

    return record;
}

/**
 * Get all usage records
 */
export function getUsageRecords(): UsageRecord[] {
    if (typeof window === 'undefined') return [];

    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

/**
 * Get usage records for a specific time period
 */
export function getUsageForPeriod(
    startTime: number,
    endTime: number = Date.now()
): UsageRecord[] {
    const records = getUsageRecords();
    return records.filter(r => r.timestamp >= startTime && r.timestamp <= endTime);
}

/**
 * Get usage records for today
 */
export function getTodayUsage(): UsageRecord[] {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return getUsageForPeriod(startOfDay.getTime());
}

/**
 * Get usage records for this session (last 24 hours or since page load)
 */
export function getSessionUsage(): UsageRecord[] {
    const sessionStart = Date.now() - (24 * 60 * 60 * 1000); // Last 24 hours
    return getUsageForPeriod(sessionStart);
}

/**
 * Get usage records for a specific job
 */
export function getJobUsage(jobId: string): UsageRecord[] {
    const records = getUsageRecords();
    return records.filter(r => r.jobId === jobId);
}

/**
 * Calculate usage summary
 */
export function getUsageSummary(records?: UsageRecord[]): UsageSummary {
    const data = records || getUsageRecords();

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
                totalCost: 0
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
        records: data
    };
}

/**
 * Set credit balance for a provider (manual entry)
 */
export function setCreditBalance(
    provider: string,
    remaining: number,
    total: number = 5.00 // Default for Perplexity Pro
): void {
    if (typeof window === 'undefined') return;

    const credits = getCreditBalances();
    credits[provider] = {
        provider,
        remaining,
        total,
        updatedAt: Date.now()
    };

    localStorage.setItem(CREDITS_KEY, JSON.stringify(credits));
}

/**
 * Get credit balances
 */
export function getCreditBalances(): Record<string, CreditBalance> {
    if (typeof window === 'undefined') return {};

    try {
        const data = localStorage.getItem(CREDITS_KEY);
        return data ? JSON.parse(data) : {};
    } catch {
        return {};
    }
}

/**
 * Get credit balance for a specific provider
 */
export function getCreditBalance(provider: string): CreditBalance | null {
    const balances = getCreditBalances();
    return balances[provider] || null;
}

/**
 * Clear all usage records
 */
export function clearUsageRecords(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
    }
}

/**
 * Export usage data as JSON
 */
export function exportUsageData(): string {
    const records = getUsageRecords();
    const credits = getCreditBalances();

    return JSON.stringify({
        records,
        credits,
        exportedAt: new Date().toISOString()
    }, null, 2);
}
