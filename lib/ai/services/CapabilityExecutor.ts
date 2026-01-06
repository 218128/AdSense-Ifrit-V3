/**
 * CapabilityExecutor - Provider-Agnostic Execution Layer
 * 
 * Responsible for:
 * - Getting user's selected handler from Settings
 * - Executing capability with retry/fallback logic
 * - Validating responses per capability type
 * - Logging diagnostics for debugging
 * 
 * The executor NEVER knows which provider will run - it just requests
 * a capability and gets data back. User configures handlers in Settings.
 */

import {
    ExecuteOptions,
    ExecuteResult,
    CapabilityHandler,
    CapabilitiesConfig,
    Capability
} from './types';

// ============================================
// DIAGNOSTICS
// ============================================

export interface ProviderDiagnostics {
    providerId: string;
    model?: string;
    requestTime: number;          // When request was sent (timestamp)
    responseTime: number;         // When response received (timestamp)
    latencyMs: number;            // Total execution time
    tokensUsed?: number;
    tokensInput?: number;
    tokensOutput?: number;
    retryCount: number;
    rawResponse?: string;         // Only in verbose mode
    errors: string[];             // Any errors encountered
}

export type VerbosityLevel = 'none' | 'basic' | 'standard' | 'verbose';

export interface ExecutorConfig {
    verbosity: VerbosityLevel;
    defaultMaxRetries: number;
    defaultTimeout: number;       // in ms
    logToConsole: boolean;
    onDiagnostics?: (diagnostics: ProviderDiagnostics) => void;
}

const DEFAULT_EXECUTOR_CONFIG: ExecutorConfig = {
    verbosity: 'standard',
    defaultMaxRetries: 2,
    defaultTimeout: 30000,
    logToConsole: true,
};

// ============================================
// VALIDATION RULES PER CAPABILITY
// ============================================

interface ValidationRule {
    validate: (data: unknown) => boolean;
    errorMessage: string;
}

const CAPABILITY_VALIDATORS: Record<string, ValidationRule[]> = {
    generate: [
        {
            validate: (data) => typeof data === 'string' && data.trim().length > 0,
            errorMessage: 'Generated text is empty or invalid'
        }
    ],
    research: [
        {
            validate: (data) => typeof data === 'string' && data.length > 50,
            errorMessage: 'Research result is too short or empty'
        }
    ],
    keywords: [
        {
            validate: (data) => Array.isArray(data) || (typeof data === 'string' && data.includes(',')),
            errorMessage: 'Keywords result is not a list'
        }
    ],
    analyze: [
        {
            validate: (data) => typeof data === 'object' && data !== null,
            errorMessage: 'Analysis result is not a valid object'
        }
    ],
    images: [
        {
            validate: (data) => {
                if (typeof data === 'string') {
                    // Could be URL or base64
                    return data.startsWith('http') || data.startsWith('data:image');
                }
                return false;
            },
            errorMessage: 'Image result is not a valid URL or base64 data'
        }
    ],
    summarize: [
        {
            validate: (data) => typeof data === 'string' && data.length > 20,
            errorMessage: 'Summary is too short or empty'
        }
    ],
    translate: [
        {
            validate: (data) => typeof data === 'string' && data.trim().length > 0,
            errorMessage: 'Translation result is empty'
        }
    ],
    reasoning: [
        {
            validate: (data) => typeof data === 'string' && data.length > 50,
            errorMessage: 'Reasoning result is too short'
        }
    ],
    code: [
        {
            validate: (data) => typeof data === 'string' && data.length > 10,
            errorMessage: 'Code result is too short or empty'
        }
    ],
    scrape: [
        {
            validate: (data) => typeof data === 'string' && data.length > 0,
            errorMessage: 'Scraped content is empty'
        }
    ],
    'search-images': [
        {
            validate: (data) => {
                // Accept array of image objects or single URL string
                if (Array.isArray(data) && data.length > 0) {
                    return data.some((img: unknown) =>
                        typeof img === 'object' && img !== null && 'url' in img
                    );
                }
                if (typeof data === 'string') {
                    return data.startsWith('http');
                }
                return false;
            },
            errorMessage: 'No valid images returned'
        }
    ],
};

// ============================================
// CAPABILITY EXECUTOR CLASS
// ============================================

export class CapabilityExecutor {
    private config: ExecutorConfig;
    private diagnosticsLog: ProviderDiagnostics[] = [];

