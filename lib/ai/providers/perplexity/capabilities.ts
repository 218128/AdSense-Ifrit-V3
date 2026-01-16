/**
 * Perplexity Capability Handlers
 * 
 * Maps Perplexity SDK methods to AIServices capabilities.
 * Each handler exposes one SDK method as a capability.
 */

import type { CapabilityHandler, ExecuteOptions, ExecuteResult } from '../../services/types';
import { perplexityProvider } from './PerplexityProvider';
import type {
    SearchRequest,
    ChatCompletionRequest,
    PerplexityModel
} from './types';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get API key from options context or settings
 */
async function getApiKey(options: ExecuteOptions): Promise<string | undefined> {
    // Try from new providerKeys format first (passed from client to server)
    const providerKeys = options.context?.providerKeys as Record<string, string> | undefined;
    if (providerKeys?.perplexity) {
        return providerKeys.perplexity;
    }

    // Try from old single apiKey format (backward compatibility)
    const contextKey = options.context?.apiKey;
    if (typeof contextKey === 'string') {
        return contextKey;
    }

    // Try from settings store (client-side only)
    if (typeof window !== 'undefined') {
        try {
            const { useSettingsStore } = await import('@/stores/settingsStore');
            const keys = useSettingsStore.getState().providerKeys.perplexity;
            if (keys?.length) {
                const firstKey = keys[0];
                return typeof firstKey === 'string' ? firstKey : (firstKey as { key: string })?.key;
            }
        } catch {
            // Settings not available
        }
    }

    return undefined;
}

/**
 * Create error result with required fields
 */
function errorResult(error: string, handlerId: string, startTime: number): ExecuteResult {
    return {
        success: false,
        error,
        handlerUsed: handlerId,
        source: 'ai-provider',
        latencyMs: Date.now() - startTime
    };
}

/**
 * Get context value safely
 */
function getContext<T>(options: ExecuteOptions, key: string, defaultValue?: T): T | undefined {
    return (options.context?.[key] as T) ?? defaultValue;
}

/**
 * Track Perplexity API cost - auto-deducts from credit balance
 * @param usage - Usage info object that may contain cost information
 */
async function trackPerplexityCost(usage?: unknown): Promise<void> {
    if (!usage || typeof usage !== 'object') return;

    const usageObj = usage as Record<string, unknown>;
    const cost = usageObj.cost;
    if (!cost) return;

    // Handle CostInfo with total_cost (snake_case from API) or totalCost (camelCase)
    let costAmount = 0;
    if (typeof cost === 'number') {
        costAmount = cost;
    } else if (typeof cost === 'object' && cost !== null) {
        const costObj = cost as Record<string, unknown>;
        costAmount = (costObj.total_cost as number) ?? (costObj.totalCost as number) ?? 0;
    }

    if (costAmount <= 0) return;

    // Client-side only - deduct from credit balance
    if (typeof window !== 'undefined') {
        try {
            const { useUsageStore } = await import('@/stores/usageStore');
            useUsageStore.getState().deductCredit('perplexity', costAmount);
            console.log(`[Perplexity] Deducted $${costAmount.toFixed(4)} from credit balance`);
        } catch {
            // Store not available
        }
    }
}

// ============================================
// CAPABILITY HANDLERS
// ============================================

/**
 * perplexity-search: Direct web search with filtering
 */
export const perplexitySearchHandler: CapabilityHandler = {
    id: 'perplexity-search',
    name: 'Perplexity Search',
    source: 'ai-provider',
    providerId: 'perplexity',
    capabilities: ['search'],
    priority: 85,
    isAvailable: true,
    requiresApiKey: true,

    async execute(opts: ExecuteOptions): Promise<ExecuteResult> {
        const startTime = Date.now();
        const handlerId = 'perplexity-search';

        const apiKey = await getApiKey(opts);
        if (!apiKey) {
            return errorResult('Perplexity API key not configured', handlerId, startTime);
        }

        try {
            const searchRequest: SearchRequest = {
                query: opts.prompt,
                max_results: getContext<number>(opts, 'maxResults', 10),
                country: getContext<string>(opts, 'country'),
                search_domain_filter: getContext<string[]>(opts, 'domainFilter'),
                search_recency_filter: getContext<'day' | 'week' | 'month' | 'year'>(opts, 'recencyFilter')
            };

            const result = await perplexityProvider.search(apiKey, searchRequest);

            return {
                success: true,
                data: result,
                text: result.results.map(r => `${r.title}: ${r.url}`).join('\n'),
                handlerUsed: handlerId,
                source: 'ai-provider',
                latencyMs: Date.now() - startTime
            };
        } catch (error) {
            return errorResult(
                error instanceof Error ? error.message : 'Search failed',
                handlerId,
                startTime
            );
        }
    }
};

