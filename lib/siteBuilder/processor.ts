/**
 * Site Builder Processor
 * 
 * Core engine that processes site building jobs:
 * - Rate limit aware provider rotation
 * - Automatic retry with exponential backoff
 * - Content generation and publishing
 * - Progress tracking
 * - Content quality validation
 * - Deployment verification
 */

import {
    SiteBuilderJob,
    ContentQueueItem,
    CompletedItem,
    ErrorLogItem,
    AIProvider,
    ContentType,
    RATE_LIMITS,
    PROVIDER_PRIORITY,
    RETRY_DELAYS,
    SiteConfig
} from './types';
import { saveJob, loadJob } from './jobStore';
import { validateContent, getContentType } from './contentValidator';
import { verifyGitHubPublish, checkPageDeployment } from './deploymentChecker';
import { siteBuilderLogger } from '@/lib/utils/logger';
import {
    generatePrivacyPage,
    generateTermsPage,
    generateContactPage,
    SiteInfo
} from '@/lib/essentialPages';
import { fetchCoverImage, hasStockPhotoApi } from '@/lib/images/stockPhotos';
import { getArticleImagesDir, ensureArticleImageDirs } from '@/lib/websiteStore';
import * as fs from 'fs';
import * as path from 'path';

// Global processor state
let isProcessing = false;
let currentJobId: string | null = null;
let shouldStop = false;

/**
 * Check if a provider is available (not rate limited)
 */
function isProviderAvailable(job: SiteBuilderJob, provider: AIProvider): boolean {
    const keys = job.providerKeys[provider];
    if (!keys || keys.length === 0) return false;

    const usage = job.providerUsage[provider];
    if (!usage) return true;

    const now = Date.now();

    // Check cooldown
    if (usage.cooldownUntil && usage.cooldownUntil > now) {
        return false;
    }

    // Check RPM
    const oneMinuteAgo = now - 60000;
    if (usage.lastRequestAt > oneMinuteAgo && usage.requestsThisMinute >= RATE_LIMITS[provider].rpm) {
        return false;
    }

    // Check daily limit
    const dailyLimit = RATE_LIMITS[provider].dailyLimit;
    if (dailyLimit !== 'unlimited' && usage.dailyRequests >= dailyLimit) {
        return false;
    }

    return true;
}

/**
 * Get the next available provider in priority order
 */
function getNextProvider(job: SiteBuilderJob): AIProvider | null {
    for (const provider of PROVIDER_PRIORITY) {
        if (isProviderAvailable(job, provider)) {
            return provider;
        }
    }
    return null;
}

/**
 * Get delay until a provider becomes available
 */
function getProviderDelay(job: SiteBuilderJob): number {
    let minDelay = Infinity;
    const now = Date.now();

    for (const provider of PROVIDER_PRIORITY) {
        const keys = job.providerKeys[provider];
        if (!keys || keys.length === 0) continue;

        const usage = job.providerUsage[provider];
        if (!usage) return 0;

        if (usage.cooldownUntil && usage.cooldownUntil > now) {
            minDelay = Math.min(minDelay, usage.cooldownUntil - now);
        } else {
            const cooldown = RATE_LIMITS[provider].cooldownMs;
            const timeSinceLastRequest = now - (usage.lastRequestAt || 0);
            if (timeSinceLastRequest < cooldown) {
                minDelay = Math.min(minDelay, cooldown - timeSinceLastRequest);
            } else {
                return 0;
            }
        }
    }

    return minDelay === Infinity ? 5000 : minDelay;
}

/**
 * Update provider usage after a request
 */
function updateProviderUsage(job: SiteBuilderJob, provider: AIProvider, isRateLimit: boolean = false): void {
    if (!job.providerUsage[provider]) {
        job.providerUsage[provider] = {
            requestsThisMinute: 0,
            lastRequestAt: 0,
            dailyRequests: 0
        };
    }

    const usage = job.providerUsage[provider]!;
    const now = Date.now();

    // Reset minute counter if needed
    if (now - usage.lastRequestAt > 60000) {
        usage.requestsThisMinute = 0;
    }

    usage.requestsThisMinute++;
    usage.lastRequestAt = now;
    usage.dailyRequests++;

    if (isRateLimit) {
        // Add cooldown
        usage.cooldownUntil = now + 60000; // 1 minute cooldown
    }
}

/**
 * Generate content for a queue item
 */