    constructor(config: Partial<ExecutorConfig> = {}) {
        this.config = { ...DEFAULT_EXECUTOR_CONFIG, ...config };
    }

    /**
     * Execute a capability - the main entry point
     * 
     * @param options - What to execute
     * @param handlers - Available handlers (from AIServices)
     * @param capabilitiesConfig - User's configuration (from Settings)
     */
    async execute(
        options: ExecuteOptions,
        handlers: CapabilityHandler[],
        capabilitiesConfig: CapabilitiesConfig
    ): Promise<ExecuteResult & { diagnostics?: ProviderDiagnostics }> {
        const startTime = Date.now();
        const {
            capability,
            maxRetries = this.config.defaultMaxRetries,
            useFallback = true  // Default to true to enable handler fallback
        } = options;

        this.log('basic', `[CapabilityExecutor] Starting ${capability}`);

        // 1. Get handlers for this capability, sorted by user preference
        const eligibleHandlers = this.getEligibleHandlers(
            capability,
            handlers,
            capabilitiesConfig,
            options.preferredHandler
        );

        if (eligibleHandlers.length === 0) {
            return this.errorResult(
                `No handlers available for capability: ${capability}`,
                startTime
            );
        }

        this.log('standard', `[CapabilityExecutor] Found ${eligibleHandlers.length} handlers for ${capability}`);

        // 2. Try handlers in order (with fallback)
        const attemptedHandlers: string[] = [];
        let lastError = '';

        for (const handler of eligibleHandlers) {
            attemptedHandlers.push(handler.id);

            // Try with retries
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                const diagnostics: ProviderDiagnostics = {
                    providerId: handler.providerId || handler.id,
                    model: options.model,
                    requestTime: Date.now(),
                    responseTime: 0,
                    latencyMs: 0,
                    retryCount: attempt,
                    errors: [],
                };

                try {
                    this.log('standard', `[CapabilityExecutor] Trying ${handler.name} (attempt ${attempt + 1})`);

                    // Execute handler
                    if (!handler.execute) {
                        throw new Error(`Handler ${handler.id} has no execute function`);
                    }

                    const result = await Promise.race([
                        handler.execute(options),
                        this.timeout(options.timeout || this.config.defaultTimeout)
                    ]) as ExecuteResult;

                    diagnostics.responseTime = Date.now();
                    diagnostics.latencyMs = diagnostics.responseTime - diagnostics.requestTime;

                    // Capture token usage if available
                    if (result.usage) {
                        diagnostics.tokensInput = result.usage.inputTokens;
                        diagnostics.tokensOutput = result.usage.outputTokens;
                        diagnostics.tokensUsed = result.usage.inputTokens + result.usage.outputTokens;
                    }

                    // Validate result
                    if (result.success) {
                        const validationError = this.validateResult(capability, result.data || result.text);
                        if (validationError) {
                            this.log('standard', `[CapabilityExecutor] Validation failed: ${validationError}`);
                            diagnostics.errors.push(validationError);
                            lastError = validationError;
                            continue; // Retry
                        }

                        // Success!
                        this.logDiagnostics(diagnostics);
                        return {
                            ...result,
                            fallbacksAttempted: attemptedHandlers.slice(0, -1),
                            diagnostics,
                        };
                    } else {
                        diagnostics.errors.push(result.error || 'Unknown error');
                        lastError = result.error || 'Unknown error';
                    }
                } catch (error) {
                    diagnostics.responseTime = Date.now();
                    diagnostics.latencyMs = diagnostics.responseTime - diagnostics.requestTime;
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    diagnostics.errors.push(errorMsg);
                    lastError = errorMsg;

                    this.log('standard', `[CapabilityExecutor] Error: ${errorMsg}`);
                }

                this.logDiagnostics(diagnostics);
            }

            // All retries failed for this handler, try next
            if (!useFallback) {
                break;
            }
        }

