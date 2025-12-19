/**
 * Template Version Registry
 * 
 * Tracks template versions with changelogs.
 * Used for upgrade detection and compatibility checking.
 */

export interface TemplateVersion {
    version: string;
    releasedAt: number;
    changelog: string[];
    minNodeVersion?: string;
    breaking: boolean;
    contentSchemaVersion: number; // For compatibility checks
}

export interface TemplateRegistry {
    id: string;
    name: string;
    description: string;
    currentVersion: string;
    versions: TemplateVersion[];
}

// ============================================
// TEMPLATE REGISTRIES
// ============================================

export const NICHE_AUTHORITY_REGISTRY: TemplateRegistry = {
    id: 'niche-authority',
    name: 'Niche Authority Blog',
    description: 'Professional blog template optimized for AdSense and authority building',
    currentVersion: '1.3.2',
    versions: [
        {
            version: '1.3.2',
            releasedAt: Date.now(),
            changelog: [
                'Dynamic structural pages read from content/*.md files',
                'Full markdown-to-HTML rendering for structural content',
                'Pages now display actual content instead of placeholders'
            ],
            breaking: false,
            contentSchemaVersion: 2
        },
        {
            version: '1.3.1',
            releasedAt: Date.now() - 12 * 60 * 60 * 1000, // 12 hours ago
            changelog: [
                'Dedicated Privacy, Terms, Contact pages (no longer treated as articles)',
                'Structural pages excluded from article listings',
                'Improved page organization and SEO structure'
            ],
            breaking: false,
            contentSchemaVersion: 2
        },
        {
            version: '1.3.0',
            releasedAt: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
            changelog: [
                'Social share buttons (Twitter, Facebook, LinkedIn)',
                'Article JSON-LD schema for rich search results',
                'E-E-A-T trust badges (Expert Reviewed, Updated)',
                'Featured image display on homepage',
                'Shared component architecture',
                'Newsletter signup form generator',
                'Smart AdSense ad zone placements'
            ],
            breaking: false,
            contentSchemaVersion: 2
        },
        {
            version: '1.2.0',
            releasedAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
            changelog: [
                'Date formatting fix for Vercel builds',
                'Content preservation during upgrades',
                'Image support in article frontmatter'
            ],
            breaking: false,
            contentSchemaVersion: 2
        },
        {
            version: '1.1.0',
            releasedAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
            changelog: [
                'Added dark mode support',
                'Improved mobile responsiveness',
                'Better AdSense placement',
                'Added related articles section'
            ],
            breaking: false,
            contentSchemaVersion: 1
        },
        {
            version: '1.0.0',
            releasedAt: Date.now() - 90 * 24 * 60 * 60 * 1000, // 90 days ago
            changelog: [
                'Initial release',
                'Basic blog layout',
                'Article pages with SEO',
                'Homepage with article grid'
            ],
            breaking: false,
            contentSchemaVersion: 1
        }
    ]
};

export const TOPICAL_MAGAZINE_REGISTRY: TemplateRegistry = {
    id: 'topical-magazine',
    name: 'Topical Magazine',
    description: 'Magazine-style layout for news and editorial content',
    currentVersion: '1.2.0',
    versions: [
        {
            version: '1.2.0',
            releasedAt: Date.now(),
            changelog: [
                'Added E-E-A-T signal components',
                'AI Overview optimization blocks',
                'Featured article carousel',
                'Category mega-menu',
                'Breaking news banner'
            ],
            breaking: false,
            contentSchemaVersion: 2
        },
        {
            version: '1.1.0',
            releasedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
            changelog: [
                'Added trending section',
                'Improved typography',
                'Social sharing buttons',
                'Newsletter signup form'
            ],
            breaking: false,
            contentSchemaVersion: 1
        },
        {
            version: '1.0.0',
            releasedAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
            changelog: [
                'Initial release',
                'Magazine grid layout',
                'Category pages',
                'Author profiles'
            ],
            breaking: false,
            contentSchemaVersion: 1
        }
    ]
};

export const EXPERT_HUB_REGISTRY: TemplateRegistry = {
    id: 'expert-hub',
    name: 'Expert Hub',
    description: 'Pillar-based knowledge hub for deep expertise content',
    currentVersion: '1.2.0',
    versions: [
        {
            version: '1.2.0',
            releasedAt: Date.now(),
            changelog: [
                'Added E-E-A-T signal components',
                'AI Overview optimization blocks',
                'Pillar/cluster visualization',
                'Expert credentials showcase',
                'Course-style navigation'
            ],
            breaking: false,
            contentSchemaVersion: 2
        },
        {
            version: '1.1.0',
            releasedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
            changelog: [
                'Added resource library',
                'Improved internal linking',
                'Progress tracking',
                'Bookmark functionality'
            ],
            breaking: false,
            contentSchemaVersion: 1
        },
        {
            version: '1.0.0',
            releasedAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
            changelog: [
                'Initial release',
                'Hub and spoke layout',
                'Pillar pages',
                'Cluster articles'
            ],
            breaking: false,
            contentSchemaVersion: 1
        }
    ]
};

// ============================================
// REGISTRY FUNCTIONS
// ============================================

const ALL_REGISTRIES: TemplateRegistry[] = [
    NICHE_AUTHORITY_REGISTRY,
    TOPICAL_MAGAZINE_REGISTRY,
    EXPERT_HUB_REGISTRY
];

/**
 * Get registry for a template
 */
