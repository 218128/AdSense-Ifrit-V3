/**
 * Content Prompt Builders
 * FSD: features/campaigns/lib/prompts.ts
 */

import type { Campaign } from '../model/types';

// ============================================================================
// Tone and Article Type Configurations
// ============================================================================

export const TONE_DESCRIPTIONS = {
    professional: 'professional and authoritative',
    conversational: 'friendly and conversational',
    authoritative: 'expert and authoritative',
    friendly: 'warm and approachable',
} as const;

export const ARTICLE_TYPE_TEMPLATES = {
    pillar: (length: number) => `Write a comprehensive pillar article (${length}+ words). Include:
- Table of contents
- Multiple detailed sections with H2 headings
- Practical examples and case studies
- Key takeaways at the end`,
    cluster: (length: number) => `Write a focused cluster article (~${length} words). Include:
- Clear problem/solution structure
- Specific actionable advice
- Link suggestions to related topics`,
    'how-to': (length: number) => `Write a step-by-step how-to guide (~${length} words). Include:
- Numbered steps with clear instructions
- Tips and warnings where appropriate
- Expected outcomes for each step`,
    review: (length: number) => `Write a detailed review (~${length} words). Include:
- Pros and cons
- Comparison with alternatives
- Final recommendation`,
    listicle: (length: number) => `Write an engaging list article (~${length} words). Include:
- Numbered items with detailed descriptions
- Why each item matters
- Quick summary at the end`,
} as const;

/**
 * Build content generation prompt with human-like writing style
 */
export function buildContentPrompt(
    topic: string,
    aiConfig: Campaign['aiConfig'],
    research?: string
): string {
    const toneDesc = TONE_DESCRIPTIONS[aiConfig.tone];
    const typeTemplate = ARTICLE_TYPE_TEMPLATES[aiConfig.articleType];
    const typeInstructions = typeTemplate(aiConfig.targetLength);

    let prompt = `You are an experienced content writer with a natural, engaging style. Write a ${toneDesc} article about: ${topic}

${typeInstructions}

WRITING STYLE - Make it sound HUMAN:
- Use contractions naturally (you'll, it's, don't, we've)
- Vary sentence length - mix short punchy sentences with longer explanatory ones
- Start some sentences with "And" or "But" for flow
- Include rhetorical questions to engage readers ("But what does this mean for you?")
- Add personal touches ("In my experience...", "What I've found is...")
- Use casual transitions ("Here's the thing:", "Look,", "The truth is")
- Avoid robotic phrases like "It's important to note" or "Furthermore"
- Write like you're explaining to a smart friend, not a textbook

READER ENGAGEMENT:
- Hook them in the first 2 sentences
- Use "you" and "your" to speak directly to readers
- Include relatable examples and real scenarios
- Add a surprising fact or counterintuitive insight
- End sections with a bridge to keep them reading

STRUCTURE:
- Start with an H1 title (# Title)
- Use H2 (##) for main sections
- Use H3 (###) for subsections
- Include bullet points for scannable content
- Keep paragraphs to 3-4 sentences max

DO NOT:
- Use "Certainly", "Indeed", "In conclusion"
- Include citations like [1], [2]
- Add word counts or placeholders
- Write overly formal or academic language
- Use "utilize" (say "use"), "implement" (say "set up")

Output in clean Markdown.`;

    if (research) {
        prompt += `\n\nUse this research to inform your article (cite facts naturally, not with brackets):\n${research}`;
    }

    if (aiConfig.includeFAQ) {
        prompt += `\n\nInclude a FAQ section at the end with 5 questions real readers would ask. Write answers conversationally.`;
    }

    return prompt;
}

/**
 * Build research prompt
 */
export function buildResearchPrompt(topic: string): string {
    return `Research the following topic thoroughly for a comprehensive article. 
Topic: ${topic}

Provide key facts, statistics, expert opinions, and current trends related to this topic.
Focus on accurate, up-to-date information that would be valuable for readers.`;
}

/**
 * Build image generation prompt
 */
export function buildImagePrompt(title: string): string {
    return `Create a professional blog cover image for an article titled: "${title}". 
Modern, clean design with subtle gradients. No text overlay.`;
}
