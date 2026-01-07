/**
 * AI Services - Main Class
 * 
 * The central orchestrator for all AI capabilities in Ifrit.
 * 
 * Features:
 * - Dynamic capability registration
 * - Auto-discovery of MCP tools
 * - Handler fallback chains
 * - User-configurable via Settings
 */

import {
    Capability,
    CapabilityHandler,
    CapabilitiesConfig,
    ExecuteOptions,
    ExecuteResult,
    DEFAULT_CAPABILITIES,
    DEFAULT_CONFIG,
    AI_SERVICES_STORAGE,
    AIServicesEvent,
} from './types';

// ============================================
// AI SERVICES SINGLETON
// ============================================

class AIServicesClass {
    private static instance: AIServicesClass;

    // Registry
    private capabilities: Map<string, Capability> = new Map();
    private handlers: Map<string, CapabilityHandler> = new Map();

    // Config (loaded from localStorage)
    private config: CapabilitiesConfig = DEFAULT_CONFIG;

    // Event listeners
    private listeners: ((event: AIServicesEvent) => void)[] = [];

    // Initialization flag
    private initialized = false;

    private constructor() {
        // Private constructor for singleton
    }

    static getInstance(): AIServicesClass {
        if (!AIServicesClass.instance) {
            AIServicesClass.instance = new AIServicesClass();
        }
        return AIServicesClass.instance;
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * Initialize the services layer.
     * Call this once on app startup.
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        // Load config from storage
        await this.loadConfig();

        // Register default capabilities
        for (const cap of DEFAULT_CAPABILITIES) {
            const settings = this.config.capabilitySettings[cap.id];
            this.capabilities.set(cap.id, {
                ...cap,
                isEnabled: settings?.isEnabled ?? true,
                defaultHandlerId: settings?.defaultHandlerId,
                fallbackHandlerIds: settings?.fallbackHandlerIds,
            });
        }

        // Register custom capabilities
        for (const cap of this.config.customCapabilities) {
            this.capabilities.set(cap.id, cap);
        }

        // Register AI provider handlers
        await this.registerAIProviderHandlers();

        this.initialized = true;
        console.log('[AIServices] Initialized with', this.capabilities.size, 'capabilities,', this.handlers.size, 'handlers');
    }

    /**
     * Load config from settingsStore (unified settings)
     * Falls back to legacy localStorage if settingsStore not yet migrated
     */
    private async loadConfig(): Promise<void> {
        if (typeof window === 'undefined') return;

        try {
            // Try to load from settingsStore first (unified settings)
            const settingsModule = await import('@/stores/settingsStore');
            const storeConfig = settingsModule.useSettingsStore.getState().capabilitiesConfig;

            if (storeConfig && Object.keys(storeConfig.capabilitySettings).length > 0) {
                this.config = { ...DEFAULT_CONFIG, ...storeConfig };
                console.log('[AIServices] Loaded config from unified settingsStore');
                return;
            }

            // Fallback: load from legacy localStorage
            const stored = localStorage.getItem(AI_SERVICES_STORAGE.CAPABILITIES_CONFIG);
            if (stored) {
                this.config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
                console.log('[AIServices] Loaded config from legacy localStorage');
            }
        } catch {
            console.warn('[AIServices] Failed to load config, using defaults');
        }
    }

    /**
     * Save config to settingsStore (unified settings)
     * Also keeps legacy localStorage in sync for backwards compatibility
     */
    private async saveConfig(): Promise<void> {
        if (typeof window === 'undefined') return;

        try {
            // Save to settingsStore (unified settings)
            const settingsModule = await import('@/stores/settingsStore');
            settingsModule.useSettingsStore.getState().setCapabilitiesConfig(this.config);

            // Also keep legacy localStorage in sync (backwards compatibility)
            localStorage.setItem(
                AI_SERVICES_STORAGE.CAPABILITIES_CONFIG,
                JSON.stringify(this.config)
            );

            this.emit({ type: 'config-updated', config: this.config });
        } catch {
            console.warn('[AIServices] Failed to save config');
        }
    }

    // ============================================
    // CAPABILITY MANAGEMENT
    // ============================================

    /**
     * Get all registered capabilities
     */
    getCapabilities(): Capability[] {
        return Array.from(this.capabilities.values());
    }

    /**
     * Get a specific capability
     */
    getCapability(id: string): Capability | undefined {
        return this.capabilities.get(id);
    }

    /**
     * Add a custom capability
     */
    addCapability(capability: Omit<Capability, 'isDefault'>): void {
        const cap: Capability = { ...capability, isDefault: false };
        this.capabilities.set(cap.id, cap);

        // Save to custom capabilities
        this.config.customCapabilities = [
            ...this.config.customCapabilities.filter(c => c.id !== cap.id),
            cap
        ];
        this.saveConfig();

        this.emit({ type: 'capability-added', capability: cap });
    }

