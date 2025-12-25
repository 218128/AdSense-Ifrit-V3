/**
 * Legacy Migration Functions
 * 
 * Migrate data from old storage systems to the new websiteStore format
 */

import * as fs from 'fs';
import * as path from 'path';

import type { Website } from './types';

// Forward declarations for circular dependency resolution
let _getWebsite: (domain: string) => Website | null;
let _saveWebsite: (website: Website) => void;

/**
 * Initialize dependencies from main websiteStore
 */
export function _initMigrationDeps(deps: {
    getWebsite: typeof _getWebsite;
    saveWebsite: typeof _saveWebsite;
}) {
    _getWebsite = deps.getWebsite;
    _saveWebsite = deps.saveWebsite;
}

// ============================================
// MIGRATION
// ============================================

/**
 * Migrate from old storage systems
 */
export function migrateFromLegacy(): { migrated: string[]; errors: string[] } {
    const migrated: string[] = [];
    const errors: string[] = [];

    // 1. Check for templates folder
    const templatesDir = path.join(process.cwd(), 'templates');
    if (fs.existsSync(templatesDir)) {
        const templateFolders = fs.readdirSync(templatesDir, { withFileTypes: true })
            .filter(d => d.isDirectory());

        for (const folder of templateFolders) {
            const configPath = path.join(templatesDir, folder.name, 'site-config.yaml');
            if (fs.existsSync(configPath)) {
                try {
                    const yamlContent = fs.readFileSync(configPath, 'utf-8');
                    const domain = extractDomainFromYaml(yamlContent);

                    if (domain && !_getWebsite(domain)) {
                        const website = createWebsiteFromYaml(yamlContent, folder.name);
                        if (website) {
                            _saveWebsite(website);
                            migrated.push(domain);
                        }
                    }
                } catch (e) {
                    errors.push(`Failed to migrate ${folder.name}: ${e}`);
                }
            }
        }
    }

    // 2. Check for job store completed jobs
    const jobsDir = path.join(process.cwd(), '.site-builder-jobs');
    if (fs.existsSync(jobsDir)) {
        const jobFiles = fs.readdirSync(jobsDir).filter(f => f.endsWith('.json'));

        for (const file of jobFiles) {
            try {
                const jobData = fs.readFileSync(path.join(jobsDir, file), 'utf-8');
                const job = JSON.parse(jobData);

                if (job.status === 'complete' && job.config?.domain) {
                    const domain = job.config.domain;
                    if (!_getWebsite(domain)) {
                        const website = createWebsiteFromJob(job);
                        if (website) {
                            _saveWebsite(website);
                            migrated.push(domain);
                        }
                    }
                }
            } catch (e) {
                errors.push(`Failed to migrate job ${file}: ${e}`);
            }
        }
    }

    return { migrated, errors };
}

// ============================================
// INTERNAL HELPERS
// ============================================

function extractDomainFromYaml(yaml: string): string | null {
    const match = yaml.match(/domain:\s*["']?([^"'\n]+)["']?/);
    return match ? match[1].trim() : null;
}

function createWebsiteFromYaml(yaml: string, _templateFolder: string): Website | null {
    const domain = extractDomainFromYaml(yaml);
    if (!domain) return null;

    const nameMatch = yaml.match(/name:\s*["']?([^"'\n]+)["']?/);
    const nicheMatch = yaml.match(/category:\s*["']?([^"'\n]+)["']?/);
    const authorMatch = yaml.match(/author:\s*\n\s*name:\s*["']?([^"'\n]+)["']?/);

    return {
        id: `site_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        domain,
        name: nameMatch ? nameMatch[1] : domain.split('.')[0],
        niche: nicheMatch ? nicheMatch[1] : 'general',
        template: {
            id: 'niche-authority',
            version: '1.0.0',
            installedAt: Date.now()
        },
        fingerprint: {
            providers: [],
            providerHistory: [],
            contentStrategy: 'unknown',
            eeatEnabled: false,
            aiOverviewOptimized: false,
            generatedAt: Date.now(),
            articleTemplatesUsed: []
        },
        deployment: {
            githubRepo: '',
            githubOwner: '',
            vercelProject: '',
            liveUrl: `https://${domain}`,
            pendingChanges: 0
        },
        stats: {
            articlesCount: 0,
            totalWords: 0,
            estimatedMonthlyRevenue: 0
        },
        versions: [],
        author: {
            name: authorMatch ? authorMatch[1] : 'Unknown',
            role: 'Author'
        },
        status: 'live',
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createWebsiteFromJob(job: Record<string, any>): Website | null {
    if (!job.config?.domain) return null;

    const config = job.config;

    return {
        id: job.id || `site_${Date.now()}`,
        domain: config.domain!,
        name: config.siteName || config.domain!.split('.')[0],
        niche: config.niche || 'general',
        template: {
            id: config.template || 'niche-authority',
            version: '1.0.0',
            installedAt: job.createdAt || Date.now()
        },
        fingerprint: {
            providers: Object.keys(job.providerUsage || {}),
            providerHistory: [],
            contentStrategy: 'unknown',
            eeatEnabled: config.contentStrategy?.enableEEATPages || false,
            aiOverviewOptimized: config.contentStrategy?.enableAIOverviewOptimization || false,
            generatedAt: job.createdAt || Date.now(),
            articleTemplatesUsed: []
        },
        deployment: {
            githubRepo: job.githubConfig?.repo || '',
            githubOwner: job.githubConfig?.owner || '',
            vercelProject: '',
            liveUrl: `https://${config.domain}`,
            pendingChanges: 0
        },
        stats: {
            articlesCount: job.progress?.completed || 0,
            totalWords: 0,
            estimatedMonthlyRevenue: 0
        },
        versions: [{
            version: '1.0.1',
            templateVersion: '1.0.0',
            deployedAt: job.completedAt || Date.now(),
            commitSha: '',
            changes: ['Initial site creation'],
            canRollback: false
        }],
        author: {
            name: config.author?.name || 'Unknown',
            role: config.author?.role || 'Author',
            experience: config.author?.experience
        },
        status: job.status === 'complete' ? 'live' : 'building',
        createdAt: job.createdAt || Date.now(),
        updatedAt: job.updatedAt || Date.now()
    };
}
