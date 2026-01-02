/**
 * Product Mapper Tests
 * Enterprise-grade tests for mapping external products to WooCommerce.
 */

import {
    mapAmazonProduct,
    mapEbayProduct,
    mapCustomProduct,
    mapAmazonProducts,
    mapEbayProducts,
    type ProductMappingOptions,
} from '@/features/woocommerce/lib/productMapper';

import type { AmazonProduct } from '@/features/sources/lib/amazonApi';
import type { EbayProduct } from '@/features/sources/lib/ebayApi';

describe('Product Mapper', () => {
    // =========================================================================
    // Amazon Product Mapping
    // =========================================================================
    describe('mapAmazonProduct', () => {
        const sampleAmazonProduct: AmazonProduct = {
            asin: 'B08N5WRWNW',
            title: 'Amazing Widget Pro',
            url: 'https://amazon.com/dp/B08N5WRWNW',
            affiliateUrl: 'https://amazon.com/dp/B08N5WRWNW?tag=mytag-20',
            price: { amount: 49.99, currency: 'USD', formatted: '$49.99' },
            listPrice: { amount: 79.99, currency: 'USD', formatted: '$79.99' },
            brand: 'WidgetCo',
            features: ['Feature 1', 'Feature 2', 'Feature 3'],
            rating: 4.5,
            reviewCount: 1250,
            isPrime: true,
            images: {
                small: 'https://images/small.jpg',
                medium: 'https://images/medium.jpg',
                large: 'https://images/large.jpg',
            },
        };

        it('should map basic product info', () => {
            const result = mapAmazonProduct(sampleAmazonProduct);

            expect(result.wooProduct.name).toBe('Amazing Widget Pro');
            expect(result.wooProduct.type).toBe('external');
            expect(result.wooProduct.external_url).toBe(sampleAmazonProduct.affiliateUrl);
            expect(result.wooProduct.button_text).toBe('Buy on Amazon');
            expect(result.source).toBe('amazon');
            expect(result.sourceId).toBe('B08N5WRWNW');
        });

        it('should apply price markup', () => {
            const options: ProductMappingOptions = {
                priceMarkup: 20, // 20% markup
            };
            const result = mapAmazonProduct(sampleAmazonProduct, options);

            // Original: 49.99, with 20% markup = 59.99
            expect(parseFloat(result.wooProduct.regular_price)).toBeCloseTo(95.99, 1); // List price with markup
            expect(parseFloat(result.wooProduct.sale_price!)).toBeCloseTo(59.99, 1); // Sale price with markup
        });

        it('should set sale price when discounted', () => {
            const result = mapAmazonProduct(sampleAmazonProduct);

            // Has list price higher than current price
            expect(result.wooProduct.sale_price).toBeDefined();
            expect(parseFloat(result.wooProduct.sale_price!)).toBeLessThan(
                parseFloat(result.wooProduct.regular_price)
            );
        });

        it('should include affiliate disclosure', () => {
            const options: ProductMappingOptions = {
                affiliateDisclosure: 'As an Amazon Associate, I earn from qualifying purchases.',
            };
            const result = mapAmazonProduct(sampleAmazonProduct, options);

            expect(result.wooProduct.description).toContain('affiliate-disclosure');
            expect(result.wooProduct.description).toContain('Amazon Associate');
        });

        it('should map images', () => {
            const result = mapAmazonProduct(sampleAmazonProduct);

            expect(result.wooProduct.images).toHaveLength(1);
            expect(result.wooProduct.images![0].src).toBe('https://images/large.jpg');
        });

        it('should set product attributes', () => {
            const result = mapAmazonProduct(sampleAmazonProduct);

            const brandAttr = result.wooProduct.attributes?.find(a => a.name === 'Brand');
            const primeAttr = result.wooProduct.attributes?.find(a => a.name === 'Prime Eligible');
            const ratingAttr = result.wooProduct.attributes?.find(a => a.name === 'Amazon Rating');

            expect(brandAttr?.options).toContain('WidgetCo');
            expect(primeAttr?.options).toContain('Yes');
            expect(ratingAttr?.options).toContain('4.5/5');
        });

        it('should include meta data for source tracking', () => {
            const result = mapAmazonProduct(sampleAmazonProduct);

            const sourceMeta = result.wooProduct.meta_data?.find(m => m.key === '_source');
            const asinMeta = result.wooProduct.meta_data?.find(m => m.key === '_asin');

            expect(sourceMeta?.value).toBe('amazon');
            expect(asinMeta?.value).toBe('B08N5WRWNW');
        });

        it('should respect default status option', () => {
            const options: ProductMappingOptions = {
                defaultStatus: 'publish',
            };
            const result = mapAmazonProduct(sampleAmazonProduct, options);

            expect(result.wooProduct.status).toBe('publish');
        });

        it('should generate SKU with prefix', () => {
            const options: ProductMappingOptions = {
                skuPrefix: 'AMZN',
            };
            const result = mapAmazonProduct(sampleAmazonProduct, options);

            expect(result.wooProduct.sku).toMatch(/^AMZN-/);
        });
    });

    // =========================================================================
    // eBay Product Mapping
    // =========================================================================
    describe('mapEbayProduct', () => {
        const sampleEbayProduct: EbayProduct = {
            itemId: '123456789012',
            title: 'Vintage Watch Collector Edition',
            url: 'https://ebay.com/itm/123456789012',
            affiliateUrl: 'https://ebay.com/itm/123456789012?mcp=123',
            price: { value: 199.99, currency: 'USD', formatted: '$199.99' },
            originalPrice: { value: 249.99, currency: 'USD', formatted: '$249.99' },
            condition: 'Used - Very Good',
            imageUrl: 'https://images/watch.jpg',
            seller: {
                username: 'vintagedealer',
                feedbackScore: 5800,
                feedbackPercentage: 99.2,
            },
            shipping: {
                cost: { value: 0, currency: 'USD', formatted: 'Free' },
                isFreeShipping: true,
            },
            location: 'New York, NY',
            endTime: new Date('2024-12-31'),
        };

        it('should map basic product info', () => {
            const result = mapEbayProduct(sampleEbayProduct);

            expect(result.wooProduct.name).toBe('Vintage Watch Collector Edition');
            expect(result.wooProduct.type).toBe('external');
            expect(result.wooProduct.external_url).toBe(sampleEbayProduct.affiliateUrl);
            expect(result.wooProduct.button_text).toBe('Buy on eBay');
            expect(result.source).toBe('ebay');
            expect(result.sourceId).toBe('123456789012');
        });

        it('should include condition attribute', () => {
            const result = mapEbayProduct(sampleEbayProduct);

            const conditionAttr = result.wooProduct.attributes?.find(a => a.name === 'Condition');
            expect(conditionAttr?.options).toContain('Used - Very Good');
        });

        it('should include seller rating attribute', () => {
            const result = mapEbayProduct(sampleEbayProduct);

            const sellerAttr = result.wooProduct.attributes?.find(a => a.name === 'Seller Rating');
            expect(sellerAttr?.options).toContain('99.2% Positive');
        });

        it('should include free shipping attribute', () => {
            const result = mapEbayProduct(sampleEbayProduct);

            const shippingAttr = result.wooProduct.attributes?.find(a => a.name === 'Shipping');
            expect(shippingAttr?.options).toContain('Free Shipping');
        });

        it('should set sale price when discounted', () => {
            const result = mapEbayProduct(sampleEbayProduct);

            expect(result.wooProduct.sale_price).toBeDefined();
            expect(parseFloat(result.wooProduct.sale_price!)).toBeLessThan(
                parseFloat(result.wooProduct.regular_price)
            );
        });

        it('should include short description with condition and seller', () => {
            const result = mapEbayProduct(sampleEbayProduct);

            expect(result.wooProduct.short_description).toContain('Used - Very Good');
            expect(result.wooProduct.short_description).toContain('99.2%');
        });
    });

    // =========================================================================
    // Custom Product Mapping
    // =========================================================================
    describe('mapCustomProduct', () => {
        it('should map custom product data', () => {
            const result = mapCustomProduct({
                title: 'Custom Product',
                description: 'A great custom product.',
                price: 29.99,
                imageUrl: 'https://images/custom.jpg',
                externalUrl: 'https://shop.example.com/product',
                sourceId: 'custom-123',
            });

            expect(result.wooProduct.name).toBe('Custom Product');
            expect(result.wooProduct.type).toBe('external');
            expect(result.source).toBe('custom');
            expect(result.sourceId).toBe('custom-123');
        });

        it('should create simple product without external URL', () => {
            const result = mapCustomProduct({
                title: 'Physical Product',
                description: 'Ships to you.',
                price: 49.99,
                sourceId: 'simple-456',
            });

            expect(result.wooProduct.type).toBe('simple');
            expect(result.wooProduct.external_url).toBeUndefined();
        });

        it('should respect virtual option', () => {
            const result = mapCustomProduct(
                {
                    title: 'Virtual Product',
                    description: 'Digital download.',
                    price: 9.99,
                    sourceId: 'virtual-789',
                },
                { virtual: true }
            );

            expect(result.wooProduct.virtual).toBe(true);
        });

        it('should apply price markup', () => {
            const result = mapCustomProduct(
                {
                    title: 'Markup Test',
                    description: 'Test',
                    price: 100,
                    sourceId: 'markup-test',
                },
                { priceMarkup: 50 }
            );

            expect(parseFloat(result.wooProduct.regular_price)).toBe(150);
        });
    });

    // =========================================================================
    // Batch Mapping
    // =========================================================================
    describe('Batch Mapping', () => {
        const amazonProducts: AmazonProduct[] = [
            {
                asin: 'A1', title: 'Product 1', url: 'http://a.co/1', affiliateUrl: 'http://a.co/1',
                price: { amount: 10, currency: 'USD', formatted: '$10' }, brand: '', features: [],
                rating: 4, reviewCount: 100, isPrime: false, images: {},
            },
            {
                asin: 'A2', title: 'Product 2', url: 'http://a.co/2', affiliateUrl: 'http://a.co/2',
                price: { amount: 20, currency: 'USD', formatted: '$20' }, brand: '', features: [],
                rating: 5, reviewCount: 200, isPrime: true, images: {},
            },
        ];

        it('should map multiple Amazon products', () => {
            const results = mapAmazonProducts(amazonProducts);

            expect(results).toHaveLength(2);
            expect(results[0].sourceId).toBe('A1');
            expect(results[1].sourceId).toBe('A2');
        });

        it('should apply same options to all products', () => {
            const results = mapAmazonProducts(amazonProducts, { defaultStatus: 'publish' });

            expect(results.every(r => r.wooProduct.status === 'publish')).toBe(true);
        });
    });

    // =========================================================================
    // Description Generation
    // =========================================================================
    describe('Description Generation', () => {
        it('should include features list', () => {
            const product: AmazonProduct = {
                asin: 'B1', title: 'Test', url: '', affiliateUrl: '',
                price: { amount: 10, currency: 'USD', formatted: '$10' },
                brand: '', features: ['Feature A', 'Feature B'], rating: 4,
                reviewCount: 50, isPrime: false, images: {},
            };
            const result = mapAmazonProduct(product);

            expect(result.wooProduct.description).toContain('<ul>');
            expect(result.wooProduct.description).toContain('Feature A');
            expect(result.wooProduct.description).toContain('Feature B');
        });

        it('should include source link when requested', () => {
            const product: AmazonProduct = {
                asin: 'B1', title: 'Test', url: '', affiliateUrl: 'https://affiliate.link',
                price: { amount: 10, currency: 'USD', formatted: '$10' },
                brand: '', features: [], rating: 4, reviewCount: 50, isPrime: false, images: {},
            };
            const result = mapAmazonProduct(product, { includeSourceLink: true });

            expect(result.wooProduct.description).toContain('View Original Listing');
            expect(result.wooProduct.description).toContain('nofollow sponsored');
        });
    });
});