        // All handlers failed
        return this.errorResult(
            `All handlers failed for ${capability}. Last error: ${lastError}`,
            startTime,
            attemptedHandlers
        );
    }

    /**
     * Get handlers sorted by user preference and priority
     */
    private getEligibleHandlers(
        capability: string,
        handlers: CapabilityHandler[],
        config: CapabilitiesConfig,
        preferredHandler?: string
    ): CapabilityHandler[] {
        // Filter to handlers that support this capability and are available
        const eligible = handlers.filter(h =>
            h.capabilities.includes(capability) && h.isAvailable
        );

        // Sort by user preference
        const capSettings = config.capabilitySettings[capability];
        const defaultHandlerId = preferredHandler || capSettings?.defaultHandlerId;
        const fallbackIds = capSettings?.fallbackHandlerIds || [];

        eligible.sort((a, b) => {
            // Preferred handler first
            if (a.id === defaultHandlerId) return -1;
            if (b.id === defaultHandlerId) return 1;

            // Then fallback order
            const aFallbackIndex = fallbackIds.indexOf(a.id);
            const bFallbackIndex = fallbackIds.indexOf(b.id);
            if (aFallbackIndex !== -1 && bFallbackIndex === -1) return -1;
            if (bFallbackIndex !== -1 && aFallbackIndex === -1) return 1;
            if (aFallbackIndex !== -1 && bFallbackIndex !== -1) {
                return aFallbackIndex - bFallbackIndex;
            }

            // Then by priority
            return b.priority - a.priority;
        });

        return eligible;
    }

    /**
     * Validate result based on capability type
     */
    private validateResult(capability: string, data: unknown): string | null {
        const rules = CAPABILITY_VALIDATORS[capability] || [];

        for (const rule of rules) {
            if (!rule.validate(data)) {
                return rule.errorMessage;
            }
        }

        return null; // Valid
    }

    /**
     * Log based on verbosity level
     */
    private log(level: VerbosityLevel, message: string): void {
        const levels: VerbosityLevel[] = ['none', 'basic', 'standard', 'verbose'];
        const currentLevel = levels.indexOf(this.config.verbosity);
        const messageLevel = levels.indexOf(level);

        if (messageLevel <= currentLevel && this.config.logToConsole) {
            console.log(message);
        }
    }

    /**
     * Log diagnostics for analysis
     */
    private logDiagnostics(diagnostics: ProviderDiagnostics): void {
        this.diagnosticsLog.push(diagnostics);

        if (this.config.onDiagnostics) {
            this.config.onDiagnostics(diagnostics);
        }

        if (this.config.verbosity === 'verbose') {
            console.log('[CapabilityExecutor] Diagnostics:', JSON.stringify(diagnostics, null, 2));
        }
    }

    /**
     * Create timeout promise
     */
    private timeout(ms: number): Promise<never> {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
        });
    }

    /**
     * Create error result
     */
    private errorResult(
        error: string,
        startTime: number,
        attemptedHandlers: string[] = []
    ): ExecuteResult {
        return {
            success: false,
            error,
            handlerUsed: 'none',
            source: 'local',
            latencyMs: Date.now() - startTime,
            fallbacksAttempted: attemptedHandlers,
        };
    }

    // ============================================
    // PUBLIC API FOR DIAGNOSTICS
    // ============================================

    /**
     * Get all diagnostics logs
     */
    getDiagnosticsLog(): ProviderDiagnostics[] {
        return [...this.diagnosticsLog];
    }

    /**
     * Clear diagnostics log
     */
    clearDiagnosticsLog(): void {
        this.diagnosticsLog = [];
    }

    /**
     * Get summary of provider performance
     */
    getProviderStats(): Record<string, {
        calls: number;
        avgLatency: number;
        errors: number;
        successRate: number;
    }> {
        const stats: Record<string, {
            calls: number;
            totalLatency: number;
            errors: number;
            successes: number;
        }> = {};

        for (const diag of this.diagnosticsLog) {
            if (!stats[diag.providerId]) {
                stats[diag.providerId] = { calls: 0, totalLatency: 0, errors: 0, successes: 0 };
            }

            const s = stats[diag.providerId];
            s.calls++;
            s.totalLatency += diag.latencyMs;
            if (diag.errors.length > 0) {
                s.errors++;
            } else {
                s.successes++;
            }
        }

        const result: Record<string, {
            calls: number;
            avgLatency: number;
            errors: number;
            successRate: number;
        }> = {};

        for (const [id, s] of Object.entries(stats)) {
            result[id] = {
                calls: s.calls,
                avgLatency: Math.round(s.totalLatency / s.calls),
                errors: s.errors,
                successRate: Math.round((s.successes / s.calls) * 100),
            };
        }

        return result;
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<ExecutorConfig>): void {
        this.config = { ...this.config, ...config };
    }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let executorInstance: CapabilityExecutor | null = null;

export function getCapabilityExecutor(): CapabilityExecutor {
    if (!executorInstance) {
        executorInstance = new CapabilityExecutor();
    }
    return executorInstance;
}
