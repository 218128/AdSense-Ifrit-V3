/**
 * Tests for Dashboard Component
 * 
 * Tests the main generation dashboard with state management and API calls
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '@/components/shared/Dashboard';

// Mock the SettingsView module
jest.mock('@/components/settings/SettingsView', () => ({
    __esModule: true,
    default: () => <div data-testid="settings-modal">Settings Modal</div>,
    getUserSettings: jest.fn(() => ({
        geminiKey: 'test-gemini-key',
        blogUrl: 'https://test-blog.com'
    })),
    getEnabledProviderKeys: jest.fn(() => ({ gemini: 'test-key' }))
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Dashboard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockReset();
    });

    describe('rendering', () => {
        it('should render the generate button', () => {
            render(<Dashboard />);

            expect(screen.getByText('Trigger Ifrit Autonomy')).toBeInTheDocument();
        });

        it('should render settings modal', () => {
            render(<Dashboard />);

            expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
        });

        it('should render Zap icon in button', () => {
            render(<Dashboard />);

            const button = screen.getByText('Trigger Ifrit Autonomy').closest('button');
            expect(button).toContainHTML('svg');
        });
    });

    describe('generation flow', () => {
        it('should show loading state when generating', async () => {
            mockFetch.mockImplementation(() => new Promise(() => { })); // Never resolves

            render(<Dashboard />);

            const button = screen.getByText('Trigger Ifrit Autonomy');
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText('Ifrit is Thinking...')).toBeInTheDocument();
            });
        });

        it('should disable button while generating', async () => {
            mockFetch.mockImplementation(() => new Promise(() => { }));

            render(<Dashboard />);

            const button = screen.getByText('Trigger Ifrit Autonomy');
            fireEvent.click(button);

            await waitFor(() => {
                const loadingButton = screen.getByText('Ifrit is Thinking...').closest('button');
                expect(loadingButton).toBeDisabled();
            });
        });

        it('should show status message during generation', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ message: 'Article generated', article: 'New Article Title' })
            });

            render(<Dashboard />);

            fireEvent.click(screen.getByText('Trigger Ifrit Autonomy'));

            await waitFor(() => {
                expect(screen.getByText(/Initializing Ifrit Engine|Scanning for trends|Success/)).toBeInTheDocument();
            });
        });

        it('should call /api/generate endpoint', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ message: 'Success', article: 'Test' })
            });

            render(<Dashboard />);

            fireEvent.click(screen.getByText('Trigger Ifrit Autonomy'));

            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalledWith('/api/generate', expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                }));
            });
        });

        it('should show success status on successful generation', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ message: 'Article created', article: 'New Article' })
            });

            render(<Dashboard />);

            fireEvent.click(screen.getByText('Trigger Ifrit Autonomy'));

            await waitFor(() => {
                expect(screen.getByText(/Success/)).toBeInTheDocument();
            });
        });

        it('should show warning status when response includes warning', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    message: 'Article created',
                    article: 'New Article',
                    warning: 'Some images may not have loaded'
                })
            });

            render(<Dashboard />);

            fireEvent.click(screen.getByText('Trigger Ifrit Autonomy'));

            await waitFor(() => {
                expect(screen.getByText(/Note:/)).toBeInTheDocument();
            });
        });

        it('should show error status on API failure', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                json: () => Promise.resolve({ error: 'API rate limit exceeded' })
            });

            render(<Dashboard />);

            fireEvent.click(screen.getByText('Trigger Ifrit Autonomy'));

            await waitFor(() => {
                expect(screen.getByText(/Error:/)).toBeInTheDocument();
            });
        });

        it('should show error on network failure', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            render(<Dashboard />);

            fireEvent.click(screen.getByText('Trigger Ifrit Autonomy'));

            await waitFor(() => {
                expect(screen.getByText(/System Failure/)).toBeInTheDocument();
            });
        });
    });

    describe('without API key', () => {
        it('should show error when no Gemini key is set', async () => {
            // Override getUserSettings to return no key
            const SettingsModule = jest.requireMock('@/components/settings/SettingsView');
            SettingsModule.getUserSettings.mockReturnValueOnce({
                geminiKey: null,
                blogUrl: 'https://test-blog.com'
            });

            render(<Dashboard />);

            fireEvent.click(screen.getByText('Trigger Ifrit Autonomy'));

            await waitFor(() => {
                expect(screen.getByText(/No Gemini API Key found/)).toBeInTheDocument();
            });
        });
    });
});
