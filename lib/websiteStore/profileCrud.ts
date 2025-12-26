/**
 * Domain Profile CRUD Operations
 * 
 * Storage for domain research profiles before website creation
 */

import * as fs from 'fs';
import * as path from 'path';

import type { DomainProfile } from './types';

// Forward declaration for dependency injection
let _PROFILES_DIR: string;

/**
 * Initialize dependencies from main websiteStore
 */
export function _initProfileCrudDeps(deps: {
    PROFILES_DIR: string;
}) {
    _PROFILES_DIR = deps.PROFILES_DIR;
}

// ============================================
// INTERNAL HELPERS
// ============================================

function ensureProfilesDir(): void {
    if (!fs.existsSync(_PROFILES_DIR)) {
        fs.mkdirSync(_PROFILES_DIR, { recursive: true });
    }
}

function getProfilePath(domain: string): string {
    return path.join(_PROFILES_DIR, `${domain.replace(/[^a-zA-Z0-9.-]/g, '_')}.json`);
}

// ============================================
// DOMAIN PROFILE CRUD
// ============================================

/**
 * Save domain research profile
 */
export function saveDomainProfile(profile: DomainProfile): void {
    ensureProfilesDir();
    const profilePath = getProfilePath(profile.domain);
    fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
}

/**
 * Get domain profile by domain name
 */
export function getDomainProfile(domain: string): DomainProfile | null {
    const profilePath = getProfilePath(domain);

    if (!fs.existsSync(profilePath)) {
        return null;
    }

    try {
        const data = fs.readFileSync(profilePath, 'utf-8');
        return JSON.parse(data);
    } catch {
        return null;
    }
}

/**
 * List all saved domain profiles
 */
export function listDomainProfiles(): DomainProfile[] {
    ensureProfilesDir();

    const profiles: DomainProfile[] = [];
    const files = fs.readdirSync(_PROFILES_DIR).filter(f => f.endsWith('.json'));

    for (const file of files) {
        try {
            const data = fs.readFileSync(path.join(_PROFILES_DIR, file), 'utf-8');
            profiles.push(JSON.parse(data));
        } catch {
            // Skip invalid files
        }
    }

    return profiles.sort((a, b) => b.researchedAt - a.researchedAt);
}

/**
 * Delete a domain profile
 */
export function deleteDomainProfile(domain: string): boolean {
    const profilePath = getProfilePath(domain);

    if (fs.existsSync(profilePath)) {
        fs.unlinkSync(profilePath);
        return true;
    }
    return false;
}

/**
 * Mark profile as transferred to website
 */
export function markProfileTransferred(domain: string): void {
    const profile = getDomainProfile(domain);
    if (profile) {
        profile.transferredToWebsite = true;
        profile.websiteCreatedAt = Date.now();
        saveDomainProfile(profile);
    }
}

