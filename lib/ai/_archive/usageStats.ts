/**
 * Usage Statistics Tracking
 * 
 * Tracks AI API usage per provider/model:
 * - Request counts
 * - Token usage
 * - Latency
 * - Estimated costs
 * 
 * Data persisted to localStorage (last 1000 records)
 */

import { ProviderId } from './providers/base';

// ============================================
// TYPES
// ============================================

export interface UsageRecord {
    timestamp: number;
    providerId: ProviderId;
    modelId: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    success: boolean;
    error?: string;
}

export interface ProviderStats {
    providerId: ProviderId;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    averageLatencyMs: number;
    estimatedCostUsd: number;
    lastUsed: number;
    modelBreakdown: Record<string, {
        requests: number;
        inputTokens: number;
        outputTokens: number;
    }>;
}

// ============================================
// PRICING (per 1M tokens, Dec 2025)
// ============================================

const PRICING: Record<ProviderId, { input: number; output: number }> = {
    gemini: { input: 0, output: 0 },           // Free tier
    deepseek: { input: 0.28, output: 0.42 },   // V3 pricing
    openrouter: { input: 0.10, output: 0.10 }, // Varies by model
    perplexity: { input: 1.00, output: 1.00 }, // Sonar pricing
    vercel: { input: 0.50, output: 0.50 }      // Gateway average
};

// ============================================
// STORAGE
// ============================================

const STORAGE_KEY = 'ifrit_usage_stats';
const MAX_RECORDS = 1000;

function getRecords(): UsageRecord[] {
    if (typeof window === 'undefined') return [];

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function saveRecords(records: UsageRecord[]): void {
    if (typeof window === 'undefined') return;

    // Keep only last MAX_RECORDS
    const trimmed = records.slice(-MAX_RECORDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

// ============================================
// TRACKING FUNCTIONS
// ============================================

/**
 * Record a usage event after an API call
 */
export function recordUsage(record: UsageRecord): void {
    const records = getRecords();
    records.push(record);
    saveRecords(records);
}

/**
 * Helper to record usage from a provider call
 */
export function trackProviderCall(
    providerId: ProviderId,
    modelId: string,
    startTime: number,
    result: { success: boolean; inputTokens?: number; outputTokens?: number; error?: string }
): void {
    recordUsage({
        timestamp: Date.now(),
        providerId,
        modelId,
        inputTokens: result.inputTokens || 0,
        outputTokens: result.outputTokens || 0,
        latencyMs: Date.now() - startTime,
        success: result.success,
        error: result.error
    });
}

// ============================================
// STATS FUNCTIONS
// ============================================

/**
 * Get usage statistics for a specific provider
 */
export function getProviderStats(providerId: ProviderId): ProviderStats {
    const records = getRecords().filter(r => r.providerId === providerId);

    const successRecords = records.filter(r => r.success);
    const failedRecords = records.filter(r => !r.success);

    const totalInputTokens = records.reduce((sum, r) => sum + r.inputTokens, 0);
    const totalOutputTokens = records.reduce((sum, r) => sum + r.outputTokens, 0);
    const totalLatency = records.reduce((sum, r) => sum + r.latencyMs, 0);

    // Calculate cost
    const pricing = PRICING[providerId];
    const estimatedCostUsd =
        (totalInputTokens / 1_000_000) * pricing.input +
        (totalOutputTokens / 1_000_000) * pricing.output;

    // Model breakdown
    const modelBreakdown: Record<string, { requests: number; inputTokens: number; outputTokens: number }> = {};
    for (const record of records) {
        if (!modelBreakdown[record.modelId]) {
            modelBreakdown[record.modelId] = { requests: 0, inputTokens: 0, outputTokens: 0 };
        }
        modelBreakdown[record.modelId].requests++;
        modelBreakdown[record.modelId].inputTokens += record.inputTokens;
        modelBreakdown[record.modelId].outputTokens += record.outputTokens;
    }

    return {
        providerId,
        totalRequests: records.length,
        successfulRequests: successRecords.length,
        failedRequests: failedRecords.length,
        totalInputTokens,
        totalOutputTokens,
        averageLatencyMs: records.length > 0 ? Math.round(totalLatency / records.length) : 0,
        estimatedCostUsd: Math.round(estimatedCostUsd * 100) / 100,
        lastUsed: records.length > 0 ? Math.max(...records.map(r => r.timestamp)) : 0,
        modelBreakdown
    };
}

/**
 * Get usage statistics for all providers
 */
export function getAllStats(): ProviderStats[] {
    const providerIds: ProviderId[] = ['gemini', 'deepseek', 'openrouter', 'perplexity', 'vercel'];
    return providerIds.map(id => getProviderStats(id));
}

/**
 * Get total usage summary
 */
export function getTotalStats(): {
    totalRequests: number;
    totalTokens: number;
    totalCostUsd: number;
    successRate: number;
} {
    const allStats = getAllStats();

    const totalRequests = allStats.reduce((sum, s) => sum + s.totalRequests, 0);
    const successfulRequests = allStats.reduce((sum, s) => sum + s.successfulRequests, 0);
    const totalTokens = allStats.reduce((sum, s) => sum + s.totalInputTokens + s.totalOutputTokens, 0);
    const totalCostUsd = allStats.reduce((sum, s) => sum + s.estimatedCostUsd, 0);

    return {
        totalRequests,
        totalTokens,
        totalCostUsd: Math.round(totalCostUsd * 100) / 100,
        successRate: totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 100
    };
}

/**
 * Get recent usage records (for detailed view)
 */
export function getRecentRecords(limit: number = 50): UsageRecord[] {
    const records = getRecords();
    return records.slice(-limit).reverse();
}

/**
 * Clear all usage statistics
 */
export function clearStats(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Export usage data as JSON
 */
export function exportUsageData(): string {
    const records = getRecords();
    const stats = getAllStats();
    const total = getTotalStats();

    return JSON.stringify({
        exportedAt: new Date().toISOString(),
        summary: total,
        providerStats: stats,
        records
    }, null, 2);
}
