/**
 * Facebook API Tests
 * Enterprise-grade tests for Facebook Graph API helper functions.
 */

import {
    calculateFacebookEngagement,
    getFacebookPostImage,
    getFacebookPostText,
    getPostAge,
    type FacebookPost,
} from '@/features/sources/lib/facebookApi';

describe('Facebook API', () => {
    // =========================================================================
    // calculateFacebookEngagement
    // =========================================================================
    describe('calculateFacebookEngagement', () => {
        it('should calculate weighted engagement', () => {
            const post: FacebookPost = {
                id: '123',
                permalink_url: 'https://fb.com/123',
                created_time: '2024-01-01T00:00:00Z',
                reactions: { summary: { total_count: 100 } },
                comments: { summary: { total_count: 50 } },
                shares: { count: 25 },
            };

            // Formula: reactions (1x) + comments (2x) + shares (3x)
            // 100 + 100 + 75 = 275
            const engagement = calculateFacebookEngagement(post);
            expect(engagement).toBe(275);
        });

        it('should handle missing metrics', () => {
            const post: FacebookPost = {
                id: '123',
                permalink_url: 'https://fb.com/123',
                created_time: '2024-01-01T00:00:00Z',
            };

            const engagement = calculateFacebookEngagement(post);
            expect(engagement).toBe(0);
        });

        it('should handle partial metrics', () => {
            const post: FacebookPost = {
                id: '123',
                permalink_url: 'https://fb.com/123',
                created_time: '2024-01-01T00:00:00Z',
                reactions: { summary: { total_count: 50 } },
            };

            const engagement = calculateFacebookEngagement(post);
            expect(engagement).toBe(50);
        });

        it('should handle comments only', () => {
            const post: FacebookPost = {
                id: '123',
                permalink_url: 'https://fb.com/123',
                created_time: '2024-01-01T00:00:00Z',
                comments: { summary: { total_count: 30 } },
            };

            const engagement = calculateFacebookEngagement(post);
            expect(engagement).toBe(60); // 30 * 2
        });

        it('should handle shares only', () => {
            const post: FacebookPost = {
                id: '123',
                permalink_url: 'https://fb.com/123',
                created_time: '2024-01-01T00:00:00Z',
                shares: { count: 10 },
            };

            const engagement = calculateFacebookEngagement(post);
            expect(engagement).toBe(30); // 10 * 3
        });
    });

    // =========================================================================
    // getFacebookPostImage
    // =========================================================================
    describe('getFacebookPostImage', () => {
        it('should return full_picture if available', () => {
            const post: FacebookPost = {
                id: '123',
                permalink_url: 'https://fb.com/123',
                created_time: '2024-01-01T00:00:00Z',
                full_picture: 'https://images/full.jpg',
                attachments: {
                    data: [{
                        type: 'photo',
                        media: { image: { src: 'https://images/attachment.jpg', height: 100, width: 100 } },
                    }],
                },
            };

            expect(getFacebookPostImage(post)).toBe('https://images/full.jpg');
        });

        it('should fall back to attachment image', () => {
            const post: FacebookPost = {
                id: '123',
                permalink_url: 'https://fb.com/123',
                created_time: '2024-01-01T00:00:00Z',
                attachments: {
                    data: [{
                        type: 'photo',
                        media: { image: { src: 'https://images/attachment.jpg', height: 100, width: 100 } },
                    }],
                },
            };

            expect(getFacebookPostImage(post)).toBe('https://images/attachment.jpg');
        });

        it('should return undefined when no image', () => {
            const post: FacebookPost = {
                id: '123',
                permalink_url: 'https://fb.com/123',
                created_time: '2024-01-01T00:00:00Z',
            };

            expect(getFacebookPostImage(post)).toBeUndefined();
        });

        it('should handle empty attachments array', () => {
            const post: FacebookPost = {
                id: '123',
                permalink_url: 'https://fb.com/123',
                created_time: '2024-01-01T00:00:00Z',
                attachments: { data: [] },
            };

            expect(getFacebookPostImage(post)).toBeUndefined();
        });
    });

    // =========================================================================
    // getFacebookPostText
    // =========================================================================
    describe('getFacebookPostText', () => {
        it('should return message if available', () => {
            const post: FacebookPost = {
                id: '123',
                permalink_url: 'https://fb.com/123',
                created_time: '2024-01-01T00:00:00Z',
                message: 'This is the message',
                story: 'User shared a link',
            };

            expect(getFacebookPostText(post)).toBe('This is the message');
        });

        it('should fall back to story', () => {
            const post: FacebookPost = {
                id: '123',
                permalink_url: 'https://fb.com/123',
                created_time: '2024-01-01T00:00:00Z',
                story: 'User shared a link',
            };

            expect(getFacebookPostText(post)).toBe('User shared a link');
        });

        it('should return empty string when no text', () => {
            const post: FacebookPost = {
                id: '123',
                permalink_url: 'https://fb.com/123',
                created_time: '2024-01-01T00:00:00Z',
            };

            expect(getFacebookPostText(post)).toBe('');
        });
    });

    // =========================================================================
    // getPostAge
    // =========================================================================
    describe('getPostAge', () => {
        it('should format recent posts', () => {
            const now = new Date();
            const minutes30ago = new Date(now.getTime() - 30 * 60 * 1000);
            const post: FacebookPost = {
                id: '123',
                permalink_url: 'https://fb.com/123',
                created_time: minutes30ago.toISOString(),
            };

            expect(getPostAge(post)).toBe('Just now');
        });

        it('should format hours', () => {
            const now = new Date();
            const hours5ago = new Date(now.getTime() - 5 * 60 * 60 * 1000);
            const post: FacebookPost = {
                id: '123',
                permalink_url: 'https://fb.com/123',
                created_time: hours5ago.toISOString(),
            };

            expect(getPostAge(post)).toBe('5h ago');
        });

        it('should format days', () => {
            const now = new Date();
            const days3ago = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
            const post: FacebookPost = {
                id: '123',
                permalink_url: 'https://fb.com/123',
                created_time: days3ago.toISOString(),
            };

            expect(getPostAge(post)).toBe('3d ago');
        });

        it('should format weeks', () => {
            const now = new Date();
            const weeks2ago = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
            const post: FacebookPost = {
                id: '123',
                permalink_url: 'https://fb.com/123',
                created_time: weeks2ago.toISOString(),
            };

            expect(getPostAge(post)).toBe('2w ago');
        });
    });
});
