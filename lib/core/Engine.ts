/**
 * Ifrit Engine - The Absolute Root
 * 
 * The central orchestrator for all capabilities in Ifrit.
 * This is the "Number One" file—the isomorphic entry point for execution.
 * 
 * Features:
 * - Isomorphic execution (works on client AND server)
 * - Provider-agnostic capability execution
 * - Automatic fallback chains
 * - Unified diagnostics
 * 
 * @module core/Engine
 */

import { ConfigProvider, createConfigProvider } from './ConfigProvider';
import { HandlerRegistry } from './HandlerRegistry';
import type {
    Capability,
    CapabilityHandler,
    ExecuteOptions,
    ExecuteResult,
    DEFAULT_CAPABILITIES,
} from '@/lib/ai/services/types';

// ============================================
// ENGINE TYPES
// ============================================

export interface EngineOptions {
    configProvider?: ConfigProvider;
    registry?: HandlerRegistry;
    /** If true, create a fresh registry (for server-side isolation) */
    isolated?: boolean;
}

export interface EngineExecuteOptions extends ExecuteOptions {
    /** Override config provider for this execution */
    configProvider?: ConfigProvider;
    /** Additional context passed to handlers */
    serverContext?: Record<string, unknown>;
}

export interface EngineDiagnostics {
    totalHandlers: number;
    availableHandlers: number;
    capabilitiesCovered: string[];
    configSource: 'browser' | 'server';
}

// ============================================
// IFRIT ENGINE
// ============================================

/**
 * The Ifrit Engine - Isomorphic Capability Executor
 * 
 * This replaces the AIServices singleton with a server-compatible design.
 */
export class IfritEngine {
    private configProvider: ConfigProvider;
    private registry: HandlerRegistry;
    private capabilities: Map<string, Capability> = new Map();
    private initialized = false;

    // Singleton for browser (state persistence)
    private static browserInstance: IfritEngine | null = null;

    constructor(options: EngineOptions = {}) {
        this.configProvider = options.configProvider || createConfigProvider();
        this.registry = options.isolated
            ? HandlerRegistry.create()
            : (options.registry || HandlerRegistry.getInstance());
    }

    /**
     * Get the browser singleton.
     * On server, use create() instead for request isolation.
     */
    static getInstance(): IfritEngine {
        if (typeof window === 'undefined') {
            // Server: always create fresh
            return IfritEngine.create();
        }
        if (!IfritEngine.browserInstance) {
            IfritEngine.browserInstance = new IfritEngine();
        }
        return IfritEngine.browserInstance;
    }

    /**
     * Create a fresh engine instance.
     * Use for server-side execution with request-scoped configuration.
     */
    static create(options: EngineOptions = {}): IfritEngine {
        return new IfritEngine({ ...options, isolated: true });
    }

    /**
     * Create an engine with explicit server keys.
     * Convenience method for API routes.
     */
    static forServer(providerKeys: Record<string, string | string[]>): IfritEngine {
        const configProvider = createConfigProvider(providerKeys);
        return new IfritEngine({ configProvider, isolated: true });
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * Initialize the engine.
     * Registers default capabilities and handlers.
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        // Import default capabilities
        const { DEFAULT_CAPABILITIES } = await import('@/lib/ai/services/types');

        // Register capabilities
        for (const cap of DEFAULT_CAPABILITIES) {
            this.capabilities.set(cap.id, {
                ...cap,
                isEnabled: true,
                isDefault: true,
            });
        }

        // Register handlers (import dynamically to avoid circular deps)
        await this.registerCoreHandlers();

        this.initialized = true;
        console.log(`[Engine] Initialized: ${this.capabilities.size} capabilities, ${this.registry.size} handlers`);
    }

    /**
     * Register core handlers.
     * Imports from existing handler modules.
     */
    private async registerCoreHandlers(): Promise<void> {
        // AI Provider handlers will be registered by AIServices compatibility layer
        // or directly when we complete Phase 2

        // For now, just log that we're ready
        console.log('[Engine] Ready to accept handler registrations');
    }

