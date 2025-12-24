/**
 * TipSection Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TipSection } from '../TipSection';

describe('TipSection', () => {
    it('renders the tips heading', () => {
        render(<TipSection onHide={jest.fn()} />);
        expect(screen.getByText('How to Use Live Trends')).toBeInTheDocument();
    });

    it('renders tip content', () => {
        render(<TipSection onHide={jest.fn()} />);
        expect(screen.getByText(/High CPC trends/)).toBeInTheDocument();
    });

    it('renders hide button', () => {
        render(<TipSection onHide={jest.fn()} />);
        expect(screen.getByText('Hide')).toBeInTheDocument();
    });

    it('calls onHide when hide button clicked', () => {
        const onHide = jest.fn();
        render(<TipSection onHide={onHide} />);
        fireEvent.click(screen.getByText('Hide'));
        expect(onHide).toHaveBeenCalledTimes(1);
    });
});
