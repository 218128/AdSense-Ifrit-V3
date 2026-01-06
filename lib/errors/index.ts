/**
 * Ifrit Error Types
 * FSD: lib/errors/index.ts
 * 
 * Phase 2 Enhancement: Typed error hierarchy for consistent error handling
 */

// ============================================================================
// Error Codes
// ============================================================================

export type ErrorCode =
    // AI/Content Generation
    | 'AI_REQUEST_FAILED'
    | 'AI_RESPONSE_INVALID'
    | 'AI_RATE_LIMIT'
    | 'AI_KEY_MISSING'
    | 'CONTENT_GENERATION_FAILED'
    | 'IMAGE_GENERATION_FAILED'
    | 'RESEARCH_FAILED'

    // WordPress
    | 'WP_CONNECTION_FAILED'
    | 'WP_AUTH_FAILED'
    | 'WP_POST_FAILED'
    | 'WP_MEDIA_FAILED'

    // Hunt
    | 'PROFILE_GENERATION_FAILED'
    | 'DOMAIN_ANALYSIS_FAILED'
    | 'KEYWORD_ANALYSIS_FAILED'

    // Pipeline
    | 'PIPELINE_STAGE_FAILED'
    | 'PIPELINE_ABORTED'
    | 'DEDUPLICATION_BLOCKED'

    // Hosting
    | 'HOSTINGER_API_FAILED'
    | 'SITE_PROVISION_FAILED'
    | 'DNS_CONFIG_FAILED'

    // General
    | 'VALIDATION_ERROR'
    | 'NOT_FOUND'
    | 'UNAUTHORIZED'
    | 'UNKNOWN_ERROR';

// ============================================================================
// Base Error Class
// ============================================================================

export class IfritError extends Error {
    public readonly timestamp: number;

    constructor(
        message: string,
        public readonly code: ErrorCode,
        public readonly context?: Record<string, unknown>,
        public readonly recoverable: boolean = false,
        public readonly retryable: boolean = false
    ) {
        super(message);
        this.name = 'IfritError';
        this.timestamp = Date.now();

        // Maintains proper stack trace for where error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, IfritError);
        }
    }

    toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            context: this.context,
            recoverable: this.recoverable,
            retryable: this.retryable,
            timestamp: this.timestamp,
        };
    }
}

// ============================================================================
// AI Errors
// ============================================================================

export class AIError extends IfritError {
    constructor(
        message: string,
        code: ErrorCode = 'AI_REQUEST_FAILED',
        context?: Record<string, unknown>
    ) {
        super(message, code, context, true, true);
        this.name = 'AIError';
    }
}

export class ContentGenerationError extends IfritError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, 'CONTENT_GENERATION_FAILED', context, true, true);
        this.name = 'ContentGenerationError';
    }
}

export class ImageGenerationError extends IfritError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, 'IMAGE_GENERATION_FAILED', context, true, true);
        this.name = 'ImageGenerationError';
    }
}

export class RateLimitError extends IfritError {
    constructor(
        message: string,
        public readonly retryAfter?: number,
        context?: Record<string, unknown>
    ) {
        super(message, 'AI_RATE_LIMIT', context, true, true);
        this.name = 'RateLimitError';
    }
}

// ============================================================================
// WordPress Errors
// ============================================================================

export class WordPressError extends IfritError {
    constructor(
        message: string,
        code: ErrorCode = 'WP_CONNECTION_FAILED',
        context?: Record<string, unknown>
    ) {
        super(message, code, context, true, true);
        this.name = 'WordPressError';
    }
}

export class WPAuthError extends IfritError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, 'WP_AUTH_FAILED', context, false, false);
        this.name = 'WPAuthError';
    }
}

export class WPPostError extends IfritError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, 'WP_POST_FAILED', context, true, true);
        this.name = 'WPPostError';
    }
}

// ============================================================================
// Pipeline Errors
// ============================================================================

export class PipelineError extends IfritError {
    constructor(
        message: string,
        public readonly stage: string,
        context?: Record<string, unknown>
    ) {
        super(message, 'PIPELINE_STAGE_FAILED', { ...context, stage }, true, true);
        this.name = 'PipelineError';
    }
}

export class DeduplicationError extends IfritError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, 'DEDUPLICATION_BLOCKED', context, false, false);
        this.name = 'DeduplicationError';
    }
}

// ============================================================================
// Hunt Errors
// ============================================================================

export class HuntError extends IfritError {
    constructor(
        message: string,
        code: ErrorCode = 'DOMAIN_ANALYSIS_FAILED',
        context?: Record<string, unknown>
    ) {
        super(message, code, context, true, true);
        this.name = 'HuntError';
    }
}

export class ProfileGenerationError extends IfritError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, 'PROFILE_GENERATION_FAILED', context, true, true);
        this.name = 'ProfileGenerationError';
    }
}

// ============================================================================
// Hosting Errors
// ============================================================================

export class HostingError extends IfritError {
    constructor(
        message: string,
        code: ErrorCode = 'HOSTINGER_API_FAILED',
        context?: Record<string, unknown>
    ) {
        super(message, code, context, true, true);
        this.name = 'HostingError';
    }
}

// ============================================================================
// Error Utilities
// ============================================================================

/**
 * Wrap any error as an IfritError
 */
export function wrapError(error: unknown, defaultCode: ErrorCode = 'UNKNOWN_ERROR'): IfritError {
    if (error instanceof IfritError) {
        return error;
    }

    if (error instanceof Error) {
        return new IfritError(
            error.message,
            defaultCode,
            { originalError: error.name, stack: error.stack },
            true,
            true
        );
    }

    return new IfritError(
        String(error),
        defaultCode,
        { originalValue: error },
        true,
        true
    );
}

/**
 * Check if error is retryable
 */
export function isRetryable(error: unknown): boolean {
    if (error instanceof IfritError) {
        return error.retryable;
    }
    return false;
}

/**
 * Check if error is recoverable (can continue pipeline)
 */
export function isRecoverable(error: unknown): boolean {
    if (error instanceof IfritError) {
        return error.recoverable;
    }
    return false;
}

/**
 * Extract user-friendly message from error
 */
export function getUserMessage(error: unknown): string {
    if (error instanceof IfritError) {
        return error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'An unexpected error occurred';
}

/**
 * Log error with context
 */
export function logError(error: unknown, additionalContext?: Record<string, unknown>): void {
    const wrapped = wrapError(error);
    console.error('[Ifrit Error]', {
        ...wrapped.toJSON(),
        ...additionalContext,
    });
}
