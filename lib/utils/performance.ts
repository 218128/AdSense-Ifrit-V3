/**
 * Performance Utilities (T2)
 * 
 * Caching, rate limiting, and error handling utilities
 * for improved application reliability.
 */

/**
 * Simple in-memory cache with TTL
 */
export class SimpleCache<T> {
    private cache: Map<string, { value: T; expiresAt: number }> = new Map();
    private defaultTTL: number;

    constructor(defaultTTLMs: number = 5 * 60 * 1000) { // 5 minutes default
        this.defaultTTL = defaultTTLMs;
    }

    get(key: string): T | undefined {
        const item = this.cache.get(key);

        if (!item) return undefined;

        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return undefined;
        }

        return item.value;
    }

    set(key: string, value: T, ttlMs?: number): void {
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + (ttlMs ?? this.defaultTTL)
        });
    }

    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    size(): number {
        return this.cache.size;
    }

    /**
     * Get or compute value if not cached
     */
    async getOrCompute(
        key: string,
        computeFn: () => Promise<T>,
        ttlMs?: number
    ): Promise<T> {
        const cached = this.get(key);
        if (cached !== undefined) {
            return cached;
        }

        const value = await computeFn();
        this.set(key, value, ttlMs);
        return value;
    }
}

/**
 * Rate limiter for API calls
 */
export class RateLimiter {
    private requests: number[] = [];
    private maxRequests: number;
    private windowMs: number;

    constructor(maxRequests: number = 10, windowMs: number = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }

    canMakeRequest(): boolean {
        this.cleanup();
        return this.requests.length < this.maxRequests;
    }

    recordRequest(): void {
        this.cleanup();
        this.requests.push(Date.now());
    }

    getTimeUntilNextSlot(): number {
        this.cleanup();

        if (this.requests.length < this.maxRequests) {
            return 0;
        }

        const oldestRequest = this.requests[0];
        return Math.max(0, oldestRequest + this.windowMs - Date.now());
    }

    private cleanup(): void {
        const now = Date.now();
        this.requests = this.requests.filter(t => now - t < this.windowMs);
    }
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    options: {
        maxRetries?: number;
        initialDelayMs?: number;
        maxDelayMs?: number;
        retryCondition?: (error: unknown) => boolean;
    } = {}
): Promise<T> {
    const {
        maxRetries = 3,
        initialDelayMs = 1000,
        maxDelayMs = 30000,
        retryCondition = () => true
    } = options;

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt === maxRetries || !retryCondition(error)) {
                throw error;
            }

            const delay = Math.min(
                initialDelayMs * Math.pow(2, attempt),
                maxDelayMs
            );

            await sleep(delay);
        }
    }

    throw lastError;
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
    fn: T,
    delayMs: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delayMs);
    };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
    fn: T,
    limitMs: number
): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limitMs);
        }
    };
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
    try {
        return JSON.parse(json);
    } catch {
        return fallback;
    }
}

/**
 * Error wrapper for consistent error handling
 */
export class AppError extends Error {
    code: string;
    statusCode: number;
    isOperational: boolean;

    constructor(
        message: string,
        code: string = 'UNKNOWN_ERROR',
        statusCode: number = 500,
        isOperational: boolean = true
    ) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Create a wrapped async handler that catches errors
 */
export function asyncHandler<T extends (...args: Parameters<T>) => Promise<ReturnType<T>>>(
    fn: T
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
        try {
            return await fn(...args);
        } catch (error) {
            console.error('Async handler error:', error);
            throw error;
        }
    };
}

/**
 * Measure execution time
 */
export async function measureTime<T>(
    fn: () => Promise<T>,
    label: string
): Promise<{ result: T; durationMs: number }> {
    const start = performance.now();
    const result = await fn();
    const durationMs = Math.round(performance.now() - start);

    console.log(`⏱️ ${label}: ${durationMs}ms`);

    return { result, durationMs };
}

/**
 * Batch processor for handling multiple items with rate limiting
 */
export async function processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options: {
        batchSize?: number;
        delayBetweenBatches?: number;
        onProgress?: (completed: number, total: number) => void;
    } = {}
): Promise<R[]> {
    const { batchSize = 5, delayBetweenBatches = 1000, onProgress } = options;
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(processor));
        results.push(...batchResults);

        if (onProgress) {
            onProgress(results.length, items.length);
        }

        if (i + batchSize < items.length) {
            await sleep(delayBetweenBatches);
        }
    }

    return results;
}
