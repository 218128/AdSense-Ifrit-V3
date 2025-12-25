/**
 * AI Provider Base Interface & Types
 * 
 * This module defines the standard interface that all AI providers must implement.
 * Each provider (Gemini, DeepSeek, OpenRouter, Perplexity, Vercel) has its own file
 * that implements ProviderAdapter.
 * 
 * @module lib/ai/providers/base
 */

// ============================================
// PROVIDER TYPES
// ============================================

/**
 * Unique identifier for each AI provider
 */
export type ProviderId = 'gemini' | 'deepseek' | 'openrouter' | 'perplexity' | 'vercel';

/**
 * Model capability modes
 * Different models support different modes - this is fetched from real API
 */
export type ModelMode = 'chat' | 'stream' | 'reason' | 'code' | 'image' | 'audio' | 'video' | 'search';

/**
 * Information about a specific model
 * This should be fetched from the real API /models endpoint
 */
export interface ModelInfo {
    id: string;                    // Model ID used in API calls (e.g., "gemini-2.5-pro")
    name: string;                  // Human-readable name
    description?: string;          // Model description/capabilities
    contextLength?: number;        // Max context window in tokens
    modes: ModelMode[];            // Supported modes/capabilities
    pricing?: {                    // Pricing info if available
        input: number;             // Cost per million input tokens
        output: number;            // Cost per million output tokens
    };
    deprecated?: boolean;          // If model is deprecated/sunset
}

/**
 * Provider metadata - static info about the provider
 */
export interface ProviderMeta {
    id: ProviderId;
    name: string;                  // Display name (e.g., "Google Gemini")  
    description: string;           // Brief description
    signupUrl: string;             // URL to get API key
    docsUrl: string;               // Official documentation URL
    keyPrefix?: string;            // Expected key prefix (e.g., "pplx-" for Perplexity)
}

// ============================================
// GENERATION TYPES
// ============================================

/**
 * Options for content generation
 */
export interface GenerateOptions {
    prompt: string;
    model?: string;                // Specific model to use (defaults to selected model)
    maxTokens?: number;            // Max output tokens
    temperature?: number;          // 0-1 creativity
    systemPrompt?: string;         // System/context prompt
    mode?: ModelMode;              // Specific mode to use
}

/**
 * Result from content generation
 */
export interface GenerateResult {
    success: boolean;
    content?: string;              // Generated content
    reasoning?: string;            // Chain-of-thought (for reasoning models)
    model: string;                 // Model that was used
    usage?: {
        inputTokens: number;
        outputTokens: number;
    };
    error?: string;
}

/**
 * Result from key validation
 */
export interface KeyTestResult {
    valid: boolean;
    models: ModelInfo[];           // REAL models from API response
    error?: string;
    responseTimeMs?: number;
}

// ============================================
// PROVIDER ADAPTER INTERFACE
// ============================================

/**
 * Main interface that all AI providers must implement
 * 
 * Each provider creates a class that implements this interface.
 * The key principle: NO HARDCODED MODEL LISTS - everything comes from real API.
 */
export interface ProviderAdapter {
    /**
     * Provider metadata
     */
    readonly meta: ProviderMeta;

    /**
     * Test API key validity by fetching real models from provider API
     * This is the ONLY way to get valid model list - no hardcoding
     * 
     * @param apiKey - The API key to test
     * @returns Real models from API if key is valid
     */
    testKey(apiKey: string): Promise<KeyTestResult>;

    /**
     * Generate content using standard chat completion
     * 
     * @param apiKey - API key for authentication
     * @param options - Generation options
     * @returns Generated content
     */
    chat(apiKey: string, options: GenerateOptions): Promise<GenerateResult>;

    /**
     * Stream content generation (optional - not all providers support)
     * 
     * @param apiKey - API key
     * @param options - Generation options
     * @yields Chunks of generated content
     */
    stream?(apiKey: string, options: GenerateOptions): AsyncGenerator<string, void, unknown>;

    /**
     * Reasoning/chain-of-thought generation (optional)
     * For models like DeepSeek-R1, Gemini with Deep Think
     * 
     * @param apiKey - API key
     * @param options - Generation options  
     * @returns Content with reasoning trace
     */
    reason?(apiKey: string, options: GenerateOptions): Promise<GenerateResult>;

    /**
     * Generate images (optional)
     * For providers that support image generation (e.g., Gemini with image models)
     * 
     * @param apiKey - API key
     * @param options - Generation options with prompt
     * @returns Image data (base64 or URL)
     */
    generateImage?(apiKey: string, options: GenerateOptions): Promise<GenerateResult>;
}

// ============================================
// DATA PROVIDER INTERFACE (for CapabilityExecutor)
// ============================================

/**
 * Capability request - what the executor sends to providers
 */
export interface CapabilityRequest {
    capability: string;           // e.g., 'generate', 'research', 'images'
    prompt: string;
    context?: Record<string, unknown>;
    options?: {
        model?: string;
        maxTokens?: number;
        temperature?: number;
        systemPrompt?: string;
    };
}

/**
 * Capability result - what providers return
 */
export interface CapabilityDataResult {
    success: boolean;
    data?: unknown;               // Raw data (varies by capability)
    text?: string;                // Text result
    error?: string;
    usage?: {
        inputTokens: number;
        outputTokens: number;
    };
}

/**
 * DataProvider - Unified interface for CapabilityExecutor
 * 
 * This wraps the specific provider methods (chat, reason, generateImage)
 * into a single execute() method that the CapabilityExecutor can call.
 */
export interface DataProvider {
    id: ProviderId;
    name: string;
    supportedCapabilities: string[];

    /**
     * Execute a capability request
     * Internally maps to appropriate provider method (chat, reason, etc.)
     */
    execute(apiKey: string, request: CapabilityRequest): Promise<CapabilityDataResult>;
}

// ============================================
// PROVIDER STATE (for Registry)
// ============================================

/**
 * State of a provider in the registry
 */
export interface ProviderState {
    providerId: ProviderId;
    enabled: boolean;              // User has toggled this provider on
    apiKey?: string;               // Stored API key
    keyValidated: boolean;         // Has key been tested successfully
    availableModels: ModelInfo[];  // Models from last testKey() call
    selectedModel?: string;        // User's chosen default model
    lastValidated?: number;        // Timestamp of last successful validation
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Parse modes from model capabilities
 * Different providers return capabilities in different formats
 */
export function parseModelModes(capabilities: string[] | undefined): ModelMode[] {
    if (!capabilities) return ['chat'];

    const modeMap: Record<string, ModelMode> = {
        'chat': 'chat',
        'completion': 'chat',
        'stream': 'stream',
        'streaming': 'stream',
        'reason': 'reason',
        'reasoning': 'reason',
        'code': 'code',
        'coder': 'code',
        'image': 'image',
        'vision': 'image',
        'audio': 'audio',
        'video': 'video',
        'search': 'search',
    };

    const modes: ModelMode[] = [];
    for (const cap of capabilities) {
        const mode = modeMap[cap.toLowerCase()];
        if (mode && !modes.includes(mode)) {
            modes.push(mode);
        }
    }

    return modes.length > 0 ? modes : ['chat'];
}

/**
 * Create a standard error result
 */
export function errorResult(error: string, model: string = 'unknown'): GenerateResult {
    return { success: false, error, model };
}
