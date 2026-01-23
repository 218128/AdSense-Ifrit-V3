/**
 * AI Services - Types
 * 
 * Central type definitions for the pluggable AI Services Layer.
 * Capabilities are DYNAMIC and user-configurable, not hardcoded.
 */

// ============================================
// PROVIDER TYPES (Re-exported from unified types)
// ============================================

// Import from single source of truth
import { TextProviderId } from '../types/providers';

/**
 * Supported AI provider IDs for type-safe key management
 * @deprecated Use TextProviderId from '@/lib/ai/types/providers' instead
 */
export type ProviderType = TextProviderId;

// ============================================
// CAPABILITY SYSTEM (Dynamic)
// ============================================

/**
 * A capability represents a type of AI task.
 * Users can add custom capabilities via Settings.
 */
export interface Capability {
    id: string;                      // e.g., 'research', 'translate', 'summarize'
    name: string;                    // Human-readable, e.g., 'Web Research'
    description: string;             // What this capability does
    icon?: string;                   // Lucide icon name
    isDefault: boolean;              // Built-in capability
    isEnabled: boolean;              // User can disable
    defaultHandlerId?: string;       // Which handler to use by default
    fallbackHandlerIds?: string[];   // Fallback chain
    aggregateResults?: boolean;      // If true, call ALL handlers and combine (AND logic)
}

/**
 * Default capabilities shipped with Ifrit.
 * Users can add more via Settings.
 */
export const DEFAULT_CAPABILITIES: Omit<Capability, 'isEnabled' | 'defaultHandlerId'>[] = [
    {
        id: 'generate',
        name: 'Text Generation',
        description: 'Generate text content using AI',
        icon: 'Sparkles',
        isDefault: true,
    },
    {
        id: 'research',
        name: 'Web Research',
        description: 'Research topics using web search',
        icon: 'Search',
        isDefault: true,
    },
    {
        id: 'keywords',
        name: 'Keyword Discovery',
        description: 'Discover SEO keywords for topics',
        icon: 'Target',
        isDefault: true,
    },
    {
        id: 'analyze',
        name: 'Content Analysis',
        description: 'Analyze content for SEO, readability, E-E-A-T',
        icon: 'BarChart3',
        isDefault: true,
    },
    {
        id: 'scrape',
        name: 'Web Scraping',
        description: 'Extract content from web pages',
        icon: 'Globe',
        isDefault: true,
    },
    {
        id: 'summarize',
        name: 'Summarization',
        description: 'Summarize long content into key points',
        icon: 'FileText',
        isDefault: true,
    },
    {
        id: 'translate',
        name: 'Translation',
        description: 'Translate content between languages',
        icon: 'Languages',
        isDefault: true,
    },
    {
        id: 'images',
        name: 'Image Generation',
        description: 'Generate images using AI (Gemini, OpenRouter, etc.)',
        icon: 'Image',
        isDefault: true,
    },
    {
        id: 'search-images',
        name: 'Image Search',
        description: 'Search stock photos (Unsplash, Pexels, Brave, Perplexity)',
        icon: 'ImageSearch',
        isDefault: true,
    },
    {
        id: 'reasoning',
        name: 'Deep Reasoning',
        description: 'Complex reasoning and planning tasks',
        icon: 'Brain',
        isDefault: true,
    },
    {
        id: 'code',
        name: 'Code Generation',
        description: 'Generate or analyze code',
        icon: 'Code',
        isDefault: true,
    },
    // Hunt Feature Capabilities
    {
        id: 'trend-scan',
        name: 'Trend Scanning',
        description: 'Fetch trending topics from multiple sources (HN, Google News, etc.)',
        icon: 'TrendingUp',
        isDefault: true,
        aggregateResults: true,  // Call ALL handlers and combine results
    },
    {
        id: 'domain-search',
        name: 'Domain Search',
        description: 'Search expired domain databases (SpamZilla, etc.)',
        icon: 'Globe',
        isDefault: true,
    },
    {
        id: 'domain-analyze',
        name: 'Domain Analysis',
        description: 'Analyze domain history, spam score, and blacklists',
        icon: 'Shield',
        isDefault: true,
    },
    {
        id: 'keyword-analyze',
        name: 'Keyword Analysis',
        description: 'Analyze keywords for difficulty/CPC',
        icon: 'BarChart',
        isDefault: true,
    },
    {
        id: 'wayback-lookup',
        name: 'Wayback Lookup',
        description: 'Check domain history in Wayback Machine',
        icon: 'History',
        isDefault: true,
    },
    {
        id: 'domain-profile',
        name: 'Domain Profile Generation',
        description: 'Generate comprehensive site profile from domain and keyword data',
        icon: 'FileUser',
        isDefault: true,
    },
    // E-E-A-T & Quality Capabilities (Campaign/Content Quality)
    {
        id: 'eeat-scoring',
        name: 'E-E-A-T Scoring',
        description: 'Score content for Experience, Expertise, Authority, Trust',
        icon: 'ShieldCheck',
        isDefault: true,
    },
    {
        id: 'fact-check',
        name: 'Fact Check',
        description: 'Verify claims and citations in content',
        icon: 'CheckCircle',
        isDefault: true,
    },
    {
        id: 'quality-review',
        name: 'Quality Review',
        description: 'Auto-review content quality before publishing',
        icon: 'Star',
        isDefault: true,
    },
    // SEO Capabilities
    {
        id: 'seo-optimize',
        name: 'SEO Optimize',
        description: 'Optimize content for search engines',
        icon: 'TrendingUp',
        isDefault: true,
    },
    {
        id: 'schema-generate',
        name: 'Schema Generate',
        description: 'Generate structured data/schema markup for articles',
        icon: 'Database',
        isDefault: true,
    },
    {
        id: 'internal-link',
        name: 'Internal Linking',
        description: 'Suggest and add internal links between articles',
        icon: 'Link',
        isDefault: true,
    },
    // Publishing Capabilities
    {
        id: 'wp-publish',
        name: 'WP Publish',
        description: 'Publish content to WordPress sites',
        icon: 'Upload',
        isDefault: true,
    },
    {
        id: 'author-match',
        name: 'Author Match',
        description: 'Match content to appropriate author profile',
        icon: 'UserCheck',
        isDefault: true,
    },
    {
        id: 'campaign-run',
        name: 'Campaign Run',
        description: 'Execute content campaigns with pipelines',
        icon: 'Play',
        isDefault: true,
    },
];

