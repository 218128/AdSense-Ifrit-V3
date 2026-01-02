/**
 * Tests for ImageGallery Component
 * 
 * Tests image management functionality for articles
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ImageGallery from '@/components/websites/ImageGallery';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ImageGallery', () => {
    const defaultProps = {
        domain: 'test-domain.com'
    };

    const createImagesResponse = (images: { id: string; url: string; filename: string; type: string; articleSlug: string; articleTitle?: string; alt: string; sizeBytes: number; createdAt: number }[] = []) => ({
        success: true,
        totalSizeMB: '0.12',
        images: images.length ? images : [
            {
                id: 'img-1',
                url: '/images/test-domain.com/article-1/cover.png',
                filename: 'cover.png',
                type: 'cover',
                articleSlug: 'article-1',
                articleTitle: 'Test Article',
                alt: 'Cover image',
                sizeBytes: 50000,
                createdAt: Date.now()
            },
            {
                id: 'img-2',
                url: '/images/test-domain.com/article-1/img-001.png',
                filename: 'img-001.png',
                type: 'content',
                articleSlug: 'article-1',
                articleTitle: 'Test Article',
                alt: 'Content image',
                sizeBytes: 75000,
                createdAt: Date.now()
            }
        ],
        articles: [
            { slug: 'article-1', title: 'Test Article' }
        ]
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockReset();
    });

    describe('loading state', () => {
        it('should show loading state initially', () => {
            mockFetch.mockImplementation(() => new Promise(() => { }));

            const { container } = render(<ImageGallery {...defaultProps} />);

            // Component shows Loader2 spinner (SVG with animate-spin class)
            expect(container.querySelector('.animate-spin')).toBeInTheDocument();
        });
    });

    describe('displaying images', () => {
        it('should display images from API', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(createImagesResponse())
            });

            render(<ImageGallery {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByAltText('Cover image')).toBeInTheDocument();
            });
        });

        it('should show image count', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(createImagesResponse())
            });

            render(<ImageGallery {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText(/2 images/i)).toBeInTheDocument();
            });
        });

        it('should show file sizes', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(createImagesResponse())
            });

            render(<ImageGallery {...defaultProps} />);

            await waitFor(() => {
                // Component shows total size in MB (from totalSizeMB field)
                expect(screen.getByText(/MB/)).toBeInTheDocument();
            });
        });
    });

    describe('empty state', () => {
        it('should show empty state when no images', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true, images: [], articles: [], totalSizeMB: '0' })
            });

            render(<ImageGallery {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText(/No images/i)).toBeInTheDocument();
            });
        });
    });

    describe('filtering', () => {
        it('should filter images by article when articleSlug prop provided', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(createImagesResponse([
                    {
                        id: 'img-1',
                        url: '/images/cover.png',
                        filename: 'cover.png',
                        type: 'cover',
                        articleSlug: 'article-1',
                        alt: 'Article 1 Cover',
                        sizeBytes: 50000,
                        createdAt: Date.now()
                    },
                    {
                        id: 'img-2',
                        url: '/images/cover.png',
                        filename: 'cover.png',
                        type: 'cover',
                        articleSlug: 'article-2',
                        alt: 'Article 2 Cover',
                        sizeBytes: 50000,
                        createdAt: Date.now()
                    }
                ]))
            });

            render(<ImageGallery domain="test-domain.com" articleSlug="article-1" />);

            await waitFor(() => {
                expect(screen.getByAltText('Article 1 Cover')).toBeInTheDocument();
            });
        });
    });

    describe('picker mode', () => {
        it('should call onSelect when image clicked in picker mode', async () => {
            const onSelect = jest.fn();
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(createImagesResponse())
            });

            render(<ImageGallery {...defaultProps} pickerMode={true} onSelect={onSelect} />);

            await waitFor(() => {
                expect(screen.getByAltText('Cover image')).toBeInTheDocument();
            });

            // Click on image
            const image = screen.getByAltText('Cover image');
            fireEvent.click(image.closest('div')!);

            await waitFor(() => {
                expect(onSelect).toHaveBeenCalled();
            });
        });
    });

    describe('drag and drop', () => {
        it('should show upload zone when article is selected', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(createImagesResponse())
            });

            // Drop zone only shows when selectedArticle is set
            render(<ImageGallery domain="test-domain.com" articleSlug="article-1" />);

            await waitFor(() => {
                expect(screen.getByAltText('Cover image')).toBeInTheDocument();
            });

            // The upload zone says "Drop images here"
            expect(screen.getByText(/Drop images here/i)).toBeInTheDocument();
        });
    });

    describe('error handling', () => {
        it('should handle API failure gracefully', async () => {
            mockFetch.mockRejectedValue(new Error('Failed to load'));

            // Component should not crash and should complete loading
            const { container } = render(<ImageGallery {...defaultProps} />);

            await waitFor(() => {
                // After error, loading should be false (spinner disappears)
                // Component silently logs errors - no error UI shown
                expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
            });
        });
    });
});
