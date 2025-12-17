/**
 * Provider Pricing Constants
 * 
 * Pricing rates for each AI provider based on their official documentation.
 * Rates are in USD per token/request.
 */

export interface ProviderRate {
    name: string;
    inputPerToken: number;      // Cost per input token
    outputPerToken: number;     // Cost per output token
    requestFee: number;         // Fixed fee per request (if any)
    freeRequests?: number;      // Free tier limit (if any)
    freeTierLimit?: string;     // Human-readable free tier description
    notes?: string;
}

// Pricing as of December 2024
export const PROVIDER_PRICING: Record<string, ProviderRate> = {
    perplexity: {
        name: 'Perplexity Sonar',
        inputPerToken: 0.000001,    // $1 per 1M tokens = $0.000001/token
        outputPerToken: 0.000001,   // $1 per 1M tokens
        requestFee: 0.005,          // $0.005 per request (web search)
        notes: 'Pro subscribers get $5/month credit'
    },
    gemini: {
        name: 'Google Gemini',
        inputPerToken: 0,           // Free tier
        outputPerToken: 0,
        requestFee: 0,
        freeRequests: 1500,
        freeTierLimit: '1500 requests/day',
        notes: 'Free tier with rate limits'
    },
    deepseek: {
        name: 'DeepSeek',
        inputPerToken: 0.00000014,  // $0.14 per 1M tokens
        outputPerToken: 0.00000028, // $0.28 per 1M tokens
        requestFee: 0,
        notes: 'Competitive pricing'
    },
    openrouter: {
        name: 'OpenRouter',
        inputPerToken: 0.000001,    // Varies by model, using average
        outputPerToken: 0.000002,
        requestFee: 0,
        notes: 'Pricing varies by model'
    },
    vercel: {
        name: 'Vercel AI',
        inputPerToken: 0.00000015,
        outputPerToken: 0.0000006,
        requestFee: 0,
        notes: 'Based on underlying model'
    }
};

/**
 * Calculate cost for a single API call
 */
export function calculateCost(
    provider: string,
    inputTokens: number,
    outputTokens: number
): number {
    const rates = PROVIDER_PRICING[provider];
    if (!rates) return 0;

    const inputCost = inputTokens * rates.inputPerToken;
    const outputCost = outputTokens * rates.outputPerToken;
    const requestCost = rates.requestFee;

    return inputCost + outputCost + requestCost;
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
    if (cost < 0.01) {
        return `$${cost.toFixed(4)}`;
    }
    return `$${cost.toFixed(2)}`;
}

/**
 * Format token count for display
 */
export function formatTokens(tokens: number): string {
    if (tokens >= 1000000) {
        return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
        return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
}
