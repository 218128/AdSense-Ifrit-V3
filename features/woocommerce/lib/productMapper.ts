/**
 * Product Mapper
 * FSD: features/woocommerce/lib/productMapper.ts
 * 
 * Maps external product sources to WooCommerce product format.
 * Supports Amazon, eBay, and custom sources.
 */

import type { WooProduct, WooAttribute } from './wooApi';
import type { AmazonProduct } from '@/features/sources/lib/amazonApi';
import type { EbayProduct } from '@/features/sources/lib/ebayApi';
import { generateSku } from './wooApi';

// ============================================================================
// Types
// ============================================================================

export interface ProductMappingOptions {
    /** Default product status */
    defaultStatus?: 'draft' | 'pending' | 'publish';
    /** Price markup percentage (e.g., 20 for 20% markup) */
    priceMarkup?: number;
    /** Whether to include source URL in description */
    includeSourceLink?: boolean;
    /** Affiliate disclosure text */
    affiliateDisclosure?: string;
    /** Default category IDs */
    categoryIds?: number[];
    /** SKU prefix */
    skuPrefix?: string;
    /** Whether product is virtual (no shipping) */
    virtual?: boolean;
}

export interface MappedProduct {
    wooProduct: Omit<WooProduct, 'id'>;
    source: 'amazon' | 'ebay' | 'custom';
    sourceId: string;
    sourceUrl: string;
}

// ============================================================================
// Amazon Mapping
// ============================================================================

/**
 * Map Amazon product to WooCommerce format
 */
export function mapAmazonProduct(
    amazon: AmazonProduct,
    options: ProductMappingOptions = {}
): MappedProduct {
    const basePrice = amazon.price?.amount || 0;
    const markup = options.priceMarkup || 0;
    const finalPrice = basePrice * (1 + markup / 100);

    const description = buildProductDescription({
        features: amazon.features,
        brand: amazon.brand,
        sourceUrl: amazon.affiliateUrl,
        includeSourceLink: options.includeSourceLink ?? true,
        affiliateDisclosure: options.affiliateDisclosure,
    });

    const wooProduct: Omit<WooProduct, 'id'> = {
        name: amazon.title,
        type: 'external',
        status: options.defaultStatus || 'draft',
        description,
        short_description: amazon.features?.slice(0, 2).join(' ') || '',
        sku: generateSku(options.skuPrefix || 'AMZ'),
        regular_price: finalPrice.toFixed(2),
        external_url: amazon.affiliateUrl,
        button_text: 'Buy on Amazon',
        virtual: true,
        images: amazon.images.large ? [
            { src: amazon.images.large, name: amazon.title, alt: amazon.title }
        ] : [],
        categories: options.categoryIds?.map(id => ({ id })) || [],
        attributes: buildAmazonAttributes(amazon),
        meta_data: [
            { key: '_source', value: 'amazon' },
            { key: '_asin', value: amazon.asin },
            { key: '_source_url', value: amazon.url },
            { key: '_affiliate_url', value: amazon.affiliateUrl },
            { key: '_original_price', value: String(basePrice) },
        ],
    };

    // Add sale price if there's a discount
    if (amazon.listPrice?.amount && amazon.listPrice.amount > basePrice) {
        wooProduct.regular_price = (amazon.listPrice.amount * (1 + markup / 100)).toFixed(2);
        wooProduct.sale_price = finalPrice.toFixed(2);
    }

    return {
        wooProduct,
        source: 'amazon',
        sourceId: amazon.asin,
        sourceUrl: amazon.affiliateUrl,
    };
}

/**
 * Build WooCommerce attributes from Amazon product
 */
function buildAmazonAttributes(amazon: AmazonProduct): WooAttribute[] {
    const attributes: WooAttribute[] = [];

    if (amazon.brand) {
        attributes.push({
            name: 'Brand',
            visible: true,
            options: [amazon.brand],
        });
    }

    if (amazon.isPrime) {
        attributes.push({
            name: 'Prime Eligible',
            visible: true,
            options: ['Yes'],
        });
    }

    if (amazon.rating) {
        attributes.push({
            name: 'Amazon Rating',
            visible: true,
            options: [`${amazon.rating}/5`],
        });
    }

    return attributes;
}

// ============================================================================
// eBay Mapping
// ============================================================================

/**
 * Map eBay product to WooCommerce format
 */
export function mapEbayProduct(
    ebay: EbayProduct,
    options: ProductMappingOptions = {}
): MappedProduct {
    const basePrice = ebay.price.value;
    const markup = options.priceMarkup || 0;
    const finalPrice = basePrice * (1 + markup / 100);

    const description = buildProductDescription({
        condition: ebay.condition,
        seller: `${ebay.seller.username} (${ebay.seller.feedbackPercentage}% positive)`,
        location: ebay.location,
        sourceUrl: ebay.affiliateUrl,
        includeSourceLink: options.includeSourceLink ?? true,
        affiliateDisclosure: options.affiliateDisclosure,
    });

    const wooProduct: Omit<WooProduct, 'id'> = {
        name: ebay.title,
        type: 'external',
        status: options.defaultStatus || 'draft',
        description,
        short_description: `${ebay.condition} - ${ebay.seller.feedbackPercentage}% positive seller`,
        sku: generateSku(options.skuPrefix || 'EBAY'),
        regular_price: finalPrice.toFixed(2),
        external_url: ebay.affiliateUrl,
        button_text: 'Buy on eBay',
        virtual: true,
        images: ebay.imageUrl ? [
            { src: ebay.imageUrl, name: ebay.title, alt: ebay.title }
        ] : [],
        categories: options.categoryIds?.map(id => ({ id })) || [],
        attributes: buildEbayAttributes(ebay),
        meta_data: [
            { key: '_source', value: 'ebay' },
            { key: '_item_id', value: ebay.itemId },
            { key: '_source_url', value: ebay.url },
            { key: '_affiliate_url', value: ebay.affiliateUrl },
            { key: '_original_price', value: String(basePrice) },
            { key: '_condition', value: ebay.condition },
        ],
    };

    // Add sale price if there's a discount
    if (ebay.originalPrice && ebay.originalPrice.value > basePrice) {
        wooProduct.regular_price = (ebay.originalPrice.value * (1 + markup / 100)).toFixed(2);
        wooProduct.sale_price = finalPrice.toFixed(2);
    }

    return {
        wooProduct,
        source: 'ebay',
        sourceId: ebay.itemId,
        sourceUrl: ebay.affiliateUrl,
    };
}