    // ============================================
    // HANDLER MANAGEMENT
    // ============================================

    /**
     * Register a capability handler.
     */
    registerHandler(handler: CapabilityHandler): void {
        this.registry.register(handler);
    }

    /**
     * Get all registered handlers.
     */
    getHandlers(): CapabilityHandler[] {
        return this.registry.getAll();
    }

    /**
     * Get handlers that can fulfill a capability.
     */
    getHandlersFor(capabilityId: string): CapabilityHandler[] {
        return this.registry.getHandlersFor(capabilityId);
    }

    // ============================================
    // CAPABILITY MANAGEMENT
    // ============================================

    /**
     * Get all registered capabilities.
     */
    getCapabilities(): Capability[] {
        return Array.from(this.capabilities.values());
    }

    /**
     * Get a specific capability.
     */
    getCapability(id: string): Capability | undefined {
        return this.capabilities.get(id);
    }

    /**
     * Add a capability dynamically.
     */
    addCapability(capability: Capability): void {
        this.capabilities.set(capability.id, {
            ...capability,
            isDefault: capability.isDefault ?? false,
            isEnabled: capability.isEnabled ?? true,
        });
    }

    /**
     * Remove a capability dynamically.
     */
    removeCapability(capabilityId: string): void {
        this.capabilities.delete(capabilityId);
    }

    /**
     * Get diagnostic information about the engine.
     */
    getDiagnostics(): EngineDiagnostics {
        const allHandlers = this.registry.getAll();
        const availableHandlers = allHandlers.filter(h => h.isAvailable);
        const capabilitiesCovered = new Set<string>();
        for (const handler of availableHandlers) {
            handler.capabilities.forEach(cap => capabilitiesCovered.add(cap));
        }

        return {
            totalHandlers: allHandlers.length,
            availableHandlers: availableHandlers.length,
            capabilitiesCovered: Array.from(capabilitiesCovered),
            configSource: typeof window !== 'undefined' ? 'browser' : 'server',
        };
    }

    // ============================================
    // EXECUTION
    // ============================================

    /**
     * Execute a capability.
     * This is the main entry point for all automated work.
     */
    async execute(options: EngineExecuteOptions): Promise<ExecuteResult> {
        const startTime = Date.now();
        const { capability, useFallback = true } = options;

        // Use override config if provided
        const config = options.configProvider || this.configProvider;

        // Check capability exists
        const cap = this.capabilities.get(capability);
        if (!cap) {
            return {
                success: false,
                error: `Unknown capability: ${capability}`,
                handlerUsed: 'none',
                source: 'local',
                latencyMs: Date.now() - startTime,
            };
        }

        // Check if enabled
        const settings = config.getCapabilitySettings(capability);
        if (settings && !settings.isEnabled) {
            return {
                success: false,
                error: `Capability "${cap.name}" is disabled`,
                handlerUsed: 'none',
                source: 'local',
                latencyMs: Date.now() - startTime,
            };
        }

        // Get handler chain
        const handlers = this.registry.getHandlerChain({
            capabilityId: capability,
            preferredHandlerId: settings?.defaultHandlerId,
            fallbackHandlerIds: settings?.fallbackHandlerIds,
        });

        if (handlers.length === 0) {
            return {
                success: false,
                error: `No handlers available for capability: ${capability}`,
                handlerUsed: 'none',
                source: 'local',
                latencyMs: Date.now() - startTime,
            };
        }

        // Check cache (Dynamic import to avoid circular deps if any, though cache should be safe)
        // import { responseCache } from '@/lib/ai/cache/responseCache';
        // We will assume responseCache is globally available or imported at top
        const { responseCache } = await import('@/lib/ai/cache/responseCache');
        const cachedResult = responseCache.get(capability, options.prompt, options.model);
        if (cachedResult) {
            cachedResult.latencyMs = Date.now() - startTime;
            this.emit({ type: 'execution-complete', result: cachedResult, cached: true });
            return cachedResult;
        }

        // Try handlers in order
        const fallbacksAttempted: string[] = [];

        for (const handler of handlers) {
            try {
                // Execute the handler
                const result = await this.executeHandler(handler, options, config);

                if (result.success) {
                    result.fallbacksAttempted = fallbacksAttempted.length > 0
                        ? fallbacksAttempted
                        : undefined;

                    // Cache successful result
                    responseCache.set(capability, options.prompt, result, options.model);

                    this.emit({ type: 'execution-complete', result });
                    return result;
                }

                // Handler failed, try next
                fallbacksAttempted.push(handler.id);
                console.warn(`[Engine] Handler ${handler.id} failed:`, result.error);

                if (!useFallback) break;

            } catch (error) {
                fallbacksAttempted.push(handler.id);
                console.error(`[Engine] Handler ${handler.id} threw:`, error);

                if (!useFallback) break;
            }
        }

        // All handlers failed
        return {
            success: false,
            error: `All handlers failed for capability: ${capability}`,
            handlerUsed: 'none',
            source: 'local',
            latencyMs: Date.now() - startTime,
            fallbacksAttempted,
        };
    }

