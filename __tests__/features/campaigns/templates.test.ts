/**
 * Campaign Templates Tests
 * Enterprise-grade tests for pre-built campaign configurations.
 */

import {
    CAMPAIGN_TEMPLATES,
    getTemplate,
    getTemplatesByCategory,
    getTemplatesBySource,
    getTemplateCategories,
    cloneTemplate,
    type CampaignTemplate,
    type TemplateCategory,
    type SourceType,
} from '@/features/campaigns/templates';

describe('Campaign Templates', () => {
    // =========================================================================
    // Template Registry
    // =========================================================================
    describe('CAMPAIGN_TEMPLATES', () => {
        it('should have at least 7 templates', () => {
            expect(CAMPAIGN_TEMPLATES.length).toBeGreaterThanOrEqual(7);
        });

        it('should have unique IDs', () => {
            const ids = CAMPAIGN_TEMPLATES.map(t => t.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        it('should have all required fields', () => {
            for (const template of CAMPAIGN_TEMPLATES) {
                expect(template.id).toBeDefined();
                expect(template.name).toBeDefined();
                expect(template.description).toBeDefined();
                expect(template.category).toBeDefined();
                expect(template.icon).toBeDefined();
                expect(template.sourceType).toBeDefined();
                expect(template.config).toBeDefined();
            }
        });

        it('should have valid config structure', () => {
            for (const template of CAMPAIGN_TEMPLATES) {
                expect(template.config.postFrequency).toMatch(/^(hourly|daily|weekly)$/);
                expect(template.config.postsPerRun).toBeGreaterThan(0);
                expect(typeof template.config.autoPublish).toBe('boolean');
                expect(template.config.contentGeneration).toBeDefined();
            }
        });

        it('should have valid content generation config', () => {
            for (const template of CAMPAIGN_TEMPLATES) {
                const cg = template.config.contentGeneration;
                expect(typeof cg.useAI).toBe('boolean');
                if (cg.minWords) expect(cg.minWords).toBeGreaterThan(0);
                if (cg.maxWords) expect(cg.maxWords).toBeGreaterThanOrEqual(cg.minWords || 0);
            }
        });
    });

    // =========================================================================
    // getTemplate
    // =========================================================================
    describe('getTemplate', () => {
        it('should find template by ID', () => {
            const template = getTemplate('amazon-product-reviews');
            expect(template).toBeDefined();
            expect(template?.name).toBe('Amazon Product Reviews');
        });

        it('should return undefined for non-existent ID', () => {
            const template = getTemplate('non-existent');
            expect(template).toBeUndefined();
        });
    });

    // =========================================================================
    // getTemplatesByCategory
    // =========================================================================
    describe('getTemplatesByCategory', () => {
        it('should filter by affiliate category', () => {
            const templates = getTemplatesByCategory('affiliate');
            expect(templates.length).toBeGreaterThan(0);
            expect(templates.every(t => t.category === 'affiliate')).toBe(true);
        });

        it('should filter by news category', () => {
            const templates = getTemplatesByCategory('news');
            expect(templates.length).toBeGreaterThan(0);
            expect(templates.every(t => t.category === 'news')).toBe(true);
        });

        it('should filter by social category', () => {
            const templates = getTemplatesByCategory('social');
            expect(templates.length).toBeGreaterThan(0);
        });

        it('should filter by video category', () => {
            const templates = getTemplatesByCategory('video');
            expect(templates.length).toBeGreaterThan(0);
        });

        it('should return empty array for empty category', () => {
            const templates = getTemplatesByCategory('custom');
            expect(templates).toEqual([]);
        });
    });

    // =========================================================================
    // getTemplatesBySource
    // =========================================================================
    describe('getTemplatesBySource', () => {
        it('should filter by amazon source', () => {
            const templates = getTemplatesBySource('amazon');
            expect(templates.length).toBeGreaterThan(0);
            expect(templates.every(t => t.sourceType === 'amazon')).toBe(true);
        });

        it('should filter by rss source', () => {
            const templates = getTemplatesBySource('rss');
            expect(templates.length).toBeGreaterThan(0);
        });

        it('should filter by youtube source', () => {
            const templates = getTemplatesBySource('youtube');
            expect(templates.length).toBeGreaterThan(0);
        });

        it('should filter by reddit source', () => {
            const templates = getTemplatesBySource('reddit');
            expect(templates.length).toBeGreaterThan(0);
        });

        it('should filter by twitter source', () => {
            const templates = getTemplatesBySource('twitter');
            expect(templates.length).toBeGreaterThan(0);
        });

        it('should filter by trends source', () => {
            const templates = getTemplatesBySource('trends');
            expect(templates.length).toBeGreaterThan(0);
        });
    });

    // =========================================================================
    // getTemplateCategories
    // =========================================================================
    describe('getTemplateCategories', () => {
        it('should return all categories', () => {
            const categories = getTemplateCategories();

            expect(categories.map(c => c.id)).toContain('affiliate');
            expect(categories.map(c => c.id)).toContain('news');
            expect(categories.map(c => c.id)).toContain('social');
            expect(categories.map(c => c.id)).toContain('video');
            expect(categories.map(c => c.id)).toContain('trending');
        });

        it('should include count for each category', () => {
            const categories = getTemplateCategories();

            for (const category of categories) {
                expect(category.id).toBeDefined();
                expect(category.name).toBeDefined();
                expect(typeof category.count).toBe('number');
            }
        });

        it('should have accurate counts', () => {
            const categories = getTemplateCategories();

            const affiliateCategory = categories.find(c => c.id === 'affiliate');
            const expectedCount = CAMPAIGN_TEMPLATES.filter(t => t.category === 'affiliate').length;
            expect(affiliateCategory?.count).toBe(expectedCount);
        });

        it('should have capitalized names', () => {
            const categories = getTemplateCategories();

            for (const category of categories) {
                // First letter should be uppercase
                expect(category.name[0]).toBe(category.name[0].toUpperCase());
            }
        });
    });

    // =========================================================================
    // cloneTemplate
    // =========================================================================
    describe('cloneTemplate', () => {
        it('should clone template with new ID', () => {
            const cloned = cloneTemplate('amazon-product-reviews', {});

            expect(cloned).toBeDefined();
            expect(cloned?.id).not.toBe('amazon-product-reviews');
            expect(cloned?.id).toContain('amazon-product-reviews');
        });

        it('should override provided fields', () => {
            const cloned = cloneTemplate('amazon-product-reviews', {
                name: 'Custom Amazon Reviews',
                description: 'My custom description',
            });

            expect(cloned?.name).toBe('Custom Amazon Reviews');
            expect(cloned?.description).toBe('My custom description');
        });

        it('should merge config overrides', () => {
            const cloned = cloneTemplate('amazon-product-reviews', {
                config: {
                    postFrequency: 'weekly',
                    postsPerRun: 10,
                    autoPublish: true,
                    contentGeneration: {
                        useAI: true,
                    },
                },
            });

            expect(cloned?.config.postFrequency).toBe('weekly');
            expect(cloned?.config.postsPerRun).toBe(10);
        });

        it('should merge preset overrides', () => {
            const cloned = cloneTemplate('amazon-product-reviews', {
                presets: {
                    categoryIds: [1, 2, 3],
                },
            });

            expect(cloned?.presets.categoryIds).toEqual([1, 2, 3]);
        });

        it('should return undefined for non-existent template', () => {
            const cloned = cloneTemplate('non-existent', {});
            expect(cloned).toBeUndefined();
        });

        it('should preserve original template presets', () => {
            const original = getTemplate('amazon-product-reviews');
            const cloned = cloneTemplate('amazon-product-reviews', {});

            expect(cloned?.presets.contentTemplate).toBe(original?.presets.contentTemplate);
        });
    });

    // =========================================================================
    // Template Content
    // =========================================================================
    describe('Template Content', () => {
        it('amazon-product-reviews should have content template', () => {
            const template = getTemplate('amazon-product-reviews');
            expect(template?.presets.contentTemplate).toBeDefined();
            expect(template?.presets.contentTemplate).toContain('[product_title]');
        });

        it('news-aggregator should have filter rules', () => {
            const template = getTemplate('news-aggregator');
            expect(template?.presets.filterRules).toBeDefined();
        });

        it('youtube-to-blog should have filter rules', () => {
            const template = getTemplate('youtube-to-blog');
            expect(template?.presets.filterRules).toBeDefined();
        });

        it('google-trends should have keyword config', () => {
            const template = getTemplate('google-trends');
            expect(template?.presets.keywordConfig).toBeDefined();
        });

        it('all templates should have AI enabled', () => {
            for (const template of CAMPAIGN_TEMPLATES) {
                expect(template.config.contentGeneration.useAI).toBe(true);
            }
        });
    });

    // =========================================================================
    // Edge Cases
    // =========================================================================
    describe('Edge Cases', () => {
        it('should handle cloning with empty overrides', () => {
            const cloned = cloneTemplate('amazon-product-reviews', {});
            expect(cloned).toBeDefined();
        });

        it('should handle category with no templates', () => {
            const templates = getTemplatesByCategory('custom' as TemplateCategory);
            expect(Array.isArray(templates)).toBe(true);
        });

        it('should handle source with no templates', () => {
            const templates = getTemplatesBySource('scraper' as SourceType);
            expect(Array.isArray(templates)).toBe(true);
        });
    });
});
