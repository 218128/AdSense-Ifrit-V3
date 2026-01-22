/**
 * Multi-Format Content Generator
 * FSD: lib/distribution/multiFormatGenerator.ts
 *
 * Converts a single article into multiple distribution formats:
 * LinkedIn, Twitter, TikTok, Podcast, Newsletter, YouTube.
 */

import { engine } from '@/lib/core/Engine';
import {
    LINKEDIN_POST_PROMPT,
    TWITTER_THREAD_PROMPT,
    TIKTOK_SCRIPT_PROMPT,
    PODCAST_OUTLINE_PROMPT,
    NEWSLETTER_PROMPT,
    YOUTUBE_DESCRIPTION_PROMPT,
} from '@/lib/prompts/multiFormat';

// ============================================================================
// Types
// ============================================================================

export interface BaseContent {
    title: string;
    body: string;           // Full article HTML or markdown
    excerpt?: string;       // Short summary
    keyPoints?: string[];   // Main takeaways
    sources?: string[];     // Citation URLs
}

export interface LinkedInOutput {
    post: string;
    hashtags: string[];
}

export interface TwitterOutput {
    thread: string[];
    standalone: string;
}

export interface TikTokOutput {
    hook: string;
    script: string;
    segments: Array<{ text: string; visual: string; duration: number }>;
    callToAction: string;
    hooks: string[];
}

export interface PodcastOutput {
    title: string;
    intro: string;
    mainPoints: Array<{ topic: string; talkingPoints: string[]; duration: number }>;
    listenerQuestions: string[];
    outro: string;
}

export interface NewsletterOutput {
    subject: string;
    preview: string;
    body: string;
    plainText: string;
}

export interface YouTubeOutput {
    description: string;
    timestamps: Array<{ time: string; label: string }>;
    tags: string[];
}

export interface MultiFormatOutput {
    linkedIn?: LinkedInOutput;
    twitter?: TwitterOutput;
    tikTok?: TikTokOutput;
    podcast?: PodcastOutput;
    newsletter?: NewsletterOutput;
    youtube?: YouTubeOutput;
}

export type FormatType = keyof MultiFormatOutput;

export interface GenerateOptions {
    formats?: FormatType[];
    tikTokDuration?: 30 | 60 | 90;
}

// ============================================================================
// Prompt Helpers
// ============================================================================

function stripHtml(html: string): string {
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function truncateForPrompt(text: string, maxLength: number = 8000): string {
    const plain = stripHtml(text);
    if (plain.length <= maxLength) return plain;
    return plain.slice(0, maxLength) + '...[truncated]';
}

function parseJsonResponse<T>(response: string): T | null {
    try {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[1].trim());
        }
        // Try direct parse
        return JSON.parse(response);
    } catch {
        console.error('[MultiFormat] Failed to parse JSON response:', response.slice(0, 200));
        return null;
    }
}

// ============================================================================
// Individual Format Generators
// ============================================================================

async function generateLinkedIn(article: string): Promise<LinkedInOutput | null> {
    const prompt = LINKEDIN_POST_PROMPT.replace('{article}', truncateForPrompt(article));

    const result = await engine.execute({
        capability: 'generate',
        prompt,
        context: { outputFormat: 'json' },
    });

    return parseJsonResponse<LinkedInOutput>(result.text || '');
}

async function generateTwitter(article: string): Promise<TwitterOutput | null> {
    const prompt = TWITTER_THREAD_PROMPT.replace('{article}', truncateForPrompt(article));

    const result = await engine.execute({
        capability: 'generate',
        prompt,
        context: { outputFormat: 'json' },
    });

    return parseJsonResponse<TwitterOutput>(result.text || '');
}

async function generateTikTok(article: string, duration: number = 60): Promise<TikTokOutput | null> {
    const prompt = TIKTOK_SCRIPT_PROMPT
        .replace('{article}', truncateForPrompt(article, 4000))
        .replace('{duration}', String(duration));

    const result = await engine.execute({
        capability: 'generate',
        prompt,
        context: { outputFormat: 'json' },
    });

    return parseJsonResponse<TikTokOutput>(result.text || '');
}

async function generatePodcast(article: string): Promise<PodcastOutput | null> {
    const prompt = PODCAST_OUTLINE_PROMPT.replace('{article}', truncateForPrompt(article));

    const result = await engine.execute({
        capability: 'generate',
        prompt,
        context: { outputFormat: 'json' },
    });

    return parseJsonResponse<PodcastOutput>(result.text || '');
}

