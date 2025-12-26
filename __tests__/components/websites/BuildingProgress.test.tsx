/**
 * Tests for BuildingProgress Component
 * 
 * Tests the progress display for website content generation jobs
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import BuildingProgress from '@/components/websites/BuildingProgress';

// Mock fetch for polling
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock timers
jest.useFakeTimers();

describe('BuildingProgress', () => {
    const defaultProps = {
        domain: 'test-domain.com',
        onComplete: jest.fn()
    };

    const createJobResponse = (overrides = {}) => ({
        id: 'job-123',
        status: 'running',
        domain: 'test-domain.com',
        siteName: 'Test Site',
        niche: 'Technology',
        progress: {
            total: 10,
            completed: 3,
            failed: 0,
            retrying: 0,
            published: 2,
            pending: 7,
            processing: 1
        },
        currentProvider: 'gemini',
        currentItem: 'How to Use React Hooks',
        queueSummary: [],
        recentErrors: [],
        ...overrides
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockReset();
    });

    afterEach(() => {
        jest.clearAllTimers();
    });

    describe('rendering', () => {
        it('should show loading state initially', () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(null)
            });

            render(<BuildingProgress {...defaultProps} />);

            expect(screen.getByText(/Checking/)).toBeInTheDocument();
        });

        it('should display progress information when job is running', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(createJobResponse())
            });

            render(<BuildingProgress {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText(/3 \/ 10/)).toBeInTheDocument();
            });
        });

        it('should show current item being processed', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(createJobResponse())
            });

            render(<BuildingProgress {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText(/How to Use React Hooks/)).toBeInTheDocument();
            });
        });

        it('should display site name and niche', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(createJobResponse())
            });

            render(<BuildingProgress {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText(/Test Site/)).toBeInTheDocument();
            });
        });
    });

    describe('polling', () => {
        it('should poll for status updates', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(createJobResponse())
            });

            render(<BuildingProgress {...defaultProps} />);

            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalled();
            });

            // Advance timer to trigger next poll
            act(() => {
                jest.advanceTimersByTime(3000);
            });

            await waitFor(() => {
                expect(mockFetch.mock.calls.length).toBeGreaterThan(1);
            });
        });

        it('should call onComplete when job is done', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(createJobResponse({ status: 'completed' }))
            });

            render(<BuildingProgress {...defaultProps} />);

            await waitFor(() => {
                expect(defaultProps.onComplete).toHaveBeenCalled();
            });
        });
    });

    describe('error handling', () => {
        it('should display recent errors when present', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(createJobResponse({
                    recentErrors: [
                        { topic: 'Failed Article', error: 'Rate limit exceeded', willRetry: true }
                    ]
                }))
            });

            render(<BuildingProgress {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText(/Rate limit exceeded/)).toBeInTheDocument();
            });
        });

        it('should handle failed status', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(createJobResponse({
                    status: 'failed',
                    progress: { total: 10, completed: 5, failed: 5, pending: 0 }
                }))
            });

            render(<BuildingProgress {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText(/5/)).toBeInTheDocument();
            });
        });

        it('should handle API errors gracefully', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            render(<BuildingProgress {...defaultProps} />);

            // Should not crash, continues to poll
            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalled();
            });
        });
    });

    describe('job not found', () => {
        it('should handle no active job', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(null)
            });

            render(<BuildingProgress {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText(/No active/i)).toBeInTheDocument();
            });
        });
    });
});