    /**
     * Execute a specific handler.
     */
    private async executeHandler(
        handler: CapabilityHandler,
        options: EngineExecuteOptions,
        config: ConfigProvider
    ): Promise<ExecuteResult> {
        const startTime = Date.now();

        // For AI providers, inject the API key
        if (handler.requiresApiKey && handler.providerId) {
            const key = config.getFirstKey(handler.providerId as import('@/lib/ai/types/providers').ProviderId);
            if (!key) {
                return {
                    success: false,
                    error: `No API key available for provider: ${handler.providerId}`,
                    handlerUsed: handler.id,
                    source: handler.source,
                    latencyMs: Date.now() - startTime,
                };
            }
            // Inject key into context
            options = {
                ...options,
                context: {
                    ...options.context,
                    apiKey: key,
                },
            };
        }

        // Execute - guard against handlers without execute function
        if (!handler.execute) {
            return {
                success: false,
                error: `Handler ${handler.id} has no execute function`,
                handlerUsed: handler.id,
                source: handler.source,
                latencyMs: Date.now() - startTime,
            };
        }

        const result = await handler.execute(options);
        result.latencyMs = Date.now() - startTime;
        result.handlerUsed = handler.id;
        result.source = handler.source;

        return result;
    }

    // ============================================
    // EVENTS
    // ============================================

    private listeners: ((event: any) => void)[] = [];