async function generateContent(
    job: SiteBuilderJob,
    item: ContentQueueItem,
    provider: AIProvider
): Promise<{ success: boolean; content?: string; error?: string }> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Use lib/essentialPages templates for legal pages (no AI needed)
    if (item.type === 'privacy' || item.type === 'terms' || item.type === 'contact') {
        try {
            const siteInfo: SiteInfo = {
                siteName: job.config.siteName || 'Our Website',
                domain: job.githubConfig?.repo?.replace(/-/g, '.') || 'example.com',
                niche: job.config.niche || 'General',
                siteTagline: job.config.siteTagline,
                email: `contact@${job.githubConfig?.repo?.replace(/-/g, '.') || 'example.com'}`,
                author: job.config.author ? {
                    name: job.config.author.name,
                    role: job.config.author.role,
                    experience: job.config.author.experience,
                    bio: job.config.author.bio || `Expert in ${job.config.niche || 'this field'}`
                } : { name: 'Editorial Team', role: 'Content Team', experience: '5+ years', bio: 'Our team of experts brings years of experience to every article.' }
            };

            let content: string;
            switch (item.type) {
                case 'privacy':
                    content = generatePrivacyPage(siteInfo);
                    break;
                case 'terms':
                    content = generateTermsPage(siteInfo);
                    break;
                case 'contact':
                    content = generateContactPage(siteInfo);
                    break;
                default:
                    content = '';
            }

            siteBuilderLogger.info(`Generated ${item.type} page using template`);
            return { success: true, content };
        } catch (error) {
            siteBuilderLogger.warn(`Template generation failed for ${item.type}, falling back to AI`);
            // Fall through to AI generation
        }
    }

    try {
        const response = await fetch(`${baseUrl}/api/generate-site-content`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                providerKeys: { [provider]: job.providerKeys[provider] },
                contentType: item.type,
                topic: item.topic,
                keywords: item.keywords,
                parentPillar: item.parentPillar,
                siteContext: {
                    siteName: job.config.siteName,
                    siteTagline: job.config.siteTagline,
                    niche: job.config.niche,
                    targetAudience: job.config.targetAudience,
                    author: job.config.author
                }
            })
        });

        const data = await response.json();

        if (data.success) {
            return { success: true, content: typeof data.content === 'string' ? data.content : JSON.stringify(data.content) };
        } else {
            return { success: false, error: data.error || 'Generation failed' };
        }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
}

/**
 * Save content to file
 */
function saveContent(job: SiteBuilderJob, item: ContentQueueItem, content: string): string {
    const slug = generateSlug(item.topic);
    const contentDir = path.join(process.cwd(), 'content');

    if (!fs.existsSync(contentDir)) {
        fs.mkdirSync(contentDir, { recursive: true });
    }

    // Create frontmatter
    const frontmatter = `---
title: "${item.topic}"
description: "${generateDescription(item)}"
date: "${new Date().toISOString().split('T')[0]}"
author: "${job.config.author.name}"
category: "${getCategoryFromType(item.type, item.parentPillar)}"
---

`;

    const filePath = path.join(contentDir, `${slug}.md`);
    fs.writeFileSync(filePath, frontmatter + content);

    return slug;
}

/**
 * Publish content to GitHub
 */
