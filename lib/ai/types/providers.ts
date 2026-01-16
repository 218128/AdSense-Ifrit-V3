/**
 * AI Provider Types - Unified Type Definitions
 * 
 * Single source of truth for all AI provider-related types.
 * All other modules should import from here.
 * 
 * @module lib/ai/types/providers
 */

// ============================================
// PROVIDER ID
// ============================================

/**
 * Unique identifier for each AI provider.
 * This is the canonical definition - all other modules re-export from here.
 */
export type ProviderId = 'gemini' | 'deepseek' | 'openrouter' | 'perplexity' | 'vercel';

/**
 * Provider IDs that support text generation (excludes vercel gateway)
 */
export type TextProviderId = 'gemini' | 'deepseek' | 'openrouter' | 'perplexity';

/**
 * Array of all provider IDs for iteration
 */
export const ALL_PROVIDER_IDS: ProviderId[] = ['gemini', 'deepseek', 'openrouter', 'perplexity', 'vercel'];

/**
 * Array of text provider IDs for iteration
 */
export const TEXT_PROVIDER_IDS: TextProviderId[] = ['gemini', 'deepseek', 'openrouter', 'perplexity'];
