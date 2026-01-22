/**
 * Video Script Generator
 * FSD: lib/video/scriptGenerator.ts
 *
 * Generates scripts for short-form (TikTok, Reels, Shorts) and
 * long-form (YouTube) video content.
 */

import { engine } from '@/lib/core/Engine';

// ============================================================================
// Types
// ============================================================================

export type VideoPlatform = 'youtube_shorts' | 'tiktok' | 'instagram_reels' | 'youtube';
export type ShortFormDuration = 15 | 30 | 60 | 90;
export type LongFormLength = 'short' | 'medium' | 'long'; // 5min, 10min, 20min

export interface Caption {
    text: string;
    startTime: number;  // seconds
    endTime: number;    // seconds
}

export interface VideoSegment {
    text: string;
    visual: string;        // B-roll or visual suggestion
    duration: number;      // seconds
    cameraDirection?: string; // e.g., "close-up", "wide shot"
}

export interface VideoScript {
    type: 'short' | 'long';
    platform: VideoPlatform;
    targetDuration: number; // seconds

    // Content
    title: string;
    hook: string;           // Opening attention-grabber
    body: VideoSegment[];
    callToAction: string;

    // Production aids
    bRoll: string[];        // Suggested B-roll footage
    captions: Caption[];    // Auto-generated caption segments

    // Metadata
    hashtags: string[];
    description?: string;
}

export interface ShortFormOptions {
    topic: string;
    platform: 'youtube_shorts' | 'tiktok' | 'instagram_reels';
    duration: ShortFormDuration;
    style?: 'educational' | 'entertaining' | 'inspirational' | 'tutorial';
    targetAudience?: string;
}

export interface LongFormOptions {
    topic: string;
    length: LongFormLength;
    style?: 'tutorial' | 'review' | 'documentary' | 'vlog' | 'interview';
    includeChapters?: boolean;
}

// ============================================================================
// Prompts
// ============================================================================

const SHORT_FORM_PROMPT = `Create a viral {platform} video script about: {topic}

**Target Duration:** {duration} seconds
**Style:** {style}
**Target Audience:** {audience}

**Requirements:**
1. Hook (first 3 seconds) - Must stop the scroll immediately
2. Body - 2-4 punchy segments, each with visual suggestions
3. Call-to-action - Drive engagement (follow, like, comment)
4. Must fit exactly {duration} seconds when spoken naturally

**Output JSON format:**
{
  "title": "Video title",
  "hook": "Opening hook text (3 seconds)",
  "body": [
    {"text": "Segment text", "visual": "B-roll/visual suggestion", "duration": 10}
  ],
  "callToAction": "Ending CTA",
  "bRoll": ["visual idea 1", "visual idea 2"],
  "hashtags": ["hashtag1", "hashtag2"]
}`;

const LONG_FORM_PROMPT = `Create a detailed YouTube video outline about: {topic}

**Target Length:** {length}
**Style:** {style}
**Include Chapters:** {includeChapters}

**Requirements:**
1. Hook (first 30 seconds) - Preview value, pattern interrupt
2. Intro - Brief overview and promise
3. Main content - 4-8 sections with clear structure
4. Recap and call-to-action
5. Each section needs visual/B-roll suggestions

**Output JSON format:**
{
  "title": "Video title",
  "hook": "Opening 30-second hook",
  "intro": "1-minute intro script",
  "sections": [
    {
      "title": "Section title",
      "script": "Full script for this section",
      "duration": 120,
      "visuals": ["visual 1", "visual 2"],
      "timestamp": "2:30"
    }
  ],
  "recap": "Summary script",
  "callToAction": "Subscribe, like, comment CTA",
  "description": "Full YouTube description",
  "hashtags": ["tag1", "tag2"]
}`;

// ============================================================================
// Duration Helpers
// ============================================================================

const LONG_FORM_DURATIONS: Record<LongFormLength, number> = {
    short: 300,    // 5 minutes
    medium: 600,   // 10 minutes
    long: 1200,    // 20 minutes
};

function estimateSpeakingTime(text: string): number {
    // Average speaking rate: ~150 words per minute = 2.5 words per second
    const words = text.split(/\s+/).length;
    return Math.ceil(words / 2.5);
}

function generateCaptions(segments: VideoSegment[]): Caption[] {
    const captions: Caption[] = [];
    let currentTime = 0;

    for (const segment of segments) {
        // Split into ~10 word chunks for natural captions
        const words = segment.text.split(/\s+/);
        const chunkSize = 10;
        const chunkDuration = segment.duration / Math.ceil(words.length / chunkSize);

        for (let i = 0; i < words.length; i += chunkSize) {
            const chunk = words.slice(i, i + chunkSize).join(' ');
            const startTime = currentTime;
            const endTime = currentTime + chunkDuration;

            captions.push({
                text: chunk,
                startTime: Math.round(startTime * 10) / 10,
                endTime: Math.round(endTime * 10) / 10,
            });

            currentTime = endTime;
        }
    }

    return captions;
}