async function publishContent(
    job: SiteBuilderJob,
    item: ContentQueueItem
): Promise<{ success: boolean; articleUrl?: string; commitUrl?: string; error?: string }> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    try {
        const response = await fetch(`${baseUrl}/api/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                articleSlug: item.articleSlug,
                domain: job.config.domain,
                githubToken: job.githubConfig.token,
                repoOwner: job.githubConfig.owner,
                repoName: job.githubConfig.repo,
                branch: job.githubConfig.branch || 'main'
            })
        });

        const data = await response.json();

        if (data.success) {
            return { success: true, articleUrl: data.articleUrl, commitUrl: data.commitUrl };
        } else {
            return { success: false, error: data.error || 'Publish failed' };
        }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
}

/**
 * Process a single queue item
 */
async function processItem(job: SiteBuilderJob, item: ContentQueueItem): Promise<void> {
    const provider = getNextProvider(job);

    if (!provider) {
        // All providers rate limited, schedule retry
        const delay = getProviderDelay(job);
        item.scheduledAt = Date.now() + delay;
        item.status = 'scheduled';
        saveJob(job);
        return;
    }

    item.status = 'processing';
    item.provider = provider;
    job.currentProvider = provider;
    job.currentItem = item.id;
    job.progress.processing = 1;
    job.progress.pending = job.queue.filter(i => i.status === 'pending' || i.status === 'scheduled').length;
    saveJob(job);

    // Generate content
    const result = await generateContent(job, item, provider);
    updateProviderUsage(job, provider, !result.success && result.error?.includes('rate'));

    if (result.success && result.content) {
        // ========================================
        // CONTENT QUALITY VALIDATION
        // ========================================
        const contentType = getContentType(item.type);
        const validation = validateContent(result.content, contentType);

        siteBuilderLogger.debug(`Content validation for "${item.topic}": score=${validation.score}, valid=${validation.valid}`);

        // If content has errors (not just warnings), treat as generation failure
        if (!validation.valid) {
            const errorMessages = validation.issues
                .filter(i => i.type === 'error')
                .map(i => i.message)
                .join('; ');

            siteBuilderLogger.warn(`Content validation failed: ${errorMessages}`);

            // Treat as generation failure - will retry
            item.retries++;
            if (item.retries >= item.maxRetries) {
                item.status = 'failed';
                item.lastError = `Content quality failed: ${errorMessages}`;
                job.progress.failed++;

                job.errors.push({
                    id: `err_${Date.now()}`,
                    itemId: item.id,
                    topic: item.topic,
                    error: `Content quality failed: ${errorMessages}`,
                    provider,
                    timestamp: Date.now(),
                    willRetry: false
                });
            } else {
                const retryDelay = RETRY_DELAYS[item.retries - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
                item.status = 'scheduled';
                item.scheduledAt = Date.now() + retryDelay;
                item.lastError = `Content quality failed, regenerating`;
                job.progress.retrying++;

                job.errors.push({
                    id: `err_${Date.now()}`,
                    itemId: item.id,
                    topic: item.topic,
                    error: `Content quality failed: ${errorMessages}`,
                    provider,
                    timestamp: Date.now(),
                    willRetry: true,
                    retryAt: item.scheduledAt
                });
            }

            job.currentItem = undefined;
            job.progress.processing = 0;
            job.updatedAt = Date.now();
            saveJob(job);
            return;
        }

        // Log warnings but continue
        if (validation.issues.filter(i => i.type === 'warning').length > 0) {
            const warnings = validation.issues
                .filter(i => i.type === 'warning')
                .map(i => i.message);
            siteBuilderLogger.debug(`Content warnings: ${warnings.join('; ')}`);
        }

        // Save content to file
        const slug = saveContent(job, item, result.content);
        item.articleSlug = slug;

        // ========================================
        // AUTO-FETCH COVER IMAGE
        // ========================================
        if (hasStockPhotoApi() && item.type !== 'privacy' && item.type !== 'terms' && item.type !== 'contact') {
            try {
                const domain = job.githubConfig?.repo || 'default';
                const imagesDir = path.join(process.cwd(), 'websites', domain, 'content', 'images');
                ensureArticleImageDirs(domain, slug);

                const coverImage = await fetchCoverImage(item.topic, slug, imagesDir);
                if (coverImage) {
                    siteBuilderLogger.info(`Fetched cover image for ${slug}`);
                    // TODO: Update article with coverImage data
                }
            } catch (imgError) {
                siteBuilderLogger.warn(`Cover image fetch failed for ${slug}: ${imgError}`);
                // Continue without image - not critical
            }
        }

        // Publish to GitHub
        const publishResult = await publishContent(job, item);

        if (publishResult.success) {
            // ========================================
            // DEPLOYMENT VERIFICATION
            // ========================================
            // Verify the file was actually created in GitHub
            const verifyResult = await verifyGitHubPublish(
                job.githubConfig.owner,
                job.githubConfig.repo,
                `content/posts/${slug}.md`,
                job.githubConfig.token
            );

            if (!verifyResult.success) {
                siteBuilderLogger.warn(`GitHub verification warning: ${verifyResult.error}`);
                // Continue anyway, the API said success
            }

            // Success!
            item.status = 'complete';
            item.completedAt = Date.now();
            item.published = true;

            const completedItem: CompletedItem = {
                id: item.id,
                type: item.type,
                topic: item.topic,
                articleSlug: slug,
                provider: provider,
                contentLength: result.content.length,
                generatedAt: Date.now(),
                publishedAt: Date.now(),
                articleUrl: publishResult.articleUrl,
                commitUrl: publishResult.commitUrl
            };

            job.completedItems.push(completedItem);
            job.progress.completed++;
            job.progress.published++;
        } else {
            // Generated but publish failed
            item.status = 'complete';
            item.completedAt = Date.now();
            item.published = false;
            item.lastError = publishResult.error;

            job.completedItems.push({
                id: item.id,
                type: item.type,
                topic: item.topic,
                articleSlug: slug,
                provider: provider,
                contentLength: result.content.length,
                generatedAt: Date.now()
            });

            job.progress.completed++;

            // Log error
            job.errors.push({
                id: `err_${Date.now()}`,
                itemId: item.id,
                topic: item.topic,
                error: `Publish failed: ${publishResult.error}`,
                provider,
                timestamp: Date.now(),
                willRetry: false
            });
        }
    } else {
        // Generation failed
        item.retries++;

        if (item.retries >= item.maxRetries) {
            item.status = 'failed';
            item.lastError = result.error;
            job.progress.failed++;

            job.errors.push({
                id: `err_${Date.now()}`,
                itemId: item.id,
                topic: item.topic,
                error: result.error || 'Unknown error',
                provider,
                timestamp: Date.now(),
                willRetry: false
            });
        } else {
            // Schedule retry
            const retryDelay = RETRY_DELAYS[item.retries - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
            item.status = 'scheduled';
            item.scheduledAt = Date.now() + retryDelay;
            item.lastError = result.error;
            job.progress.retrying++;

            job.errors.push({
                id: `err_${Date.now()}`,
                itemId: item.id,
                topic: item.topic,
                error: result.error || 'Unknown error',
                provider,
                timestamp: Date.now(),
                willRetry: true,
                retryAt: item.scheduledAt
            });
        }
    }

    job.currentItem = undefined;
    job.progress.processing = 0;
    job.updatedAt = Date.now();
    saveJob(job);
}

/**
 * Main job processing loop
 */
export async function runJob(jobId: string): Promise<void> {
    if (isProcessing) {
        siteBuilderLogger.debug('Already processing a job');
        return;
    }

    isProcessing = true;
    currentJobId = jobId;
    shouldStop = false;

    siteBuilderLogger.info(`Starting job ${jobId}`);

    try {
        while (!shouldStop) {
            const job = loadJob(jobId);
            if (!job) {
                siteBuilderLogger.warn('Job not found');
                break;
            }

            if (job.status === 'cancelled' || job.status === 'paused') {
                siteBuilderLogger.info(`Job ${job.status}`);
                break;
            }

            // Find next item to process
            const now = Date.now();
            const nextItem = job.queue.find(item =>
                item.status === 'pending' ||
                (item.status === 'scheduled' && (!item.scheduledAt || item.scheduledAt <= now))
            );

            if (!nextItem) {
                // Check if all items are done
                const allDone = job.queue.every(i => i.status === 'complete' || i.status === 'failed');

                if (allDone) {
                    job.status = 'complete';
                    job.completedAt = Date.now();
                    saveJob(job);
                    siteBuilderLogger.success('Job complete!');
                    break;
                }

                // Some items are scheduled, wait
                const delay = getProviderDelay(job);
                siteBuilderLogger.debug(`Waiting ${delay}ms for rate limits...`);
                await sleep(Math.min(delay, 5000));
                continue;
            }

            // Process the item
            await processItem(job, nextItem);

            // Small delay between items
            await sleep(1000);
        }
    } catch (error) {
        siteBuilderLogger.error('Job error:', error instanceof Error ? error : undefined);
        const job = loadJob(jobId);
        if (job) {
            job.status = 'failed';
            job.errors.push({
                id: `err_${Date.now()}`,
                itemId: 'job',
                topic: 'Job Processing',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: Date.now(),
                willRetry: false
            });
            saveJob(job);
        }
    } finally {
        isProcessing = false;
        currentJobId = null;
    }
}

/**
 * Stop the current job
 */
export function stopJob(): void {
    shouldStop = true;
}

/**
 * Check if processor is running
 */
export function isJobRunning(): boolean {
    return isProcessing;
}

/**
 * Get current job ID
 */
export function getCurrentJobId(): string | null {
    return currentJobId;
}

// Helper functions
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function generateSlug(topic: string): string {
    return topic
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 60);
}

function generateDescription(item: ContentQueueItem): string {
    const keywords = item.keywords.slice(0, 3).join(', ');
    return `Expert guide on ${item.topic}. Covers ${keywords} for budget-conscious shoppers.`.substring(0, 160);
}

function getCategoryFromType(type: ContentType, parentPillar?: string): string {
    if (type === 'about') return 'About';
    if (type === 'homepage') return 'Home';
    if (parentPillar) {
        if (parentPillar.toLowerCase().includes('smartphone')) return 'Smartphones';
        if (parentPillar.toLowerCase().includes('earbuds') || parentPillar.toLowerCase().includes('audio')) return 'Audio';
        if (parentPillar.toLowerCase().includes('smart home')) return 'Smart Home';
        if (parentPillar.toLowerCase().includes('gaming')) return 'Gaming';
    }
    return 'Tech';
}

/**
 * Build initial queue from config
 */
export function buildQueue(config: SiteConfig): ContentQueueItem[] {
    const queue: ContentQueueItem[] = [];
    let idCounter = 1;

    // About page first (highest priority)
    if (config.includeAbout) {
        queue.push({
            id: `item_${idCounter++}`,
            type: 'about',
            topic: `About ${config.siteName}`,
            keywords: [config.niche, 'about us', 'our mission'],
            status: 'pending',
            retries: 0,
            maxRetries: 3,
            published: false
        });
    }

    // Essential pages (Privacy, Terms, Contact)
    if (config.includeEssentialPages) {
        queue.push({
            id: `item_${idCounter++}`,
            type: 'privacy',
            topic: `Privacy Policy - ${config.siteName}`,
            keywords: ['privacy policy', 'data protection', 'cookies'],
            status: 'pending',
            retries: 0,
            maxRetries: 3,
            published: false
        });

        queue.push({
            id: `item_${idCounter++}`,
            type: 'terms',
            topic: `Terms of Service - ${config.siteName}`,
            keywords: ['terms of service', 'user agreement', 'legal'],
            status: 'pending',
            retries: 0,
            maxRetries: 3,
            published: false
        });

        queue.push({
            id: `item_${idCounter++}`,
            type: 'contact',
            topic: `Contact Us - ${config.siteName}`,
            keywords: ['contact', 'get in touch', 'support'],
            status: 'pending',
            retries: 0,
            maxRetries: 3,
            published: false
        });
    }

    // Pillars (high priority)
    for (const pillarTopic of config.pillars) {
        queue.push({
            id: `item_${idCounter++}`,
            type: 'pillar',
            topic: pillarTopic,
            keywords: extractKeywords(pillarTopic, config.niche),
            status: 'pending',
            retries: 0,
            maxRetries: 3,
            published: false
        });
    }

    // Clusters for each pillar
    for (const pillarTopic of config.pillars) {
        const clusterTopics = generateClusterTopics(pillarTopic, config.clustersPerPillar);
        for (const clusterTopic of clusterTopics) {
            queue.push({
                id: `item_${idCounter++}`,
                type: 'cluster',
                topic: clusterTopic,
                keywords: extractKeywords(clusterTopic, config.niche),
                parentPillar: pillarTopic,
                status: 'pending',
                retries: 0,
                maxRetries: 3,
                published: false
            });
        }
    }

    return queue;
}

function extractKeywords(topic: string, niche: string): string[] {
    const words = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    return [...new Set([...words.slice(0, 3), niche.split(' ')[0].toLowerCase()])];
}

function generateClusterTopics(pillarTopic: string, count: number): string[] {
    // Generate cluster topics based on pillar
    const clusters: string[] = [];

    if (pillarTopic.toLowerCase().includes('smartphone')) {
        clusters.push(
            'Xiaomi Budget Phones vs Samsung 2025',
            'Best Phone Features Under 299 SAR',
            'How to Choose a Budget Smartphone',
            'Phone Camera Comparison Under 299'
        );
    } else if (pillarTopic.toLowerCase().includes('earbuds') || pillarTopic.toLowerCase().includes('audio')) {
        clusters.push(
            'AirPods Alternatives That Sound Great',
            'Best Gaming Earbuds Under 299 SAR',
            'Earbuds for Workout and Sports',
            'Noise Cancelling Under 299 SAR'
        );
    } else if (pillarTopic.toLowerCase().includes('smart home')) {
        clusters.push(
            'Best Smart Plugs Under 299 SAR',
            'Budget Security Cameras for Home',
            'LED Smart Lights Comparison',
            'Voice Assistants Worth Buying'
        );
    } else if (pillarTopic.toLowerCase().includes('gaming')) {
        clusters.push(
            'Best Gaming Mice Under 299 SAR',
            'Mechanical Keyboards on Budget',
            'Gaming Headsets Comparison',
            'Controllers and Gamepads Review'
        );
    } else {
        // Generic clusters
        for (let i = 1; i <= count; i++) {
            clusters.push(`${pillarTopic} - Part ${i}`);
        }
    }

    return clusters.slice(0, count);
}
