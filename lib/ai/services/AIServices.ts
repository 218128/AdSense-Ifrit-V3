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
        this.loadConfig();

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
    private loadConfig(): void {
        if (typeof window === 'undefined') return;

        try {
            // Try to load from settingsStore first (unified settings)
            const { useSettingsStore } = require('@/stores/settingsStore');
            const storeConfig = useSettingsStore.getState().capabilitiesConfig;

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
    private saveConfig(): void {
        if (typeof window === 'undefined') return;

        try {
            // Save to settingsStore (unified settings)
            const { useSettingsStore } = require('@/stores/settingsStore');
            useSettingsStore.getState().setCapabilitiesConfig(this.config);

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
        // Use KeyManager to check key availability
        let hasGeminiKeys = false;
        let hasDeepseekKeys = false;
        let hasPerplexityKeys = false;
        let hasOpenrouterKeys = false;

        try {
            const { keyManager } = require('@/lib/keys');
            hasGeminiKeys = !!keyManager.getKey('gemini');
            hasDeepseekKeys = !!keyManager.getKey('deepseek');
            hasPerplexityKeys = !!keyManager.getKey('perplexity');
            hasOpenrouterKeys = !!keyManager.getKey('openrouter');
        } catch {
            console.warn('[AIServices] KeyManager not available, defaulting all providers to available');
            hasGeminiKeys = hasDeepseekKeys = hasPerplexityKeys = hasOpenrouterKeys = true;
        }

        // All text-based capabilities that any AI provider can potentially handle
        // User decides which provider to use for each in Settings
        const textCapabilities = [
            'generate', 'research', 'keywords', 'analyze',
            'summarize', 'translate', 'reasoning', 'code'
        ];

        // Image capabilities - only some providers support
        const imageCapabilities = ['images'];

        // Register Gemini as handler for all capabilities
        this.registerHandler({
            id: 'gemini',
            name: 'Google Gemini',
            source: 'ai-provider',
            providerId: 'gemini',
            capabilities: [...textCapabilities, ...imageCapabilities],  // All capabilities
            priority: 80,
            isAvailable: hasGeminiKeys,
            requiresApiKey: true,
        });

        // DeepSeek - all text capabilities
        this.registerHandler({
            id: 'deepseek',
            name: 'DeepSeek',
            source: 'ai-provider',
            providerId: 'deepseek',
            capabilities: textCapabilities,  // All text capabilities
            priority: 70,
            isAvailable: hasDeepseekKeys,
            requiresApiKey: true,
        });

        // Perplexity - all text capabilities (especially good for research)
        this.registerHandler({
            id: 'perplexity',
            name: 'Perplexity',
            source: 'ai-provider',
            providerId: 'perplexity',
            capabilities: textCapabilities,  // All text capabilities
            priority: 75,
            isAvailable: hasPerplexityKeys,
            requiresApiKey: true,
        });

        // OpenRouter - all text capabilities (access to many models)
        this.registerHandler({
            id: 'openrouter',
            name: 'OpenRouter',
            source: 'ai-provider',
            providerId: 'openrouter',
            capabilities: textCapabilities,  // All text capabilities
            priority: 60,
            isAvailable: hasOpenrouterKeys,
            requiresApiKey: true,
        });

        // ============================================
        // IMAGE INTEGRATION HANDLERS
        // ============================================

        // Unsplash - stock photos for images capability
        this.registerHandler({
            id: 'unsplash',
            name: 'Unsplash',
            source: 'integration',
            capabilities: ['images'],
            priority: 85,  // High priority for images
            isAvailable: true,  // Free tier available
            requiresApiKey: false,  // Optional API key for higher rate limits
        });

        // Pexels - free stock photos
        this.registerHandler({
            id: 'pexels',
            name: 'Pexels',
            source: 'integration',
            capabilities: ['images'],
            priority: 80,
            isAvailable: true,
            requiresApiKey: false,
        });
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
        // Use fetch API to call the generation endpoint
        // This avoids bundling Node.js-only dependencies in client code
        try {
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
                }),
            });

            const data = await response.json();

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
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to call AI provider',
                handlerUsed: handler.id,
                source: 'ai-provider' as const,
                latencyMs: Date.now() - startTime,
            };
        }
    }

    // ============================================
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
    // SERVER-SIDE EXECUTION (with passed keys)
    // ============================================

    /**
     * Execute a capability on the server with explicitly provided API keys.
     * Use this in API routes where localStorage is not available.
     * 
     * @param options - Execution options including capability, prompt, etc.
     * @param providerKeys - Map of providerId → apiKey[]
     * @returns ExecuteResult with text/data or error
     */
    async executeWithKeys(
        options: ExecuteOptions,
        providerKeys: Record<string, string[]>
    ): Promise<ExecuteResult> {
        const startTime = Date.now();
        const { capability, prompt } = options;

        // Validate capability exists
        const cap = this.capabilities.get(capability);
        if (!cap || !cap.isEnabled) {
            return {
                success: false,
                error: `Capability '${capability}' not found or disabled`,
                handlerUsed: 'none',
                source: 'local',
                latencyMs: Date.now() - startTime,
            };
        }

        // Import providers dynamically (safe for server-side)
        const { PROVIDER_ADAPTERS } = await import('@/lib/ai/providers');

        // Provider priority order
        const providerOrder = ['gemini', 'deepseek', 'openrouter', 'perplexity'];

        for (const providerId of providerOrder) {
            const keys = providerKeys[providerId];
            if (!keys?.length) continue;

            const adapter = PROVIDER_ADAPTERS[providerId as keyof typeof PROVIDER_ADAPTERS];
            if (!adapter) continue;

            // Try each key
            for (const apiKey of keys) {
                try {
                    const result = await adapter.chat(apiKey, {
                        prompt,
                        model: options.model,
                        maxTokens: options.maxTokens,
                        temperature: options.temperature,
                        systemPrompt: options.systemPrompt,
                    });

                    if (result.success && result.content) {
                        return {
                            success: true,
                            text: result.content,
                            handlerUsed: providerId,
                            source: 'ai-provider',
                            latencyMs: Date.now() - startTime,
                            model: result.model,
                        };
                    }
                } catch (error) {
                    console.log(`[AIServices.executeWithKeys] ${providerId} failed:`, error);
                    continue;
                }
            }
        }

        return {
            success: false,
            error: 'All providers failed or no valid keys provided',
            handlerUsed: 'none',
            source: 'local',
            latencyMs: Date.now() - startTime,
        };
    }

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
