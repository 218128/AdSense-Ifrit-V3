/**
 * Content Enhancement Tests
 * @jest-environment jsdom
 */

import { quickSpin } from '@/features/campaigns/lib/contentSpinner';
import {
    findLinkOpportunities,
    injectInternalLinks,
    type ExistingPost
} from '@/features/campaigns/lib/internalLinking';
import {
    generateAltText,
    determineImagePlacements,
    injectImages,
    type GeneratedImage
} from '@/features/campaigns/lib/imageOptimization';
import {
    generateArticleSchema,
    generateFAQSchema,
    generateHowToSchema
} from '@/features/campaigns/lib/schemaMarkup';

describe('Content Spinner', () => {
    describe('quickSpin', () => {
        it('should replace synonyms at given intensity', () => {
            const original = 'This is a good and important product.';

            // Run multiple times to account for randomness
            let changed = false;
            for (let i = 0; i < 10; i++) {
                const spun = quickSpin(original, 1.0); // 100% intensity
                if (spun !== original) {
                    changed = true;
                    break;
                }
            }

            expect(changed).toBe(true);
        });

        it('should preserve words without synonyms', () => {
            const original = 'UniqueTerm123 stays the same.';
            const spun = quickSpin(original, 1.0);

            expect(spun).toContain('UniqueTerm123');
        });

        it('should preserve original casing', () => {
            const original = 'Good morning!';
            const spun = quickSpin(original, 1.0);

            // First letter should remain capitalized
            expect(spun[0]).toBe(spun[0].toUpperCase());
        });
    });
});

describe('Internal Linking', () => {
    const mockPosts: ExistingPost[] = [
        {
            id: 1,
            title: 'Best Camera Reviews',
            slug: 'camera-reviews',
            url: 'https://example.com/camera-reviews',
            categories: [1],
            keywords: ['camera', 'reviews']
        },
        {
            id: 2,
            title: 'Photography Guide',
            slug: 'photography-guide',
            url: 'https://example.com/photography-guide',
            categories: [1],
            keywords: ['photography', 'guide']
        },
    ];

    describe('findLinkOpportunities', () => {
        it('should find keywords matching existing posts', () => {
            const content = 'This article covers camera basics and photography tips.';

            const suggestions = findLinkOpportunities(content, mockPosts);

            expect(suggestions.length).toBeGreaterThan(0);
            expect(suggestions.some(s => s.anchor === 'camera')).toBe(true);
        });

        it('should limit to maxLinks', () => {
            const content = 'Camera reviews, photography guide, more camera info.';

            const suggestions = findLinkOpportunities(content, mockPosts, 1);

            expect(suggestions.length).toBeLessThanOrEqual(1);
        });
    });

    describe('injectInternalLinks', () => {
        it('should inject links at keyword positions', () => {
            const content = 'Learn about camera techniques.';
            const suggestions = findLinkOpportunities(content, mockPosts);

            const result = injectInternalLinks(content, suggestions, 1);

            expect(result.content).toContain('<a href="');
            expect(result.linksAdded).toBe(1);
        });

        it('should not double-link already linked text', () => {
            const content = '<a href="test">camera</a> and more camera info.';
            const suggestions = findLinkOpportunities(content, mockPosts);

            const result = injectInternalLinks(content, suggestions, 2);

            // Should only add 1 link (2nd occurrence), not modify existing
            expect(result.linksAdded).toBeLessThanOrEqual(1);
        });
    });
});

describe('Image Optimization', () => {
    describe('generateAltText', () => {
        it('should generate alt text from topic and context', () => {
            const alt = generateAltText('Best Phones', 'smartphone review comparison');

            expect(alt).toContain('Best Phones');
            expect(alt.length).toBeLessThanOrEqual(125);
        });
    });

    describe('determineImagePlacements', () => {
        it('should suggest placements based on content structure', () => {
            const content = '<p>This is a comprehensive introduction paragraph that contains enough content to meet the minimum length requirements for image placement determination in the test.</p><h2>Section 1</h2><p>Text</p><h2>Section 2</h2><p>More text</p>';

            const placements = determineImagePlacements(content, 'Test Topic', 3);

            expect(placements.length).toBeGreaterThan(0);
            expect(placements.some(p => p.position === 'after-intro')).toBe(true);
        });
    });

    describe('injectImages', () => {
        it('should inject images at specified positions', () => {
            const content = '<p>Intro paragraph.</p><h2>Section</h2><p>Content</p>';
            const images: GeneratedImage[] = [{
                url: 'https://example.com/image.jpg',
                altText: 'Test image',
                placement: 'after-intro',
            }];

            const result = injectImages(content, images);

            expect(result.content).toContain('<figure');
            expect(result.content).toContain('https://example.com/image.jpg');
            expect(result.imagesAdded).toBe(1);
        });
    });
});

describe('Schema Markup', () => {
    describe('generateArticleSchema', () => {
        it('should generate valid article schema', () => {
            const schema = generateArticleSchema('Test Title', 'Test description');

            expect(schema['@context']).toBe('https://schema.org');
            expect(schema['@type']).toBe('BlogPosting');
            expect(schema.headline).toBe('Test Title');
        });

        it('should truncate long headlines', () => {
            const longTitle = 'A'.repeat(200);
            const schema = generateArticleSchema(longTitle, 'desc');

            expect(schema.headline.length).toBeLessThanOrEqual(110);
        });
    });

    describe('generateFAQSchema', () => {
        it('should extract FAQ from H3 patterns', () => {
            const content = `
                <h2>FAQ</h2>
                <h3>What is this?</h3>
                <p>This is a test.</p>
                <h3>How does it work?</h3>
                <p>It works well.</p>
            `;

            const schema = generateFAQSchema(content);

            expect(schema).not.toBeNull();
            expect(schema?.mainEntity.length).toBe(2);
            expect(schema?.mainEntity[0].name).toBe('What is this?');
        });

        it('should return null if no FAQ section', () => {
            const content = '<h2>Regular Content</h2><p>No FAQ here.</p>';

            const schema = generateFAQSchema(content);

            expect(schema).toBeNull();
        });
    });

    describe('generateHowToSchema', () => {
        it('should extract steps from ordered lists', () => {
            const title = 'How to Make Coffee';
            const content = `
                <p>Learn how to make great coffee.</p>
                <ol>
                    <li>Boil water</li>
                    <li>Add grounds</li>
                    <li>Pour and enjoy</li>
                </ol>
            `;

            const schema = generateHowToSchema(title, content);

            expect(schema).not.toBeNull();
            expect(schema?.step.length).toBe(3);
            expect(schema?.step[0].text).toBe('Boil water');
        });
    });
});
