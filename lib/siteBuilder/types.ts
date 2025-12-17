/**
 * Site Builder Types
 * 
 * Core type definitions for the automated site building system.
 */

export type ContentType =
    | 'about' | 'author' | 'homepage' | 'pillar' | 'cluster'
    | 'privacy' | 'terms' | 'contact' | 'disclaimer'
    // New content strategy types
    | 'tofu' | 'tactical' | 'seasonal' | 'editorial_policy';

export type ItemStatus = 'pending' | 'processing' | 'complete' | 'failed' | 'scheduled';
export type JobStatus = 'pending' | 'running' | 'paused' | 'complete' | 'failed' | 'cancelled';
export type AIProvider = 'gemini' | 'deepseek' | 'openrouter' | 'vercel' | 'perplexity';

export interface ProviderKeys {
    gemini?: string[];
    deepseek?: string[];
    openrouter?: string[];
    vercel?: string[];
    perplexity?: string[];
}

export interface ContentStrategyConfig {
    tofuPercentage: number;      // Default: 40
    tacticalPercentage: number;  // Default: 40
    seasonalPercentage: number;  // Default: 20
    enableAIOverviewOptimization: boolean;
    enableEEATPages: boolean;
}

export interface SiteConfig {
    domain: string;
    siteName: string;
    siteTagline: string;
    niche: string;
    targetAudience: string;
    template?: 'niche-authority' | 'topical-magazine' | 'expert-hub';
    author: {
        name: string;
        role: string;
        experience: string;
        credentials?: string[];
        bio?: string;
    };
    pillars: string[];           // Pillar article topics
    clustersPerPillar: number;   // How many clusters per pillar
    includeAbout: boolean;
    includeEssentialPages?: boolean;  // Privacy, Terms, Contact
    includeHomepage: boolean;
    // New Authority Engine options
    contentStrategy?: ContentStrategyConfig;
}

export interface GitHubConfig {
    token: string;
    owner: string;
    repo: string;
    branch: string;
}

export interface ContentQueueItem {
    id: string;
    type: ContentType;
    topic: string;
    keywords: string[];
    parentPillar?: string;
    status: ItemStatus;
    retries: number;
    maxRetries: number;
    lastError?: string;
    provider?: AIProvider;
    scheduledAt?: number;        // Timestamp for rate limit delay
    completedAt?: number;
    articleSlug?: string;        // Slug after content saved
    content?: string;            // Generated content (cleared after publish)
    published: boolean;
}

export interface CompletedItem {
    id: string;
    type: ContentType;
    topic: string;
    articleSlug: string;
    provider: AIProvider;
    contentLength: number;
    generatedAt: number;
    publishedAt?: number;
    articleUrl?: string;
    commitUrl?: string;
}

export interface ErrorLogItem {
    id: string;
    itemId: string;
    topic: string;
    error: string;
    provider?: AIProvider;
    timestamp: number;
    willRetry: boolean;
    retryAt?: number;
}

export interface JobProgress {
    total: number;
    completed: number;
    failed: number;
    retrying: number;
    published: number;
    pending: number;
    processing: number;
}

export interface SiteBuilderJob {
    id: string;
    status: JobStatus;
    config: SiteConfig;
    providerKeys: ProviderKeys;
    githubConfig: GitHubConfig;

    progress: JobProgress;
    queue: ContentQueueItem[];
    completedItems: CompletedItem[];
    errors: ErrorLogItem[];

    currentProvider?: AIProvider;
    currentItem?: string;        // ID of item being processed

    createdAt: number;
    updatedAt: number;
    startedAt?: number;
    completedAt?: number;
    estimatedCompletion?: number;

    // Rate limit tracking
    providerUsage: {
        [key in AIProvider]?: {
            requestsThisMinute: number;
            lastRequestAt: number;
            dailyRequests: number;
            cooldownUntil?: number;
        };
    };
}

export interface StartJobRequest {
    config: SiteConfig;
    providerKeys: ProviderKeys;
    githubConfig: GitHubConfig;
}

export interface JobStatusResponse {
    job: SiteBuilderJob | null;
    isRunning: boolean;
    canResume: boolean;
}

// Rate limits per provider
export const RATE_LIMITS: { [key in AIProvider]: { rpm: number; cooldownMs: number; dailyLimit: number | 'unlimited' } } = {
    perplexity: { rpm: 20, cooldownMs: 3000, dailyLimit: 'unlimited' },
    gemini: { rpm: 15, cooldownMs: 4000, dailyLimit: 1500 },
    deepseek: { rpm: 60, cooldownMs: 1000, dailyLimit: 'unlimited' },
    openrouter: { rpm: 20, cooldownMs: 3000, dailyLimit: 50 },
    vercel: { rpm: 10, cooldownMs: 6000, dailyLimit: 100 }
};

// Provider priority order
export const PROVIDER_PRIORITY: AIProvider[] = ['perplexity', 'gemini', 'deepseek', 'openrouter', 'vercel'];

// Retry delays in milliseconds
export const RETRY_DELAYS = [30000, 60000, 120000]; // 30s, 60s, 2min
