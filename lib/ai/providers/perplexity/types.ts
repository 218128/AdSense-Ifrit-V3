/**
 * Perplexity SDK Types
 * 
 * Complete type definitions for the Perplexity API.
 * Based on official SDK: @perplexity-ai/perplexity_ai
 * 
 * @see https://docs.perplexity.ai/
 */

// ============================================
// MODELS
// ============================================

/**
 * Available Perplexity models
 */
export type PerplexityModel =
    | 'sonar'                 // Lightweight, cost-effective search
    | 'sonar-pro'             // Advanced search, complex queries
    | 'sonar-reasoning-pro'   // Chain of Thought reasoning
    | 'sonar-deep-research';  // Expert-level research (async only)

/**
 * Model capabilities and use cases
 */
export const PERPLEXITY_MODELS: Record<PerplexityModel, {
    name: string;
    description: string;
    asyncOnly: boolean;
    supportsStreaming: boolean;
}> = {
    'sonar': {
        name: 'Sonar',
        description: 'Lightweight, cost-effective search model with grounding',
        asyncOnly: false,
        supportsStreaming: true
    },
    'sonar-pro': {
        name: 'Sonar Pro',
        description: 'Advanced search offering, complex queries and follow-ups',
        asyncOnly: false,
        supportsStreaming: true
    },
    'sonar-reasoning-pro': {
        name: 'Sonar Reasoning Pro',
        description: 'Precise reasoning with Chain of Thought (CoT)',
        asyncOnly: false,
        supportsStreaming: true
    },
    'sonar-deep-research': {
        name: 'Sonar Deep Research',
        description: 'Expert-level research, comprehensive reports',
        asyncOnly: true,
        supportsStreaming: false
    }
};

// ============================================
// SEARCH API TYPES
// ============================================

/**
 * Search API request parameters
 */
export interface SearchRequest {
    /** Search query - single string or array for multi-query */
    query: string | string[];

    /** Maximum number of results (1-20) */
    max_results?: number;

    /** Total content budget in tokens across all results (1-1000000) */
    max_tokens?: number;

    /** Max tokens extracted per page (default: 2048) */
    max_tokens_per_page?: number;

    /** Domain filter - allow or deny list (max 20 domains) */
    search_domain_filter?: string[];

    /** Country code for regional results (ISO: US, GB, DE...) */
    country?: string;

    /** Filter by content recency */
    search_recency_filter?: 'day' | 'week' | 'month' | 'year';

    /** Only include content published after this date (MM/DD/YYYY) */
    search_after_date?: string;

    /** Only include content published before this date (MM/DD/YYYY) */
    search_before_date?: string;
}

/**
 * Individual search result
 */
export interface SearchResult {
    /** Page title */
    title: string;

    /** Full URL */
    url: string;

    /** Extracted content snippet (can be lengthy) */
    snippet: string;

    /** Publication date */
    date: string;

    /** Last crawl/update date */
    last_updated: string;
}

/**
 * Search API response
 */
export interface SearchResponse {
    /** Array of search results */
    results: SearchResult[];

    /** Request ID for tracking */
    id: string;
}

// ============================================
// CHAT COMPLETIONS TYPES
// ============================================

/**
 * Chat message role
 */
export type ChatRole = 'system' | 'user' | 'assistant';

/**
 * Chat message
 */
export interface ChatMessage {
    role: ChatRole;
    content: string;
}

/**
 * Web search options for chat completions
 */
export interface WebSearchOptions {
    /** Filter by content recency */
    search_recency_filter?: 'day' | 'week' | 'month' | 'year';

    /** Domain filter - allow or deny list */
    search_domain_filter?: string[];

    /** Maximum search results to include */
    max_search_results?: number;
}

/**
 * Search context size (affects cost and depth)
 */
export type SearchContextSize = 'low' | 'medium' | 'high';

/**
 * Search mode
 */
export type SearchMode = 'web' | 'academic';

/**
 * Chat completion request parameters
 */
export interface ChatCompletionRequest {
    /** Model to use */
    model: PerplexityModel;

    /** Conversation messages */
    messages: ChatMessage[];

    // ---- Response Customization ----

    /** Maximum tokens in response */
    max_tokens?: number;

    /** Sampling temperature (0-2) */
    temperature?: number;

    /** Nucleus sampling (0-1) */
    top_p?: number;

    /** Presence penalty (-2 to 2) */
    presence_penalty?: number;

    /** Frequency penalty (-2 to 2) */
    frequency_penalty?: number;

    // ---- Perplexity-Specific ----

    /** Domain filter - allow or deny specific domains */
    search_domain_filter?: string[];

    /** Filter by content recency */
    search_recency_filter?: 'day' | 'week' | 'month' | 'year';

    /** Search mode: web or academic */
    search_mode?: SearchMode;

    /** Include image URLs in response */
    return_images?: boolean;

