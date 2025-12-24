/**
 * SelectionBar Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SelectionBar } from '../SelectionBar';

describe('SelectionBar', () => {
    const defaultProps = {
        selectedCount: 0,
        totalCount: 10,
        onSelectAll: jest.fn(),
        onClear: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('rendering', () => {
        it('shows empty message when nothing selected', () => {
            render(<SelectionBar {...defaultProps} />);
            expect(screen.getByText('Click items to select')).toBeInTheDocument();
        });

        it('shows custom empty message', () => {
            render(<SelectionBar {...defaultProps} emptyMessage="Select trends" />);
            expect(screen.getByText('Select trends')).toBeInTheDocument();
        });

        it('shows selected count when items selected', () => {
            render(<SelectionBar {...defaultProps} selectedCount={3} />);
            expect(screen.getByText('3 selected')).toBeInTheDocument();
        });

        it('shows total count', () => {
            render(<SelectionBar {...defaultProps} />);
            expect(screen.getByText('10 total')).toBeInTheDocument();
        });

        it('shows high-CPC count when provided', () => {
            render(<SelectionBar {...defaultProps} highValueCount={5} />);
            expect(screen.getByText('5 high-CPC')).toBeInTheDocument();
        });
    });

    describe('buttons', () => {
        it('renders Select All and Clear buttons', () => {
            render(<SelectionBar {...defaultProps} />);
            expect(screen.getByText('Select All')).toBeInTheDocument();
            expect(screen.getByText('Clear')).toBeInTheDocument();
        });

        it('calls onSelectAll when Select All clicked', () => {
            render(<SelectionBar {...defaultProps} />);
            fireEvent.click(screen.getByText('Select All'));
            expect(defaultProps.onSelectAll).toHaveBeenCalledTimes(1);
        });

        it('calls onClear when Clear clicked', () => {
            render(<SelectionBar {...defaultProps} />);
            fireEvent.click(screen.getByText('Clear'));
            expect(defaultProps.onClear).toHaveBeenCalledTimes(1);
        });
    });

    describe('action button', () => {
        it('hides action button when no selection', () => {
            const onAction = jest.fn();
            render(<SelectionBar {...defaultProps} onAction={onAction} />);
            expect(screen.queryByText(/Analyze Selected/)).not.toBeInTheDocument();
        });

        it('shows action button when items selected and onAction provided', () => {
            const onAction = jest.fn();
            render(<SelectionBar {...defaultProps} selectedCount={3} onAction={onAction} />);
            expect(screen.getByText('Analyze Selected (3)')).toBeInTheDocument();
        });

        it('shows custom action label', () => {
            const onAction = jest.fn();
            render(
                <SelectionBar
                    {...defaultProps}
                    selectedCount={2}
                    onAction={onAction}
                    actionLabel="Process"
                />
            );
            expect(screen.getByText('Process (2)')).toBeInTheDocument();
        });

        it('calls onAction when action button clicked', () => {
            const onAction = jest.fn();
            render(<SelectionBar {...defaultProps} selectedCount={3} onAction={onAction} />);
            fireEvent.click(screen.getByText('Analyze Selected (3)'));
            expect(onAction).toHaveBeenCalledTimes(1);
        });
    });
});