async function generateNewsletter(article: string): Promise<NewsletterOutput | null> {
    const prompt = NEWSLETTER_PROMPT.replace('{article}', truncateForPrompt(article));

    const result = await engine.execute({
        capability: 'generate',
        prompt,
        context: { outputFormat: 'json' },
    });

    return parseJsonResponse<NewsletterOutput>(result.text || '');
}

async function generateYouTube(article: string): Promise<YouTubeOutput | null> {
    const prompt = YOUTUBE_DESCRIPTION_PROMPT.replace('{article}', truncateForPrompt(article));

    const result = await engine.execute({
        capability: 'generate',
        prompt,
        context: { outputFormat: 'json' },
    });

    return parseJsonResponse<YouTubeOutput>(result.text || '');
}

// ============================================================================
// Main Entry Point
// ============================================================================

const ALL_FORMATS: FormatType[] = ['linkedIn', 'twitter', 'tikTok', 'podcast', 'newsletter', 'youtube'];

/**
 * Generate multiple content formats from a single article.
 */
export async function generateAllFormats(
    content: BaseContent,
    options: GenerateOptions = {}
): Promise<MultiFormatOutput> {
    const formats = options.formats || ALL_FORMATS;
    const article = content.body;

    const output: MultiFormatOutput = {};

    // Run in parallel for speed
    const tasks: Promise<void>[] = [];

    if (formats.includes('linkedIn')) {
        tasks.push(
            generateLinkedIn(article).then(result => {
                if (result) output.linkedIn = result;
            })
        );
    }

    if (formats.includes('twitter')) {
        tasks.push(
            generateTwitter(article).then(result => {
                if (result) output.twitter = result;
            })
        );
    }

    if (formats.includes('tikTok')) {
        tasks.push(
            generateTikTok(article, options.tikTokDuration || 60).then(result => {
                if (result) output.tikTok = result;
            })
        );
    }

    if (formats.includes('podcast')) {
        tasks.push(
            generatePodcast(article).then(result => {
                if (result) output.podcast = result;
            })
        );
    }

    if (formats.includes('newsletter')) {
        tasks.push(
            generateNewsletter(article).then(result => {
                if (result) output.newsletter = result;
            })
        );
    }

    if (formats.includes('youtube')) {
        tasks.push(
            generateYouTube(article).then(result => {
                if (result) output.youtube = result;
            })
        );
    }

    await Promise.all(tasks);

    console.log(`[MultiFormat] Generated ${Object.keys(output).length} formats`);

    return output;
}

/**
 * Generate a specific format only.
 */
export async function generateSingleFormat<T extends FormatType>(
    content: BaseContent,
    format: T,
    options: GenerateOptions = {}
): Promise<MultiFormatOutput[T] | null> {
    const article = content.body;

    switch (format) {
        case 'linkedIn':
            return generateLinkedIn(article) as Promise<MultiFormatOutput[T] | null>;
        case 'twitter':
            return generateTwitter(article) as Promise<MultiFormatOutput[T] | null>;
        case 'tikTok':
            return generateTikTok(article, options.tikTokDuration || 60) as Promise<MultiFormatOutput[T] | null>;
        case 'podcast':
            return generatePodcast(article) as Promise<MultiFormatOutput[T] | null>;
        case 'newsletter':
            return generateNewsletter(article) as Promise<MultiFormatOutput[T] | null>;
        case 'youtube':
            return generateYouTube(article) as Promise<MultiFormatOutput[T] | null>;
        default:
            return null;
    }
}

// ============================================================================
// Convenience: Get Format Display Names
// ============================================================================

export const FORMAT_DISPLAY_NAMES: Record<FormatType, string> = {
    linkedIn: 'LinkedIn Post',
    twitter: 'Twitter Thread',
    tikTok: 'TikTok Script',
    podcast: 'Podcast Outline',
    newsletter: 'Email Newsletter',
    youtube: 'YouTube Description',
};

export const FORMAT_ICONS: Record<FormatType, string> = {
    linkedIn: '💼',
    twitter: '🐦',
    tikTok: '📱',
    podcast: '🎙️',
    newsletter: '📧',
    youtube: '▶️',
};