/**
 * Build WooCommerce attributes from eBay product
 */
function buildEbayAttributes(ebay: EbayProduct): WooAttribute[] {
    const attributes: WooAttribute[] = [];

    attributes.push({
        name: 'Condition',
        visible: true,
        options: [ebay.condition],
    });

    if (ebay.shipping?.isFreeShipping) {
        attributes.push({
            name: 'Shipping',
            visible: true,
            options: ['Free Shipping'],
        });
    }

    attributes.push({
        name: 'Seller Rating',
        visible: true,
        options: [`${ebay.seller.feedbackPercentage}% Positive`],
    });

    return attributes;
}

// ============================================================================
// Generic/Custom Mapping
// ============================================================================

export interface CustomProductData {
    title: string;
    description: string;
    price: number;
    originalPrice?: number;
    imageUrl?: string;
    externalUrl?: string;
    brand?: string;
    features?: string[];
    sourceId: string;
}

/**
 * Map custom product data to WooCommerce format
 */
export function mapCustomProduct(
    data: CustomProductData,
    options: ProductMappingOptions = {}
): MappedProduct {
    const markup = options.priceMarkup || 0;
    const finalPrice = data.price * (1 + markup / 100);

    const description = buildProductDescription({
        features: data.features,
        brand: data.brand,
        sourceUrl: data.externalUrl,
        includeSourceLink: options.includeSourceLink ?? true,
        affiliateDisclosure: options.affiliateDisclosure,
    });

    const wooProduct: Omit<WooProduct, 'id'> = {
        name: data.title,
        type: data.externalUrl ? 'external' : 'simple',
        status: options.defaultStatus || 'draft',
        description,
        short_description: data.description.slice(0, 200),
        sku: generateSku(options.skuPrefix || 'CUST'),
        regular_price: finalPrice.toFixed(2),
        external_url: data.externalUrl,
        button_text: data.externalUrl ? 'Buy Now' : undefined,
        virtual: options.virtual ?? !!data.externalUrl,
        images: data.imageUrl ? [
            { src: data.imageUrl, name: data.title, alt: data.title }
        ] : [],
        categories: options.categoryIds?.map(id => ({ id })) || [],
        meta_data: [
            { key: '_source', value: 'custom' },
            { key: '_source_id', value: data.sourceId },
            { key: '_original_price', value: String(data.price) },
        ],
    };

    // Add sale price if provided
    if (data.originalPrice && data.originalPrice > data.price) {
        wooProduct.regular_price = (data.originalPrice * (1 + markup / 100)).toFixed(2);
        wooProduct.sale_price = finalPrice.toFixed(2);
    }

    return {
        wooProduct,
        source: 'custom',
        sourceId: data.sourceId,
        sourceUrl: data.externalUrl || '',
    };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Build product description HTML
 */
function buildProductDescription(options: {
    features?: string[];
    brand?: string;
    condition?: string;
    seller?: string;
    location?: string;
    sourceUrl?: string;
    includeSourceLink?: boolean;
    affiliateDisclosure?: string;
}): string {
    const parts: string[] = [];

    // Affiliate disclosure
    if (options.affiliateDisclosure) {
        parts.push(`<p class="affiliate-disclosure"><em>${options.affiliateDisclosure}</em></p>`);
    }

    // Brand
    if (options.brand) {
        parts.push(`<p><strong>Brand:</strong> ${options.brand}</p>`);
    }

    // Condition
    if (options.condition) {
        parts.push(`<p><strong>Condition:</strong> ${options.condition}</p>`);
    }

    // Seller info
    if (options.seller) {
        parts.push(`<p><strong>Seller:</strong> ${options.seller}</p>`);
    }

    // Location
    if (options.location) {
        parts.push(`<p><strong>Ships from:</strong> ${options.location}</p>`);
    }

    // Features
    if (options.features && options.features.length > 0) {
        parts.push('<h3>Features</h3>');
        parts.push('<ul>');
        options.features.forEach(f => parts.push(`<li>${f}</li>`));
        parts.push('</ul>');
    }

    // Source link
    if (options.includeSourceLink && options.sourceUrl) {
        parts.push(`<p><a href="${options.sourceUrl}" target="_blank" rel="nofollow sponsored">View Original Listing</a></p>`);
    }

    return parts.join('\n');
}

/**
 * Batch map multiple Amazon products
 */
export function mapAmazonProducts(
    products: AmazonProduct[],
    options: ProductMappingOptions = {}
): MappedProduct[] {
    return products.map(p => mapAmazonProduct(p, options));
}

/**
 * Batch map multiple eBay products
 */
export function mapEbayProducts(
    products: EbayProduct[],
    options: ProductMappingOptions = {}
): MappedProduct[] {
    return products.map(p => mapEbayProduct(p, options));
}
