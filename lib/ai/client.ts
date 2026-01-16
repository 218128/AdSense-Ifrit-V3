/**
 * Unified AI Client
 * 
 * Single entry point for all AI capabilities in Ifrit.
 * Wraps CapabilityExecutor with easy-to-use methods.
 * 
 * Usage:
 *   import { ai } from '@/lib/ai/client';
 *   
 *   const result = await ai.generate('Write an article about...');
 *   const research = await ai.research('Latest trends in...');
 *   const image = await ai.image('A professional banner...');
 * 
 * MIGRATION: Uses aiServices. Engine accessible via @/lib/core.
 */

import { getCapabilityExecutor, ProviderDiagnostics } from './services/CapabilityExecutor';
import { aiServices } from './services';
import type { ExecuteOptions, ExecuteResult, CapabilityHandler, CapabilitiesConfig } from './services/types';

// ============================================
// TYPES
// ============================================

export interface GenerateOptions {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
    preferredHandler?: string;
}

export interface ResearchOptions {
    sources?: boolean;
    maxTokens?: number;
    preferredHandler?: string;
}

export interface ImageOptions {
    size?: '512x512' | '1024x1024' | '1792x1024';
    style?: 'natural' | 'vivid';
    preferredHandler?: string;
}

export interface AnalyzeOptions {
    type?: 'seo' | 'eeat' | 'readability' | 'all';
    preferredHandler?: string;
}

export interface TranslateOptions {
    targetLanguage: string;
    sourceLanguage?: string;
    preferredHandler?: string;
}

export interface AIResult {
    success: boolean;
    text?: string;
    data?: unknown;
    error?: string;
    handlerUsed: string;
    latencyMs: number;
    diagnostics?: ProviderDiagnostics;
}

// ============================================
// UNIFIED AI CLIENT
// ============================================

class AIClient {
    private getExecutor() {
        return getCapabilityExecutor();
    }

    private getHandlers(): CapabilityHandler[] {
        return aiServices.getHandlers();
    }

    private getConfig(): CapabilitiesConfig {
        return aiServices.getConfig();
    }

    /**
     * Execute any capability directly
     */
    async execute(options: ExecuteOptions): Promise<AIResult> {
        const executor = this.getExecutor();
        const handlers = this.getHandlers();
        const config = this.getConfig();

        const result = await executor.execute(options, handlers, config);

        return {
            success: result.success,
            text: result.text,
            data: result.data,
            error: result.error,
            handlerUsed: result.handlerUsed,
            latencyMs: result.latencyMs,
            diagnostics: result.diagnostics,
        };
    }

    // ============================================
    // CONVENIENCE METHODS
    // ============================================

    /**
     * Generate text content
     */
    async generate(prompt: string, options: GenerateOptions = {}): Promise<AIResult> {
        return this.execute({
            capability: 'generate',
            prompt,
            model: options.model,
            maxTokens: options.maxTokens,
            temperature: options.temperature,
            systemPrompt: options.systemPrompt,
            preferredHandler: options.preferredHandler,
        });
    }

    /**
     * Perform web research
     */
    async research(topic: string, options: ResearchOptions = {}): Promise<AIResult> {
        return this.execute({
            capability: 'research',
            prompt: topic,
            maxTokens: options.maxTokens,
            preferredHandler: options.preferredHandler,
            context: { includeSources: options.sources },
        });
    }

    /**
     * Generate images
     */
    async image(prompt: string, options: ImageOptions = {}): Promise<AIResult> {
        return this.execute({
            capability: 'images',
            prompt,
            preferredHandler: options.preferredHandler,
            context: { size: options.size, style: options.style },
        });
    }

    /**
     * Analyze content
     */
    async analyze(content: string, options: AnalyzeOptions = {}): Promise<AIResult> {
        return this.execute({
            capability: 'analyze',
            prompt: content,
            preferredHandler: options.preferredHandler,
            context: { analysisType: options.type || 'all' },
        });
    }

    /**
     * Discover keywords
     */
    async keywords(topic: string, options: { count?: number; preferredHandler?: string } = {}): Promise<AIResult> {
        return this.execute({
            capability: 'keywords',
            prompt: topic,
            preferredHandler: options.preferredHandler,
            context: { count: options.count || 10 },
        });
    }

    /**
     * Summarize content
     */
    async summarize(content: string, options: { maxLength?: number; preferredHandler?: string } = {}): Promise<AIResult> {
        return this.execute({
            capability: 'summarize',
            prompt: content,
            preferredHandler: options.preferredHandler,
            context: { maxLength: options.maxLength },
        });
    }

    /**
     * Translate content
     */
    async translate(content: string, options: TranslateOptions): Promise<AIResult> {
        return this.execute({
            capability: 'translate',
            prompt: content,
            preferredHandler: options.preferredHandler,
            context: {
                targetLanguage: options.targetLanguage,
                sourceLanguage: options.sourceLanguage,
            },
        });
    }

    /**
     * Scrape web page
     */
    async scrape(url: string, options: { selector?: string; preferredHandler?: string } = {}): Promise<AIResult> {
        return this.execute({
            capability: 'scrape',
            prompt: url,
            preferredHandler: options.preferredHandler,
            context: { selector: options.selector },
        });
    }

    /**
     * Deep reasoning / planning
     */
    async reason(prompt: string, options: { maxTokens?: number; preferredHandler?: string } = {}): Promise<AIResult> {
        return this.execute({
            capability: 'reasoning',
            prompt,
            maxTokens: options.maxTokens,
            preferredHandler: options.preferredHandler,
        });
    }

    /**
     * Generate code
     */
    async code(prompt: string, options: { language?: string; preferredHandler?: string } = {}): Promise<AIResult> {
        return this.execute({
            capability: 'code',
            prompt,
            preferredHandler: options.preferredHandler,
            context: { language: options.language },
        });
    }

    // ============================================
    // DIAGNOSTICS
    // ============================================

    /**
     * Get performance stats for all providers
     */
    getProviderStats() {
        return this.getExecutor().getProviderStats();
    }

    /**
     * Get diagnostics log
     */
    getDiagnosticsLog() {
        return this.getExecutor().getDiagnosticsLog();
    }

    /**
     * Clear diagnostics log
     */
    clearDiagnosticsLog() {
        this.getExecutor().clearDiagnosticsLog();
    }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const ai = new AIClient();

// Also export class for custom instances
export { AIClient };
