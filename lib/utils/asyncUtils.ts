/**
 * Async Utilities with Result Pattern
 * FSD: lib/utils/asyncUtils.ts
 * 
 * Phase 3: Type-safe async operations with Result pattern
 * Eliminates try/catch boilerplate and provides structured error handling
 */

import { IfritError, wrapError, type ErrorCode } from '../errors';

// ============================================================================
// Result Type
// ============================================================================

/**
 * Type-safe Result pattern for operations that can fail
 * Inspired by Rust's Result<T, E>
 */
export type Result<T, E = IfritError> =
    | { ok: true; value: T }
    | { ok: false; error: E };

/**
 * Create a successful result
 */
export function Ok<T>(value: T): Result<T, never> {
    return { ok: true, value };
}

/**
 * Create a failed result
 */
export function Err<E>(error: E): Result<never, E> {
    return { ok: false, error };
}

/**
 * Check if result is Ok
 */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
    return result.ok;
}

/**
 * Check if result is Err
 */
export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
    return !result.ok;
}

// ============================================================================
// Async Result Wrappers
// ============================================================================

/**
 * Wrap an async function to return Result instead of throwing
 */
export async function tryAsync<T>(
    fn: () => Promise<T>,
    errorCode?: ErrorCode
): Promise<Result<T, IfritError>> {
    try {
        const value = await fn();
        return Ok(value);
    } catch (error) {
        return Err(wrapError(error, errorCode || 'UNKNOWN_ERROR'));
    }
}

/**
 * Wrap a sync function to return Result instead of throwing
 */
export function trySync<T>(
    fn: () => T,
    errorCode?: ErrorCode
): Result<T, IfritError> {
    try {
        const value = fn();
        return Ok(value);
    } catch (error) {
        return Err(wrapError(error, errorCode || 'UNKNOWN_ERROR'));
    }
}

// ============================================================================
// Result Utilities
// ============================================================================

/**
 * Map over a successful result
 */
export function mapResult<T, U, E>(
    result: Result<T, E>,
    fn: (value: T) => U
): Result<U, E> {
    if (result.ok) {
        return Ok(fn(result.value));
    }
    return result;
}

/**
 * Map over a failed result
 */
export function mapError<T, E, F>(
    result: Result<T, E>,
    fn: (error: E) => F
): Result<T, F> {
    if (!result.ok) {
        return Err(fn(result.error));
    }
    return result;
}

/**
 * Chain results (flatMap)
 */
export function andThen<T, U, E>(
    result: Result<T, E>,
    fn: (value: T) => Result<U, E>
): Result<U, E> {
    if (result.ok) {
        return fn(result.value);
    }
    return result;
}

/**
 * Unwrap result or throw
 */
export function unwrapResult<T>(result: Result<T, IfritError>): T {
    if (result.ok) {
        return result.value;
    }
    throw result.error;
}

/**
 * Unwrap result or return default
 */
export function unwrapOr<T>(result: Result<T, unknown>, defaultValue: T): T {
    if (result.ok) {
        return result.value;
    }
    return defaultValue;
}

/**
 * Unwrap result or compute default
 */
export function unwrapOrElse<T, E>(
    result: Result<T, E>,
    fn: (error: E) => T
): T {
    if (result.ok) {
        return result.value;
    }
    return fn(result.error);
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Collect multiple results into a single result with array of values
 */
export function collectResults<T>(
    results: Result<T, IfritError>[]
): Result<T[], IfritError> {
    const values: T[] = [];

    for (const result of results) {
        if (!result.ok) {
            return result;
        }
        values.push(result.value);
    }

    return Ok(values);
}

/**
 * Collect all results, separating successes and failures
 */
export function partitionResults<T>(
    results: Result<T, IfritError>[]
): { successes: T[]; failures: IfritError[] } {
    const successes: T[] = [];
    const failures: IfritError[] = [];

    for (const result of results) {
        if (result.ok) {
            successes.push(result.value);
        } else {
            failures.push(result.error);
        }
    }

    return { successes, failures };
}

// ============================================================================
// Retry Logic
// ============================================================================

export interface RetryOptions {
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier?: number;
    maxDelayMs?: number;
    shouldRetry?: (error: IfritError, attempt: number) => boolean;
    onRetry?: (error: IfritError, attempt: number, nextDelayMs: number) => void;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
    maxDelayMs: 30000,
};

/**
 * Retry an async operation with exponential backoff
 */
export async function retryAsync<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
): Promise<Result<T, IfritError>> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: IfritError | null = null;
    let delay = opts.delayMs;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
        const result = await tryAsync(fn);

        if (result.ok) {
            return result;
        }

        lastError = result.error;

        // Check if we should retry
        const shouldRetry = opts.shouldRetry?.(result.error, attempt) ?? result.error.retryable;

        if (!shouldRetry || attempt === opts.maxAttempts) {
            return result;
        }

        // Notify about retry
        opts.onRetry?.(result.error, attempt, delay);

        // Wait before next attempt
        await sleep(delay);

        // Increase delay with backoff
        delay = Math.min(
            delay * (opts.backoffMultiplier || 2),
            opts.maxDelayMs || 30000
        );
    }

    return Err(lastError || wrapError(new Error('Retry failed')));
}

// ============================================================================
// Promise Utilities
// ============================================================================

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Race a promise against a timeout
 */
export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutError?: IfritError
): Promise<Result<T, IfritError>> {
    const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => {
            reject(timeoutError || wrapError(new Error(`Operation timed out after ${timeoutMs}ms`)));
        }, timeoutMs);
    });

    try {
        const value = await Promise.race([promise, timeout]);
        return Ok(value);
    } catch (error) {
        return Err(error instanceof IfritError ? error : wrapError(error));
    }
}

/**
 * Run promises in parallel with concurrency limit
 */
export async function parallelLimit<T, R>(
    items: T[],
    limit: number,
    fn: (item: T, index: number) => Promise<R>
): Promise<Result<R, IfritError>[]> {
    const results: Result<R, IfritError>[] = [];
    const executing: Promise<void>[] = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        const promise = tryAsync(() => fn(item, i)).then(result => {
            results[i] = result;
        });

        executing.push(promise);

        if (executing.length >= limit) {
            await Promise.race(executing);
            // Remove resolved promises
            const stillExecuting = executing.filter(p => {
                const resolved = results.some((_, idx) => executing.indexOf(p) === idx);
                return !resolved;
            });
            executing.length = 0;
            executing.push(...stillExecuting);
        }
    }

    await Promise.all(executing);
    return results;
}

/**
 * Debounce an async function
 */
export function debounceAsync<T extends unknown[], R>(
    fn: (...args: T) => Promise<R>,
    delayMs: number
): (...args: T) => Promise<R> {
    let timeoutId: NodeJS.Timeout | null = null;
    let pendingResolve: ((value: R) => void) | null = null;
    let pendingReject: ((error: unknown) => void) | null = null;

    return (...args: T): Promise<R> => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        return new Promise<R>((resolve, reject) => {
            pendingResolve = resolve;
            pendingReject = reject;

            timeoutId = setTimeout(async () => {
                try {
                    const result = await fn(...args);
                    pendingResolve?.(result);
                } catch (error) {
                    pendingReject?.(error);
                }
            }, delayMs);
        });
    };
}
