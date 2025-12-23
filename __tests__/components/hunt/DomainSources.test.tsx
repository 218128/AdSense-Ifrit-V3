/**
 * DomainSources Component Tests
 * 
 * Tests for the domain import UI component.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DomainSources from '@/components/hunt/DomainDomination/DomainSources';

// Mock props factory
const createMockProps = (overrides = {}) => ({
    // Manual Import
    manualInput: '',
    setManualInput: jest.fn(),
    handleCSVUpload: jest.fn(),
    parseManualDomains: jest.fn(),
    clearManual: jest.fn(),
    manualDomains: [],
    isParsingManual: false,

    // Free Scraping
    fetchFreeDomains: jest.fn(),
    freeLoading: false,
    freeDomains: [],
    freeError: null,
    freeActionRequired: null,

    // Premium/Spamzilla
    spamzillaConfigured: false,
    enrichAllDomains: jest.fn(),
    enriching: false,
    allDomains: [],

    ...overrides
});

describe('DomainSources', () => {
    describe('Rendering', () => {
        it('should render all three columns', () => {
            render(<DomainSources {...createMockProps()} />);

            // Check for column headers - use getAllByText for SpamZilla since it appears multiple times
            expect(screen.getByText(/Discovery Import/i)).toBeInTheDocument();
            expect(screen.getByText(/Free Scraping/i)).toBeInTheDocument();
            expect(screen.getAllByText(/SpamZilla/i).length).toBeGreaterThan(0);
        });

        it('should render CSV upload button', () => {
            render(<DomainSources {...createMockProps()} />);

            expect(screen.getByText(/Upload CSV/i)).toBeInTheDocument();
        });

        it('should render search button for free sources', () => {
            render(<DomainSources {...createMockProps()} />);

            expect(screen.getByRole('button', { name: /Search Free Sources/i })).toBeInTheDocument();
        });
    });

    describe('Manual Import', () => {
        it('should have file input for CSV upload', () => {
            render(<DomainSources {...createMockProps()} />);

            const fileInputs = document.querySelectorAll('input[type="file"]');
            expect(fileInputs.length).toBeGreaterThan(0);
        });

        it('should have parse button', () => {
            render(<DomainSources {...createMockProps()} />);

            expect(screen.getByRole('button', { name: /Parse/i })).toBeInTheDocument();
        });
    });

    describe('Free Scraping', () => {
        it('should call fetchFreeDomains when search button clicked', async () => {
            const fetchFreeDomains = jest.fn();
            const props = createMockProps({ fetchFreeDomains });

            render(<DomainSources {...props} />);

            const searchButton = screen.getByRole('button', { name: /Search Free Sources/i });
            await userEvent.click(searchButton);

            expect(fetchFreeDomains).toHaveBeenCalledTimes(1);
        });

        it('should display error message when provided', () => {
            const props = createMockProps({
                freeError: 'Network error occurred'
            });

            render(<DomainSources {...props} />);

            expect(screen.getByText(/Network error occurred/i)).toBeInTheDocument();
        });

        it('should display action required warning when error present', () => {
            const props = createMockProps({
                freeError: 'Error occurred',
                freeActionRequired: {
                    type: 'captcha',
                    message: 'Captcha required',
                    action: 'Complete captcha',
                    url: 'https://example.com'
                }
            });

            render(<DomainSources {...props} />);

            expect(screen.getByText(/Captcha required/i)).toBeInTheDocument();
        });
    });

    describe('SpamZilla Integration', () => {
        it('should show SpamZilla Import label', () => {
            const props = createMockProps({ spamzillaConfigured: false });

            render(<DomainSources {...props} />);

            // Should indicate CSV import
            expect(screen.getByText(/SpamZilla Import/i)).toBeInTheDocument();
        });

        it('should have Import SpamZilla CSV button', () => {
            render(<DomainSources {...createMockProps()} />);

            expect(screen.getByText(/Import SpamZilla CSV/i)).toBeInTheDocument();
        });

        it('should show preset badges', () => {
            render(<DomainSources {...createMockProps()} />);

            expect(screen.getByText(/Gold/)).toBeInTheDocument();
            expect(screen.getByText(/Safe/)).toBeInTheDocument();
            expect(screen.getByText(/Volume/)).toBeInTheDocument();
        });

        it('should have link to SpamZilla website', () => {
            render(<DomainSources {...createMockProps()} />);

            const link = screen.getByText(/Open SpamZilla/i);
            expect(link).toBeInTheDocument();
            expect(link.closest('a')).toHaveAttribute('href', 'https://spamzilla.io');
        });
    });
});