    /**
     * Subscribe to engine events.
     */
    subscribe(listener: (event: any) => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private emit(event: any): void {
        for (const listener of this.listeners) {
            try {
                listener(event);
            } catch (error) {
                console.error('[Engine] Event listener error:', error);
            }
        }
    }

    // ============================================
    // AGGREGATE EXECUTION
    // ============================================

    /**
     * Execute a capability with aggregation (AND logic).
     * Calls ALL handlers for the capability in parallel and combines results.
     */
    async executeAggregate(options: EngineExecuteOptions): Promise<ExecuteResult> {
        const startTime = Date.now();
        const { capability, onProgress } = options;

        // Use override config if provided
        const config = options.configProvider || this.configProvider;

        // Check capability exists
        const cap = this.capabilities.get(capability);
        if (!cap) {
            return {
                success: false,
                error: `Unknown capability: ${capability}`,
                handlerUsed: 'none',
                source: 'local',
                latencyMs: Date.now() - startTime,
            };
        }

        // Get ALL handlers for this capability
        const handlers = this.registry.getHandlersFor(capability);

        if (handlers.length === 0) {
            return {
                success: false,
                error: `No handlers available for capability: ${capability}`,
                handlerUsed: 'none',
                source: 'local',
                latencyMs: Date.now() - startTime,
            };
        }

        // Report starting
        onProgress?.({
            phase: 'starting',
            message: `Starting aggregation for ${capability}`,
            total: handlers.length,
            current: 0,
        });

        // Execute all handlers in parallel
        const results = await Promise.allSettled(
            handlers.map(async (handler, index) => {
                try {
                    // Update progress
                    onProgress?.({
                        phase: 'handler',
                        message: `Running ${handler.name}`,
                        handlerId: handler.id,
                        handlerName: handler.name,
                        current: index + 1,
                        total: handlers.length,
                    });

                    // Execute handler
                    const result = await this.executeHandler(handler, options, config);

                    // Report completion for this handler
                    onProgress?.({
                        phase: 'handler',
                        message: `Completed ${handler.name}`,
                        handlerId: handler.id,
                        handlerName: handler.name,
                        success: result.success,
                        error: !result.success ? result.error : undefined,
                        current: index + 1,
                        total: handlers.length,
                    });

                    return result;
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);

                    onProgress?.({
                        phase: 'handler',
                        message: `Failed ${handler.name}`,
                        handlerId: handler.id,
                        handlerName: handler.name,
                        success: false,
                        error: errorMsg,
                        current: index + 1,
                        total: handlers.length,
                    });

                    return {
                        success: false,
                        error: errorMsg,
                        handlerUsed: handler.id,
                        source: handler.source,
                        latencyMs: 0,
                    };
                }
            })
        );

        // Process results
        const successfulResults = results
            .filter(r => r.status === 'fulfilled' && r.value.success)
            .map(r => (r as PromiseFulfilledResult<ExecuteResult>).value.data);

        const failedResults = results
            .filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));

        const errors = failedResults
            .map(r => r.status === 'fulfilled' ? r.value.error : String(r.reason))
            .filter(Boolean);

        // Build metadata map of source results
        const sourceMetadata: Record<string, any> = {};
        handlers.forEach((h, i) => {
            const res = results[i];
            const isSuccess = res.status === 'fulfilled' && res.value.success;
            const data = (res.status === 'fulfilled' && res.value.success) ? res.value.data : null;
            const error = (res.status === 'fulfilled' && !res.value.success) ? res.value.error :
                (res.status === 'rejected' ? String(res.reason) : null);

            // Extract count if available (for trend scanning)
            let count = 0;
            if (Array.isArray(data)) count = data.length;
            // Try to extract from metadata/sources if complex object

            sourceMetadata[h.id] = {
                success: isSuccess,
                error,
                count,
                data: isSuccess ? data : undefined
            };
        });

        // Report complete
        onProgress?.({
            phase: 'complete',
            message: `Aggregation complete. ${successfulResults.length} succeeded, ${failedResults.length} failed.`,
            total: handlers.length,
            current: handlers.length,
        });

        // Flatten results if they are arrays (common for aggregation)
        const flatData = successfulResults.flat();

        return {
            success: successfulResults.length > 0, // Success if at least one handler succeeded
            data: flatData,
            error: successfulResults.length === 0 ? `All handlers failed: ${errors.join(', ')}` : undefined,
            handlerUsed: 'aggregate',
            source: 'local', // Aggregation is a local operation
            latencyMs: Date.now() - startTime,
            metadata: {
                sources: sourceMetadata,
                total: handlers.length,
                successful: successfulResults.length,
                failed: failedResults.length,
            }
        };
    }
}

// ============================================
// EXPORTS
// ============================================

export { createConfigProvider, BrowserConfigProvider, ServerConfigProvider } from './ConfigProvider';
export type { ConfigProvider } from './ConfigProvider';
export { HandlerRegistry, handlerRegistry } from './HandlerRegistry';

/**
 * Default engine instance (singleton on browser, fresh on server).
 */
export const engine = IfritEngine.getInstance();