    /**
     * Remove a custom capability
     */
    removeCapability(id: string): boolean {
        const cap = this.capabilities.get(id);
        if (!cap || cap.isDefault) return false;

        this.capabilities.delete(id);
        this.config.customCapabilities = this.config.customCapabilities.filter(c => c.id !== id);
        this.saveConfig();

        this.emit({ type: 'capability-removed', capabilityId: id });
        return true;
    }

    /**
     * Update capability settings
     */
    updateCapabilitySettings(
        capabilityId: string,
        settings: Partial<{
            isEnabled: boolean;
            defaultHandlerId: string;
            fallbackHandlerIds: string[];
        }>
    ): void {
        const cap = this.capabilities.get(capabilityId);
        if (!cap) return;

        // Update in-memory
        Object.assign(cap, settings);

        // Update config
        this.config.capabilitySettings[capabilityId] = {
            ...this.config.capabilitySettings[capabilityId],
            ...settings
        };
        this.saveConfig();
    }

    // ============================================
    // HANDLER MANAGEMENT
    // ============================================

    /**
     * Get all registered handlers
     */
    getHandlers(): CapabilityHandler[] {
        return Array.from(this.handlers.values());
    }

    /**
     * Get handlers for a specific capability
     */
    getHandlersFor(capabilityId: string): CapabilityHandler[] {
        return Array.from(this.handlers.values())
            .filter(h => h.capabilities.includes(capabilityId) && h.isAvailable)
            .sort((a, b) => b.priority - a.priority);
    }

    /**
     * Register a handler
     */
    registerHandler(handler: CapabilityHandler): void {
        this.handlers.set(handler.id, handler);
        console.log(`[AIServices] Registered handler: ${handler.id} for capabilities: ${handler.capabilities.join(', ')}`);
        this.emit({ type: 'handler-registered', handler });
    }

    /**
     * Remove a handler
     */
    removeHandler(handlerId: string): boolean {
        const removed = this.handlers.delete(handlerId);
        if (removed) {
            this.emit({ type: 'handler-removed', handlerId });
        }
        return removed;
    }

    /**
     * Update handler availability
     */
    setHandlerAvailable(handlerId: string, available: boolean): void {
        const handler = this.handlers.get(handlerId);
        if (handler) {
            handler.isAvailable = available;
        }
    }

    // ============================================
    // AI PROVIDER HANDLERS (Auto-registered)
    // ============================================

