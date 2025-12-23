/**
 * AI Providers Module - Main Export
 * 
 * This module exports all AI provider functionality for use throughout Ifrit.
 * 
 * Usage:
 * ```typescript
 * import { getProviderRegistry, PROVIDER_ADAPTERS } from '@/lib/ai/providers';
 * 
 * // Test a key
 * const registry = getProviderRegistry();
 * const result = await registry.testKey('gemini', 'your-api-key');
 * console.log(result.models); // Real models from API
 * 
 * // Select a model and enable
 * registry.selectModel('gemini', 'gemini-2.5-pro');
 * registry.setEnabled('gemini', true);
 * 
 * // Generate content
 * const adapter = PROVIDER_ADAPTERS.gemini;
 * const response = await adapter.chat('your-api-key', { prompt: 'Hello' });
 * ```
 */

// Base types and interfaces
export type {
    ProviderId,
    ModelMode,
    ModelInfo,
    ProviderMeta,
    GenerateOptions,
    GenerateResult,
    KeyTestResult,
    ProviderState,
    ProviderAdapter
} from './base';

export { parseModelModes, errorResult } from './base';

// Individual provider classes
export { GeminiProvider, geminiProvider } from './gemini';
export { DeepSeekProvider, deepseekProvider } from './deepseek';
export { OpenRouterProvider, openrouterProvider } from './openrouter';
export { PerplexityProvider, perplexityProvider } from './perplexity';
export { VercelGatewayProvider, vercelGatewayProvider } from './vercel';

// Registry and provider management
export {
    PROVIDER_ADAPTERS,
    ProviderRegistry,
    getProviderRegistry,
    PROVIDER_STORAGE_KEYS
} from './registry';
