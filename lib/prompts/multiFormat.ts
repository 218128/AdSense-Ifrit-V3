/**
 * Multi-Format Prompts
 * FSD: lib/prompts/multiFormat.ts
 *
 * Prompts for converting article content to various social & distribution formats.
 */

// ============================================================================
// LinkedIn
// ============================================================================

export const LINKEDIN_POST_PROMPT = `Convert this article into a professional LinkedIn post.

**Article:**
{article}

**Requirements:**
- Maximum 3000 characters (LinkedIn limit)
- Start with a compelling hook that stops scrolling
- Use short paragraphs (2-3 sentences max)
- Include 3-5 key insights as bullet points
- End with a thought-provoking question or call-to-action
- Suggest 3-5 relevant hashtags

**Output JSON format:**
{
  "post": "The full LinkedIn post text",
  "hashtags": ["hashtag1", "hashtag2", ...]
}`;

// ============================================================================
// Twitter/X
// ============================================================================

export const TWITTER_THREAD_PROMPT = `Convert this article into a Twitter/X thread.

**Article:**
{article}

**Requirements:**
- Create a thread of 5-10 tweets
- First tweet must be a hook that makes people want to read more
- Each tweet max 280 characters
- Use numbered format (1/10, 2/10, etc.)
- Add relevant emojis sparingly
- Final tweet should summarize key takeaway and encourage engagement
- Also provide a standalone single tweet version

**Output JSON format:**
{
  "thread": ["Tweet 1/N...", "Tweet 2/N...", ...],
  "standalone": "A single standalone tweet summarizing the article"
}`;

// ============================================================================
// TikTok / Short-Form Video
// ============================================================================

export const TIKTOK_SCRIPT_PROMPT = `Create a TikTok/Reels video script from this article.

**Article:**
{article}

**Target Duration:** {duration} seconds

**Requirements:**
- Start with an attention-grabbing hook (first 3 seconds are critical)
- Use conversational, Gen-Z friendly language
- Break into clear visual segments
- Include 2-3 key points maximum
- End with a strong call-to-action
- Suggest B-roll or visual ideas for each segment

**Output JSON format:**
{
  "hook": "Opening 3-second hook",
  "script": "Full spoken script",
  "segments": [
    {"text": "Segment text", "visual": "Visual suggestion", "duration": 5}
  ],
  "callToAction": "Ending CTA",
  "hooks": ["Alternative hook 1", "Alternative hook 2"]
}`;

// ============================================================================
// Podcast
// ============================================================================

export const PODCAST_OUTLINE_PROMPT = `Create a podcast episode outline from this article.

**Article:**
{article}

**Requirements:**
- Create intro that hooks listeners in first 30 seconds
- Break content into 3-5 main discussion points
- Include potential tangent topics for natural conversation
- Suggest questions listeners might have
- Write outro with call-to-action

**Output JSON format:**
{
  "title": "Episode title",
  "intro": "Opening monologue (2-3 paragraphs)",
  "mainPoints": [
    {"topic": "Topic name", "talkingPoints": ["Point 1", "Point 2"], "duration": 5}
  ],
  "listenerQuestions": ["Q1", "Q2", "Q3"],
  "outro": "Closing remarks and CTA"
}`;

// ============================================================================
// Newsletter
// ============================================================================

export const NEWSLETTER_PROMPT = `Convert this article into an engaging email newsletter.

**Article:**
{article}

**Requirements:**
- Subject line that drives opens (max 50 characters)
- Preview text that complements subject (max 100 characters)
- Personal, conversational tone
- Break content into scannable sections
- Include 1-2 relevant links or resources
- End with clear next step or CTA

**Output JSON format:**
{
  "subject": "Email subject line",
  "preview": "Preview text",
  "body": "Full newsletter HTML body",
  "plainText": "Plain text version"
}`;

// ============================================================================
// YouTube Description
// ============================================================================

export const YOUTUBE_DESCRIPTION_PROMPT = `Create a YouTube video description from this article.

**Article:**
{article}

**Requirements:**
- First 2 lines are most important (shown before "Show More")
- Include timestamps for key sections
- Add relevant keywords naturally
- Include call-to-action for likes/subscribe
- Add relevant hashtags at the end

**Output JSON format:**
{
  "description": "Full description text",
  "timestamps": [{"time": "0:00", "label": "Intro"}, ...],
  "tags": ["tag1", "tag2", ...]
}`;
