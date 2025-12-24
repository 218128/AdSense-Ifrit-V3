/**
 * HistoryPanel Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HistoryPanel } from '../HistoryPanel';

describe('HistoryPanel', () => {
    const mockHistory = [
        {
            id: '1',
            keywords: [
                { keyword: 'react', source: 'test' as const },
                { keyword: 'typescript', source: 'test' as const }
            ],
            timestamp: Date.now() - 3600000
        },
        {
            id: '2',
            keywords: [
                { keyword: 'vue', source: 'test' as const },
                { keyword: 'javascript', source: 'test' as const }
            ],
            timestamp: Date.now() - 7200000
        },
    ];

    it('renders panel title', () => {
        render(
            <HistoryPanel
                history={mockHistory}
                onLoadItem={jest.fn()}
                onClear={jest.fn()}
                onClose={jest.fn()}
            />
        );
        expect(screen.getByText('Analysis History')).toBeInTheDocument();
    });

    it('returns null when no history', () => {
        const { container } = render(
            <HistoryPanel
                history={[]}
                onLoadItem={jest.fn()}
                onClear={jest.fn()}
                onClose={jest.fn()}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('shows clear button when history exists', () => {
        render(
            <HistoryPanel
                history={mockHistory}
                onLoadItem={jest.fn()}
                onClear={jest.fn()}
                onClose={jest.fn()}
            />
        );
        expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('calls onClear when clear clicked', () => {
        const onClear = jest.fn();
        render(
            <HistoryPanel
                history={mockHistory}
                onLoadItem={jest.fn()}
                onClear={onClear}
                onClose={jest.fn()}
            />
        );
        fireEvent.click(screen.getByText('Clear'));
        expect(onClear).toHaveBeenCalledTimes(1);
    });

    it('displays keyword names from history', () => {
        render(
            <HistoryPanel
                history={mockHistory}
                onLoadItem={jest.fn()}
                onClear={jest.fn()}
                onClose={jest.fn()}
            />
        );
        expect(screen.getByText(/react/)).toBeInTheDocument();
    });
});
