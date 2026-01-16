/**
 * Perplexity SDK Wrapper
 * 
 * Wraps the official @perplexity-ai/perplexity_ai SDK with full data extraction.
 * Every response field is captured - nothing is discarded.
 * 
 * @see https://docs.perplexity.ai/
 */

import Perplexity from '@perplexity-ai/perplexity_ai';
import type {
    PerplexityModel,
    SearchRequest,
    SearchResponse,
    SearchResult,
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatCompletionChoice,
    UsageInfo,
    AsyncRequest,
    AsyncStatusResponse,
    AsyncListRequest,
    PerplexityResult,
    StreamChunk
} from './types';

// ============================================
// SDK WRAPPER CLASS
// ============================================

export class PerplexitySdk {
    private client: Perplexity;
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        this.client = new Perplexity({ apiKey });
    }

    // =====================
    // SEARCH API
    // =====================

    /**
     * Execute a web search with optional filtering
     * Returns ranked results with snippets and metadata
     */
    async search(request: SearchRequest): Promise<SearchResponse> {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const response = await (this.client as any).search.create(request);

            return {
                id: response.id || '',
                results: (response.results || []).map((r: SearchResult) => ({
                    title: r.title || '',
                    url: r.url || '',
                    snippet: r.snippet || '',
                    date: r.date || '',
                    last_updated: r.last_updated || ''
                }))
            };
        } catch (error) {
            throw this.wrapError(error);
        }
    }

    // =====================
    // CHAT COMPLETIONS API
    // =====================

    /**
     * Create a chat completion with web-grounded response
     * Extracts ALL response fields including citations, search_results, images
     */
    async chatComplete(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const response = await (this.client as any).chat.completions.create({
                model: request.model,
                messages: request.messages,
                max_tokens: request.max_tokens,
                temperature: request.temperature,
                top_p: request.top_p,
                presence_penalty: request.presence_penalty,
                frequency_penalty: request.frequency_penalty,
                search_domain_filter: request.search_domain_filter,
                search_recency_filter: request.search_recency_filter,
                search_mode: request.search_mode,
                return_images: request.return_images,
                return_related_questions: request.return_related_questions,
                stream: false
            });

            return this.extractFullResponse(response);
        } catch (error) {
            throw this.wrapError(error);
        }
    }

    /**
     * Create a streaming chat completion
     * Yields chunks as they arrive
     */
    async *chatStream(request: ChatCompletionRequest): AsyncGenerator<StreamChunk> {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const stream = await (this.client as any).chat.completions.create({
                ...request,
                stream: true
            });

            for await (const chunk of stream) {
                yield {
                    id: chunk.id || '',
                    object: 'chat.completion.chunk',
                    created: chunk.created || Date.now(),
                    model: chunk.model || request.model,
                    choices: (chunk.choices || []).map((c: ChatCompletionChoice) => ({
                        index: c.index || 0,
                        delta: {
                            role: c.delta?.role,
                            content: c.delta?.content
                        },
                        finish_reason: c.finish_reason || null
                    }))
                };
            }
        } catch (error) {
            throw this.wrapError(error);
        }
    }

    // =====================
    // ASYNC OPERATIONS (for Deep Research)
    // =====================

    /**
     * Start an async chat completion (for sonar-deep-research)
     * Returns immediately with a request_id to poll
     */
    async asyncCreate(request: ChatCompletionRequest): Promise<AsyncRequest> {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const response = await (this.client as any).async.chat.completions.create({
                model: request.model,
                messages: request.messages,
                max_tokens: request.max_tokens,
                temperature: request.temperature,
                return_images: request.return_images,
                return_related_questions: request.return_related_questions
            });

            return {
                request_id: response.request_id || '',
                status: response.status || 'pending'
            };
        } catch (error) {
            throw this.wrapError(error);
        }
    }

    /**
     * Check the status of an async request
     */
    async asyncGet(requestId: string): Promise<AsyncStatusResponse> {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const response = await (this.client as any).async.chat.completions.get(requestId);

            return {
                request_id: response.request_id || requestId,
                status: response.status || 'pending',
                result: response.result ? this.extractFullResponse(response.result) : undefined,
                error: response.error,
                created_at: response.created_at,
                completed_at: response.completed_at
            };
        } catch (error) {
            throw this.wrapError(error);
        }
    }

    /**
     * List async requests with optional filtering
     */
    async asyncList(options?: AsyncListRequest): Promise<AsyncStatusResponse[]> {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const response = await (this.client as any).async.chat.completions.list(options);

            return (response.data || []).map((r: AsyncStatusResponse) => ({
                request_id: r.request_id,
                status: r.status,
                result: r.result ? this.extractFullResponse(r.result) : undefined,
                error: r.error,
                created_at: r.created_at,
                completed_at: r.completed_at
            }));
        } catch (error) {
            throw this.wrapError(error);
        }
    }

    // =====================
    // CONVENIENCE METHODS
    // =====================

    /**
     * Quick chat with minimal options
     */
    async chat(
        prompt: string,
        model: PerplexityModel = 'sonar',
        systemPrompt?: string
    ): Promise<PerplexityResult> {
        const messages = systemPrompt
            ? [
                { role: 'system' as const, content: systemPrompt },
                { role: 'user' as const, content: prompt }
            ]
            : [{ role: 'user' as const, content: prompt }];

        try {
            const response = await this.chatComplete({
                model,
                messages,
                return_images: true,
                return_related_questions: true
            });

            return this.toPerplexityResult(response);
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Research with reasoning model
     */
    async reason(prompt: string, systemPrompt?: string): Promise<PerplexityResult> {
        return this.chat(prompt, 'sonar-reasoning-pro', systemPrompt);
    }

    /**
     * Start deep research (async)
     */
    async startDeepResearch(prompt: string): Promise<AsyncRequest> {
        return this.asyncCreate({
            model: 'sonar-deep-research',
            messages: [{ role: 'user', content: prompt }]
        });
    }

    // =====================
    // FULL RESPONSE EXTRACTION
    // =====================

    /**
     * Extract ALL fields from raw API response
     * Nothing is discarded
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private extractFullResponse(raw: any): ChatCompletionResponse {
        return {
            id: raw.id || '',
            model: raw.model || '',
            object: 'chat.completion',
            created: raw.created || Date.now(),

            // Choices
            choices: (raw.choices || []).map((c: ChatCompletionChoice, i: number) => ({
                index: c.index ?? i,
                finish_reason: c.finish_reason || 'stop',
                message: {
                    role: 'assistant' as const,
                    content: c.message?.content || ''
                }
            })),

            // Usage with full cost breakdown
            usage: this.extractUsage(raw.usage),

            // Perplexity-specific - THE VALUABLE DATA
            citations: raw.citations || [],
            search_results: (raw.search_results || []).map((r: SearchResult) => ({
                title: r.title || '',
                url: r.url || '',
                snippet: r.snippet || '',
                date: r.date || '',
                last_updated: r.last_updated || ''
            })),
            images: raw.images || [],
            related_questions: raw.related_questions || []
        };
    }

    /**
     * Extract usage information with cost
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private extractUsage(raw: any): UsageInfo {
        if (!raw) {
            return {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0
            };
        }

        return {
            prompt_tokens: raw.prompt_tokens || 0,
            completion_tokens: raw.completion_tokens || 0,
            total_tokens: raw.total_tokens || 0,
            search_context_size: raw.search_context_size,
            cost: raw.cost ? {
                input_tokens_cost: raw.cost.input_tokens_cost || 0,
                output_tokens_cost: raw.cost.output_tokens_cost || 0,
                request_cost: raw.cost.request_cost || 0,
                total_cost: raw.cost.total_cost || 0
            } : undefined
        };
    }

    /**
     * Convert ChatCompletionResponse to PerplexityResult
     */
    private toPerplexityResult(response: ChatCompletionResponse): PerplexityResult {
        const content = response.choices[0]?.message?.content || '';

        return {
            success: true,
            content,
            model: response.model,
            requestId: response.id,
            created: response.created,
            finishReason: response.choices[0]?.finish_reason,

            // Usage with cost
            usage: {
                inputTokens: response.usage.prompt_tokens,
                outputTokens: response.usage.completion_tokens,
                totalTokens: response.usage.total_tokens,
                searchContextSize: response.usage.search_context_size,
                cost: response.usage.cost ? {
                    inputTokensCost: response.usage.cost.input_tokens_cost,
                    outputTokensCost: response.usage.cost.output_tokens_cost,
                    requestCost: response.usage.cost.request_cost,
                    totalCost: response.usage.cost.total_cost
                } : undefined
            },

            // Perplexity-specific
            citations: response.citations,
            searchResults: response.search_results?.map(r => ({
                title: r.title,
                url: r.url,
                snippet: r.snippet,
                date: r.date,
                lastUpdated: r.last_updated
            })),
            images: response.images,
            relatedQuestions: response.related_questions
        };
    }

    /**
     * Wrap errors with context
     */
    private wrapError(error: unknown): Error {
        if (error instanceof Error) {
            return new Error(`Perplexity SDK: ${error.message}`);
        }
        return new Error('Perplexity SDK: Unknown error');
    }
}

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * Create a new Perplexity SDK instance
 */
export function createPerplexitySdk(apiKey: string): PerplexitySdk {
    return new PerplexitySdk(apiKey);
}
