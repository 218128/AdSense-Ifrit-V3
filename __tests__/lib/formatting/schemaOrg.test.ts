/**
 * Tests for Schema.org Generators
 */

import {
    generateArticleSchema,
    generateProductReviewSchema,
    generateFAQSchema,
    generateHowToSchema,
    generateBreadcrumbSchema,
    wrapSchemaInScriptTag
} from '@/lib/formatting/schemaOrg';

describe('Schema.org Generators', () => {
    describe('generateArticleSchema', () => {
        it('should generate valid Article schema', () => {
            const schema = generateArticleSchema({
                title: 'Test Article',
                description: 'A test description',
                datePublished: '2025-01-01',
                authorName: 'John Doe',
                url: 'https://example.com/article'
            });

            expect(schema).toHaveProperty('@context', 'https://schema.org');
            expect(schema).toHaveProperty('@type', 'Article');
            expect(schema).toHaveProperty('headline', 'Test Article');
            expect((schema as Record<string, unknown>).author).toHaveProperty('name', 'John Doe');
        });

        it('should include image when provided', () => {
            const schema = generateArticleSchema({
                title: 'Test',
                description: 'Test',
                datePublished: '2025-01-01',
                authorName: 'John',
                url: 'https://example.com',
                imageUrl: 'https://example.com/image.jpg'
            });

            expect(schema).toHaveProperty('image', 'https://example.com/image.jpg');
        });
    });

    describe('generateProductReviewSchema', () => {
        it('should generate valid Product + Review schema', () => {
            const schema = generateProductReviewSchema({
                productName: 'Test Product',
                productDescription: 'A great product',
                rating: 4.5,
                reviewBody: 'I loved this product.',
                authorName: 'Jane Doe',
                datePublished: '2025-01-01'
            });

            expect(schema).toHaveProperty('@type', 'Product');
            expect(schema).toHaveProperty('name', 'Test Product');
            expect(schema).toHaveProperty('review');
            expect((schema as Record<string, unknown>).review).toHaveProperty('@type', 'Review');
        });

        it('should include price when provided', () => {
            const schema = generateProductReviewSchema({
                productName: 'Test',
                productDescription: 'Test',
                rating: 4,
                reviewBody: 'Good',
                authorName: 'John',
                datePublished: '2025-01-01',
                price: '49.99',
                priceCurrency: 'USD'
            });

            expect(schema).toHaveProperty('offers');
            expect((schema as Record<string, unknown>).offers).toHaveProperty('price', '49.99');
        });
    });

    describe('generateFAQSchema', () => {
        it('should generate valid FAQPage schema', () => {
            const schema = generateFAQSchema([
                { question: 'What is this?', answer: 'A test.' },
                { question: 'How to use?', answer: 'Just click.' }
            ]);

            expect(schema).toHaveProperty('@type', 'FAQPage');
            expect(schema).toHaveProperty('mainEntity');
            expect((schema as Record<string, unknown[]>).mainEntity).toHaveLength(2);
        });

        it('should format questions correctly', () => {
            const schema = generateFAQSchema([
                { question: 'Test Q?', answer: 'Test A.' }
            ]);

            const mainEntity = (schema as Record<string, unknown[]>).mainEntity[0] as Record<string, unknown>;
            expect(mainEntity).toHaveProperty('@type', 'Question');
            expect(mainEntity).toHaveProperty('name', 'Test Q?');
            expect(mainEntity).toHaveProperty('acceptedAnswer');
        });
    });

    describe('generateHowToSchema', () => {
        it('should generate valid HowTo schema', () => {
            const schema = generateHowToSchema({
                name: 'How to Test',
                description: 'Learn testing',
                steps: [
                    { name: 'Step 1', text: 'Do this' },
                    { name: 'Step 2', text: 'Do that' }
                ]
            });

            expect(schema).toHaveProperty('@type', 'HowTo');
            expect(schema).toHaveProperty('name', 'How to Test');
            expect(schema).toHaveProperty('step');
            expect((schema as Record<string, unknown[]>).step).toHaveLength(2);
        });

        it('should include tools and supplies', () => {
            const schema = generateHowToSchema({
                name: 'Test',
                description: 'Test',
                steps: [{ name: 'Step', text: 'Do' }],
                tool: ['Hammer', 'Screwdriver'],
                supply: ['Nails', 'Wood']
            });

            expect(schema).toHaveProperty('tool');
            expect(schema).toHaveProperty('supply');
        });
    });

    describe('generateBreadcrumbSchema', () => {
        it('should generate valid BreadcrumbList schema', () => {
            const schema = generateBreadcrumbSchema([
                { name: 'Home', url: 'https://example.com' },
                { name: 'Category', url: 'https://example.com/cat' },
                { name: 'Article', url: 'https://example.com/cat/article' }
            ]);

            expect(schema).toHaveProperty('@type', 'BreadcrumbList');
            expect((schema as Record<string, unknown[]>).itemListElement).toHaveLength(3);
        });

        it('should set correct positions', () => {
            const schema = generateBreadcrumbSchema([
                { name: 'A', url: 'a' },
                { name: 'B', url: 'b' }
            ]);

            const items = (schema as Record<string, Record<string, unknown>[]>).itemListElement;
            expect(items[0].position).toBe(1);
            expect(items[1].position).toBe(2);
        });
    });

    describe('wrapSchemaInScriptTag', () => {
        it('should wrap schema in script tag', () => {
            const schema = { '@type': 'Test' };
            const result = wrapSchemaInScriptTag(schema);

            expect(result).toContain('<script type="application/ld+json">');
            expect(result).toContain('</script>');
            expect(result).toContain('"@type": "Test"');
        });
    });
});
