/**
 * Instagram API Tests
 * Enterprise-grade tests for Instagram API helper functions.
 */

import {
    calculateInstagramEngagement,
    getInstagramMediaUrl,
    extractInstagramHashtags,
    getCarouselImages,
    type InstagramMedia,
} from '@/features/sources/lib/instagramApi';

describe('Instagram API', () => {
    // =========================================================================
    // calculateInstagramEngagement
    // =========================================================================
    describe('calculateInstagramEngagement', () => {
        it('should calculate total engagement', () => {
            const media: InstagramMedia = {
                id: '123',
                media_type: 'IMAGE',
                permalink: 'https://instagram.com/p/123',
                timestamp: '2024-01-01T00:00:00Z',
                like_count: 500,
                comments_count: 50,
            };

            const engagement = calculateInstagramEngagement(media);
            expect(engagement).toBe(550);
        });

        it('should calculate engagement rate with followers', () => {
            const media: InstagramMedia = {
                id: '123',
                media_type: 'IMAGE',
                permalink: 'https://instagram.com/p/123',
                timestamp: '2024-01-01T00:00:00Z',
                like_count: 500,
                comments_count: 50,
            };

            const engagementRate = calculateInstagramEngagement(media, 10000);
            expect(engagementRate).toBe(5.5); // 550/10000 * 100 = 5.5%
        });

        it('should handle missing counts', () => {
            const media: InstagramMedia = {
                id: '123',
                media_type: 'IMAGE',
                permalink: 'https://instagram.com/p/123',
                timestamp: '2024-01-01T00:00:00Z',
            };

            expect(calculateInstagramEngagement(media)).toBe(0);
        });

        it('should handle likes only', () => {
            const media: InstagramMedia = {
                id: '123',
                media_type: 'IMAGE',
                permalink: 'https://instagram.com/p/123',
                timestamp: '2024-01-01T00:00:00Z',
                like_count: 1000,
            };

            expect(calculateInstagramEngagement(media)).toBe(1000);
        });

        it('should handle comments only', () => {
            const media: InstagramMedia = {
                id: '123',
                media_type: 'IMAGE',
                permalink: 'https://instagram.com/p/123',
                timestamp: '2024-01-01T00:00:00Z',
                comments_count: 200,
            };

            expect(calculateInstagramEngagement(media)).toBe(200);
        });
    });

    // =========================================================================
    // getInstagramMediaUrl
    // =========================================================================
    describe('getInstagramMediaUrl', () => {
        it('should return media_url for images', () => {
            const media: InstagramMedia = {
                id: '123',
                media_type: 'IMAGE',
                media_url: 'https://images/photo.jpg',
                permalink: 'https://instagram.com/p/123',
                timestamp: '2024-01-01T00:00:00Z',
            };

            expect(getInstagramMediaUrl(media)).toBe('https://images/photo.jpg');
        });

        it('should return thumbnail_url for videos', () => {
            const media: InstagramMedia = {
                id: '123',
                media_type: 'VIDEO',
                media_url: 'https://videos/video.mp4',
                thumbnail_url: 'https://images/thumbnail.jpg',
                permalink: 'https://instagram.com/p/123',
                timestamp: '2024-01-01T00:00:00Z',
            };

            expect(getInstagramMediaUrl(media)).toBe('https://images/thumbnail.jpg');
        });

        it('should fall back to media_url for videos without thumbnail', () => {
            const media: InstagramMedia = {
                id: '123',
                media_type: 'VIDEO',
                media_url: 'https://videos/video.mp4',
                permalink: 'https://instagram.com/p/123',
                timestamp: '2024-01-01T00:00:00Z',
            };

            expect(getInstagramMediaUrl(media)).toBe('https://videos/video.mp4');
        });

        it('should return empty string when no URL', () => {
            const media: InstagramMedia = {
                id: '123',
                media_type: 'IMAGE',
                permalink: 'https://instagram.com/p/123',
                timestamp: '2024-01-01T00:00:00Z',
            };

            expect(getInstagramMediaUrl(media)).toBe('');
        });
    });

    // =========================================================================
    // extractInstagramHashtags
    // =========================================================================
    describe('extractInstagramHashtags', () => {
        it('should extract hashtags from caption', () => {
            const hashtags = extractInstagramHashtags('Great photo #travel #photography #summer');

            expect(hashtags).toHaveLength(3);
            expect(hashtags).toContain('#travel');
            expect(hashtags).toContain('#photography');
            expect(hashtags).toContain('#summer');
        });

        it('should handle multiple hashtags together', () => {
            const hashtags = extractInstagramHashtags('#one#two#three');

            expect(hashtags.length).toBeGreaterThanOrEqual(1);
        });

        it('should return empty array for no hashtags', () => {
            expect(extractInstagramHashtags('No hashtags here')).toEqual([]);
        });

        it('should return empty array for undefined', () => {
            expect(extractInstagramHashtags(undefined)).toEqual([]);
        });

        it('should return empty array for empty string', () => {
            expect(extractInstagramHashtags('')).toEqual([]);
        });

        it('should handle hashtags at start', () => {
            const hashtags = extractInstagramHashtags('#firsthashtag is important');
            expect(hashtags).toContain('#firsthashtag');
        });

        it('should handle hashtags at end', () => {
            const hashtags = extractInstagramHashtags('Check this out #lasthashtag');
            expect(hashtags).toContain('#lasthashtag');
        });
    });

    // =========================================================================
    // getCarouselImages
    // =========================================================================
    describe('getCarouselImages', () => {
        it('should extract images from carousel', () => {
            const media: InstagramMedia = {
                id: '123',
                media_type: 'CAROUSEL_ALBUM',
                permalink: 'https://instagram.com/p/123',
                timestamp: '2024-01-01T00:00:00Z',
                children: {
                    data: [
                        { id: '1', media_type: 'IMAGE', media_url: 'https://images/1.jpg' },
                        { id: '2', media_type: 'IMAGE', media_url: 'https://images/2.jpg' },
                        { id: '3', media_type: 'VIDEO', media_url: 'https://videos/3.mp4' },
                    ],
                },
            };

            const images = getCarouselImages(media);
            expect(images).toHaveLength(2);
            expect(images).toContain('https://images/1.jpg');
            expect(images).toContain('https://images/2.jpg');
        });

        it('should return single image for non-carousel', () => {
            const media: InstagramMedia = {
                id: '123',
                media_type: 'IMAGE',
                media_url: 'https://images/single.jpg',
                permalink: 'https://instagram.com/p/123',
                timestamp: '2024-01-01T00:00:00Z',
            };

            const images = getCarouselImages(media);
            expect(images).toEqual(['https://images/single.jpg']);
        });

        it('should return empty array for missing media_url', () => {
            const media: InstagramMedia = {
                id: '123',
                media_type: 'IMAGE',
                permalink: 'https://instagram.com/p/123',
                timestamp: '2024-01-01T00:00:00Z',
            };

            expect(getCarouselImages(media)).toEqual([]);
        });

        it('should handle empty children array', () => {
            const media: InstagramMedia = {
                id: '123',
                media_type: 'CAROUSEL_ALBUM',
                permalink: 'https://instagram.com/p/123',
                timestamp: '2024-01-01T00:00:00Z',
                children: { data: [] },
            };

            expect(getCarouselImages(media)).toEqual([]);
        });
    });
});