    private async registerAIProviderHandlers(): Promise<void> {
        // On server-side, we can't check localStorage for keys
        // Mark all providers as "available" and let execution handle key validation
        const isServer = typeof window === 'undefined';

        // Handlers with execute functions handle key retrieval dynamically
        // Mark as available - the execute function will fail gracefully if no key
        let hasGeminiKeys = true;
        let hasDeepseekKeys = true;
        let hasPerplexityKeys = true;
        let hasOpenrouterKeys = true;

        // Note: We no longer check keys at registration time because:
        // 1. The execute function dynamically retrieves keys
        // 2. Keys may be added after registration (user configures later)
        // 3. The execute function fails gracefully with clear error if no key

        // AI-based capabilities (require language model to process)
        // User decides which provider to use for each in Settings
        const textCapabilities = [
            // Core capabilities
            'generate', 'research', 'keywords', 'analyze', 'keyword-analyze',
            'summarize', 'translate', 'reasoning', 'code', 'domain-profile',
            // Quality capabilities that need AI reasoning
            'quality-review',
            // SEO capabilities that need AI reasoning
            'seo-optimize',
        ];

        // Image capabilities - only some providers support
        const imageCapabilities = ['images'];

        // Register Gemini as handler for all capabilities
        this.registerHandler({
            id: 'gemini',
            name: 'Google Gemini',
            source: 'ai-provider',
            providerId: 'gemini',
            capabilities: [...textCapabilities, ...imageCapabilities],
            priority: 80,
            isAvailable: hasGeminiKeys,
            requiresApiKey: true,
            execute: (opts) => this.executeProviderDirect('gemini', opts),
        });

        // DeepSeek - all text capabilities
        this.registerHandler({
            id: 'deepseek',
            name: 'DeepSeek',
            source: 'ai-provider',
            providerId: 'deepseek',
            capabilities: textCapabilities,
            priority: 70,
            isAvailable: hasDeepseekKeys,
            requiresApiKey: true,
            execute: (opts) => this.executeProviderDirect('deepseek', opts),
        });

        // Perplexity - all text capabilities (especially good for research)
        this.registerHandler({
            id: 'perplexity',
            name: 'Perplexity',
            source: 'ai-provider',
            providerId: 'perplexity',
            capabilities: textCapabilities,
            priority: 75,
            isAvailable: hasPerplexityKeys,
            requiresApiKey: true,
            execute: (opts) => this.executeProviderDirect('perplexity', opts),
        });

        // OpenRouter - all text capabilities (access to many models)
        this.registerHandler({
            id: 'openrouter',
            name: 'OpenRouter',
            source: 'ai-provider',
            providerId: 'openrouter',
            capabilities: textCapabilities,
            priority: 60,
            isAvailable: hasOpenrouterKeys,
            requiresApiKey: true,
            execute: (opts) => this.executeProviderDirect('openrouter', opts),
        });

        // ============================================
        // LOCAL HANDLERS (Non-AI Capabilities)
        // ============================================

        // E-E-A-T Scoring - uses lib/contentQuality/eeatScorer.ts
        this.registerHandler({
            id: 'local-eeat-scorer',
            name: 'E-E-A-T Scorer (Local)',
            source: 'local',
            capabilities: ['eeat-scoring'],
            priority: 100,  // Local handlers have highest priority
            isAvailable: true,
            execute: async (opts) => {
                try {
                    const { calculateEEATScore } = await import('@/lib/contentQuality/eeatScorer');
                    const score = calculateEEATScore(opts.prompt);
                    return { success: true, data: score, handlerUsed: 'local-eeat-scorer', source: 'local', latencyMs: 0 };
                } catch (e) {
                    return { success: false, error: String(e), handlerUsed: 'local-eeat-scorer', source: 'local', latencyMs: 0 };
                }
            },
        });

        // Schema.org Generator - uses lib/formatting/schemaOrg.ts
        this.registerHandler({
            id: 'local-schema-generator',
            name: 'Schema.org Generator (Local)',
            source: 'local',
            capabilities: ['schema-generate'],
            priority: 100,
            isAvailable: true,
            execute: async (opts) => {
                try {
                    const schemaOrg = await import('@/lib/formatting/schemaOrg');
                    // Parse context for schema type and options
                    const schemaType = (opts.context?.schemaType as string) || 'article';
                    const schemaOpts = opts.context?.options as Record<string, unknown> || {};

                    let schema;
                    switch (schemaType) {
                        case 'article':
                            schema = schemaOrg.generateArticleSchema(schemaOpts as any);
                            break;
                        case 'faq':
                            schema = schemaOrg.generateFAQSchema(schemaOpts as any);
                            break;
                        case 'howto':
                            schema = schemaOrg.generateHowToSchema(schemaOpts as any);
                            break;
                        default:
                            schema = schemaOrg.generateArticleSchema(schemaOpts as any);
                    }
                    return { success: true, data: schema, handlerUsed: 'local-schema-generator', source: 'local', latencyMs: 0 };
                } catch (e) {
                    return { success: false, error: String(e), handlerUsed: 'local-schema-generator', source: 'local', latencyMs: 0 };
                }
            },
        });

        // Author Match - uses features/authors matching logic
        this.registerHandler({
            id: 'local-author-matcher',
            name: 'Author Matcher (Local)',
            source: 'local',
            capabilities: ['author-match'],
            priority: 100,
            isAvailable: true,
            execute: async (opts) => {
                try {
                    // Import author matching logic
                    const { matchAuthorToContent } = await import('@/features/authors');
                    const topic = opts.context?.topic as string || opts.prompt;
                    const niche = opts.context?.niche as string;
                    const match = matchAuthorToContent(topic, niche);
                    return { success: true, data: match, handlerUsed: 'local-author-matcher', source: 'local', latencyMs: 0 };
                } catch (e) {
                    return { success: false, error: String(e), handlerUsed: 'local-author-matcher', source: 'local', latencyMs: 0 };
                }
            },
        });

        // WP Publish - integration handler (uses WP REST API)
        this.registerHandler({
            id: 'integration-wp-publish',
            name: 'WordPress Publisher',
            source: 'integration',
            capabilities: ['wp-publish'],
            priority: 100,
            isAvailable: true,  // Availability checked at execution time
            execute: async (opts) => {
                // WP publishing is handled by specific WP API routes
                return {
                    success: false,
                    error: 'WP publishing should be called via /api/wp-sites routes, not through aiServices.execute()',
                    handlerUsed: 'integration-wp-publish',
                    source: 'integration',
                    latencyMs: 0
                };
            },
        });

        // Campaign Run - orchestrator (local)
        this.registerHandler({
            id: 'local-campaign-runner',
            name: 'Campaign Pipeline Runner',
            source: 'local',
            capabilities: ['campaign-run'],
            priority: 100,
            isAvailable: true,
            execute: async (opts) => {
                // Campaign running is handled by features/campaigns pipeline
                return {
                    success: false,
                    error: 'Campaign running should use the Campaign Pipeline directly, not aiServices.execute()',
                    handlerUsed: 'local-campaign-runner',
                    source: 'local',
                    latencyMs: 0
                };
            },
        });

        // Fact Check - Google Fact Check API integration
        // Primary handler uses Google API, can fallback to AI for additional verification
        this.registerHandler({
            id: 'integration-google-factcheck',
            name: 'Google Fact Check API',
            source: 'integration',
            capabilities: ['fact-check'],
            priority: 90,  // High priority for dedicated API
            isAvailable: true,  // Availability checked at execution time via API key
            execute: async (opts) => {
                try {
                    const { factCheckContent, searchFactChecks } = await import('@/lib/contentQuality/factChecker');

                    // If content is provided, do full content fact-check
                    if (opts.context?.html || opts.prompt.length > 200) {
                        const result = await factCheckContent(opts.context?.html as string || opts.prompt);
                        return { success: true, data: result, handlerUsed: 'integration-google-factcheck', source: 'integration', latencyMs: 0 };
                    }

                    // Otherwise, search for specific claim
                    const result = await searchFactChecks(opts.prompt);
                    return { success: true, data: result, handlerUsed: 'integration-google-factcheck', source: 'integration', latencyMs: 0 };
                } catch (e) {
                    return { success: false, error: String(e), handlerUsed: 'integration-google-factcheck', source: 'integration', latencyMs: 0 };
                }
            },
        });

        // Internal Linking - local keyword matching algorithm
        this.registerHandler({
            id: 'local-internal-linker',
            name: 'Internal Linker (Local)',
            source: 'local',
            capabilities: ['internal-link'],
            priority: 100,
            isAvailable: true,
            execute: async (opts) => {
                try {
                    const { findLinkOpportunities, injectInternalLinks } = await import('@/features/campaigns/lib/internalLinking');

                    const content = opts.context?.html as string || opts.prompt;
                    const existingPosts = opts.context?.existingPosts as any[] || [];
                    const maxLinks = (opts.context?.maxLinks as number) || 5;

                    // Find opportunities
                    const suggestions = findLinkOpportunities(content, existingPosts, maxLinks);

                    // Optionally inject links if requested
                    if (opts.context?.inject) {
                        const result = injectInternalLinks(content, suggestions, maxLinks);
                        return { success: true, data: result, handlerUsed: 'local-internal-linker', source: 'local', latencyMs: 0 };
                    }

                    return { success: true, data: { suggestions }, handlerUsed: 'local-internal-linker', source: 'local', latencyMs: 0 };
                } catch (e) {
                    return { success: false, error: String(e), handlerUsed: 'local-internal-linker', source: 'local', latencyMs: 0 };
                }
            },
        });

        // ============================================
        // IMAGE SEARCH HANDLERS (search-images capability)
        // ============================================

        // Import and register image search handlers
        try {
            const { imageSearchHandlers } = await import('../handlers/imageSearchHandlers');
            for (const handler of imageSearchHandlers) {
                this.registerHandler(handler);
            }
        } catch (e) {
            console.warn('[AIServices] Failed to load image search handlers:', e);
        }

        // ============================================
        // HUNT FEATURE HANDLERS
        // ============================================

        // Import and register trend handlers
        try {
            const { trendHandlers } = await import('../handlers/trendHandlers');
            for (const handler of trendHandlers) {
                this.registerHandler(handler);
            }
        } catch (e) {
            console.warn('[AIServices] Failed to load trend handlers:', e);
        }

        // Import and register domain handlers
        try {
            const { domainHandlers } = await import('../handlers/domainHandlers');
            for (const handler of domainHandlers) {
                this.registerHandler(handler);
            }
        } catch (e) {
            console.warn('[AIServices] Failed to load domain handlers:', e);
        }

        // Import and register scrape handler (Web Scraping)
        try {
            const { scrapeHandler } = await import('../handlers/scrapeHandler');
            this.registerHandler(scrapeHandler);
        } catch (e) {
            console.warn('[AIServices] Failed to load scrape handler:', e);
        }

    }

