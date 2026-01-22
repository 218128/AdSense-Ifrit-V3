/**
 * Distribution Module - Barrel Export
 * FSD: lib/distribution/index.ts
 *
 * Centralized exports for content distribution functionality.
 */

// ============================================================================
// Multi-Format Generator
// ============================================================================

export type {
    BaseContent,
    LinkedInOutput,
    TwitterOutput,
    TikTokOutput,
    PodcastOutput,
    NewsletterOutput,
    YouTubeOutput,
    MultiFormatOutput,
    FormatType,
    GenerateOptions,
} from './multiFormatGenerator';

export {
    generateAllFormats,
    generateSingleFormat,
    FORMAT_DISPLAY_NAMES,
    FORMAT_ICONS,
} from './multiFormatGenerator';

// ============================================================================
// Newsletter Client
// ============================================================================

export type {
    NewsletterProvider,
    NewsletterConfig,
    NewsletterPost,
    SendResult,
    SubscriberInfo,
} from './newsletterClient';

export {
    sendNewsletter,
    getSubscriberCount,
    addSubscriber,
    validateCredentials as validateNewsletterCredentials,
} from './newsletterClient';

// ============================================================================
// Syndication Client
// ============================================================================

export type {
    SyndicationPlatform,
    SyndicationConfig,
    ArticlePayload,
    SyndicationResult,
} from './syndicationClient';

export {
    syndicateArticle,
    syndicateToMultiple,
    validateCredentials as validateSyndicationCredentials,
    PLATFORM_INFO,
} from './syndicationClient';
