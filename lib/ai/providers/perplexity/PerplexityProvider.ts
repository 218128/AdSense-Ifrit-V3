/**
 * Perplexity Provider (Updated to use Official SDK)
 * 
 * Web-grounded AI with citations using official SDK.
 * Models: sonar, sonar-pro, sonar-reasoning-pro, sonar-deep-research
 * 
 * @see https://docs.perplexity.ai/
 */

import {
    ProviderAdapter,
    ProviderMeta,
    ModelInfo,
    KeyTestResult,
    GenerateOptions,
    GenerateResult,
    errorResult
} from '../base';

import { PerplexitySdk } from './PerplexitySdk';
import type {
    PerplexityModel,
    PerplexityResult,
    SearchRequest,
    SearchResponse,
    ChatCompletionRequest,
    ChatCompletionResponse,
    AsyncRequest,
    AsyncStatusResponse
} from './types';
import { PERPLEXITY_MODELS } from './types';

// ============================================
// EXTENDED GENERATE RESULT
// ============================================

/**
 * Extended GenerateResult with Perplexity-specific fields
 */
export interface PerplexityGenerateResult extends GenerateResult {
    /** Source URLs used for grounding */
    citations?: string[];

    /** Structured search results */
    searchResults?: Array<{
        title: string;
        url: string;
        snippet: string;
        date: string;
        lastUpdated: string;
    }>;

    /** Image URLs found */
    images?: string[];

    /** Follow-up question suggestions */
    relatedQuestions?: string[];

    /** Request ID */
    requestId?: string;

    /** Actual cost */
    cost?: {
        inputTokensCost: number;
        outputTokensCost: number;
        requestCost: number;
        totalCost: number;
    };
}

// ============================================
// PROVIDER IMPLEMENTATION
// ============================================

export class PerplexityProvider implements ProviderAdapter {
    readonly meta: ProviderMeta = {
        id: 'perplexity',
        name: 'Perplexity AI',
        description: 'Web-grounded search AI with citations',
        signupUrl: 'https://www.perplexity.ai/',
        docsUrl: 'https://docs.perplexity.ai/',
        keyPrefix: 'pplx-'
    };

    /**
     * Test API key by making a minimal request
     */
    async testKey(apiKey: string): Promise<KeyTestResult> {
        const startTime = Date.now();

        // Validate key prefix
        if (!apiKey.startsWith('pplx-')) {
            return {
                valid: false,
                models: [],
                error: 'Perplexity keys must start with "pplx-"'
            };
        }

        try {
            const sdk = new PerplexitySdk(apiKey);

            // Try a minimal chat to validate key
            await sdk.chat('test', 'sonar');

            // Return known models
            const models: ModelInfo[] = Object.entries(PERPLEXITY_MODELS).map(
                ([id, info]) => ({
                    id,
                    name: info.name,
                    description: info.description,
                    modes: id.includes('reasoning')
                        ? ['chat', 'search', 'reason'] as const
                        : ['chat', 'search'] as const
                })
            );

            return {
                valid: true,
                models,
                responseTimeMs: Date.now() - startTime
            };
        } catch (error) {
            return {
                valid: false,
                models: [],
                error: error instanceof Error ? error.message : 'Key validation failed'
            };
        }
    }

    /**
     * Generate content using Perplexity chat completion
     * Extracts ALL response data including citations, search_results, images
     */
    async chat(apiKey: string, options: GenerateOptions): Promise<PerplexityGenerateResult> {
        const model = (options.model || 'sonar') as PerplexityModel;

        try {
            const sdk = new PerplexitySdk(apiKey);

            const result = await sdk.chat(
                options.prompt,
                model,
                options.systemPrompt
            );

            if (!result.success) {
                return errorResult(result.error || 'Unknown error', model);
            }

            return this.toGenerateResult(result, model);
        } catch (error) {
            return errorResult(
                error instanceof Error ? error.message : 'Network error',
                model
            );
        }
    }

    // =====================
    // NEW SDK METHODS
    // =====================

    /**
     * Direct search with domain/date filtering
     */
    async search(apiKey: string, request: SearchRequest): Promise<SearchResponse> {
        const sdk = new PerplexitySdk(apiKey);
        return sdk.search(request);
    }

    /**
     * Full chat completion with all options
     */
    async chatComplete(
        apiKey: string,
        request: ChatCompletionRequest
    ): Promise<ChatCompletionResponse> {
        const sdk = new PerplexitySdk(apiKey);
        return sdk.chatComplete(request);
    }

    /**
     * Streaming chat completion
     */
    async *chatStream(apiKey: string, request: ChatCompletionRequest) {
        const sdk = new PerplexitySdk(apiKey);
        yield* sdk.chatStream(request);
    }

    /**
     * Start async deep research
     */
    async startDeepResearch(apiKey: string, prompt: string): Promise<AsyncRequest> {
        const sdk = new PerplexitySdk(apiKey);
        return sdk.startDeepResearch(prompt);
    }

    /**
     * Check async request status
     */
    async getAsyncStatus(apiKey: string, requestId: string): Promise<AsyncStatusResponse> {
        const sdk = new PerplexitySdk(apiKey);
        return sdk.asyncGet(requestId);
    }

    /**
     * List async requests
     */
    async listAsyncRequests(apiKey: string): Promise<AsyncStatusResponse[]> {
        const sdk = new PerplexitySdk(apiKey);
        return sdk.asyncList();
    }

    /**
     * Chain of Thought reasoning
     */
    async reason(
        apiKey: string,
        options: GenerateOptions
    ): Promise<PerplexityGenerateResult> {
        const sdk = new PerplexitySdk(apiKey);
        const result = await sdk.reason(options.prompt, options.systemPrompt);

        if (!result.success) {
            return errorResult(result.error || 'Reasoning failed', 'sonar-reasoning-pro');
        }

        return this.toGenerateResult(result, 'sonar-reasoning-pro');
    }

    // =====================
    // HELPERS
    // =====================

    /**
     * Convert PerplexityResult to GenerateResult with all extra fields
     */
    private toGenerateResult(
        result: PerplexityResult,
        model: string
    ): PerplexityGenerateResult {
        return {
            success: true,
            content: result.content || '',
            model,
            usage: result.usage ? {
                inputTokens: result.usage.inputTokens,
                outputTokens: result.usage.outputTokens
            } : undefined,

            // Perplexity-specific data
            citations: result.citations,
            searchResults: result.searchResults,
            images: result.images,
            relatedQuestions: result.relatedQuestions,
            requestId: result.requestId,
            cost: result.usage?.cost
        };
    }
}

// Export singleton instance
export const perplexityProvider = new PerplexityProvider();
