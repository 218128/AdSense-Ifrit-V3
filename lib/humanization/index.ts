/**
 * Humanization Index Module
 * 
 * Central export point for all humanization features.
 */

export type { AuthorPersona, WritingStyle } from './personas';

export {
    DEFAULT_PERSONAS,
    getPersonaById,
    getRandomPersona,
    getPersonasBySpecialty,
    getBestPersonaForTopic
} from './personas';

export type { VoiceVariabilityConfig } from './voiceVariability';

export {
    DEFAULT_VOICE_CONFIG,
    generateVoiceInstructions,
    generateEEATInstructions,
    generateAnecdotePrompt,
    addHumanTouches
} from './voiceVariability';