/**
 * perplexity-chat: Web-grounded chat completion
 */
export const perplexityChatHandler: CapabilityHandler = {
    id: 'perplexity-chat',
    name: 'Perplexity Chat',
    source: 'ai-provider',
    providerId: 'perplexity',
    capabilities: ['generate', 'research'],
    priority: 75,
    isAvailable: true,
    requiresApiKey: true,

    async execute(opts: ExecuteOptions): Promise<ExecuteResult> {
        const startTime = Date.now();
        const handlerId = 'perplexity-chat';

        const apiKey = await getApiKey(opts);
        if (!apiKey) {
            return errorResult('Perplexity API key not configured', handlerId, startTime);
        }

        try {
            const model = (opts.model || 'sonar') as PerplexityModel;

            const request: ChatCompletionRequest = {
                model,
                messages: [
                    ...(opts.systemPrompt
                        ? [{ role: 'system' as const, content: opts.systemPrompt }]
                        : []),
                    { role: 'user' as const, content: opts.prompt }
                ],
                max_tokens: opts.maxTokens,
                temperature: opts.temperature,
                return_images: getContext<boolean>(opts, 'returnImages', true),
                return_related_questions: getContext<boolean>(opts, 'returnRelatedQuestions', true),
                search_domain_filter: getContext<string[]>(opts, 'domainFilter'),
                search_recency_filter: getContext<'day' | 'week' | 'month' | 'year'>(opts, 'recencyFilter')
            };

            const result = await perplexityProvider.chatComplete(apiKey, request);
            const content = result.choices[0]?.message?.content || '';

            // Auto-deduct cost from credit balance
            await trackPerplexityCost(result.usage);

            return {
                success: true,
                text: content,
                data: {
                    citations: result.citations,
                    searchResults: result.search_results,
                    images: result.images,
                    relatedQuestions: result.related_questions,
                    usage: result.usage
                },
                handlerUsed: handlerId,
                source: 'ai-provider',
                latencyMs: Date.now() - startTime
            };
        } catch (error) {
            return errorResult(
                error instanceof Error ? error.message : 'Chat failed',
                handlerId,
                startTime
            );
        }
    }
};

/**
 * perplexity-reason: Chain of Thought reasoning
 */
export const perplexityReasonHandler: CapabilityHandler = {
    id: 'perplexity-reason',
    name: 'Perplexity Reasoning',
    source: 'ai-provider',
    providerId: 'perplexity',
    capabilities: ['reasoning', 'analyze'],
    priority: 80,
    isAvailable: true,
    requiresApiKey: true,

    async execute(opts: ExecuteOptions): Promise<ExecuteResult> {
        const startTime = Date.now();
        const handlerId = 'perplexity-reason';

        const apiKey = await getApiKey(opts);
        if (!apiKey) {
            return errorResult('Perplexity API key not configured', handlerId, startTime);
        }

        try {
            const result = await perplexityProvider.reason(
                apiKey,
                { prompt: opts.prompt, systemPrompt: opts.systemPrompt }
            );

            if (!result.success) {
                return errorResult(result.error || 'Reasoning failed', handlerId, startTime);
            }

            // Auto-deduct cost from credit balance
            await trackPerplexityCost(result.usage);

            return {
                success: true,
                text: result.content || '',
                data: {
                    citations: result.citations,
                    searchResults: result.searchResults,
                    relatedQuestions: result.relatedQuestions,
                    usage: result.usage
                },
                handlerUsed: handlerId,
                source: 'ai-provider',
                latencyMs: Date.now() - startTime
            };
        } catch (error) {
            return errorResult(
                error instanceof Error ? error.message : 'Reasoning failed',
                handlerId,
                startTime
            );
        }
    }
};

/**
 * perplexity-deep-research: Start async deep research
 */
