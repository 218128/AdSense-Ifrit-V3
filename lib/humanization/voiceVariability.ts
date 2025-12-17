/**
 * Voice Variability Module
 * 
 * Implements techniques to make AI-generated content less detectable:
 * - Sentence length variation (burstiness)
 * - Vocabulary variation
 * - Personal voice injection
 * - Informal language mixing
 */

import { AuthorPersona, WritingStyle } from './personas';

export interface VoiceVariabilityConfig {
    enableBurstiness: boolean;
    enableContractions: boolean;
    enableFirstPerson: boolean;
    enableAnecdotes: boolean;
    anecdoteFrequency: 'low' | 'medium' | 'high';
}

export const DEFAULT_VOICE_CONFIG: VoiceVariabilityConfig = {
    enableBurstiness: true,
    enableContractions: true,
    enableFirstPerson: true,
    enableAnecdotes: true,
    anecdoteFrequency: 'medium'
};

/**
 * Generate prompt instructions for voice variability
 */
export function generateVoiceInstructions(
    persona: AuthorPersona,
    config: VoiceVariabilityConfig = DEFAULT_VOICE_CONFIG
): string {
    const instructions: string[] = [];

    // Base persona voice
    instructions.push(`You are ${persona.name}, a ${persona.profession} with ${persona.yearsExperience} years of experience.`);
    instructions.push(`Your specialties include: ${persona.specialties.join(', ')}.`);

    // Voice traits
    instructions.push(`Your writing voice is: ${persona.voiceTraits.join('; ')}.`);

    // Writing style
    const style = persona.writingStyle;
    instructions.push(generateStyleInstructions(style));

    // Burstiness
    if (config.enableBurstiness) {
        instructions.push(BURSTINESS_INSTRUCTION);
    }

    // Contractions
    if (config.enableContractions && style.useContractions) {
        instructions.push(CONTRACTION_INSTRUCTION);
    }

    // First person
    if (config.enableFirstPerson && style.useFirstPerson) {
        instructions.push(FIRST_PERSON_INSTRUCTION);
    }

    // Common phrases
    instructions.push(`Occasionally use phrases like: "${persona.commonPhrases.slice(0, 3).join('", "')}"`);

    // Anecdotes
    if (config.enableAnecdotes) {
        const frequency = config.anecdoteFrequency === 'high' ? '2-3' :
            config.anecdoteFrequency === 'medium' ? '1-2' : '1';
        instructions.push(`Include ${frequency} personal experience(s) where relevant, starting with phrases like: "${persona.personalExperiences[0].split('{')[0]}..."`);
    }

    return instructions.join('\n\n');
}

function generateStyleInstructions(style: WritingStyle): string {
    const parts: string[] = [];

    // Formality
    switch (style.formality) {
        case 'casual':
            parts.push('Write in a casual, friendly tone as if talking to a friend.');
            break;
        case 'conversational':
            parts.push('Write in a conversational but knowledgeable tone.');
            break;
        case 'professional':
            parts.push('Maintain a professional tone while being approachable.');
            break;
        case 'academic':
            parts.push('Write in an academic, well-researched style.');
            break;
    }

    // Sentence complexity
    switch (style.sentenceComplexity) {
        case 'simple':
            parts.push('Use mostly short, clear sentences.');
            break;
        case 'mixed':
            parts.push('Mix short punchy sentences with longer, more detailed ones.');
            break;
        case 'complex':
            parts.push('Use sophisticated sentence structures when appropriate.');
            break;
    }

    // Humor
    switch (style.humorLevel) {
        case 'subtle':
            parts.push('Include subtle humor or wit occasionally.');
            break;
        case 'frequent':
            parts.push('Be lighthearted and humorous when appropriate.');
            break;
        case 'none':
            // No instruction needed
            break;
    }

    return parts.join(' ');
}

const BURSTINESS_INSTRUCTION = `
CRITICAL - Sentence Variability (Burstiness):
Vary your sentence length dramatically throughout the article. Mix:
- Very short sentences. Like this. They punch.
- Medium-length sentences that explain a concept or make a point clearly.
- Longer, more complex sentences that weave together multiple ideas, provide nuance, or elaborate on a topic with additional context and examples.

This variation is essential. Never write more than 2-3 sentences of similar length in a row.
`;

const CONTRACTION_INSTRUCTION = `
Use natural contractions: don't, won't, can't, isn't, it's, you're, they're, we've, I've, I'm.
Avoid stiff formal language. Write like you speak.
`;

const FIRST_PERSON_INSTRUCTION = `
Write in first person when sharing experiences: "I've found...", "In my experience...", "I recommend...".
Mix with second person when addressing the reader: "You'll want to...", "What you need to know is...".
`;

/**
 * Generate E-E-A-T compliance instructions
 */
export function generateEEATInstructions(persona: AuthorPersona): string {
    return `
E-E-A-T COMPLIANCE REQUIREMENTS:

**Experience**: Share genuine first-hand experiences with the products/topics discussed.
- Use phrases like: "When I tested this...", "After using this for [timeframe]...", "My experience was..."
- Include specific details that only someone who used the product would know.

**Expertise**: Demonstrate your ${persona.yearsExperience} years of expertise as a ${persona.profession}.
- Reference your professional background when relevant.
- Explain *why* something works, not just that it works.
- Use technical terms appropriately, then explain them for general readers.

**Authoritativeness**: Build credibility through:
- Citing specific data, statistics, or research when available.
- Referencing industry standards or best practices.
- Mentioning specific features, pricing, or specifications accurately.

**Trustworthiness**: Be honest and balanced:
- Acknowledge limitations or cons of products you recommend.
- Be transparent about who the product is NOT for.
- Include a "Last Updated: [Month Year]" note at the end.
- Never make claims you can't substantiate.
`;
}

/**
 * Generate anecdote templates for a given product/topic
 */
export function generateAnecdotePrompt(
    persona: AuthorPersona,
    productName: string,
    context: string
): string {
    const templates = persona.personalExperiences.map(exp =>
        exp.replace('{product}', productName)
            .replace('{category}', context)
            .replace('{issue}', 'this problem')
            .replace('{result}', 'measurable improvements')
            .replace('{location}', 'a remote area')
            .replace('{country}', 'Southeast Asia')
    );

    return `
Include 1-2 personal anecdotes using patterns like:
${templates.map((t, i) => `${i + 1}. "${t}..."`).join('\n')}

Make these feel genuine and specific. Include concrete details like timeframes, specific features used, or measurable outcomes.
`;
}

/**
 * Post-processing: Add variety to generated content
 * (To be called on AI output for additional humanization)
 */
export function addHumanTouches(content: string): string {
    let result = content;

    // Add occasional em-dashes for natural pauses
    result = result.replace(/,(\s+)(and|but|so|because)/gi, (match, space, conj) => {
        return Math.random() > 0.7 ? ` – ${conj}` : match;
    });

    // Occasionally convert "very" to more casual alternatives
    const veryAlternatives = ['really', 'super', 'incredibly', 'genuinely'];
    result = result.replace(/\bvery\b/gi, (match) => {
        if (Math.random() > 0.6) {
            return veryAlternatives[Math.floor(Math.random() * veryAlternatives.length)];
        }
        return match;
    });

    return result;
}
