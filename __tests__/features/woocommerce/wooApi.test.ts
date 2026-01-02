/**
 * WooCommerce API Tests
 * Enterprise-grade tests for WooCommerce REST API integration.
 */

import {
    generateSku,
    validateProduct,
    type WooProduct,
} from '@/features/woocommerce/lib/wooApi';

describe('WooCommerce API', () => {
    // =========================================================================
    // generateSku
    // =========================================================================
    describe('generateSku', () => {
        it('should generate SKU with default prefix', () => {
            const sku = generateSku();
            expect(sku).toMatch(/^IFRIT-[A-Z0-9]+-[A-Z0-9]+$/);
        });

        it('should generate SKU with custom prefix', () => {
            const sku = generateSku('PRODUCT');
            expect(sku).toMatch(/^PRODUCT-[A-Z0-9]+-[A-Z0-9]+$/);
        });

        it('should generate unique SKUs', () => {
            const skus = new Set<string>();
            for (let i = 0; i < 100; i++) {
                skus.add(generateSku());
            }
            expect(skus.size).toBe(100);
        });

        it('should handle empty prefix', () => {
            const sku = generateSku('');
            expect(sku).toMatch(/^-[A-Z0-9]+-[A-Z0-9]+$/);
        });
    });

    // =========================================================================
    // validateProduct
    // =========================================================================
    describe('validateProduct', () => {
        it('should validate complete product', () => {
            const product: Partial<WooProduct> = {
                name: 'Test Product',
                type: 'simple',
                regular_price: '29.99',
            };
            const result = validateProduct(product);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should require name', () => {
            const product: Partial<WooProduct> = {
                type: 'simple',
                regular_price: '29.99',
            };
            const result = validateProduct(product);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Product name is required');
        });

        it('should require valid regular_price', () => {
            const product: Partial<WooProduct> = {
                name: 'Test',
                type: 'simple',
                regular_price: 'invalid',
            };
            const result = validateProduct(product);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Valid regular price is required');
        });

        it('should require type', () => {
            const product: Partial<WooProduct> = {
                name: 'Test',
                regular_price: '29.99',
            };
            const result = validateProduct(product);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Product type is required');
        });

        it('should reject empty name', () => {
            const product: Partial<WooProduct> = {
                name: '  ',
                type: 'simple',
                regular_price: '29.99',
            };
            const result = validateProduct(product);
            expect(result.valid).toBe(false);
        });

        it('should validate zero price', () => {
            const product: Partial<WooProduct> = {
                name: 'Free Product',
                type: 'simple',
                regular_price: '0',
            };
            const result = validateProduct(product);
            expect(result.valid).toBe(true);
        });

        it('should accept negative price as valid number (implementation specific)', () => {
            const product: Partial<WooProduct> = {
                name: 'Test',
                type: 'simple',
                regular_price: '-10',
            };
            const result = validateProduct(product);
            // Current implementation only checks if price is a valid number
            expect(result.valid).toBe(true);
        });

        it('should accept all product types', () => {
            const types: WooProduct['type'][] = ['simple', 'grouped', 'external', 'variable'];
            for (const type of types) {
                const product: Partial<WooProduct> = {
                    name: 'Test',
                    type,
                    regular_price: '10',
                };
                const result = validateProduct(product);
                expect(result.valid).toBe(true);
            }
        });
    });

    // =========================================================================
    // Product Structure
    // =========================================================================
    describe('WooProduct Type', () => {
        it('should accept minimal external product', () => {
            const product: Partial<WooProduct> = {
                name: 'External Product',
                type: 'external',
                regular_price: '19.99',
                external_url: 'https://amazon.com/product',
                button_text: 'Buy on Amazon',
            };
            const result = validateProduct(product);
            expect(result.valid).toBe(true);
        });

        it('should accept product with images', () => {
            const product: Partial<WooProduct> = {
                name: 'Product with Images',
                type: 'simple',
                regular_price: '29.99',
                images: [
                    { src: 'https://example.com/image1.jpg' },
                    { src: 'https://example.com/image2.jpg' },
                ],
            };
            const result = validateProduct(product);
            expect(result.valid).toBe(true);
        });

        it('should accept product with attributes', () => {
            const product: Partial<WooProduct> = {
                name: 'Product with Attributes',
                type: 'simple',
                regular_price: '49.99',
                attributes: [
                    { name: 'Color', options: ['Red', 'Blue', 'Green'], visible: true },
                    { name: 'Size', options: ['S', 'M', 'L'], visible: true },
                ],
            };
            const result = validateProduct(product);
            expect(result.valid).toBe(true);
        });

        it('should accept product with meta data', () => {
            const product: Partial<WooProduct> = {
                name: 'Product with Meta',
                type: 'simple',
                regular_price: '39.99',
                meta_data: [
                    { key: '_source', value: 'amazon' },
                    { key: '_asin', value: 'B08N5WRWNW' },
                ],
            };
            const result = validateProduct(product);
            expect(result.valid).toBe(true);
        });
    });
});
