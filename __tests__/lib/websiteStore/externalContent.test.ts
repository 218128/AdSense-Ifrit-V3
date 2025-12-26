/**
 * Tests for externalContent.ts - External Content Integration
 */

import {
    createMockExternalContentDeps
} from './_testUtils';

import {
    importExternalContent,
    generateSlug,
    _initExternalContentDeps
} from '@/lib/websiteStore/externalContent';

describe('externalContent.ts', () => {
    let mockDeps: ReturnType<typeof createMockExternalContentDeps>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockDeps = createMockExternalContentDeps();
        _initExternalContentDeps(mockDeps);
    });

    describe('generateSlug()', () => {
        it('should convert title to lowercase', () => {
            expect(generateSlug('Hello World')).toBe('hello-world');
        });

        it('should replace spaces with dashes', () => {
            expect(generateSlug('my blog post')).toBe('my-blog-post');
        });

        it('should remove special characters', () => {
            expect(generateSlug('Hello! World?')).toBe('hello-world');
        });

        it('should remove leading and trailing dashes', () => {
            expect(generateSlug('---hello---')).toBe('hello');
        });

        it('should handle multiple consecutive spaces/dashes', () => {
            expect(generateSlug('hello   world')).toBe('hello-world');
        });

        it('should limit slug to 60 characters', () => {
            const longTitle = 'This is a very long title that should be truncated because it exceeds sixty characters';
            const result = generateSlug(longTitle);

            expect(result.length).toBeLessThanOrEqual(60);
        });

        it('should handle numbers', () => {
            expect(generateSlug('Top 10 Tips for 2024')).toBe('top-10-tips-for-2024');
        });

        it('should handle empty string', () => {
            expect(generateSlug('')).toBe('');
        });

        it('should handle only special characters', () => {
            expect(generateSlug('!@#$%^&*()')).toBe('');
        });
    });

    describe('importExternalContent()', () => {
        it('should create article with correct properties', () => {
            const domain = 'test-site.com';
            const content = {
                title: 'Imported Article',
                content: 'This is imported content from external source.'
            };

            const result = importExternalContent(domain, content);

            expect(result.title).toBe('Imported Article');
            expect(result.content).toBe(content.content);
            expect(result.contentType).toBe('external');
            expect(result.isExternal).toBe(true);
            expect(result.source).toBe('external');
            expect(result.status).toBe('draft');
        });

        it('should generate slug from title if not provided', () => {
            const domain = 'test-site.com';
            const content = {
                title: 'My Custom Title',
                content: 'Some content'
            };

            const result = importExternalContent(domain, content);

            expect(result.slug).toBe('my-custom-title');
        });

        it('should use provided slug if given', () => {
            const domain = 'test-site.com';
            const content = {
                title: 'My Title',
                slug: 'custom-slug',
                content: 'Some content'
            };

            const result = importExternalContent(domain, content);

            expect(result.slug).toBe('custom-slug');
        });

        it('should calculate word count', () => {
            const domain = 'test-site.com';
            const content = {
                title: 'Test',
                content: 'one two three four five'
            };

            const result = importExternalContent(domain, content);

            expect(result.wordCount).toBe(5);
        });

        it('should calculate reading time', () => {
            const domain = 'test-site.com';
            const words = Array(400).fill('word').join(' '); // 400 words
            const content = {
                title: 'Test',
                content: words
            };

            const result = importExternalContent(domain, content);

            expect(result.readingTime).toBe(2); // 400/200 = 2 minutes
        });

        it('should generate description from content start', () => {
            const domain = 'test-site.com';
            const content = {
                title: 'Test',
                content: 'This is the beginning of the article content that will be truncated for the description.'
            };

            const result = importExternalContent(domain, content);

            expect(result.description).toContain('This is the beginning');
            expect(result.description).toMatch(/\.\.\.$/);
        });

        it('should use provided category or default to general', () => {
            const domain = 'test-site.com';

            const withCategory = importExternalContent(domain, {
                title: 'Test',
                content: 'Content',
                category: 'technology'
            });

            const withoutCategory = importExternalContent(domain, {
                title: 'Test',
                content: 'Content'
            });

            expect(withCategory.category).toBe('technology');
            expect(withoutCategory.category).toBe('general');
        });

        it('should use provided tags or default to empty array', () => {
            const domain = 'test-site.com';

            const withTags = importExternalContent(domain, {
                title: 'Test',
                content: 'Content',
                tags: ['tag1', 'tag2']
            });

            const withoutTags = importExternalContent(domain, {
                title: 'Test',
                content: 'Content'
            });

            expect(withTags.tags).toEqual(['tag1', 'tag2']);
            expect(withoutTags.tags).toEqual([]);
        });

        it('should include cover image if provided', () => {
            const domain = 'test-site.com';
            const coverImage = {
                url: 'https://example.com/image.jpg',
                alt: 'Cover image'
            };

            const result = importExternalContent(domain, {
                title: 'Test',
                content: 'Content',
                coverImage
            });

            expect(result.coverImage).toEqual(coverImage);
        });

        it('should include content images if provided', () => {
            const domain = 'test-site.com';
            const contentImages = [
                { url: 'https://example.com/img1.jpg', alt: 'Image 1' },
                { url: 'https://example.com/img2.jpg', alt: 'Image 2' }
            ];

            const result = importExternalContent(domain, {
                title: 'Test',
                content: 'Content',
                contentImages
            });

            expect(result.contentImages).toEqual(contentImages);
        });

        it('should call generateArticleId from dependencies', () => {
            const domain = 'test-site.com';

            importExternalContent(domain, {
                title: 'Test',
                content: 'Content'
            });

            expect(mockDeps.generateArticleId).toHaveBeenCalled();
        });

        it('should call saveArticle with domain and article', () => {
            const domain = 'test-site.com';

            const result = importExternalContent(domain, {
                title: 'Test',
                content: 'Content'
            });

            expect(mockDeps.saveArticle).toHaveBeenCalledWith(domain, result);
        });

        it('should set lastModifiedAt to current timestamp', () => {
            const beforeTime = Date.now();
            const domain = 'test-site.com';

            const result = importExternalContent(domain, {
                title: 'Test',
                content: 'Content'
            });

            expect(result.lastModifiedAt).toBeGreaterThanOrEqual(beforeTime);
        });

        it('should have undefined generatedBy and generatedAt for external content', () => {
            const domain = 'test-site.com';

            const result = importExternalContent(domain, {
                title: 'Test',
                content: 'Content'
            });

            expect(result.generatedBy).toBeUndefined();
            expect(result.generatedAt).toBeUndefined();
        });

        it('should set pageType to article', () => {
            const domain = 'test-site.com';

            const result = importExternalContent(domain, {
                title: 'Test',
                content: 'Content'
            });

            expect(result.pageType).toBe('article');
        });

        it('should initialize empty arrays for eeatSignals and aiOverviewBlocks', () => {
            const domain = 'test-site.com';

            const result = importExternalContent(domain, {
                title: 'Test',
                content: 'Content'
            });

            expect(result.eeatSignals).toEqual([]);
            expect(result.aiOverviewBlocks).toEqual([]);
        });
    });
});
