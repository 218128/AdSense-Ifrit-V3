/**
 * E-E-A-T Injector
 * FSD: features/campaigns/lib/eeatInjector.ts
 * 
 * Phase 2 Integration: Injects author-based E-E-A-T signals into content.
 * Adds bylines, bio boxes, experience phrases, and enhanced schema.
 */

import type { PipelineContext } from '../model/types';
import {
    generateAuthorByline,
    generateAuthorBioBox,
    generateEEATIntro,
    generateArticleWithAuthorSchema,
    getFirstHandPhrase,
    type AuthorProfile,
} from '@/features/authors';
import { getPromptImprovements, getTopicRecommendations } from '@/features/editorial';

// ============================================================================
// Types
// ============================================================================

export interface EEATInjectionResult {
    modifiedContent: string;
    injections: string[];               // What was injected
    schemaMarkup?: string;
}

export interface EEATInjectionOptions {
    injectByline?: boolean;
    injectBioBox?: boolean;
    injectExperienceIntro?: boolean;
    injectSchema?: boolean;
    bioBoxPosition?: 'top' | 'bottom';
}

const DEFAULT_OPTIONS: EEATInjectionOptions = {
    injectByline: true,
    injectBioBox: true,
    injectExperienceIntro: true,
    injectSchema: true,
    bioBoxPosition: 'bottom',
};

// ============================================================================
// E-E-A-T Injection Functions
// ============================================================================

/**
 * Inject all E-E-A-T signals into content
 */
export function injectEEATSignals(
    ctx: PipelineContext,
    author: AuthorProfile,
    options: EEATInjectionOptions = DEFAULT_OPTIONS
): EEATInjectionResult {
    if (!ctx.content) {
        return { modifiedContent: '', injections: [] };
    }

    let content = ctx.content.body;
    const injections: string[] = [];
    let schemaMarkup: string | undefined;

    const topic = ctx.sourceItem.topic;

    // 1. Inject byline after first paragraph
    if (options.injectByline) {
        const byline = generateAuthorByline(author);

        // Find first </p> and insert byline after it
        const firstPEnd = content.indexOf('</p>');
        if (firstPEnd !== -1) {
            content =
                content.substring(0, firstPEnd + 4) +
                `\n<div class="author-byline">${byline}</div>\n` +
                content.substring(firstPEnd + 4);
            injections.push('Author byline');
        }
    }

    // 2. Inject E-E-A-T intro paragraph
    if (options.injectExperienceIntro) {
        const intro = generateEEATIntro(author, author.primaryNiche, topic);

        // Find second paragraph and inject intro
        const paragraphs = content.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
        if (paragraphs.length >= 2) {
            const secondPStart = content.indexOf(paragraphs[1]);
            if (secondPStart !== -1) {
                content =
                    content.substring(0, secondPStart) +
                    `<p class="eeat-intro">${intro}</p>\n` +
                    content.substring(secondPStart);
                injections.push('Experience intro');
            }
        }
    }

    // 3. Inject bio box
    if (options.injectBioBox) {
        const bioBox = generateAuthorBioBox(author);

        if (options.bioBoxPosition === 'top') {
            // After header
            const headerEnd = content.indexOf('</header>');
            if (headerEnd !== -1) {
                content =
                    content.substring(0, headerEnd + 9) +
                    `\n${bioBox}\n` +
                    content.substring(headerEnd + 9);
            } else {
                content = bioBox + '\n' + content;
            }
        } else {
            // Before closing
            const lastClosing = content.lastIndexOf('</article>');
            if (lastClosing !== -1) {
                content =
                    content.substring(0, lastClosing) +
                    `\n${bioBox}\n` +
                    content.substring(lastClosing);
            } else {
                content = content + '\n' + bioBox;
            }
        }
        injections.push('Author bio box');
    }

    // 4. Generate enhanced schema with author
    if (options.injectSchema) {
        const schemaObj = generateArticleWithAuthorSchema(author, {
            articleTitle: ctx.content.title,
            articleUrl: '', // URL not available in PipelineContext
            publishedDate: new Date().toISOString(),
            modifiedDate: new Date().toISOString(),
        });
        schemaMarkup = JSON.stringify(schemaObj, null, 2);
        injections.push('Article + Author schema');
    }

    return {
        modifiedContent: content,
        injections,
        schemaMarkup,
    };
}

/**
 * Inject first-hand experience phrases throughout content
 */
export function injectExperiencePhrases(
    content: string,
    author: AuthorProfile,
    maxInjections: number = 3
): string {
    // Find H2 sections
    const sections = content.split(/<h2[^>]*>/gi);
    if (sections.length <= 1) return content;

    let injected = 0;
    const result: string[] = [sections[0]];

    for (let i = 1; i < sections.length && injected < maxInjections; i++) {
        const section = sections[i];

        // Add experience phrase after section heading
        const headingEnd = section.indexOf('</h2>');
        if (headingEnd !== -1) {
            // Extract section heading text as topic
            const sectionText = section.substring(0, headingEnd);
            const phrase = getFirstHandPhrase(author, sectionText);
            const afterHeading = section.indexOf('</p>', headingEnd);

            if (afterHeading !== -1 && phrase) {
                // Insert phrase at start of first paragraph in section
                const modifiedSection =
                    section.substring(0, headingEnd + 5) +
                    section.substring(headingEnd + 5, afterHeading).replace(
                        /(<p[^>]*>)/i,
                        `$1<span class="experience-signal">${phrase}</span> `
                    ) +
                    section.substring(afterHeading);

                result.push(modifiedSection);
                injected++;
                continue;
            }
        }

        result.push(section);
    }

    // Add remaining sections
    for (let i = result.length; i <= sections.length; i++) {
        if (sections[i]) result.push(sections[i]);
    }

    return result.join('<h2');
}

/**
 * Get prompt improvements for content generation
 */
export function getContentGenerationEnhancements(topic: string): {
    promptAdditions: string[];
    recommendations: string[];
    targetScore: number;
} {
    const improvements = getPromptImprovements();
    const topicRecs = getTopicRecommendations(topic);

    return {
        promptAdditions: [
            ...improvements,
            'Include personal experience phrases like "When I tested..." and "In my experience..."',
            'Add at least 3 authoritative citations from reputable sources',
        ],
        recommendations: topicRecs.focusAreas,
        targetScore: topicRecs.minTargetScore,
    };
}
