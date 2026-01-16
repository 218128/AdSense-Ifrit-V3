/**
 * Perplexity Provider (Legacy Entry Point)
 * 
 * This file re-exports from the new perplexity module for backward compatibility.
 * New code should import from './perplexity/index' directly.
 * 
 * @deprecated Import from './perplexity' module instead
 * @see ./perplexity/PerplexityProvider.ts
 */

// Re-export everything from the new module
export {
    PerplexityProvider,
    perplexityProvider,
    type PerplexityGenerateResult
} from './perplexity/PerplexityProvider';

// Export types for consumers
export type {
    PerplexityModel,
    PerplexityResult,
    SearchRequest,
    SearchResponse,
    SearchResult,
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatMessage,
    UsageInfo,
    AsyncRequest,
    AsyncStatusResponse
} from './perplexity/types';

// Export SDK for direct usage
export { PerplexitySdk, createPerplexitySdk } from './perplexity/PerplexitySdk';
