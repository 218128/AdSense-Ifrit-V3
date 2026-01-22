/**
 * OpenRouter Provider Module
 * 
 * Re-exports OpenRouter provider and capability handlers
 */

export { openrouterProvider, OpenRouterProvider } from '../openrouter';
export {
    openrouterHandlers,
    openrouterGenerateHandler,
    openrouterResearchHandler,
    openrouterReasonHandler,
} from './capabilities';
