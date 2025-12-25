/**
 * Version Control Operations
 * 
 * All version history and rollback operations extracted from websiteStore.ts
 */

import * as fs from 'fs';
import * as path from 'path';

import type { Website, WebsiteVersion, ContentCompatibilityWarning } from './types';
import {
    getVersionsDir
} from './paths';

// Forward declarations for circular dependency resolution
let _getWebsite: (domain: string) => Website | null;
let _saveWebsite: (website: Website) => void;
let _listArticles: (domain: string) => import('./types').Article[];

/**
 * Initialize dependencies from main websiteStore
 */
export function _initVersionControlDeps(deps: {
    getWebsite: typeof _getWebsite;
    saveWebsite: typeof _saveWebsite;
    listArticles: typeof _listArticles;
}) {
    _getWebsite = deps.getWebsite;
    _saveWebsite = deps.saveWebsite;
    _listArticles = deps.listArticles;
}

// ============================================
// CONSTANTS
// ============================================

const MAX_VERSIONS = 5;

// ============================================
// VERSION CONTROL
// ============================================

/**
 * Add a new version to history
 */
export function addVersion(
    domain: string,
    templateVersion: string,
    commitSha: string,
    changes: string[]
): WebsiteVersion {
    const website = _getWebsite(domain);
    if (!website) throw new Error(`Website ${domain} not found`);

    // Generate next version number
    const currentVersionNum = website.versions.length > 0
        ? parseInt(website.versions[0].version.split('.')[2]) + 1
        : 1;
    const newVersion = `1.0.${currentVersionNum}`;

    const version: WebsiteVersion = {
        version: newVersion,
        templateVersion,
        deployedAt: Date.now(),
        commitSha,
        changes,
        canRollback: true
    };

    // Add to front, keep last MAX_VERSIONS
    website.versions.unshift(version);
    if (website.versions.length > MAX_VERSIONS) {
        website.versions[MAX_VERSIONS - 1].canRollback = false;
        website.versions = website.versions.slice(0, MAX_VERSIONS);
    }

    website.template.version = templateVersion;
    website.updatedAt = Date.now();
    _saveWebsite(website);

    // Save version snapshot
    saveVersionSnapshot(domain, version);

    return version;
}

/**
 * Save version snapshot for rollback
 */
function saveVersionSnapshot(domain: string, version: WebsiteVersion): void {
    const versionsDir = getVersionsDir(domain);
    const snapshotPath = path.join(versionsDir, `${version.version}.json`);

    const website = _getWebsite(domain);
    if (!website) return;

    const snapshot = {
        version,
        template: website.template,
        fingerprint: website.fingerprint,
        savedAt: Date.now()
    };

    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
}

/**
 * Get version history
 */
export function getVersionHistory(domain: string): WebsiteVersion[] {
    const website = _getWebsite(domain);
    return website?.versions || [];
}

/**
 * Update commit SHA on a version record after deployment
 */
export function updateVersionCommit(
    domain: string,
    version: string,
    commitSha: string
): boolean {
    const website = _getWebsite(domain);
    if (!website) return false;

    const versionRecord = website.versions.find(v => v.version === version);
    if (versionRecord) {
        versionRecord.commitSha = commitSha;
        versionRecord.deployedAt = Date.now();
        _saveWebsite(website);
        return true;
    }
    return false;
}

/**
 * Check content compatibility before rollback
 */
export function checkContentCompatibility(
    domain: string,
    targetVersion: string
): ContentCompatibilityWarning[] {
    const warnings: ContentCompatibilityWarning[] = [];
    const versionsDir = getVersionsDir(domain);
    const snapshotPath = path.join(versionsDir, `${targetVersion}.json`);

    if (!fs.existsSync(snapshotPath)) {
        return warnings;
    }

    try {
        const snapshotData = fs.readFileSync(snapshotPath, 'utf-8');
        const snapshot = JSON.parse(snapshotData);
        const currentWebsite = _getWebsite(domain);
        const articles = _listArticles(domain);

        // Check template compatibility
        if (snapshot.template.id !== currentWebsite?.template.id) {
            warnings.push({
                type: 'schema_mismatch',
                description: `Template type changed from ${snapshot.template.id} to ${currentWebsite?.template.id}`,
                affectedItems: articles.map(a => a.slug),
                suggestedAction: 'Review article layouts and reorganize categories'
            });
        }

        // Check content strategy compatibility
        if (snapshot.fingerprint?.contentStrategy !== currentWebsite?.fingerprint.contentStrategy) {
            const articlesByType = articles.reduce((acc, a) => {
                acc[a.contentType] = (acc[a.contentType] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            warnings.push({
                type: 'missing_category',
                description: 'Content strategy changed, some article types may not align',
                affectedItems: Object.keys(articlesByType),
                suggestedAction: 'Review article categorization after rollback'
            });
        }
    } catch {
        // Unable to check, return empty
    }

    return warnings;
}

/**
 * Rollback to a previous version (template only)
 */
export function rollbackToVersion(domain: string, targetVersion: string): {
    success: boolean;
    warnings: ContentCompatibilityWarning[];
    error?: string;
} {
    const website = _getWebsite(domain);
    if (!website) {
        return { success: false, warnings: [], error: 'Website not found' };
    }

    const targetVersionInfo = website.versions.find(v => v.version === targetVersion);
    if (!targetVersionInfo || !targetVersionInfo.canRollback) {
        return { success: false, warnings: [], error: 'Version not found or cannot rollback' };
    }

    // Check compatibility
    const warnings = checkContentCompatibility(domain, targetVersion);

    // Load snapshot
    const versionsDir = getVersionsDir(domain);
    const snapshotPath = path.join(versionsDir, `${targetVersion}.json`);

    if (!fs.existsSync(snapshotPath)) {
        return { success: false, warnings, error: 'Version snapshot not found' };
    }

    try {
        const snapshotData = fs.readFileSync(snapshotPath, 'utf-8');
        const snapshot = JSON.parse(snapshotData);

        // Rollback template only (keep content)
        website.template = snapshot.template;
        website.fingerprint = snapshot.fingerprint;
        website.status = 'pending-deploy';
        website.updatedAt = Date.now();

        _saveWebsite(website);

        return { success: true, warnings };
    } catch (error) {
        return {
            success: false,
            warnings,
            error: error instanceof Error ? error.message : 'Rollback failed'
        };
    }
}