    // ============================================
    // MCP HANDLER REGISTRATION
    // ============================================

    /**
     * Register an MCP tool as a handler.
     * Called by MCPManager when tools are discovered.
     */
    registerMCPHandler(
        serverId: string,
        tool: { name: string; description?: string },
        capabilities: string[],
        executeFn: (options: ExecuteOptions) => Promise<ExecuteResult>
    ): void {
        const handlerId = `mcp-${serverId}-${tool.name}`;

        this.registerHandler({
            id: handlerId,
            name: `${tool.name} (MCP)`,
            source: 'mcp',
            mcpServerId: serverId,
            mcpToolName: tool.name,
            capabilities,
            priority: 90,  // MCP tools have high priority
            isAvailable: true,
            execute: executeFn,
        });
    }

    /**
     * Unregister all handlers for an MCP server.
     * Called when MCP disconnects.
     */
    unregisterMCPServer(serverId: string): void {
        const toRemove = Array.from(this.handlers.values())
            .filter(h => h.mcpServerId === serverId)
            .map(h => h.id);

        for (const id of toRemove) {
            this.removeHandler(id);
        }
    }

    // ============================================
    // EXECUTION
    // ============================================

    /**
     * Execute a capability.
     * This is the main entry point for all AI operations.
     */
    async execute(options: ExecuteOptions): Promise<ExecuteResult> {
        const startTime = Date.now();
        const { capability, useFallback = true } = options;

        // Check capability exists and is enabled
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

        if (!cap.isEnabled) {
            return {
                success: false,
                error: `Capability "${cap.name}" is disabled`,
                handlerUsed: 'none',
                source: 'local',
                latencyMs: Date.now() - startTime,
            };
        }

        // Get handlers in priority order
        const handlers = this.getHandlerChain(options);

        if (handlers.length === 0) {
            return {
                success: false,
                error: `No handlers available for capability: ${capability}`,
                handlerUsed: 'none',
                source: 'local',
                latencyMs: Date.now() - startTime,
            };
        }

        // Try handlers in order
        const fallbacksAttempted: string[] = [];

        for (const handler of handlers) {
            try {
                const result = await this.executeWithHandler(handler, options);

                if (result.success) {
                    result.fallbacksAttempted = fallbacksAttempted.length > 0 ? fallbacksAttempted : undefined;
                    this.emit({ type: 'execution-complete', result });
                    return result;
                }

                // Handler failed, try next
                fallbacksAttempted.push(handler.id);
                console.warn(`[AIServices] Handler ${handler.id} failed:`, result.error);

                if (!useFallback) break;

            } catch (error) {
                fallbacksAttempted.push(handler.id);
                console.error(`[AIServices] Handler ${handler.id} threw:`, error);

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
     * Execute a capability with aggregation (AND logic).
     * Calls ALL handlers in parallel and combines results.
     * Use for capabilities like trend-scan that need multi-source data.
     */
    async executeAggregate(options: ExecuteOptions): Promise<ExecuteResult> {
        const startTime = Date.now();
        const { capability, onProgress } = options;

        // Get capability definition
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
        const handlers = this.getHandlersFor(capability);

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
            message: `Starting ${handlers.length} sources...`,
            total: handlers.length,
        });

        // Track completed count for progress
        let completedCount = 0;

        // Execute ALL handlers with individual progress tracking
        const results = await Promise.allSettled(
            handlers.map(async (h) => {
                // Report starting this handler
                onProgress?.({
                    phase: 'handler',
                    message: `Fetching from ${h.name}...`,
                    handlerId: h.id,
                    handlerName: h.name,
                    current: completedCount,
                    total: handlers.length,
                });

                // Execute handler
                const result = await this.executeWithHandler(h, options);
                completedCount++;

                // Report completion of this handler
                onProgress?.({
                    phase: 'handler',
                    message: result.success
                        ? `${h.name}: ${Array.isArray(result.data) ? result.data.length : 1} items`
                        : `${h.name}: Failed`,
                    handlerId: h.id,
                    handlerName: h.name,
                    current: completedCount,
                    total: handlers.length,
                    success: result.success,
                    error: result.error,
                });

                return result;
            })
        );

        // Aggregate results
        const allData: unknown[] = [];
        const sources: Record<string, { success: boolean; count: number; error?: string }> = {};
        let successCount = 0;

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const handler = handlers[i];

            if (result.status === 'fulfilled' && result.value.success) {
                const data = result.value.data;
                if (Array.isArray(data)) {
                    allData.push(...data);
                } else if (data) {
                    allData.push(data);
                }
                sources[handler.id] = { success: true, count: Array.isArray(data) ? data.length : 1 };
                successCount++;
            } else {
                const error = result.status === 'rejected'
                    ? result.reason?.message
                    : (result.value as ExecuteResult).error;
                sources[handler.id] = { success: false, count: 0, error };
            }
        }

        // Report complete
        onProgress?.({
            phase: 'complete',
            message: `Fetched ${allData.length} items from ${successCount}/${handlers.length} sources`,
            current: handlers.length,
            total: handlers.length,
        });

        return {
            success: allData.length > 0,
            data: allData,
            handlerUsed: 'aggregate',
            source: 'aggregate' as 'local', // Type workaround
            latencyMs: Date.now() - startTime,
            metadata: { sources, handlersUsed: successCount, totalHandlers: handlers.length },
        };
    }

