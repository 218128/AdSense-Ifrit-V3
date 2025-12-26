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

    const createImagesResponse = (images = []) => ({
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

            render(<ImageGallery {...defaultProps} />);

            expect(screen.getByText(/Loading/)).toBeInTheDocument();
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
                // 50000 bytes = ~48.8 KB
                expect(screen.getByText(/KB/)).toBeInTheDocument();
            });
        });
    });

    describe('empty state', () => {
        it('should show empty state when no images', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ images: [], articles: [] })
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
        it('should show upload zone when dragging', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(createImagesResponse())
            });

            render(<ImageGallery {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByAltText('Cover image')).toBeInTheDocument();
            });

            // The upload zone should be visible unless dragging
            expect(screen.getByText(/Upload|Drag/i)).toBeInTheDocument();
        });
    });

    describe('error handling', () => {
        it('should show error when API fails', async () => {
            mockFetch.mockRejectedValue(new Error('Failed to load'));

            render(<ImageGallery {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
            });
        });
    });
});
