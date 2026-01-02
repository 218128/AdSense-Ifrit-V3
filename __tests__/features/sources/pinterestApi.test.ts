/**
 * Pinterest API Tests
 * Enterprise-grade tests for Pinterest API helper functions.
 */

import {
    getPinImageUrl,
    getPinText,
    hasExternalLink,
    getBoardUrl,
    getPinUrl,
    type PinterestPin,
    type PinterestBoard,
} from '@/features/sources/lib/pinterestApi';

describe('Pinterest API', () => {
    // =========================================================================
    // getPinImageUrl
    // =========================================================================
    describe('getPinImageUrl', () => {
        it('should return large image by default', () => {
            const pin: PinterestPin = {
                id: '123',
                created_at: '2024-01-01T00:00:00Z',
                board_id: 'board123',
                media: {
                    media_type: 'image',
                    images: {
                        '150x150': { url: 'https://small.jpg', width: 150, height: 150 },
                        '400x300': { url: 'https://medium.jpg', width: 400, height: 300 },
                        '1200x': { url: 'https://large.jpg', width: 1200, height: 800 },
                    },
                },
            };

            expect(getPinImageUrl(pin)).toBe('https://large.jpg');
        });

        it('should return medium image when requested', () => {
            const pin: PinterestPin = {
                id: '123',
                created_at: '2024-01-01T00:00:00Z',
                board_id: 'board123',
                media: {
                    media_type: 'image',
                    images: {
                        '150x150': { url: 'https://small.jpg', width: 150, height: 150 },
                        '400x300': { url: 'https://medium.jpg', width: 400, height: 300 },
                    },
                },
            };

            expect(getPinImageUrl(pin, 'medium')).toBe('https://medium.jpg');
        });

        it('should return small image when requested', () => {
            const pin: PinterestPin = {
                id: '123',
                created_at: '2024-01-01T00:00:00Z',
                board_id: 'board123',
                media: {
                    media_type: 'image',
                    images: {
                        '150x150': { url: 'https://small.jpg', width: 150, height: 150 },
                    },
                },
            };

            expect(getPinImageUrl(pin, 'small')).toBe('https://small.jpg');
        });

        it('should fallback to any available size', () => {
            const pin: PinterestPin = {
                id: '123',
                created_at: '2024-01-01T00:00:00Z',
                board_id: 'board123',
                media: {
                    media_type: 'image',
                    images: {
                        'originals': { url: 'https://original.jpg', width: 2000, height: 1500 },
                    },
                },
            };

            // Requested 'large' but only 'originals' exists
            expect(getPinImageUrl(pin, 'large')).toBe('https://original.jpg');
        });

        it('should return empty string when no images', () => {
            const pin: PinterestPin = {
                id: '123',
                created_at: '2024-01-01T00:00:00Z',
                board_id: 'board123',
                media: {
                    media_type: 'image',
                },
            };

            expect(getPinImageUrl(pin)).toBe('');
        });

        it('should handle video media type', () => {
            const pin: PinterestPin = {
                id: '123',
                created_at: '2024-01-01T00:00:00Z',
                board_id: 'board123',
                media: {
                    media_type: 'video',
                    images: {
                        '600x': { url: 'https://thumbnail.jpg', width: 600, height: 400 },
                    },
                },
            };

            expect(getPinImageUrl(pin)).toBe('https://thumbnail.jpg');
        });
    });

    // =========================================================================
    // getPinText
    // =========================================================================
    describe('getPinText', () => {
        it('should return title if available', () => {
            const pin: PinterestPin = {
                id: '123',
                title: 'Pin Title',
                description: 'Pin Description',
                created_at: '2024-01-01T00:00:00Z',
                board_id: 'board123',
                media: { media_type: 'image' },
            };

            expect(getPinText(pin)).toBe('Pin Title');
        });

        it('should fall back to description', () => {
            const pin: PinterestPin = {
                id: '123',
                description: 'Pin Description',
                created_at: '2024-01-01T00:00:00Z',
                board_id: 'board123',
                media: { media_type: 'image' },
            };

            expect(getPinText(pin)).toBe('Pin Description');
        });

        it('should return empty string when no text', () => {
            const pin: PinterestPin = {
                id: '123',
                created_at: '2024-01-01T00:00:00Z',
                board_id: 'board123',
                media: { media_type: 'image' },
            };

            expect(getPinText(pin)).toBe('');
        });

        it('should prefer title over description', () => {
            const pin: PinterestPin = {
                id: '123',
                title: 'Title',
                description: 'Description',
                created_at: '2024-01-01T00:00:00Z',
                board_id: 'board123',
                media: { media_type: 'image' },
            };

            expect(getPinText(pin)).toBe('Title');
        });
    });

    // =========================================================================
    // hasExternalLink
    // =========================================================================
    describe('hasExternalLink', () => {
        it('should detect external links', () => {
            const pin: PinterestPin = {
                id: '123',
                link: 'https://example.com/product',
                created_at: '2024-01-01T00:00:00Z',
                board_id: 'board123',
                media: { media_type: 'image' },
            };

            expect(hasExternalLink(pin)).toBe(true);
        });

        it('should reject pinterest.com links', () => {
            const pin: PinterestPin = {
                id: '123',
                link: 'https://pinterest.com/pin/123',
                created_at: '2024-01-01T00:00:00Z',
                board_id: 'board123',
                media: { media_type: 'image' },
            };

            expect(hasExternalLink(pin)).toBe(false);
        });

        it('should return false when no link', () => {
            const pin: PinterestPin = {
                id: '123',
                created_at: '2024-01-01T00:00:00Z',
                board_id: 'board123',
                media: { media_type: 'image' },
            };

            expect(hasExternalLink(pin)).toBe(false);
        });

        it('should detect affiliate links', () => {
            const pin: PinterestPin = {
                id: '123',
                link: 'https://amazon.com/dp/B08N5WRWNW?tag=mytag-20',
                created_at: '2024-01-01T00:00:00Z',
                board_id: 'board123',
                media: { media_type: 'image' },
            };

            expect(hasExternalLink(pin)).toBe(true);
        });

        it('should handle empty string link', () => {
            const pin: PinterestPin = {
                id: '123',
                link: '',
                created_at: '2024-01-01T00:00:00Z',
                board_id: 'board123',
                media: { media_type: 'image' },
            };

            expect(hasExternalLink(pin)).toBe(false);
        });
    });

    // =========================================================================
    // URL Generators
    // =========================================================================
    describe('URL Generators', () => {
        it('should generate board URL', () => {
            const board: PinterestBoard = {
                id: 'board123',
                name: 'My Board',
                privacy: 'PUBLIC',
                owner: { username: 'johndoe' },
            };

            expect(getBoardUrl(board)).toBe('https://pinterest.com/johndoe/board123');
        });

        it('should generate pin URL', () => {
            expect(getPinUrl('pin456')).toBe('https://pinterest.com/pin/pin456');
        });

        it('should handle special characters in board ID', () => {
            const board: PinterestBoard = {
                id: 'board-with-dashes',
                name: 'My Board',
                privacy: 'PUBLIC',
                owner: { username: 'user123' },
            };

            expect(getBoardUrl(board)).toBe('https://pinterest.com/user123/board-with-dashes');
        });
    });
});
