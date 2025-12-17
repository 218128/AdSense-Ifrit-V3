/**
 * Tests for Rich Markdown Formatters
 */

import {
    generateComparisonTable,
    formatRating,
    generateProsCons,
    generateCallout,
    generateKeyTakeaways,
    generateFAQSection,
    generateVerdictBox,
    ProductForComparison
} from '@/lib/formatting/richMarkdown';

describe('Rich Markdown Formatters', () => {
    describe('formatRating', () => {
        it('should format 5-star rating', () => {
            const result = formatRating(5);

            expect(result).toContain('★★★★★');
            expect(result).toContain('(5.0)');
        });

        it('should format partial rating with half star', () => {
            const result = formatRating(3.5);

            expect(result).toContain('★★★½');
            expect(result).toContain('(3.5)');
        });

        it('should format low rating', () => {
            const result = formatRating(2);

            expect(result).toContain('★★');
            expect(result).toContain('☆☆☆');
        });
    });

    describe('generateComparisonTable', () => {
        const products: ProductForComparison[] = [
            {
                name: 'Product A',
                price: '$10/mo',
                rating: 4.5,
                features: { 'Feature 1': 'Yes', 'Feature 2': 'No' },
                bestFor: 'Beginners'
            },
            {
                name: 'Product B',
                price: '$20/mo',
                rating: 4.0,
                features: { 'Feature 1': 'Yes', 'Feature 2': 'Yes' },
                bestFor: 'Professionals'
            }
        ];

        it('should generate valid markdown table', () => {
            const result = generateComparisonTable(products, {
                features: ['Feature 1', 'Feature 2']
            });

            expect(result).toContain('| Product |');
            expect(result).toContain('| --- |');
            expect(result).toContain('**Product A**');
            expect(result).toContain('**Product B**');
        });

        it('should include ratings when enabled', () => {
            const result = generateComparisonTable(products, {
                features: [],
                showRatings: true
            });

            expect(result).toContain('Rating');
            expect(result).toContain('★');
        });

        it('should highlight best product', () => {
            const result = generateComparisonTable(products, {
                features: [],
                highlightBest: true
            });

            expect(result).toContain('🏆');
            expect(result).toContain('**Product A**');
        });

        it('should include custom title', () => {
            const result = generateComparisonTable(products, {
                features: [],
                title: 'My Comparison'
            });

            expect(result).toContain('### My Comparison');
        });
    });

    describe('generateProsCons', () => {
        it('should generate pros and cons section', () => {
            const result = generateProsCons(
                ['Fast', 'Easy to use'],
                ['Expensive', 'Limited features']
            );

            expect(result).toContain('✅ Fast');
            expect(result).toContain('✅ Easy to use');
            expect(result).toContain('❌ Expensive');
            expect(result).toContain('❌ Limited features');
        });

        it('should include section heading', () => {
            const result = generateProsCons([], []);

            expect(result).toContain('### ✅ Pros and ❌ Cons');
        });
    });

    describe('generateCallout', () => {
        it('should generate tip callout', () => {
            const result = generateCallout('tip', 'Pro Tip', 'Use this feature');

            expect(result).toContain('💡');
            expect(result).toContain('**Pro Tip**');
            expect(result).toContain('Use this feature');
        });

        it('should generate warning callout', () => {
            const result = generateCallout('warning', 'Warning', 'Be careful');

            expect(result).toContain('⚠️');
            expect(result).toContain('**Warning**');
        });

        it('should handle multiline content', () => {
            const result = generateCallout('note', 'Note', 'Line 1\nLine 2');

            expect(result).toContain('> Line 1');
            expect(result).toContain('> Line 2');
        });
    });

    describe('generateKeyTakeaways', () => {
        it('should generate takeaways section', () => {
            const result = generateKeyTakeaways([
                'Point 1',
                'Point 2',
                'Point 3'
            ]);

            expect(result).toContain('### 🎯 Key Takeaways');
            expect(result).toContain('• Point 1');
            expect(result).toContain('• Point 2');
            expect(result).toContain('• Point 3');
        });
    });

    describe('generateFAQSection', () => {
        it('should generate FAQ section', () => {
            const result = generateFAQSection([
                { question: 'What is this?', answer: 'A great product.' },
                { question: 'How much?', answer: '$10/month.' }
            ]);

            expect(result).toContain('## ❓ Frequently Asked Questions');
            expect(result).toContain('### What is this?');
            expect(result).toContain('A great product.');
            expect(result).toContain('### How much?');
        });
    });

    describe('generateVerdictBox', () => {
        it('should generate verdict section', () => {
            const result = generateVerdictBox(
                'Product X',
                4.5,
                'An excellent choice for most users.',
                'Power users',
                'Budget shoppers'
            );

            expect(result).toContain('### 🏆 Final Verdict: Product X');
            expect(result).toContain('★★★★½');
            expect(result).toContain('An excellent choice');
            expect(result).toContain('Power users');
            expect(result).toContain('Budget shoppers');
        });
    });
});
