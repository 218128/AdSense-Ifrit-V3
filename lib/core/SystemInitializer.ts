/**
 * System Initializer
 * 
 * Registers all system handlers with the Engine.
 * This is the central bootstrap for the capability system.
 * 
 * Uses dynamic imports with error handling since not all handlers
 * may be available and this should not block the UI from loading.
 */

import { engine } from './Engine';

let initialized = false;

/**
 * Initialize all system handlers.
 * This should be called once during app startup.
 */
export async function initializeSystemHandlers(): Promise<void> {
    if (initialized) return;

    // Initialize Engine first
    await engine.initialize();

    // Register Perplexity SDK handlers (built-in)
    try {
        const { perplexityHandlers } = await import('@/lib/ai/providers/perplexity/capabilities');
        for (const handler of perplexityHandlers) {
            engine.registerHandler(handler);
        }
    } catch (e) { console.warn('[SystemInitializer] Perplexity handlers not available:', e); }

    // Register Gemini SDK handlers
    try {
        const { geminiHandlers } = await import('@/lib/ai/providers/gemini/capabilities');
        for (const handler of geminiHandlers) {
            engine.registerHandler(handler);
        }
        console.log('[SystemInitializer] Gemini handlers registered:', geminiHandlers.length);
    } catch (e) { console.warn('[SystemInitializer] Gemini handlers not available:', e); }

    // Register DeepSeek handlers (OpenAI-compatible API)
    try {
        const { deepseekHandlers } = await import('@/lib/ai/providers/deepseek/capabilities');
        for (const handler of deepseekHandlers) {
            engine.registerHandler(handler);
        }
        console.log('[SystemInitializer] DeepSeek handlers registered:', deepseekHandlers.length);
    } catch (e) { console.warn('[SystemInitializer] DeepSeek handlers not available:', e); }

    // Register OpenRouter handlers (unified API for 300+ models)
    try {
        const { openrouterHandlers } = await import('@/lib/ai/providers/openrouter/capabilities');
        for (const handler of openrouterHandlers) {
            engine.registerHandler(handler);
        }
        console.log('[SystemInitializer] OpenRouter handlers registered:', openrouterHandlers.length);
    } catch (e) { console.warn('[SystemInitializer] OpenRouter handlers not available:', e); }

    // Register handlers from existing modules
    try {
        const { imageSearchHandlers } = await import('@/lib/ai/handlers/imageSearchHandlers');
        imageSearchHandlers.forEach(h => engine.registerHandler(h));
    } catch (e) { console.warn('[SystemInitializer] Image search handlers not available'); }

    try {
        const { trendHandlers } = await import('@/lib/ai/handlers/trendHandlers');
        trendHandlers.forEach(h => engine.registerHandler(h));
    } catch (e) { console.warn('[SystemInitializer] Trend handlers not available'); }

    try {
        const { domainHandlers } = await import('@/lib/ai/handlers/domainHandlers');
        domainHandlers.forEach(h => engine.registerHandler(h));
    } catch (e) { console.warn('[SystemInitializer] Domain handlers not available'); }

    try {
        const { scrapeHandler } = await import('@/lib/ai/handlers/scrapeHandler');
        engine.registerHandler(scrapeHandler);
    } catch (e) { console.warn('[SystemInitializer] Scrape handler not available'); }

    initialized = true;
    console.log('[SystemInitializer] System handlers registered');
}