    private getHandlerChain(options: ExecuteOptions): CapabilityHandler[] {
        const { capability, preferredHandler } = options;
        const cap = this.capabilities.get(capability);

        // Get all available handlers
        let handlers = this.getHandlersFor(capability);

        // If preferred handler specified, put it first
        if (preferredHandler) {
            const preferred = handlers.find(h => h.id === preferredHandler);
            if (preferred) {
                handlers = [preferred, ...handlers.filter(h => h.id !== preferredHandler)];
            }
        }

        // If capability has default handler, prioritize it
        if (cap?.defaultHandlerId) {
            const defaultH = handlers.find(h => h.id === cap.defaultHandlerId);
            if (defaultH && !preferredHandler) {
                handlers = [defaultH, ...handlers.filter(h => h.id !== cap.defaultHandlerId)];
            }
        }

        // If preferMCP is enabled, sort MCP handlers first
        if (this.config.preferMCP) {
            handlers.sort((a, b) => {
                if (a.source === 'mcp' && b.source !== 'mcp') return -1;
                if (b.source === 'mcp' && a.source !== 'mcp') return 1;
                return b.priority - a.priority;
            });
        }

        return handlers;
    }

    private async executeWithHandler(
        handler: CapabilityHandler,
        options: ExecuteOptions
    ): Promise<ExecuteResult> {
        const startTime = Date.now();

        // If handler has custom execute function (MCP), use it
        if (handler.execute) {
            const result = await handler.execute(options);
            result.handlerUsed = handler.id;
            result.source = handler.source;
            result.latencyMs = Date.now() - startTime;
            return result;
        }

        // For AI providers, delegate to the provider adapter
        if (handler.source === 'ai-provider' && handler.providerId) {
            return this.executeWithAIProvider(handler, options, startTime);
        }

        return {
            success: false,
            error: `Handler ${handler.id} has no execution function`,
            handlerUsed: handler.id,
            source: handler.source,
            latencyMs: Date.now() - startTime,
        };
    }