    /** Include follow-up question suggestions */
    return_related_questions?: boolean;

    /** Web search options (alternative format) */
    web_search_options?: WebSearchOptions;

    // ---- Streaming ----

    /** Enable streaming response */
    stream?: boolean;
}

/**
 * Finish reason for completion
 */
export type FinishReason = 'stop' | 'length' | 'content_filter';

/**
 * Chat completion choice
 */
export interface ChatCompletionChoice {
    /** Choice index */
    index: number;

    /** Why the response ended */
    finish_reason: FinishReason;

    /** The response message */
    message: {
        role: 'assistant';
        content: string;
    };

    /** For streaming - incremental content */
    delta?: {
        role?: 'assistant';
        content?: string;
    };
}

/**
 * Cost breakdown
 */
export interface CostInfo {
    /** Cost for input tokens */
    input_tokens_cost: number;

    /** Cost for output tokens */
    output_tokens_cost: number;

    /** Cost per request */
    request_cost: number;

    /** Total cost */
    total_cost: number;
}

/**
 * Token usage information
 */
export interface UsageInfo {
    /** Input/prompt tokens */
    prompt_tokens: number;

    /** Output/completion tokens */
    completion_tokens: number;

    /** Total tokens */
    total_tokens: number;

    /** Search context depth used */
    search_context_size?: SearchContextSize;

    /** Detailed cost breakdown */
    cost?: CostInfo;
}

/**
 * Complete chat completion response
 * Includes ALL Perplexity-specific fields
 */
export interface ChatCompletionResponse {
    /** Unique request ID */
    id: string;

    /** Model used */
    model: string;

    /** Response type */
    object: 'chat.completion';

    /** Unix timestamp of creation */
    created: number;

    /** Response choices */
    choices: ChatCompletionChoice[];

    /** Token usage and cost */
    usage: UsageInfo;

    // ---- Perplexity-Specific (THE VALUABLE DATA) ----

    /** Source URLs used for grounding */
    citations?: string[];

    /** Structured search results with full metadata */
    search_results?: SearchResult[];

    /** Image URLs found (if return_images=true) */
    images?: string[];

    /** Follow-up question suggestions (if return_related_questions=true) */
    related_questions?: string[];
}

// ============================================
// ASYNC OPERATIONS TYPES (for Deep Research)
// ============================================

/**
 * Async request status
 */
export type AsyncStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Async request creation response
 */
export interface AsyncRequest {
    /** Request ID for tracking */
    request_id: string;

    /** Current status */
    status: AsyncStatus;
}

/**
 * Async request status response
 */
export interface AsyncStatusResponse {
    /** Request ID */
    request_id: string;

    /** Current status */
    status: AsyncStatus;

    /** Result when completed */
    result?: ChatCompletionResponse;

    /** Error message if failed */
    error?: string;

    /** Creation timestamp */
    created_at?: string;

    /** Completion timestamp */
    completed_at?: string;
}

/**
 * Async list request parameters
 */
export interface AsyncListRequest {
    /** Maximum results to return */
    limit?: number;

    /** Filter by status */
    status?: AsyncStatus;
}

/**
 * Async list response
 */
export interface AsyncListResponse {
    /** Array of async requests */
    data: AsyncStatusResponse[];
}

// ============================================
// STREAMING TYPES
// ============================================

/**
 * Streaming chunk
 */
export interface StreamChunk {
    /** Chunk ID */
    id: string;

    /** Response type */
    object: 'chat.completion.chunk';

    /** Unix timestamp */
    created: number;

    /** Model */
    model: string;

    /** Choices with delta content */
    choices: Array<{
        index: number;
        delta: {
            role?: 'assistant';
            content?: string;
        };
        finish_reason: FinishReason | null;
    }>;
}

// ============================================
// ERROR TYPES
// ============================================

/**
 * Perplexity API error
 */
export interface PerplexityError {
    /** Error message */
    message: string;

    /** Error type */
    type: string;

    /** Error code */
    code?: string;

    /** HTTP status */
    status?: number;
}

// ============================================
// CAPABILITY RESULT TYPE (for AIServices integration)
// ============================================

/**
 * Extended result type for Perplexity responses
 * Includes all Perplexity-specific data
 */
export interface PerplexityResult {
    success: boolean;

    /** Main response content */
    content?: string;

    /** Model used */
    model?: string;

    /** Error message if failed */
    error?: string;

    // ---- Usage & Cost ----

    usage?: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        searchContextSize?: SearchContextSize;
        cost?: {
            inputTokensCost: number;
            outputTokensCost: number;
            requestCost: number;
            totalCost: number;
        };
    };

    // ---- Perplexity-Specific Data ----

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

    // ---- Metadata ----

    /** Request ID for tracking */
    requestId?: string;

    /** Creation timestamp */
    created?: number;

    /** Finish reason */
    finishReason?: FinishReason;
}