// ============================================
// HANDLER SYSTEM
// ============================================

/**
 * A handler is something that can fulfill a capability.
 * Can be an AI provider, an MCP tool, or a local function.
 */
export interface CapabilityHandler {
    id: string;                      // Unique ID, e.g., 'gemini-generate', 'brave-search'
    name: string;                    // Human-readable
    source: 'ai-provider' | 'mcp' | 'local' | 'integration';  // Where this handler comes from
    providerId?: string;             // For AI providers: 'gemini', 'deepseek', etc.
    mcpServerId?: string;            // For MCP: server ID
    mcpToolName?: string;            // For MCP: tool name within server
    capabilities: string[];          // Which capabilities this handler supports
    priority: number;                // Higher = preferred (0-100)
    isAvailable: boolean;            // Is this handler currently usable?
    requiresApiKey?: boolean;        // Does this need an API key?
    apiKeySettingName?: string;      // Which settings key holds the API key

    // The actual execution function (set at runtime)
    execute?: (options: ExecuteOptions) => Promise<ExecuteResult>;
}

// ============================================
// EXECUTION
// ============================================

export interface ExecuteOptions {
    capability: string;              // Capability ID
    prompt: string;                  // Main prompt/query
    context?: Record<string, unknown>;  // Additional context

    // Execution preferences
    preferredHandler?: string;       // Override default handler
    useFallback?: boolean;           // Allow fallback chain (default: true)
    maxRetries?: number;             // Retry count (default: 2)
    timeout?: number;                // Timeout in ms

    // Progress callbacks for real-time status
    onProgress?: (status: {
        phase: 'starting' | 'handler' | 'complete';
        message: string;
        handlerId?: string;
        handlerName?: string;
        current?: number;
        total?: number;
        success?: boolean;
        error?: string;
    }) => void;

    // AI-specific options
    model?: string;                  // Specific model to use
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
    structured?: boolean;            // Request structured JSON output
    schema?: Record<string, unknown>; // JSON schema for structured output
}

export interface ExecuteResult {
    success: boolean;
    data?: unknown;                  // Result data (varies by capability)
    text?: string;                   // Text result (for generate, summarize, etc.)
    error?: string;

    // Execution metadata
    handlerUsed: string;             // Which handler fulfilled the request
    source: 'ai-provider' | 'mcp' | 'local' | 'integration';
    latencyMs: number;
    fallbacksAttempted?: string[];   // Handlers tried before success
    metadata?: Record<string, unknown>; // Extensible metadata (e.g., sources for aggregation)

    // Rate limit flag (for retry logic)
    isRateLimited?: boolean;

    // Per-handler errors (for debugging when all handlers fail)
    handlerErrors?: Record<string, string>; // Map of handlerId -> actual error message

    // AI-specific metadata
    model?: string;
    usage?: {
        inputTokens: number;
        outputTokens: number;
    };
}

// ============================================
// CONFIGURATION (Persisted)
// ============================================

/**
 * User's capability configuration.
 * Stored in localStorage: 'ifrit_capabilities_config'
 * 
 * PURGED: customCapabilities field removed (feature was never used)
 */
export interface CapabilitiesConfig {
    // Per-capability settings
    capabilitySettings: Record<string, {
        isEnabled: boolean;
        defaultHandlerId?: string;
        fallbackHandlerIds?: string[];
    }>;

    // Global preferences
    preferMCP: boolean;              // Prefer MCP over AI when available
    autoFallback: boolean;           // Auto-fallback when handler fails
    logUsage: boolean;               // Log capability usage
}

export const DEFAULT_CONFIG: CapabilitiesConfig = {
    capabilitySettings: {},
    preferMCP: true,
    autoFallback: true,
    logUsage: true,
};

// ============================================
// STORAGE KEYS
// ============================================

export const AI_SERVICES_STORAGE = {
    CAPABILITIES_CONFIG: 'ifrit_capabilities_config',
    HANDLER_OVERRIDES: 'ifrit_handler_overrides',
    USAGE_LOG: 'ifrit_ai_usage_log',
};

// ============================================
// EVENTS (For reactivity)
// ============================================

export type AIServicesEvent =
    | { type: 'handler-registered'; handler: CapabilityHandler }
    | { type: 'handler-removed'; handlerId: string }
    | { type: 'capability-added'; capability: Capability }
    | { type: 'capability-removed'; capabilityId: string }
    | { type: 'config-updated'; config: CapabilitiesConfig }
    | { type: 'execution-complete'; result: ExecuteResult };
