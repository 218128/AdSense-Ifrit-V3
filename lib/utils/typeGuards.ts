/**
 * Type Guards
 * FSD: lib/utils/typeGuards.ts
 * 
 * Phase 3: Type-safe runtime type checking
 * Eliminates `any` types in error handling and data validation
 */

// ============================================================================
// Primitive Type Guards
// ============================================================================

export function isString(value: unknown): value is string {
    return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
    return typeof value === 'boolean';
}

export function isNull(value: unknown): value is null {
    return value === null;
}

export function isUndefined(value: unknown): value is undefined {
    return value === undefined;
}

export function isNullish(value: unknown): value is null | undefined {
    return value === null || value === undefined;
}

export function isDefined<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
}

// ============================================================================
// Object Type Guards
// ============================================================================

export function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
}

export function isArrayOf<T>(
    value: unknown,
    guard: (item: unknown) => item is T
): value is T[] {
    return Array.isArray(value) && value.every(guard);
}

export function isRecord<K extends string | number | symbol, V>(
    value: unknown,
    keyGuard: (key: unknown) => key is K,
    valueGuard: (val: unknown) => val is V
): value is Record<K, V> {
    if (!isObject(value)) return false;
    return Object.entries(value).every(
        ([k, v]) => keyGuard(k) && valueGuard(v)
    );
}

// ============================================================================
// Error Type Guards
// ============================================================================

export function isError(value: unknown): value is Error {
    return value instanceof Error;
}

export function hasMessage(value: unknown): value is { message: string } {
    return isObject(value) && 'message' in value && isString(value.message);
}

export function hasCode(value: unknown): value is { code: string } {
    return isObject(value) && 'code' in value && isString(value.code);
}

export function hasStatus(value: unknown): value is { status: number } {
    return isObject(value) && 'status' in value && isNumber(value.status);
}

// ============================================================================
// API Response Type Guards
// ============================================================================

export interface SuccessResponse<T> {
    success: true;
    data: T;
}

export interface ErrorResponse {
    success: false;
    error: string;
    code?: string;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export function isSuccessResponse<T>(
    response: ApiResponse<T>
): response is SuccessResponse<T> {
    return response.success === true && 'data' in response;
}

export function isErrorResponse(
    response: unknown
): response is ErrorResponse {
    return (
        isObject(response) &&
        response.success === false &&
        'error' in response &&
        isString(response.error)
    );
}

// ============================================================================
// Domain Type Guards
// ============================================================================

export interface HasId {
    id: string;
}

export function hasId(value: unknown): value is HasId {
    return isObject(value) && 'id' in value && isString(value.id);
}

export interface HasTimestamps {
    createdAt: number;
    updatedAt: number;
}

export function hasTimestamps(value: unknown): value is HasTimestamps {
    return (
        isObject(value) &&
        'createdAt' in value &&
        isNumber(value.createdAt) &&
        'updatedAt' in value &&
        isNumber(value.updatedAt)
    );
}

// ============================================================================
// WordPress Type Guards
// ============================================================================

export function isWPSite(value: unknown): value is {
    id: string;
    url: string;
    username: string;
    appPassword: string;
} {
    return (
        isObject(value) &&
        'id' in value && isString(value.id) &&
        'url' in value && isString(value.url) &&
        'username' in value && isString(value.username) &&
        'appPassword' in value && isString(value.appPassword)
    );
}

export function isWPPostResult(value: unknown): value is {
    id: number;
    link: string;
} {
    return (
        isObject(value) &&
        'id' in value && isNumber(value.id) &&
        'link' in value && isString(value.link)
    );
}

// ============================================================================
// Campaign Type Guards
// ============================================================================

export function isCampaign(value: unknown): value is {
    id: string;
    name: string;
    status: string;
    sourceType: string;
    targetSiteId: string;
} {
    return (
        isObject(value) &&
        'id' in value && isString(value.id) &&
        'name' in value && isString(value.name) &&
        'status' in value && isString(value.status) &&
        'sourceType' in value && isString(value.sourceType) &&
        'targetSiteId' in value && isString(value.targetSiteId)
    );
}

// ============================================================================
// Utility Guards
// ============================================================================

/**
 * Narrow a union type by checking a discriminant property
 */
export function hasProperty<K extends string>(
    value: unknown,
    key: K
): value is Record<K, unknown> {
    return isObject(value) && key in value;
}

/**
 * Check if a value has all specified keys
 */
export function hasKeys<K extends string>(
    value: unknown,
    keys: readonly K[]
): value is Record<K, unknown> {
    return isObject(value) && keys.every(key => key in value);
}

/**
 * Safely access a nested property
 */
export function getNestedProperty<T>(
    obj: unknown,
    path: string
): T | undefined {
    if (!isObject(obj)) return undefined;

    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
        if (!isObject(current) || !(key in current)) {
            return undefined;
        }
        current = (current as Record<string, unknown>)[key];
    }

    return current as T;
}

/**
 * Assert a type at runtime (throws if false)
 */
export function assertType<T>(
    value: unknown,
    guard: (v: unknown) => v is T,
    message?: string
): asserts value is T {
    if (!guard(value)) {
        throw new TypeError(message || 'Type assertion failed');
    }
}

/**
 * Create a type guard for a specific literal type
 */
export function isLiteral<T extends string | number | boolean>(
    literal: T
): (value: unknown) => value is T {
    return (value: unknown): value is T => value === literal;
}

/**
 * Create a type guard for a union of literals
 */
export function isOneOf<T extends string | number | boolean>(
    ...literals: T[]
): (value: unknown) => value is T {
    const set = new Set(literals);
    return (value: unknown): value is T => set.has(value as T);
}
