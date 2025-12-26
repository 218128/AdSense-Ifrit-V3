/**
 * Tests for SocialShareModal Component
 * 
 * Tests social sharing functionality for Twitter, LinkedIn, and clipboard
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SocialShareModal from '@/components/shared/SocialShareModal';

// Mock navigator.clipboard and navigator.share
const mockClipboard = {
    writeText: jest.fn().mockResolvedValue(undefined)
};

const mockShare = jest.fn().mockResolvedValue(undefined);

Object.defineProperty(navigator, 'clipboard', { value: mockClipboard, writable: true });
Object.defineProperty(navigator, 'share', { value: mockShare, writable: true });

describe('SocialShareModal', () => {
    const defaultProps = {
        articleTitle: 'Test Article Title',
        articleUrl: 'https://example.com/test-article',
        articleExcerpt: 'This is a test excerpt for the article.',
        onClose: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('rendering', () => {
        it('should render modal with article title', () => {
            render(<SocialShareModal {...defaultProps} />);

            expect(screen.getByText('Test Article Title')).toBeInTheDocument();
        });

        it('should render article URL', () => {
            render(<SocialShareModal {...defaultProps} />);

            expect(screen.getByText('https://example.com/test-article')).toBeInTheDocument();
        });

        it('should render Share Article header', () => {
            render(<SocialShareModal {...defaultProps} />);

            expect(screen.getByText('Share Article')).toBeInTheDocument();
        });

        it('should render Twitter/X share button', () => {
            render(<SocialShareModal {...defaultProps} />);

            expect(screen.getByText('X / Twitter')).toBeInTheDocument();
        });

        it('should render LinkedIn share button', () => {
            render(<SocialShareModal {...defaultProps} />);

            expect(screen.getByText('LinkedIn')).toBeInTheDocument();
        });

        it('should render Copy Link button', () => {
            render(<SocialShareModal {...defaultProps} />);

            expect(screen.getByText('Copy Link')).toBeInTheDocument();
        });
    });

    describe('close button', () => {
        it('should call onClose when X button clicked', () => {
            render(<SocialShareModal {...defaultProps} />);

            // Find and click the close button (X icon)
            const buttons = screen.getAllByRole('button');
            const closeButton = buttons.find(btn => btn.querySelector('svg'));

            if (closeButton) {
                fireEvent.click(closeButton);
                expect(defaultProps.onClose).toHaveBeenCalled();
            }
        });
    });

    describe('Twitter share link', () => {
        it('should have correct Twitter share URL format', () => {
            render(<SocialShareModal {...defaultProps} />);

            const twitterLink = screen.getByText('X / Twitter').closest('a');

            expect(twitterLink).toHaveAttribute('href', expect.stringContaining('twitter.com/intent/tweet'));
            expect(twitterLink).toHaveAttribute('href', expect.stringContaining(encodeURIComponent('Test Article Title')));
        });

        it('should open in new tab', () => {
            render(<SocialShareModal {...defaultProps} />);

            const twitterLink = screen.getByText('X / Twitter').closest('a');

            expect(twitterLink).toHaveAttribute('target', '_blank');
            expect(twitterLink).toHaveAttribute('rel', 'noopener noreferrer');
        });
    });

    describe('LinkedIn share link', () => {
        it('should have correct LinkedIn share URL', () => {
            render(<SocialShareModal {...defaultProps} />);

            const linkedinLink = screen.getByText('LinkedIn').closest('a');

            expect(linkedinLink).toHaveAttribute('href', expect.stringContaining('linkedin.com/sharing'));
            expect(linkedinLink).toHaveAttribute('href', expect.stringContaining(encodeURIComponent(defaultProps.articleUrl)));
        });
    });

    describe('copy link functionality', () => {
        it('should copy URL to clipboard when clicked', async () => {
            render(<SocialShareModal {...defaultProps} />);

            const copyButton = screen.getByText('Copy Link').closest('button');
            fireEvent.click(copyButton!);

            await waitFor(() => {
                expect(mockClipboard.writeText).toHaveBeenCalledWith(defaultProps.articleUrl);
            });
        });

        it('should show "Copied!" feedback after copying', async () => {
            render(<SocialShareModal {...defaultProps} />);

            const copyButton = screen.getByText('Copy Link').closest('button');
            fireEvent.click(copyButton!);

            await waitFor(() => {
                expect(screen.getByText('Copied!')).toBeInTheDocument();
            });
        });
    });

    describe('without excerpt', () => {
        it('should render correctly without article excerpt', () => {
            const propsWithoutExcerpt = {
                ...defaultProps,
                articleExcerpt: undefined
            };

            render(<SocialShareModal {...propsWithoutExcerpt} />);

            expect(screen.getByText('Test Article Title')).toBeInTheDocument();
        });
    });
});
