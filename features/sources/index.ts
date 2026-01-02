/**
 * Sources Feature - Barrel Export
 * FSD: features/sources/index.ts
 * 
 * Central export for all content source utilities.
 */

// Scraper Engine
export {
    scrapeUrl,
    extractContent,
    htmlToMarkdown,
    type ScrapeResult,
    type ScrapeOptions,
    type ExtractedContent,
} from './lib/scraperEngine';

// Scraper Templates
export {
    getTemplate,
    listTemplates,
    createCustomTemplate,
    type ScraperTemplate,
    type TemplateField,
} from './lib/scraperTemplates';

// Competitor Analyzer
export {
    analyzeCompetitor,
    extractArticleLinks,
    generateInspiredTopics,
    type CompetitorAnalysis,
    type ArticleLink,
} from './lib/competitorMirror';

// YouTube API
export {
    searchVideos,
    getVideoDetails,
    getChannelVideos,
    getChannelInfo,
    getVideoTranscript,
    extractVideoId,
    getBestThumbnail,
    formatDuration,
    parseDuration,
    setYouTubeApiKey,
    getYouTubeApiKey,
    isYouTubeConfigured,
    type YouTubeVideo,
    type YouTubeChannel,
    type YouTubeSearchResult,
    type TranscriptResult,
} from './lib/youtubeApi';

// Video Source Helper
export {
    fetchVideoSource,
    getVideoSourceItem,
    generateVideoContext,
    createVideoArticlePrompt,
    type VideoSourceItem,
    type VideoSourceConfig,
    type VideoSourceResult,
} from './lib/videoSource';

// Twitter API
export {
    searchTweets,
    searchHashtag,
    getTweetUrl,
    calculateEngagement,
    extractHashtags,
    setTwitterBearerToken,
    getTwitterBearerToken,
    isTwitterConfigured,
    type Tweet,
    type TwitterTrend,
    type TwitterSearchResult,
} from './lib/twitterApi';

// Reddit API
export {
    getSubredditPosts,
    searchReddit,
    getSubredditInfo,
    getBestImageUrl,
    calculateRedditEngagement,
    getPostAgeHours,
    setRedditCredentials,
    getRedditCredentials,
    isRedditConfigured,
    type RedditPost,
    type RedditSearchResult,
    type SubredditInfo,
} from './lib/redditApi';

// Social Source Helper
export {
    fetchSocialSource,
    generateSocialContext,
    createSocialArticlePrompt,
    sortByEngagement,
    filterHighEngagement,
    type SocialPlatform,
    type SocialSourceItem,
    type SocialSourceConfig,
    type SocialSourceResult,
} from './lib/socialSource';

// Amazon API
export {
    searchAmazonProducts,
    getAmazonProductByAsin,
    generateAffiliateLink,
    getBestProductImage,
    formatPrice,
    setAmazonCredentials,
    getAmazonCredentials,
    isAmazonConfigured,
    type AmazonProduct,
    type AmazonSearchResult,
    type AmazonCredentials,
} from './lib/amazonApi';

// eBay API
export {
    searchEbayProducts,
    getEbayProductById,
    generateEbayAffiliateLink,
    getBestEbayImage,
    formatEbayPrice,
    isAuction,
    setEbayCredentials,
    getEbayCredentials,
    isEbayConfigured,
    type EbayProduct,
    type EbaySearchResult,
    type EbayCredentials,
} from './lib/ebayApi';

// Facebook API
export {
    getPagePosts,
    getPageInfo,
    searchPages,
    calculateFacebookEngagement,
    getFacebookPostImage,
    getFacebookPostText,
    getPostAge,
    setFacebookCredentials,
    getFacebookCredentials,
    isFacebookConfigured,
    type FacebookPost,
    type FacebookPage,
    type FacebookCredentials,
    type FacebookPostResult,
} from './lib/facebookApi';

// Instagram API
export {
    getOwnMedia,
    getUserProfile,
    getBusinessMedia,
    getBusinessProfile,
    searchHashtag as searchInstagramHashtag,
    calculateInstagramEngagement,
    getInstagramMediaUrl,
    extractInstagramHashtags,
    getCarouselImages,
    setInstagramCredentials,
    getInstagramCredentials,
    isInstagramConfigured,
    type InstagramMedia,
    type InstagramUser,
    type InstagramCredentials,
    type InstagramMediaResult,
} from './lib/instagramApi';

// Pinterest API
export {
    getUserPins,
    getPin,
    getUserBoards,
    getBoardPins,
    searchPins,
    getUserAccount,
    getPinImageUrl,
    getPinText,
    hasExternalLink,
    getBoardUrl,
    getPinUrl,
    setPinterestCredentials,
    getPinterestCredentials,
    isPinterestConfigured,
    type PinterestPin,
    type PinterestBoard,
    type PinterestUser,
    type PinterestCredentials,
    type PinterestPinResult,
} from './lib/pinterestApi';
