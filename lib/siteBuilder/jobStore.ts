/**
 * Job Store - File-based persistence for site builder jobs
 * 
 * Saves job state to JSON files so jobs survive server restart
 * and continue even if browser closes.
 */

import { SiteBuilderJob } from './types';
import * as fs from 'fs';
import * as path from 'path';

const JOBS_DIR = path.join(process.cwd(), '.site-builder-jobs');

// Ensure jobs directory exists
function ensureJobsDir(): void {
    if (!fs.existsSync(JOBS_DIR)) {
        fs.mkdirSync(JOBS_DIR, { recursive: true });
    }
}

/**
 * Save a job to disk
 */
export function saveJob(job: SiteBuilderJob): void {
    ensureJobsDir();
    const filePath = path.join(JOBS_DIR, `${job.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(job, null, 2));
}

/**
 * Load a job from disk
 */
export function loadJob(jobId: string): SiteBuilderJob | null {
    const filePath = path.join(JOBS_DIR, `${jobId}.json`);

    if (!fs.existsSync(filePath)) {
        return null;
    }

    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data) as SiteBuilderJob;
    } catch (error) {
        console.error(`Failed to load job ${jobId}:`, error);
        return null;
    }
}

/**
 * Get the most recent active job
 */
export function getActiveJob(): SiteBuilderJob | null {
    ensureJobsDir();

    const files = fs.readdirSync(JOBS_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => {
            const filePath = path.join(JOBS_DIR, f);
            const stat = fs.statSync(filePath);
            return { file: f, mtime: stat.mtime.getTime() };
        })
        .sort((a, b) => b.mtime - a.mtime);

    for (const { file } of files) {
        const jobId = file.replace('.json', '');
        const job = loadJob(jobId);

        if (job && (job.status === 'running' || job.status === 'paused' || job.status === 'pending')) {
            return job;
        }
    }

    return null;
}

/**
 * List all jobs
 */
export function listJobs(): SiteBuilderJob[] {
    ensureJobsDir();

    const files = fs.readdirSync(JOBS_DIR).filter(f => f.endsWith('.json'));
    const jobs: SiteBuilderJob[] = [];

    for (const file of files) {
        const jobId = file.replace('.json', '');
        const job = loadJob(jobId);
        if (job) {
            jobs.push(job);
        }
    }

    return jobs.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Delete a job from disk
 */
export function deleteJob(jobId: string): boolean {
    const filePath = path.join(JOBS_DIR, `${jobId}.json`);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
    }

    return false;
}

/**
 * Generate a unique job ID
 */
export function generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