// ============================================================================
// JSON Parsing
// ============================================================================

function parseJsonResponse<T>(response: string): T | null {
    try {
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[1].trim());
        }
        return JSON.parse(response);
    } catch {
        console.error('[VideoScript] Failed to parse JSON:', response.slice(0, 200));
        return null;
    }
}

// ============================================================================
// Generators
// ============================================================================

/**
 * Generate a short-form video script (TikTok, Reels, Shorts)
 */
export async function generateShortFormScript(options: ShortFormOptions): Promise<VideoScript | null> {
    const prompt = SHORT_FORM_PROMPT
        .replace('{platform}', options.platform.replace('_', ' '))
        .replace('{topic}', options.topic)
        .replace(/{duration}/g, String(options.duration))
        .replace('{style}', options.style || 'educational')
        .replace('{audience}', options.targetAudience || 'general audience');

    const result = await engine.execute({
        capability: 'generate',
        prompt,
        context: { outputFormat: 'json' },
    });

    const parsed = parseJsonResponse<{
        title: string;
        hook: string;
        body: VideoSegment[];
        callToAction: string;
        bRoll: string[];
        hashtags: string[];
    }>(result.text || '');

    if (!parsed) return null;

    // Build full VideoScript
    return {
        type: 'short',
        platform: options.platform,
        targetDuration: options.duration,
        title: parsed.title,
        hook: parsed.hook,
        body: parsed.body,
        callToAction: parsed.callToAction,
        bRoll: parsed.bRoll,
        captions: generateCaptions([
            { text: parsed.hook, visual: '', duration: 3 },
            ...parsed.body,
            { text: parsed.callToAction, visual: '', duration: 3 },
        ]),
        hashtags: parsed.hashtags,
    };
}

/**
 * Generate a long-form video outline (YouTube)
 */
export async function generateLongFormOutline(options: LongFormOptions): Promise<VideoScript | null> {
    const lengthMinutes = LONG_FORM_DURATIONS[options.length] / 60;

    const prompt = LONG_FORM_PROMPT
        .replace('{topic}', options.topic)
        .replace('{length}', `${lengthMinutes} minutes (${options.length})`)
        .replace('{style}', options.style || 'tutorial')
        .replace('{includeChapters}', options.includeChapters !== false ? 'Yes' : 'No');

    const result = await engine.execute({
        capability: 'generate',
        prompt,
        context: { outputFormat: 'json' },
    });

    const parsed = parseJsonResponse<{
        title: string;
        hook: string;
        intro: string;
        sections: Array<{
            title: string;
            script: string;
            duration: number;
            visuals: string[];
            timestamp: string;
        }>;
        recap: string;
        callToAction: string;
        description: string;
        hashtags: string[];
    }>(result.text || '');

    if (!parsed) return null;

    // Convert sections to VideoSegments
    const body: VideoSegment[] = [
        { text: parsed.intro, visual: 'Intro graphics', duration: 60 },
        ...parsed.sections.map(s => ({
            text: s.script,
            visual: s.visuals.join(', '),
            duration: s.duration,
        })),
        { text: parsed.recap, visual: 'Recap graphics', duration: 30 },
    ];

    return {
        type: 'long',
        platform: 'youtube',
        targetDuration: LONG_FORM_DURATIONS[options.length],
        title: parsed.title,
        hook: parsed.hook,
        body,
        callToAction: parsed.callToAction,
        bRoll: parsed.sections.flatMap(s => s.visuals),
        captions: [], // Long-form generates real captions from audio
        hashtags: parsed.hashtags,
        description: parsed.description,
    };
}

/**
 * Quick helper: Generate script from article content
 */
export async function generateVideoFromArticle(
    articleBody: string,
    platform: VideoPlatform,
    options?: { duration?: ShortFormDuration; length?: LongFormLength }
): Promise<VideoScript | null> {
    // Extract topic from article (first H1 or first 100 chars)
    const topicMatch = articleBody.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const topic = topicMatch
        ? topicMatch[1]
        : articleBody.replace(/<[^>]+>/g, '').slice(0, 100);

    if (platform === 'youtube') {
        return generateLongFormOutline({
            topic: `Based on article: ${topic}`,
            length: options?.length || 'medium',
        });
    } else {
        return generateShortFormScript({
            topic: `Based on article: ${topic}`,
            platform: platform as 'youtube_shorts' | 'tiktok' | 'instagram_reels',
            duration: options?.duration || 60,
        });
    }
}
