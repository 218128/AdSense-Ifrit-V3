/**
 * Provider Metadata
 * 
 * Static metadata about AI providers for UI display.
 * This is separate from the runtime ProviderRegistry.
 */

import type { ProviderId } from './base';

// ============================================
// TYPES
// ============================================

export interface ProviderMetadata {
    id: ProviderId;
    name: string;
    description: string;
    baseUrl: string;
    models: string[];
    defaultModel: string;
    rateLimit: {
        requestsPerMinute: number;
        requestsPerDay: number;
        cooldownMs: number;
    };
    features: string[];
    signupUrl: string;
    pricing: string;
}

// ============================================
// PROVIDER METADATA
// ============================================

export const PROVIDER_METADATA: Record<ProviderId, ProviderMetadata> = {
    gemini: {
        id: 'gemini',
        name: 'Google Gemini',
        description: 'Google AI Studio - Advanced multimodal AI models',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3-pro'],
        defaultModel: 'gemini-2.5-flash',
        rateLimit: { requestsPerMinute: 15, requestsPerDay: 1500, cooldownMs: 4000 },
        features: ['Free tier', 'High quality', 'Multi-modal'],
        signupUrl: 'https://aistudio.google.com/',
        pricing: 'Free: 15 RPM, 1500/day'
    },
    deepseek: {
        id: 'deepseek',
        name: 'DeepSeek',
        description: 'High-quality AI models with reasoning capabilities',
        baseUrl: 'https://api.deepseek.com/v1',
        models: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-coder'],
        defaultModel: 'deepseek-chat',
        rateLimit: { requestsPerMinute: 60, requestsPerDay: 10000, cooldownMs: 1000 },
        features: ['Very cheap', 'Reasoning', 'Code generation'],
        signupUrl: 'https://platform.deepseek.com/',
        pricing: '$0.28/1M input, $0.42/1M output'
    },
    openrouter: {
        id: 'openrouter',
        name: 'OpenRouter',
        description: 'Access 300+ AI models through unified API',
        baseUrl: 'https://openrouter.ai/api/v1',
        models: ['deepseek/deepseek-chat:free', 'google/gemma-7b-it:free'],
        defaultModel: 'deepseek/deepseek-chat:free',
        rateLimit: { requestsPerMinute: 20, requestsPerDay: 50, cooldownMs: 3000 },
        features: ['300+ models', 'Free tier', 'Unified API'],
        signupUrl: 'https://openrouter.ai/',
        pricing: 'Free: 50/day (1000 with $10 credit)'
    },
    perplexity: {
        id: 'perplexity',
        name: 'Perplexity AI',
        description: 'Web-grounded search AI with citations',
        baseUrl: 'https://api.perplexity.ai',
        models: ['sonar', 'sonar-pro', 'sonar-reasoning-pro'],
        defaultModel: 'sonar',
        rateLimit: { requestsPerMinute: 3, requestsPerDay: 5000, cooldownMs: 20000 },
        features: ['Web search', 'Citations', 'Real-time info'],
        signupUrl: 'https://www.perplexity.ai/',
        pricing: 'Requires Pro ($20/month)'
    },
    vercel: {
        id: 'vercel',
        name: 'Vercel AI Gateway',
        description: 'Unified AI gateway with caching and auto-failover',
        baseUrl: 'https://ai-gateway.vercel.sh/v1',
        models: ['anthropic/claude-3-haiku', 'openai/gpt-4o-mini'],
        defaultModel: 'anthropic/claude-3-haiku',
        rateLimit: { requestsPerMinute: 60, requestsPerDay: 1000, cooldownMs: 1000 },
        features: ['Auto-failover', 'Caching', 'Analytics'],
        signupUrl: 'https://vercel.com/',
        pricing: '$5 free credits/month'
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getProvidersList(): ProviderMetadata[] {
    return Object.values(PROVIDER_METADATA);
}

export function getProviderMetadata(providerId: ProviderId): ProviderMetadata {
    return PROVIDER_METADATA[providerId];
}

// Legacy alias
export const PROVIDERS = PROVIDER_METADATA;
