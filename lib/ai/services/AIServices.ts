/**
 * AI Services - Main Class (PROXY)
 * 
 * The central orchestrator for all AI capabilities in Ifrit.
 * 
 * @deprecated Use lib/core/Engine instead. 
 * This class now acts as a thin proxy to the isomorphic Engine.
 */

import {
    Capability,
    CapabilityHandler,
    CapabilitiesConfig,
    ExecuteOptions,
    ExecuteResult,
    DEFAULT_CONFIG,
    AIServicesEvent,
} from './types';

// Engine Import (The New Brain)
import { engine } from '@/lib/core/Engine';

// ============================================
// AI SERVICES SINGLETON (PROXY)
// ============================================

/**
 * @deprecated Use IfritEngine from lib/core instead.
 */
class AIServicesClass {
    private static instance: AIServicesClass;
    private initialized = false;

    // Config stored for legacy access, but Engine manages it now
    private config: CapabilitiesConfig = DEFAULT_CONFIG;

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
    // INITIALIZATION (Redirects to SystemInitializer)
    // ============================================

    async initialize(): Promise<void> {
        if (this.initialized) return;

        console.warn('[AIServices] DEPRECATED: You are using the legacy AIServices singleton. Please migrate to "import { engine } from \'@/lib/core\'".');

        // Use the centralized SystemInitializer
        const { initializeSystemHandlers } = await import('@/lib/core/SystemInitializer');
        await initializeSystemHandlers();

        // Load config from settings store (shim)
        if (typeof window !== 'undefined') {
            this.loadConfig();
        }

        this.initialized = true;
    }

    // NOTE: Handler registration is now done by lib/core/SystemInitializer.ts



    // ============================================
    // EXECUTION - PROXY TO ENGINE
    // ============================================

    async execute(options: ExecuteOptions): Promise<ExecuteResult> {
        return engine.execute(options);
    }

    async executeAggregate(options: ExecuteOptions): Promise<ExecuteResult> {
        return engine.executeAggregate(options);
    }

    // ============================================
    // CONVENIENCE WRAPPERS (PROXIES)
    // ============================================

    async summarize(content: string, maxLength?: number): Promise<string> {
        const result = await engine.execute({
            capability: 'summarize',
            prompt: content,
            context: { maxLength }
        });
        return result.text || '';
    }

    async translate(content: string, targetLanguage: string): Promise<string> {
        const result = await engine.execute({
            capability: 'translate',
            prompt: content,
            context: { targetLanguage }
        });
        return result.text || '';
    }

    async process(content: string, type: 'sentiment' | 'topic' | 'entities'): Promise<any> {
        const result = await engine.execute({
            capability: 'analyze',
            prompt: content,
            context: { analysisType: type }
        });
        return result.data;
    }

    async research(query: string, options?: { researchType?: string }): Promise<ExecuteResult> {
        return engine.execute({
            capability: 'research',
            prompt: query,
            context: options,
        });
    }

    async scanTrends(options?: { sources?: string[]; maxItems?: number; topic?: string; }): Promise<ExecuteResult> {
        return engine.execute({
            capability: 'trend-scan',
            prompt: options?.topic || 'trending topics',
            context: {
                sources: options?.sources,
                maxItems: options?.maxItems || 10,
            },
        });
    }

    async searchDomains(options?: { keywords?: string; filters?: Record<string, unknown>; page?: number; limit?: number; apiKey?: string; }): Promise<ExecuteResult> {
        return engine.execute({
            capability: 'domain-search',
            prompt: options?.keywords || '',
            context: options,
        });
    }

    async analyzeDomain(domain: string, options?: { targetNiche?: string; skipWayback?: boolean; }): Promise<ExecuteResult> {
        return engine.execute({
            capability: 'domain-analyze',
            prompt: domain,
            context: options,
        });
    }

    async waybackLookup(domain: string): Promise<ExecuteResult> {
        return engine.execute({
            capability: 'wayback-lookup',
            prompt: domain,
            context: { domain },
        });
    }

    async generateImage(prompt: string, options?: { aspectRatio?: string; style?: string; }): Promise<string> {
        const result = await engine.execute({
            capability: 'images',
            prompt: prompt,
            context: options,
        });
        return (result.data as any)?.url || (result.data as any)?.[0]?.url || '';
    }

    // ============================================
    // HANDLER / CONFIG PROXIES
    // ============================================

    registerHandler(handler: CapabilityHandler): void {
        engine.registerHandler(handler);
    }

    getHandlers(): CapabilityHandler[] {
        return engine.getHandlers();
    }

    getCapabilities(): Capability[] {
        return engine.getCapabilities();
    }

    getConfig(): CapabilitiesConfig {
        return { ...this.config };
    }

    addCapability(capability: Capability): void {
        engine.addCapability(capability);
    }

    removeCapability(capabilityId: string): void {
        engine.removeCapability(capabilityId);
    }

    updateConfig(updates: Partial<CapabilitiesConfig>): void {
        this.config = { ...this.config, ...updates };
        this.saveConfig();
    }

    updateCapabilitySettings(capabilityId: string, settings: { isEnabled?: boolean; defaultHandlerId?: string; fallbackHandlerIds?: string[] }): void {
        // Use 'any' to avoid type issues with dynamic config structure
        const cfg = this.config as any;
        if (!cfg.capabilities) {
            cfg.capabilities = {};
        }
        cfg.capabilities[capabilityId] = {
            ...cfg.capabilities[capabilityId],
            ...settings,
        };
        this.saveConfig();
    }

    /**
     * Shim: Saves to existing settings store. 
     * Engine reads from here via BrowserConfigProvider.
     */
    private saveConfig(): void {
        if (typeof window !== 'undefined') {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const { useSettingsStore } = require('@/stores/settingsStore');
                useSettingsStore.getState().setCapabilitiesConfig(this.config);
            } catch (e) {
                console.warn('Failed to save config to store', e);
            }
        }
    }

    private loadConfig(): void {
        if (typeof window !== 'undefined') {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const { useSettingsStore } = require('@/stores/settingsStore');
                const storeConfig = useSettingsStore.getState().capabilitiesConfig;
                if (storeConfig) {
                    this.config = storeConfig;
                }
            } catch (e) {
                console.warn('Failed to load config from store', e);
            }
        }
    }

    subscribe(listener: (event: AIServicesEvent) => void): () => void {
        return engine.subscribe(listener);
    }
}

export const aiServices = AIServicesClass.getInstance();

// Auto-init client-side
if (typeof window !== 'undefined') {
    aiServices.initialize().catch(console.error);
}
