/**
 * Tests for Template Versions
 * 
 * Tests template version tracking, upgrades, and compatibility
 */

import {
    NICHE_AUTHORITY_REGISTRY,
    TOPICAL_MAGAZINE_REGISTRY,
    EXPERT_HUB_REGISTRY,
    getTemplateRegistry,
    getAllRegistries,
    getCurrentVersion,
    getVersionInfo,
    checkUpgradeAvailable,
    checkVersionCompatibility,
    getUpgradePath,
    formatVersion,
    getVersionDate
} from '@/lib/templateVersions';

describe('Template Versions', () => {
    describe('Template Registries', () => {
        it('should have three template registries', () => {
            const registries = getAllRegistries();
            expect(registries).toHaveLength(3);
        });

        it('should have niche-authority registry', () => {
            expect(NICHE_AUTHORITY_REGISTRY.id).toBe('niche-authority');
            expect(NICHE_AUTHORITY_REGISTRY.name).toBe('Niche Authority Blog');
        });

        it('should have topical-magazine registry', () => {
            expect(TOPICAL_MAGAZINE_REGISTRY.id).toBe('topical-magazine');
        });

        it('should have expert-hub registry', () => {
            expect(EXPERT_HUB_REGISTRY.id).toBe('expert-hub');
        });

        it('should have versions array for each registry', () => {
            expect(NICHE_AUTHORITY_REGISTRY.versions.length).toBeGreaterThan(0);
            expect(TOPICAL_MAGAZINE_REGISTRY.versions.length).toBeGreaterThan(0);
            expect(EXPERT_HUB_REGISTRY.versions.length).toBeGreaterThan(0);
        });
    });

    describe('getTemplateRegistry()', () => {
        it('should return registry by id', () => {
            const registry = getTemplateRegistry('niche-authority');

            expect(registry).not.toBeNull();
            expect(registry?.id).toBe('niche-authority');
        });

        it('should return null for unknown template', () => {
            const registry = getTemplateRegistry('unknown-template');

            expect(registry).toBeNull();
        });
    });

    describe('getCurrentVersion()', () => {
        it('should return current version for template', () => {
            const version = getCurrentVersion('niche-authority');

            expect(version).toMatch(/^\d+\.\d+\.\d+$/);
        });

        it('should return 1.0.0 for unknown template', () => {
            const version = getCurrentVersion('unknown');

            expect(version).toBe('1.0.0');
        });
    });

    describe('getVersionInfo()', () => {
        it('should return version details', () => {
            const current = getCurrentVersion('niche-authority');
            const info = getVersionInfo('niche-authority', current);

            expect(info).not.toBeNull();
            expect(info?.version).toBe(current);
            expect(info?.changelog).toBeDefined();
            expect(Array.isArray(info?.changelog)).toBe(true);
        });

        it('should return null for unknown version', () => {
            const info = getVersionInfo('niche-authority', '99.99.99');

            expect(info).toBeNull();
        });
    });

    describe('checkUpgradeAvailable()', () => {
        it('should detect no upgrade when on latest', () => {
            const latest = getCurrentVersion('niche-authority');
            const result = checkUpgradeAvailable('niche-authority', latest);

            expect(result.available).toBe(false);
            expect(result.latestVersion).toBe(latest);
        });

        it('should detect upgrade available for older version', () => {
            const result = checkUpgradeAvailable('niche-authority', '1.0.0');

            expect(result.available).toBe(true);
            expect(result.changelog.length).toBeGreaterThan(0);
        });

        it('should include breaking flag', () => {
            const result = checkUpgradeAvailable('niche-authority', '1.0.0');

            expect(typeof result.breaking).toBe('boolean');
        });
    });

    describe('checkVersionCompatibility()', () => {
        it('should check compatibility between versions', () => {
            const result = checkVersionCompatibility('niche-authority', '1.0.0', '1.2.0');

            expect(typeof result.compatible).toBe('boolean');
            expect(Array.isArray(result.warnings)).toBe(true);
            expect(typeof result.requiresMigration).toBe('boolean');
        });

        it('should be compatible for same version', () => {
            const version = getCurrentVersion('niche-authority');
            const result = checkVersionCompatibility('niche-authority', version, version);

            expect(result.compatible).toBe(true);
            expect(result.warnings).toEqual([]);
        });
    });

    describe('getUpgradePath()', () => {
        it('should return versions between from and to', () => {
            const path = getUpgradePath('niche-authority', '1.0.0', getCurrentVersion('niche-authority'));

            expect(Array.isArray(path)).toBe(true);
        });

        it('should return empty for same version', () => {
            const version = '1.2.0';
            const path = getUpgradePath('niche-authority', version, version);

            expect(path).toEqual([]);
        });

        it('should return empty for unknown template', () => {
            const path = getUpgradePath('unknown', '1.0.0', '2.0.0');

            expect(path).toEqual([]);
        });
    });

    describe('formatVersion()', () => {
        it('should format version with template name', () => {
            const formatted = formatVersion('1.0.0', 'niche-authority');

            expect(formatted).toContain('1.0.0');
        });
    });

    describe('getVersionDate()', () => {
        it('should return date for valid version', () => {
            const version = getCurrentVersion('niche-authority');
            const date = getVersionDate('niche-authority', version);

            expect(date).toBeInstanceOf(Date);
        });

        it('should return null for unknown version', () => {
            const date = getVersionDate('niche-authority', '99.0.0');

            expect(date).toBeNull();
        });
    });
});