export const perplexityDeepResearchHandler: CapabilityHandler = {
    id: 'perplexity-deep-research',
    name: 'Perplexity Deep Research',
    source: 'ai-provider',
    providerId: 'perplexity',
    capabilities: ['deep-research'],
    priority: 90,
    isAvailable: true,
    requiresApiKey: true,

    async execute(opts: ExecuteOptions): Promise<ExecuteResult> {
        const startTime = Date.now();
        const handlerId = 'perplexity-deep-research';

        const apiKey = await getApiKey(opts);
        if (!apiKey) {
            return errorResult('Perplexity API key not configured', handlerId, startTime);
        }

        try {
            const asyncRequest = await perplexityProvider.startDeepResearch(apiKey, opts.prompt);

            return {
                success: true,
                text: `Deep research started. Request ID: ${asyncRequest.request_id}`,
                data: {
                    requestId: asyncRequest.request_id,
                    status: asyncRequest.status
                },
                handlerUsed: handlerId,
                source: 'ai-provider',
                latencyMs: Date.now() - startTime
            };
        } catch (error) {
            return errorResult(
                error instanceof Error ? error.message : 'Deep research failed',
                handlerId,
                startTime
            );
        }
    }
};

/**
 * perplexity-async-status: Check async request status
 */
export const perplexityAsyncStatusHandler: CapabilityHandler = {
    id: 'perplexity-async-status',
    name: 'Perplexity Async Status',
    source: 'ai-provider',
    providerId: 'perplexity',
    capabilities: ['async-status'],
    priority: 100,
    isAvailable: true,
    requiresApiKey: true,

    async execute(opts: ExecuteOptions): Promise<ExecuteResult> {
        const startTime = Date.now();
        const handlerId = 'perplexity-async-status';

        const apiKey = await getApiKey(opts);
        if (!apiKey) {
            return errorResult('Perplexity API key not configured', handlerId, startTime);
        }

        const requestId = getContext<string>(opts, 'requestId') || opts.prompt;
        if (!requestId) {
            return errorResult('Request ID is required', handlerId, startTime);
        }

        try {
            const status = await perplexityProvider.getAsyncStatus(apiKey, requestId);

            return {
                success: true,
                text: status.result?.choices[0]?.message?.content || `Status: ${status.status}`,
                data: {
                    requestId: status.request_id,
                    status: status.status,
                    result: status.result,
                    error: status.error
                },
                handlerUsed: handlerId,
                source: 'ai-provider',
                latencyMs: Date.now() - startTime
            };
        } catch (error) {
            return errorResult(
                error instanceof Error ? error.message : 'Status check failed',
                handlerId,
                startTime
            );
        }
    }
};

/**
 * perplexity-fact-check: Verify claims and return authoritative citations
 */
export const perplexityFactCheckHandler: CapabilityHandler = {
    id: 'perplexity-fact-check',
    name: 'Perplexity Fact Check',
    source: 'ai-provider',
    providerId: 'perplexity',
    capabilities: ['fact-check', 'verify'],
    priority: 82,
    isAvailable: true,
    requiresApiKey: true,

    async execute(opts: ExecuteOptions): Promise<ExecuteResult> {
        const startTime = Date.now();
        const handlerId = 'perplexity-fact-check';

        const apiKey = await getApiKey(opts);
        if (!apiKey) {
            return errorResult('Perplexity API key not configured', handlerId, startTime);
        }

        try {
            // Use reasoning with a fact-checking prompt
            const factCheckPrompt = `Fact-check the following claim(s) using authoritative sources. For each claim:
1. Verify if it's TRUE, FALSE, or PARTIALLY TRUE
2. Provide supporting evidence with citations
3. If false, provide the correct information

Claim(s) to verify:
${opts.prompt}`;

            const result = await perplexityProvider.reason(
                apiKey,
                { prompt: factCheckPrompt, systemPrompt: 'You are a fact-checking expert. Be thorough and cite authoritative sources.' }
            );

            if (!result.success) {
                return errorResult(result.error || 'Fact check failed', handlerId, startTime);
            }

            // Auto-deduct cost
            await trackPerplexityCost(result.usage);

            return {
                success: true,
                text: result.content || '',
                data: {
                    citations: result.citations,
                    searchResults: result.searchResults,
                    relatedQuestions: result.relatedQuestions,
                    usage: result.usage
                },
                handlerUsed: handlerId,
                source: 'ai-provider',
                latencyMs: Date.now() - startTime
            };
        } catch (error) {
            return errorResult(
                error instanceof Error ? error.message : 'Fact check failed',
                handlerId,
                startTime
            );
        }
    }
};

// ============================================
// ALL HANDLERS
// ============================================

export const perplexityHandlers: CapabilityHandler[] = [
    perplexitySearchHandler,
    perplexityChatHandler,
    perplexityReasonHandler,
    perplexityDeepResearchHandler,
    perplexityAsyncStatusHandler,
    perplexityFactCheckHandler
];
