/**
 * System Initializer
 * 
 * Registers all system handlers with the Engine.
 * This is the central bootstrap for the capability system.
 */

import { engine } from './Engine';

// Local handlers
import { eeatScorerHandler } from '@/lib/handlers/local/eeat';
import { schemaGeneratorHandler } from '@/lib/handlers/local/schema';
import { authorMatcherHandler } from '@/lib/handlers/local/authors';
import { internalLinkerHandler } from '@/lib/handlers/local/internalLinks';

// Integration handlers
import { factCheckHandler } from '@/lib/handlers/integration/factCheck';
import { wpPublishHandler } from '@/lib/handlers/integration/wordpress';
import { campaignRunnerHandler } from '@/lib/handlers/integration/campaigns';

// Provider handlers
import { geminiHandler } from '@/lib/handlers/providers/gemini';
import { deepseekHandler } from '@/lib/handlers/providers/deepseek';
import { perplexityHandler } from '@/lib/handlers/providers/perplexity';
import { openrouterHandler } from '@/lib/handlers/providers/openrouter';

// Existing module handlers
import { perplexityHandlers } from '@/lib/ai/providers/perplexity/capabilities';

let initialized = false;

/**
 * Initialize all system handlers.
 * This should be called once during app startup.
 */
export async function initializeSystemHandlers(): Promise<void> {
    if (initialized) return;

    // Initialize Engine first
    await engine.initialize();

    // Register Provider handlers
    engine.registerHandler(geminiHandler);
    engine.registerHandler(deepseekHandler);
    engine.registerHandler(perplexityHandler);
    engine.registerHandler(openrouterHandler);

    // Register Perplexity SDK handlers
    for (const handler of perplexityHandlers) {
        engine.registerHandler(handler);
    }

    // Register Local handlers
    engine.registerHandler(eeatScorerHandler);
    engine.registerHandler(schemaGeneratorHandler);
    engine.registerHandler(authorMatcherHandler);
    engine.registerHandler(internalLinkerHandler);

    // Register Integration handlers
    engine.registerHandler(factCheckHandler);
    engine.registerHandler(wpPublishHandler);
    engine.registerHandler(campaignRunnerHandler);

    // Register handlers from existing modules
    try {
        const { imageSearchHandlers } = await import('@/lib/ai/handlers/imageSearchHandlers');
        imageSearchHandlers.forEach(h => engine.registerHandler(h));
    } catch (e) { console.warn('[SystemInitializer] Failed to load image search handlers', e); }

    try {
        const { trendHandlers } = await import('@/lib/ai/handlers/trendHandlers');
        trendHandlers.forEach(h => engine.registerHandler(h));
    } catch (e) { console.warn('[SystemInitializer] Failed to load trend handlers', e); }

    try {
        const { domainHandlers } = await import('@/lib/ai/handlers/domainHandlers');
        domainHandlers.forEach(h => engine.registerHandler(h));
    } catch (e) { console.warn('[SystemInitializer] Failed to load domain handlers', e); }

    try {
        const { scrapeHandler } = await import('@/lib/ai/handlers/scrapeHandler');
        engine.registerHandler(scrapeHandler);
    } catch (e) { console.warn('[SystemInitializer] Failed to load scrape handler', e); }

    initialized = true;
    console.log('[SystemInitializer] All system handlers registered');
}
