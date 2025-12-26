/**
 * Tests for Dev.to Integration
 * 
 * Comprehensive tests for Dev.to API client for cross-platform publishing
 */

// Setup fetch mock before imports
const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
    DevToClient,
    adaptArticleForDevTo,
    nicheToDevToTags
} from '@/lib/integrations/devto';

describe('Dev.to Integration', () => {
    let client: DevToClient;

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockReset();
        client = new DevToClient({ apiKey: 'test-api-key' });
    });

    // Helper to create mock response
    const createMockResponse = (data: unknown, ok: boolean = true, status: number = 200) => ({
        ok,
        status,
        json: jest.fn().mockResolvedValue(data)
    });

    describe('DevToClient', () => {
        describe('getMe()', () => {
            it('should return authenticated user info', async () => {
                const mockUser = {
                    id: 12345,
                    username: 'testuser',
                    name: 'Test User',
                    twitter_username: 'testuser',
                    github_username: 'testuser',
                    profile_image: 'https://dev.to/avatar.png'
                };

                mockFetch.mockResolvedValueOnce(createMockResponse(mockUser));

                const result = await client.getMe();

                expect(result.id).toBe(12345);
                expect(result.username).toBe('testuser');
            });

            it('should include API key in headers', async () => {
                mockFetch.mockResolvedValueOnce(createMockResponse({ id: 1, username: 'user' }));

                await client.getMe();

                expect(mockFetch).toHaveBeenCalledWith(
                    expect.stringContaining('dev.to/api/users/me'),
                    expect.objectContaining({
                        headers: expect.objectContaining({
                            'api-key': 'test-api-key'
                        })
                    })
                );
            });

            it('should throw on API error', async () => {
                mockFetch.mockResolvedValueOnce(createMockResponse(
                    { error: 'Unauthorized' },
                    false,
                    401
                ));

                await expect(client.getMe()).rejects.toThrow();
            });
        });

        describe('getMyArticles()', () => {
            it('should return published articles', async () => {
                const mockArticles = [
                    { id: 1, title: 'Article 1', published: true },
                    { id: 2, title: 'Article 2', published: true }
                ];

                mockFetch.mockResolvedValueOnce(createMockResponse(mockArticles));

                const result = await client.getMyArticles();

                expect(result).toHaveLength(2);
                expect(result[0].title).toBe('Article 1');
            });

            it('should support pagination', async () => {
                mockFetch.mockResolvedValueOnce(createMockResponse([]));

                await client.getMyArticles(2, 10);

                expect(mockFetch).toHaveBeenCalledWith(
                    expect.stringContaining('page=2'),
                    expect.anything()
                );
            });
        });

        describe('publishArticle()', () => {
            it('should publish article successfully', async () => {
                const mockPublished = {
                    id: 123,
                    title: 'New Article',
                    url: 'https://dev.to/user/new-article',
                    published: false
                };

                mockFetch.mockResolvedValueOnce(createMockResponse(mockPublished));

                const result = await client.publishArticle({
                    title: 'New Article',
                    body_markdown: '# Hello World'
                });

                expect(result.id).toBe(123);
                expect(result.url).toContain('dev.to');
            });

            it('should send article data in body', async () => {
                mockFetch.mockResolvedValueOnce(createMockResponse({ id: 1 }));

                await client.publishArticle({
                    title: 'Test',
                    body_markdown: 'Content',
                    tags: ['javascript', 'webdev'],
                    canonical_url: 'https://example.com/article'
                });

                expect(mockFetch).toHaveBeenCalledWith(
                    expect.stringContaining('/articles'),
                    expect.objectContaining({
                        method: 'POST',
                        body: expect.stringContaining('Test')
                    })
                );
            });
        });

        describe('updateArticle()', () => {
            it('should update article successfully', async () => {
                mockFetch.mockResolvedValueOnce(createMockResponse({
                    id: 123,
                    title: 'Updated Title'
                }));

                const result = await client.updateArticle(123, {
                    title: 'Updated Title'
                });

                expect(result.title).toBe('Updated Title');
            });

            it('should use PUT method', async () => {
                mockFetch.mockResolvedValueOnce(createMockResponse({ id: 123 }));

                await client.updateArticle(123, { published: true });

                expect(mockFetch).toHaveBeenCalledWith(
                    expect.stringContaining('/articles/123'),
                    expect.objectContaining({ method: 'PUT' })
                );
            });
        });

        describe('testConnection()', () => {
            it('should return true on successful connection', async () => {
                mockFetch.mockResolvedValueOnce(createMockResponse({ id: 1, username: 'user' }));

                const result = await client.testConnection();

                expect(result).toBe(true);
            });

            it('should return false on failed connection', async () => {
                mockFetch.mockResolvedValueOnce(createMockResponse(
                    { error: 'Invalid API key' },
                    false,
                    401
                ));

                const result = await client.testConnection();

                expect(result).toBe(false);
            });
        });
    });

    describe('adaptArticleForDevTo()', () => {
        it('should extract title from frontmatter', () => {
            const markdown = `---
title: "My Test Article"
description: "A test description"
---

# Content here`;

            const result = adaptArticleForDevTo(markdown, 'https://example.com/article');

            expect(result.title).toBe('My Test Article');
            expect(result.description).toBe('A test description');
        });

        it('should remove frontmatter from content', () => {
            const markdown = `---
title: "Test"
---

# Actual Content`;

            const result = adaptArticleForDevTo(markdown, 'https://example.com');

            // Check that the title frontmatter line is removed
            expect(result.body_markdown).not.toContain('title: "Test"');
            expect(result.body_markdown).toContain('Actual Content');
        });

        it('should remove AdSense placeholders', () => {
            const markdown = `---
title: "Test"
---

Some content
<!-- AD -->
More content
<!-- AD:BANNER -->
End`;

            const result = adaptArticleForDevTo(markdown, 'https://example.com');

            expect(result.body_markdown).not.toContain('<!-- AD');
        });

        it('should add canonical URL note', () => {
            const result = adaptArticleForDevTo(
                '---\ntitle: "Test"\n---\nContent',
                'https://myblog.com/article'
            );

            expect(result.body_markdown).toContain('Originally published at');
            expect(result.body_markdown).toContain('myblog.com');
        });

        it('should set canonical_url', () => {
            const result = adaptArticleForDevTo(
                '---\ntitle: "Test"\n---\nContent',
                'https://example.com/post'
            );

            expect(result.canonical_url).toBe('https://example.com/post');
        });

        it('should limit tags to 4', () => {
            const result = adaptArticleForDevTo(
                '---\ntitle: "Test"\n---\nContent',
                'https://example.com',
                ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6']
            );

            expect(result.tags).toHaveLength(4);
        });

        it('should default to unpublished (draft)', () => {
            const result = adaptArticleForDevTo(
                '---\ntitle: "Test"\n---\nContent',
                'https://example.com'
            );

            expect(result.published).toBe(false);
        });
    });

    describe('nicheToDevToTags()', () => {
        it('should map Technology niche to tags', () => {
            const tags = nicheToDevToTags('Technology');

            expect(tags).toContain('technology');
            expect(tags).toContain('programming');
        });

        it('should map Personal Finance niche', () => {
            const tags = nicheToDevToTags('Personal Finance');

            expect(tags).toContain('finance');
        });

        it('should map Cybersecurity niche', () => {
            const tags = nicheToDevToTags('Cybersecurity');

            expect(tags).toContain('security');
            expect(tags).toContain('cybersecurity');
        });

        it('should return General tags for unknown niche', () => {
            const tags = nicheToDevToTags('Unknown Niche');

            expect(tags).toContain('programming');
            expect(tags).toContain('webdev');
        });
    });
});