    private async executeWithAIProvider(
        handler: CapabilityHandler,
        options: ExecuteOptions,
        startTime: number
    ): Promise<ExecuteResult> {
        // DETECT SERVER ENVIRONMENT
        const isServer = typeof window === 'undefined';

        // ============================================
        // SERVER-SIDE EXECUTION (Direct SDK Usage)
        // ============================================
        if (isServer) {
            try {
                // Get API Key from context (passed from route) or fallback to internal KeyManager check
                let apiKey = options.context?.apiKey as string;

                if (!apiKey) {
                    // Try to get from server-side KeyManager (only works if ENV vars are set)
                    try {
                        const { keyManager } = await import('@/lib/keys');
                        const key = keyManager.getKey(handler.providerId as any);
                        if (key) apiKey = key.key;
                    } catch (e) {
                        // Ignore
                    }
                }

                if (!apiKey) {
                    return {
                        success: false,
                        error: `No API key provided for ${handler.name} on server`,
                        handlerUsed: handler.id,
                        source: 'ai-provider',
                        latencyMs: Date.now() - startTime,
                    };
                }

                // Import and execute provider using the unified provider map
                const provider = await this.importProvider(handler.providerId!);
                const result = await provider.chat(apiKey, {
                    prompt: options.prompt,
                    systemPrompt: options.systemPrompt,
                    maxTokens: options.maxTokens,
                    temperature: options.temperature,
                    model: options.model
                });

                return {
                    success: result.success,
                    text: result.content || result.text,
                    error: result.error,
                    handlerUsed: handler.id,
                    source: 'ai-provider',
                    latencyMs: Date.now() - startTime,
                    model: result.model
                };

            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Server-side execution failed',
                    handlerUsed: handler.id,
                    source: 'ai-provider',
                    latencyMs: Date.now() - startTime,
                };
            }
        }

