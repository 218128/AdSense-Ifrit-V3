/**
 * AI Response Cache - In-Memory TTL Cache
 * 
 * Caches AI provider responses to reduce API costs and latency.
 * Uses a simple hash of (capability + prompt + model) as cache key.
 * 
 * @module lib/ai/cache/responseCache
 */

import type { ExecuteResult } from '../services/types';

// ============================================
// CACHE CONFIGURATION
// ============================================

/**
 * Default TTL in milliseconds (5 minutes)
 */
const DEFAULT_TTL_MS = 5 * 60 * 1000;

/**
 * Maximum cache entries to prevent memory bloat
 */
const MAX_CACHE_ENTRIES = 100;

/**
 * Capabilities that should NOT be cached (always need fresh data)
 */
const BYPASS_CACHE_CAPABILITIES = [
    'research',      // Web search needs fresh data
    'trend-scan',    // Real-time trends
    'scrape',        // Live web scraping
    'domain-search', // Real-time domain availability
];

// ============================================
// CACHE ENTRY TYPE
// ============================================

interface CacheEntry {
    result: ExecuteResult;
    expiresAt: number;
    createdAt: number;
}

// ============================================
// CACHE IMPLEMENTATION
// ============================================

class ResponseCacheClass {
    private cache: Map<string, CacheEntry> = new Map();
    private defaultTtlMs: number = DEFAULT_TTL_MS;

    /**
     * Generate a cache key from request parameters
     */
    private generateKey(capability: string, prompt: string, model?: string): string {
        // Simple hash: Base64 of concatenated string (fast, not cryptographic)
        const input = `${capability}:${model || 'default'}:${prompt.slice(0, 500)}`;

        // Simple hash function for browser compatibility
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }

        return `cache_${capability}_${hash}`;
    }

    /**
     * Check if a capability should bypass the cache
     */
    shouldBypassCache(capability: string): boolean {
        return BYPASS_CACHE_CAPABILITIES.includes(capability);
    }

    /**
     * Get a cached result if available and not expired
     */
    get(capability: string, prompt: string, model?: string): ExecuteResult | null {
        // Don't cache certain capabilities
        if (this.shouldBypassCache(capability)) {
            return null;
        }

        const key = this.generateKey(capability, prompt, model);
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check expiration
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        // Return cached result with cache metadata
        return {
            ...entry.result,
            metadata: {
                ...entry.result.metadata,
                fromCache: true,
                cachedAt: entry.createdAt,
            }
        };
    }

    /**
     * Store a result in the cache
     */
    set(
        capability: string,
        prompt: string,
        result: ExecuteResult,
        model?: string,
        ttlMs?: number
    ): void {
        // Don't cache certain capabilities
        if (this.shouldBypassCache(capability)) {
            return;
        }

        // Only cache successful results
        if (!result.success) {
            return;
        }

        // Evict old entries if at capacity
        if (this.cache.size >= MAX_CACHE_ENTRIES) {
            this.evictOldest();
        }

        const key = this.generateKey(capability, prompt, model);
        const now = Date.now();
        const ttl = ttlMs || this.defaultTtlMs;

        this.cache.set(key, {
            result,
            createdAt: now,
            expiresAt: now + ttl,
        });
    }

    /**
     * Evict the oldest entry (LRU-style)
     */
    private evictOldest(): void {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.createdAt < oldestTime) {
                oldestTime = entry.createdAt;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }

    /**
     * Clear all cached entries
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Clear expired entries
     */
    prune(): number {
        const now = Date.now();
        let pruned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                pruned++;
            }
        }

        return pruned;
    }

    /**
     * Get cache statistics
     */
    getStats(): { size: number; maxSize: number; ttlMs: number } {
        return {
            size: this.cache.size,
            maxSize: MAX_CACHE_ENTRIES,
            ttlMs: this.defaultTtlMs,
        };
    }

    /**
     * Set default TTL
     */
    setDefaultTtl(ttlMs: number): void {
        this.defaultTtlMs = ttlMs;
    }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const responseCache = new ResponseCacheClass();
