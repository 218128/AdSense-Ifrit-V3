/**
 * AI Services - Main Export
 * 
 * Single entry point for the pluggable AI Services Layer.
 * 
 * Usage:
 * ```typescript
 * import { aiServices } from '@/lib/ai/services';
 * 
 * // Execute a capability
 * const result = await aiServices.execute({
 *   capability: 'research',
 *   prompt: 'Find competitors for budget tech niche'
 * });
 * 
 * // Or use convenience methods
 * const text = await aiServices.generate('Write about...');
 * const keywords = await aiServices.keywords('budget smartphones');
 * ```
 */

// Main service
export { aiServices } from './AIServices';

// Executor (provider-agnostic execution layer)
export {
    CapabilityExecutor,
    getCapabilityExecutor,
    type ProviderDiagnostics,
    type VerbosityLevel,
    type ExecutorConfig,
} from './CapabilityExecutor';

// Types
export type {
    Capability,
    CapabilityHandler,
    CapabilitiesConfig,
    ExecuteOptions,
    ExecuteResult,
    AIServicesEvent,
} from './types';

export {
    DEFAULT_CAPABILITIES,
    DEFAULT_CONFIG,
    AI_SERVICES_STORAGE,
} from './types';

