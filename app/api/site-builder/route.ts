/**
 * Site Builder API
 * 
 * Endpoints for starting, monitoring, and controlling site building jobs.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    SiteBuilderJob,
    StartJobRequest
} from '@/lib/siteBuilder/types';
import {
    saveJob,
    loadJob,
    getActiveJob,
    generateJobId,
    listJobs
} from '@/lib/siteBuilder/jobStore';
import {
    runJob,
    stopJob,
    isJobRunning,
    getCurrentJobId,
    buildQueue
} from '@/lib/siteBuilder/processor';
import {
    runPreFlightChecks
} from '@/lib/siteBuilder/validators';

/**
 * POST /api/site-builder - Start a new site building job
 */
export async function POST(request: NextRequest) {
    try {
        const body: StartJobRequest = await request.json();
        const { config, providerKeys, githubConfig } = body;

        // ========================================
        // PHASE 1: PRE-FLIGHT CHECKS
        // ========================================

        // Run comprehensive pre-flight validation
        const preFlightReport = await runPreFlightChecks(
            {
                domain: config?.domain,
                siteName: config?.siteName,
                niche: config?.niche,
                pillars: config?.pillars,
                author: config?.author,
                clustersPerPillar: config?.clustersPerPillar
            },
            providerKeys as Record<string, string[]> || {},
            {
                token: githubConfig?.token,
                owner: githubConfig?.owner,
                repo: githubConfig?.repo,
                branch: githubConfig?.branch || 'main'
            }
        );

        // If pre-flight fails, return detailed errors
        if (!preFlightReport.overall) {
            const allErrors = [
                ...preFlightReport.config.errors,
                ...preFlightReport.providers.errors,
                ...preFlightReport.github.errors
            ];

            return NextResponse.json({
                success: false,
                error: 'Pre-flight checks failed',
                preFlightReport,
                errors: allErrors,
                summary: preFlightReport.summary
            }, { status: 400 });
        }

        // Check if there's already an active job
        const activeJob = getActiveJob();
        if (activeJob && (activeJob.status === 'running' || activeJob.status === 'pending')) {
            return NextResponse.json({
                success: false,
                error: 'A job is already running',
                jobId: activeJob.id
            }, { status: 409 });
        }

        // Build the content queue
        const queue = buildQueue(config);

        // Create new job
        const job: SiteBuilderJob = {
            id: generateJobId(),
            status: 'pending',
            config,
            providerKeys,
            githubConfig,

            progress: {
                total: queue.length,
                completed: 0,
                failed: 0,
                retrying: 0,
                published: 0,
                pending: queue.length,
                processing: 0
            },

            queue,
            completedItems: [],
            errors: [],

            createdAt: Date.now(),
            updatedAt: Date.now(),

            providerUsage: {}
        };

        // Save job
        saveJob(job);

        // Start processing in background
        job.status = 'running';
        job.startedAt = Date.now();
        saveJob(job);

        // Run job (non-blocking)
        setImmediate(() => {
            runJob(job.id).catch(err => {
                console.error('[SiteBuilder API] Job failed:', err);
            });
        });

        return NextResponse.json({
            success: true,
            jobId: job.id,
            message: 'Site building job started',
            totalItems: queue.length,
            estimatedMinutes: Math.ceil(queue.length * 1.5) // ~1.5 min per item
        });

    } catch (error) {
        console.error('[SiteBuilder API] Start error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to start job'
        }, { status: 500 });
    }
}

/**
 * GET /api/site-builder - Get job status
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('jobId');

        let job: SiteBuilderJob | null = null;

        if (jobId) {
            job = loadJob(jobId);
        } else {
            // Get the most recent active job
            job = getActiveJob();

            // If no active job, get the most recent completed one
            if (!job) {
                const allJobs = listJobs();
                job = allJobs[0] || null;
            }
        }

        if (!job) {
            return NextResponse.json({
                success: true,
                hasJob: false,
                isRunning: false,
                job: null
            });
        }

        // Get summary without full content
        const summary = {
            id: job.id,
            status: job.status,
            config: {
                domain: job.config.domain,
                siteName: job.config.siteName,
                niche: job.config.niche,
                totalPillars: job.config.pillars.length,
                clustersPerPillar: job.config.clustersPerPillar
            },
            progress: job.progress,
            currentProvider: job.currentProvider,
            currentItem: job.queue.find(i => i.id === job.currentItem)?.topic,

            queueSummary: job.queue.map(item => ({
                id: item.id,
                type: item.type,
                topic: item.topic,
                status: item.status,
                retries: item.retries,
                published: item.published
            })),

            completedItems: job.completedItems.map(item => ({
                topic: item.topic,
                type: item.type,
                articleUrl: item.articleUrl,
                provider: item.provider
            })),

            recentErrors: job.errors.slice(-5).map(err => ({
                topic: err.topic,
                error: err.error,
                willRetry: err.willRetry,
                timestamp: err.timestamp
            })),

            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
            startedAt: job.startedAt,
            completedAt: job.completedAt
        };

        return NextResponse.json({
            success: true,
            hasJob: true,
            isRunning: isJobRunning() && getCurrentJobId() === job.id,
            job: summary
        });

    } catch (error) {
        console.error('[SiteBuilder API] Status error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get status'
        }, { status: 500 });
    }
}

/**
 * DELETE /api/site-builder - Stop or cancel a job
 */
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('jobId');
        const action = searchParams.get('action') || 'pause'; // 'pause' or 'cancel'

        let job: SiteBuilderJob | null = null;

        if (jobId) {
            job = loadJob(jobId);
        } else {
            job = getActiveJob();
        }

        if (!job) {
            return NextResponse.json({
                success: false,
                error: 'No active job found'
            }, { status: 404 });
        }

        // Stop the processor
        stopJob();

        // Update job status
        job.status = action === 'cancel' ? 'cancelled' : 'paused';
        job.updatedAt = Date.now();
        saveJob(job);

        return NextResponse.json({
            success: true,
            message: action === 'cancel' ? 'Job cancelled' : 'Job paused',
            jobId: job.id,
            progress: job.progress
        });

    } catch (error) {
        console.error('[SiteBuilder API] Stop error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to stop job'
        }, { status: 500 });
    }
}

/**
 * PATCH /api/site-builder - Resume a paused job
 */
export async function PATCH(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('jobId');

        let job: SiteBuilderJob | null = null;

        if (jobId) {
            job = loadJob(jobId);
        } else {
            // Find a paused job
            const allJobs = listJobs();
            job = allJobs.find(j => j.status === 'paused') || null;
        }

        if (!job) {
            return NextResponse.json({
                success: false,
                error: 'No paused job found'
            }, { status: 404 });
        }

        if (job.status !== 'paused') {
            return NextResponse.json({
                success: false,
                error: `Cannot resume job with status: ${job.status}`
            }, { status: 400 });
        }

        // Check if processor is already running
        if (isJobRunning()) {
            return NextResponse.json({
                success: false,
                error: 'Another job is already running'
            }, { status: 409 });
        }

        // Resume job
        job.status = 'running';
        job.updatedAt = Date.now();
        saveJob(job);

        // Run job (non-blocking)
        setImmediate(() => {
            runJob(job!.id).catch(err => {
                console.error('[SiteBuilder API] Resume failed:', err);
            });
        });

        return NextResponse.json({
            success: true,
            message: 'Job resumed',
            jobId: job.id,
            progress: job.progress
        });

    } catch (error) {
        console.error('[SiteBuilder API] Resume error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to resume job'
        }, { status: 500 });
    }
}