export function getTemplateRegistry(templateId: string): TemplateRegistry | null {
    return ALL_REGISTRIES.find(r => r.id === templateId) || null;
}

/**
 * Get all template registries
 */
export function getAllRegistries(): TemplateRegistry[] {
    return ALL_REGISTRIES;
}

/**
 * Get current version for a template
 */
export function getCurrentVersion(templateId: string): string {
    const registry = getTemplateRegistry(templateId);
    return registry?.currentVersion || '1.0.0';
}

/**
 * Get version info
 */
export function getVersionInfo(templateId: string, version: string): TemplateVersion | null {
    const registry = getTemplateRegistry(templateId);
    return registry?.versions.find(v => v.version === version) || null;
}

/**
 * Check if upgrade is available
 */
export function checkUpgradeAvailable(templateId: string, currentVersion: string): {
    available: boolean;
    latestVersion: string;
    changelog: string[];
    breaking: boolean;
} {
    const registry = getTemplateRegistry(templateId);
    if (!registry) {
        return { available: false, latestVersion: currentVersion, changelog: [], breaking: false };
    }

    const current = parseVersion(currentVersion);
    const latest = parseVersion(registry.currentVersion);

    const available = compareVersions(latest, current) > 0;

    // Collect all changes between current and latest
    const changelog: string[] = [];
    let hasBreaking = false;

    for (const v of registry.versions) {
        const vParsed = parseVersion(v.version);
        if (compareVersions(vParsed, current) > 0 && compareVersions(vParsed, latest) <= 0) {
            changelog.push(`**v${v.version}**`);
            changelog.push(...v.changelog.map(c => `  - ${c}`));
            if (v.breaking) hasBreaking = true;
        }
    }

    return {
        available,
        latestVersion: registry.currentVersion,
        changelog,
        breaking: hasBreaking
    };
}

/**
 * Check content compatibility between versions
 */
export function checkVersionCompatibility(
    templateId: string,
    fromVersion: string,
    toVersion: string
): {
    compatible: boolean;
    warnings: string[];
    requiresMigration: boolean;
} {
    const registry = getTemplateRegistry(templateId);
    if (!registry) {
        return { compatible: true, warnings: [], requiresMigration: false };
    }

    const fromInfo = registry.versions.find(v => v.version === fromVersion);
    const toInfo = registry.versions.find(v => v.version === toVersion);

    if (!fromInfo || !toInfo) {
        return { compatible: true, warnings: [], requiresMigration: false };
    }

    const warnings: string[] = [];
    let requiresMigration = false;

    // Check schema version
    if (fromInfo.contentSchemaVersion !== toInfo.contentSchemaVersion) {
        requiresMigration = true;

        if (fromInfo.contentSchemaVersion > toInfo.contentSchemaVersion) {
            // Downgrade - newer content may not display correctly
            warnings.push('Content created with newer template may not display correctly');
            warnings.push('Some E-E-A-T components may be hidden');
            warnings.push('AI Overview blocks may not render');
        } else {
            // Upgrade - old content works but missing new features
            warnings.push('Existing articles will work but won\'t have new features');
            warnings.push('Consider regenerating articles to use new E-E-A-T components');
        }
    }

    // Check for breaking changes in path
    const fromParsed = parseVersion(fromVersion);
    const toParsed = parseVersion(toVersion);

    for (const v of registry.versions) {
        const vParsed = parseVersion(v.version);
        if (v.breaking) {
            const isBetween = compareVersions(vParsed, fromParsed) > 0 &&
                compareVersions(vParsed, toParsed) <= 0;
            const isReverse = compareVersions(vParsed, toParsed) > 0 &&
                compareVersions(vParsed, fromParsed) <= 0;

            if (isBetween || isReverse) {
                warnings.push(`Breaking change in v${v.version}: manual review required`);
            }
        }
    }

    return {
        compatible: warnings.length === 0,
        warnings,
        requiresMigration
    };
}

/**
 * Get upgrade path between versions
 */
export function getUpgradePath(
    templateId: string,
    fromVersion: string,
    toVersion: string
): TemplateVersion[] {
    const registry = getTemplateRegistry(templateId);
    if (!registry) return [];

    const from = parseVersion(fromVersion);
    const to = parseVersion(toVersion);

    return registry.versions
        .filter(v => {
            const vParsed = parseVersion(v.version);
            return compareVersions(vParsed, from) > 0 && compareVersions(vParsed, to) <= 0;
        })
        .sort((a, b) => compareVersions(parseVersion(a.version), parseVersion(b.version)));
}

// ============================================
// HELPERS
// ============================================

interface ParsedVersion {
    major: number;
    minor: number;
    patch: number;
}

function parseVersion(version: string): ParsedVersion {
    const parts = version.split('.').map(Number);
    return {
        major: parts[0] || 0,
        minor: parts[1] || 0,
        patch: parts[2] || 0
    };
}

function compareVersions(a: ParsedVersion, b: ParsedVersion): number {
    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    return a.patch - b.patch;
}

/**
 * Format version for display
 */
export function formatVersion(version: string, templateId: string): string {
    const registry = getTemplateRegistry(templateId);
    const info = registry?.versions.find(v => v.version === version);

    if (!info) return version;

    const date = new Date(info.releasedAt).toLocaleDateString();
    return `v${version} (${date})`;
}

/**
 * Get version release date
 */
export function getVersionDate(templateId: string, version: string): Date | null {
    const info = getVersionInfo(templateId, version);
    return info ? new Date(info.releasedAt) : null;
}
