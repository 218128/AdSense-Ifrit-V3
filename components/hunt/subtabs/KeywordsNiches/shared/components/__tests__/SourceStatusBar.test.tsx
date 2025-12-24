/**
 * SourceStatusBar Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SourceStatusBar } from '../SourceStatusBar';

describe('SourceStatusBar', () => {
    it('returns null when no sources provided', () => {
        const { container } = render(<SourceStatusBar sources={{}} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders "Sources:" label when sources exist', () => {
        const sources = {
            'Hacker News': { success: true, count: 5 }
        };
        render(<SourceStatusBar sources={sources} />);
        expect(screen.getByText('Sources:')).toBeInTheDocument();
    });

    it('displays successful source with count', () => {
        const sources = {
            'google_news': { success: true, count: 10 }
        };
        render(<SourceStatusBar sources={sources} />);
        expect(screen.getByText('google news')).toBeInTheDocument();
        expect(screen.getByText('(10)')).toBeInTheDocument();
    });

    it('displays failed source without count', () => {
        const sources = {
            'brave': { success: false, count: 0, error: 'API error' }
        };
        render(<SourceStatusBar sources={sources} />);
        expect(screen.getByText('brave')).toBeInTheDocument();
        expect(screen.queryByText('(0)')).not.toBeInTheDocument();
    });

    it('renders multiple sources', () => {
        const sources = {
            'Hacker News': { success: true, count: 5 },
            'Google News': { success: true, count: 8 },
            'Brave': { success: false, count: 0 }
        };
        render(<SourceStatusBar sources={sources} />);
        expect(screen.getByText('Hacker News')).toBeInTheDocument();
        expect(screen.getByText('Google News')).toBeInTheDocument();
        expect(screen.getByText('Brave')).toBeInTheDocument();
    });
});