        // ============================================
        // CLIENT-SIDE EXECUTION (Fetch Proxy)
        // ============================================
        try {
            // Get API Key from Client KeyManager
            let apiKey = options.context?.apiKey as string; // Allow override
            if (!apiKey) {
                try {
                    // Dynamically import to be safe, though bundled invalidation is fine
                    const { keyManager } = await import('@/lib/keys');
                    const key = keyManager.getKey(handler.providerId as any);
                    if (key) apiKey = key.key;
                } catch (e) {
                    console.warn('Failed to retrieve client-side key:', e);
                }
            }

            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: options.prompt,
                    provider: handler.providerId,
                    model: options.model,
                    maxTokens: options.maxTokens,
                    temperature: options.temperature,
                    systemPrompt: options.systemPrompt,
                    apiKey: apiKey // PASS THE KEY
                }),
            });

            // Check for rate limit (429)
            if (response.status === 429) {
                // Import KeyManager and mark current key as rate-limited
                const { keyManager } = await import('@/lib/keys');
                const providerId = handler.providerId as 'gemini' | 'deepseek' | 'openrouter' | 'perplexity';
                keyManager.markRateLimited(providerId);

                return {
                    success: false,
                    error: 'RATE_LIMITED',  // Special error code for retry logic
                    handlerUsed: handler.id,
                    source: 'ai-provider' as const,
                    latencyMs: Date.now() - startTime,
                    isRateLimited: true,
                };
            }

            const data = await response.json();

            // Mark success or failure for the current key
            if (data.success && handler.providerId) {
                const { keyManager } = await import('@/lib/keys');
                const providerId = handler.providerId as 'gemini' | 'deepseek' | 'openrouter' | 'perplexity';
                keyManager.markSuccess(providerId);
            } else if (!data.success && handler.providerId) {
                const { keyManager } = await import('@/lib/keys');
                const providerId = handler.providerId as 'gemini' | 'deepseek' | 'openrouter' | 'perplexity';
                keyManager.markFailure(providerId);
            }

            return {
                success: data.success ?? false,
                text: data.content || data.text,
                error: data.error,
                handlerUsed: handler.id,
                source: 'ai-provider' as const,
                latencyMs: Date.now() - startTime,
                model: data.model,
            };
        } catch (error) {
            // Mark failure for the current key
            if (handler.providerId) {
                try {
                    const { keyManager } = await import('@/lib/keys');
                    const providerId = handler.providerId as 'gemini' | 'deepseek' | 'openrouter' | 'perplexity';
                    keyManager.markFailure(providerId);
                } catch {
                    // Ignore import errors on server side
                }
            }

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Network failure',
                handlerUsed: handler.id,
                source: 'ai-provider' as const,
                latencyMs: Date.now() - startTime,
            };
        }
    }

    // ============================================
    // PROVIDER EXECUTION HELPERS
    // ============================================

    /**
     * Provider type for type-safe key management
     */
    private readonly PROVIDER_IDS = ['gemini', 'deepseek', 'openrouter', 'perplexity'] as const;

    /**
     * Import a provider dynamically by ID.
     * Centralizes provider imports - adding new providers only requires updating this map.
     */
    private async importProvider(providerId: string) {
        const providerMap: Record<string, () => Promise<{ chat: (key: string, opts: any) => Promise<any> }>> = {
            gemini: async () => (await import('../providers/gemini')).geminiProvider,
            deepseek: async () => (await import('../providers/deepseek')).deepseekProvider,
            openrouter: async () => (await import('../providers/openrouter')).openrouterProvider,
            perplexity: async () => (await import('../providers/perplexity')).perplexityProvider,
        };

        const loader = providerMap[providerId];
        if (!loader) {
            throw new Error(`Unknown provider: ${providerId}. Available: ${Object.keys(providerMap).join(', ')}`);
        }

        return loader();
    }

    /**
     * Execute a provider directly (used by handler.execute functions).
     * Handles both server and client environments.
     */
    private async executeProviderDirect(
        providerId: string,
        options: ExecuteOptions
    ): Promise<ExecuteResult> {
        const startTime = Date.now();
        const isServer = typeof window === 'undefined';

        try {
            // Get API key
            let apiKey = options.context?.apiKey as string;
            if (!apiKey) {
                try {
                    const { keyManager } = await import('@/lib/keys');
                    const key = keyManager.getKey(providerId as 'gemini' | 'deepseek' | 'openrouter' | 'perplexity');
                    if (key) apiKey = key.key;
                } catch {
                    // KeyManager not available
                }
            }

            if (!apiKey && isServer) {
                return {
                    success: false,
                    error: `No API key for ${providerId}`,
                    handlerUsed: providerId,
                    source: 'ai-provider',
                    latencyMs: Date.now() - startTime,
                };
            }

            // Server-side: direct SDK call
            if (isServer && apiKey) {
                const provider = await this.importProvider(providerId);

                // Use generateImage for images capability (Gemini only)
                const isImageGeneration = options.capability === 'images' && providerId === 'gemini';

                let result;
                if (isImageGeneration && 'generateImage' in provider) {
                    result = await (provider as { generateImage: typeof provider.chat }).generateImage(apiKey, {
                        prompt: options.prompt,
                    });
                } else {
                    result = await provider.chat(apiKey, {
                        prompt: options.prompt,
                        systemPrompt: options.systemPrompt,
                        maxTokens: options.maxTokens,
                        temperature: options.temperature,
                        model: options.model,
                    });
                }

                return {
                    success: result.success,
                    text: result.content || result.text,
                    data: isImageGeneration ? result.content : undefined, // For images, put URL in data too
                    error: result.error,
                    handlerUsed: providerId,
                    source: 'ai-provider',
                    latencyMs: Date.now() - startTime,
                    model: result.model,
                };
            }

            // Client-side: proxy through unified capabilities API
            const capability = options.capability || 'generate';
            const response = await fetch(`/api/capabilities/${capability}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: options.prompt,
                    preferredHandler: providerId,
                    model: options.model,
                    maxTokens: options.maxTokens,
                    temperature: options.temperature,
                    systemPrompt: options.systemPrompt,
                    context: { apiKey },
                }),
            });

            if (response.status === 429) {
                try {
                    const { keyManager } = await import('@/lib/keys');
                    keyManager.markRateLimited(providerId as 'gemini' | 'deepseek' | 'openrouter' | 'perplexity');
                } catch { /* ignore */ }

                return {
                    success: false,
                    error: 'RATE_LIMITED',
                    handlerUsed: providerId,
                    source: 'ai-provider',
                    latencyMs: Date.now() - startTime,
                    isRateLimited: true,
                };
            }

            const data = await response.json();

            // Track key success/failure
            try {
                const { keyManager } = await import('@/lib/keys');
                const id = providerId as 'gemini' | 'deepseek' | 'openrouter' | 'perplexity';
                if (data.success) {
                    keyManager.markSuccess(id);
                } else {
                    keyManager.markFailure(id);
                }
            } catch { /* ignore */ }

            return {
                success: data.success ?? false,
                text: data.text,  // Unified route uses 'text' not 'content'
                data: data.data,  // Include data field for structured responses
                error: data.error,
                handlerUsed: data.handlerUsed || providerId,
                source: 'ai-provider',
                latencyMs: Date.now() - startTime,
                model: data.model,
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Provider execution failed',
                handlerUsed: providerId,
                source: 'ai-provider',
                latencyMs: Date.now() - startTime,
            };
        }
    }


    // CONVENIENCE METHODS
    // ============================================

    /**
     * Generate text content
     */
    async generate(prompt: string, options?: Partial<ExecuteOptions>): Promise<string> {
        const result = await this.execute({
            capability: 'generate',
            prompt,
            ...options,
        });
        return result.text || '';
    }

    /**
     * Research a topic
     */
    async research(query: string, context?: Record<string, unknown>): Promise<ExecuteResult> {
        return this.execute({
            capability: 'research',
            prompt: query,
            context,
        });
    }

    /**
     * Discover keywords
     */
    async keywords(topic: string, niche?: string): Promise<ExecuteResult> {
        return this.execute({
            capability: 'keywords',
            prompt: topic,
            context: { niche },
        });
    }

    /**
     * Analyze content
     */
    async analyze(
        content: string,
        type: 'seo' | 'readability' | 'eeat' | 'sentiment'
    ): Promise<ExecuteResult> {
        return this.execute({
            capability: 'analyze',
            prompt: content,
            context: { analysisType: type },
        });
    }

    /**
     * Summarize content
     */
    async summarize(content: string, maxLength?: number): Promise<string> {
        const result = await this.execute({
            capability: 'summarize',
            prompt: content,
            context: { maxLength },
        });
        return result.text || '';
    }

    /**
     * Translate content
     */
    async translate(content: string, targetLanguage: string): Promise<string> {
        const result = await this.execute({
            capability: 'translate',
            prompt: content,
            context: { targetLanguage },
        });
        return result.text || '';
    }

    // ============================================
    // HUNT FEATURE CONVENIENCE METHODS
    // ============================================

    /**
     * Scan for trending topics
     */
    async scanTrends(options?: {
        sources?: string[];
        maxItems?: number;
        topic?: string;
    }): Promise<ExecuteResult> {
        return this.execute({
            capability: 'trend-scan',
            prompt: options?.topic || 'trending topics',
            context: {
                sources: options?.sources,
                maxItems: options?.maxItems || 10,
            },
        });
    }

    /**
     * Search for expired domains
     */
    async searchDomains(options?: {
        keywords?: string;
        filters?: Record<string, unknown>;
        page?: number;
        limit?: number;
        apiKey?: string;
    }): Promise<ExecuteResult> {
        return this.execute({
            capability: 'domain-search',
            prompt: options?.keywords || '',
            context: options,
        });
    }

    /**
     * Analyze a domain
     */
    async analyzeDomain(domain: string, options?: {
        targetNiche?: string;
        skipWayback?: boolean;
    }): Promise<ExecuteResult> {
        return this.execute({
            capability: 'domain-analyze',
            prompt: domain,
            context: options,
        });
    }

    /**
     * Lookup Wayback Machine history for a domain
     */
    async waybackLookup(domain: string): Promise<ExecuteResult> {
        return this.execute({
            capability: 'wayback-lookup',
            prompt: domain,
            context: { domain },
        });
    }

    // NOTE: executeWithKeys method was removed - use CapabilityExecutor with context.apiKey instead
    // See capability_system_guidelines.md for the standard pattern

    // ============================================
    // CONFIG ACCESS
    // ============================================

    getConfig(): CapabilitiesConfig {
        return { ...this.config };
    }

    updateConfig(updates: Partial<CapabilitiesConfig>): void {
        this.config = { ...this.config, ...updates };
        this.saveConfig();
    }

    // ============================================
    // EVENTS
    // ============================================

    subscribe(listener: (event: AIServicesEvent) => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private emit(event: AIServicesEvent): void {
        for (const listener of this.listeners) {
            try {
                listener(event);
            } catch (error) {
                console.error('[AIServices] Event listener error:', error);
            }
        }
    }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const aiServices = AIServicesClass.getInstance();

// Auto-initialize on import (client-side only)
if (typeof window !== 'undefined') {
    aiServices.initialize().catch(console.error);
}
