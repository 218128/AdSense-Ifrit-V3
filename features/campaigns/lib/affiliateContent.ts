/**
 * Affiliate Content Generator
 * FSD: features/campaigns/lib/affiliateContent.ts
 * 
 * Generates affiliate content from product data.
 * Creates reviews, comparisons, and buying guides.
 */

import {
    AmazonProduct,
    getBestProductImage,
    formatPrice,
} from '@/features/sources/lib/amazonApi';

import {
    EbayProduct,
    getBestEbayImage,
    formatEbayPrice,
} from '@/features/sources/lib/ebayApi';

// ============================================================================
// Types
// ============================================================================

export type ProductSource = 'amazon' | 'ebay';

export interface UnifiedProduct {
    id: string;
    source: ProductSource;
    title: string;
    url: string;
    affiliateUrl: string;
    price: string;
    originalPrice?: string;
    discount?: string;
    imageUrl: string;
    rating?: string;
    features?: string[];
    brand?: string;
    condition?: string;
    isPrime?: boolean;
    isFreeShipping?: boolean;
}

export interface AffiliateDisclosure {
    type: 'amazon' | 'ebay' | 'general';
    text: string;
    position: 'top' | 'bottom' | 'both';
}

// ============================================================================
// Product Normalization
// ============================================================================

/**
 * Convert Amazon product to unified format
 */
export function normalizeAmazonProduct(product: AmazonProduct): UnifiedProduct {
    return {
        id: product.asin,
        source: 'amazon',
        title: product.title,
        url: product.url,
        affiliateUrl: product.affiliateUrl,
        price: formatPrice(product),
        originalPrice: product.listPrice?.formatted,
        discount: product.savings
            ? `${product.savings.percentage}% off`
            : undefined,
        imageUrl: getBestProductImage(product),
        rating: product.rating ? `${product.rating}/5` : undefined,
        features: product.features,
        brand: product.brand,
        isPrime: product.isPrime,
    };
}

/**
 * Convert eBay product to unified format
 */
export function normalizeEbayProduct(product: EbayProduct): UnifiedProduct {
    return {
        id: product.itemId,
        source: 'ebay',
        title: product.title,
        url: product.url,
        affiliateUrl: product.affiliateUrl,
        price: formatEbayPrice(product),
        originalPrice: product.originalPrice?.formatted,
        discount: product.originalPrice
            ? `${Math.round((product.originalPrice.value - product.price.value) / product.originalPrice.value * 100)}% off`
            : undefined,
        imageUrl: getBestEbayImage(product),
        rating: product.seller.feedbackPercentage
            ? `${product.seller.feedbackPercentage}% positive`
            : undefined,
        condition: product.condition,
        isFreeShipping: product.shipping?.isFreeShipping,
    };
}

// ============================================================================
// Disclosure Templates
// ============================================================================

export const DISCLOSURES: Record<string, AffiliateDisclosure> = {
    amazon: {
        type: 'amazon',
        text: 'As an Amazon Associate, we earn from qualifying purchases. This means that at no additional cost to you, we may receive a commission if you click through and make a purchase.',
        position: 'top',
    },
    ebay: {
        type: 'ebay',
        text: 'Some links on this page are affiliate links. If you make a purchase through these links, we may receive a commission at no extra cost to you.',
        position: 'top',
    },
    general: {
        type: 'general',
        text: 'Disclosure: This post may contain affiliate links. If you make a purchase through these links, we may earn a commission at no additional cost to you. We only recommend products we believe in.',
        position: 'both',
    },
};

/**
 * Generate disclosure HTML
 */
export function generateDisclosure(type: 'amazon' | 'ebay' | 'general' = 'general'): string {
    const disclosure = DISCLOSURES[type];
    return `
<aside class="affiliate-disclosure" style="background: #f8f9fa; border-left: 4px solid #6c757d; padding: 1rem; margin: 1rem 0; font-size: 0.875rem; color: #6c757d;">
    <strong>Affiliate Disclosure:</strong> ${disclosure.text}
</aside>
`.trim();
}

// ============================================================================
// Content Templates
// ============================================================================

/**
 * Generate single product review block
 */
export function generateProductReviewBlock(product: UnifiedProduct): string {
    const primeOrShipping = product.isPrime
        ? '<span style="color: #007185;">✓ Prime</span>'
        : product.isFreeShipping
            ? '<span style="color: #28a745;">✓ Free Shipping</span>'
            : '';

    const discount = product.discount
        ? `<span style="color: #B12704; font-weight: bold;">${product.discount}</span>`
        : '';

    return `
<div class="product-card" style="border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin: 1rem 0; display: flex; gap: 1.5rem; flex-wrap: wrap;">
    <div style="flex: 0 0 200px;">
        <a href="${product.affiliateUrl}" target="_blank" rel="nofollow sponsored">
            <img src="${product.imageUrl}" alt="${product.title}" style="width: 100%; border-radius: 4px;" loading="lazy" />
        </a>
    </div>
    <div style="flex: 1; min-width: 250px;">
        <h3 style="margin-top: 0;">
            <a href="${product.affiliateUrl}" target="_blank" rel="nofollow sponsored" style="color: inherit; text-decoration: none;">
                ${product.title}
            </a>
        </h3>
        ${product.brand ? `<p style="color: #666; margin: 0.25rem 0;"><strong>Brand:</strong> ${product.brand}</p>` : ''}
        ${product.rating ? `<p style="color: #f5a623; margin: 0.25rem 0;">⭐ ${product.rating}</p>` : ''}
        <div style="margin: 1rem 0;">
            <span style="font-size: 1.5rem; font-weight: bold; color: #B12704;">${product.price}</span>
            ${product.originalPrice ? `<span style="text-decoration: line-through; color: #999; margin-left: 0.5rem;">${product.originalPrice}</span>` : ''}
            ${discount}
        </div>
        <div style="margin-bottom: 1rem;">${primeOrShipping}</div>
        <a href="${product.affiliateUrl}" target="_blank" rel="nofollow sponsored" 
           style="display: inline-block; background: ${product.source === 'amazon' ? '#f0c14b' : '#3665f3'}; color: ${product.source === 'amazon' ? '#111' : '#fff'}; padding: 0.75rem 1.5rem; border-radius: 4px; text-decoration: none; font-weight: bold;">
            ${product.source === 'amazon' ? '🛒 Buy on Amazon' : '🛒 Buy on eBay'}
        </a>
    </div>
</div>
`.trim();
}

/**
 * Generate comparison table
 */
export function generateComparisonTable(
    products: UnifiedProduct[],
    title: string = 'Product Comparison'
): string {
    if (products.length === 0) return '';

    const rows = products.map(p => `
        <tr>
            <td style="padding: 1rem; border-bottom: 1px solid #ddd;">
                <a href="${p.affiliateUrl}" target="_blank" rel="nofollow sponsored">
                    <img src="${p.imageUrl}" alt="${p.title}" style="width: 80px; border-radius: 4px;" loading="lazy" />
                </a>
            </td>
            <td style="padding: 1rem; border-bottom: 1px solid #ddd;">
                <a href="${p.affiliateUrl}" target="_blank" rel="nofollow sponsored" style="color: inherit;">
                    ${p.title.slice(0, 60)}${p.title.length > 60 ? '...' : ''}
                </a>
            </td>
            <td style="padding: 1rem; border-bottom: 1px solid #ddd; font-weight: bold; color: #B12704;">
                ${p.price}
            </td>
            <td style="padding: 1rem; border-bottom: 1px solid #ddd;">${p.rating || '-'}</td>
            <td style="padding: 1rem; border-bottom: 1px solid #ddd; text-transform: capitalize;">${p.source}</td>
            <td style="padding: 1rem; border-bottom: 1px solid #ddd;">
                <a href="${p.affiliateUrl}" target="_blank" rel="nofollow sponsored" 
                   style="padding: 0.5rem 1rem; background: #28a745; color: white; border-radius: 4px; text-decoration: none;">
                    View
                </a>
            </td>
        </tr>
    `).join('');

    return `
<div style="overflow-x: auto; margin: 2rem 0;">
    <h3>${title}</h3>
    <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
        <thead>
            <tr style="background: #f8f9fa;">
                <th style="padding: 1rem; text-align: left; border-bottom: 2px solid #ddd;">Image</th>
                <th style="padding: 1rem; text-align: left; border-bottom: 2px solid #ddd;">Product</th>
                <th style="padding: 1rem; text-align: left; border-bottom: 2px solid #ddd;">Price</th>
                <th style="padding: 1rem; text-align: left; border-bottom: 2px solid #ddd;">Rating</th>
                <th style="padding: 1rem; text-align: left; border-bottom: 2px solid #ddd;">Store</th>
                <th style="padding: 1rem; text-align: left; border-bottom: 2px solid #ddd;">Action</th>
            </tr>
        </thead>
        <tbody>
            ${rows}
        </tbody>
    </table>
</div>
`.trim();
}

/**
 * Generate top picks section
 */
export function generateTopPicks(
    products: UnifiedProduct[],
    title: string = 'Our Top Picks'
): string {
    if (products.length === 0) return '';

    const cards = products.slice(0, 5).map((p, i) => {
        const badge = i === 0 ? '🏆 Best Overall'
            : i === 1 ? '💰 Best Value'
                : i === 2 ? '⭐ Editor\'s Choice'
                    : '';

        return `
<div style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem; text-align: center; min-width: 180px; flex: 1;">
    ${badge ? `<div style="background: #f0c14b; color: #111; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold; margin-bottom: 0.5rem;">${badge}</div>` : ''}
    <a href="${p.affiliateUrl}" target="_blank" rel="nofollow sponsored">
        <img src="${p.imageUrl}" alt="${p.title}" style="width: 120px; height: 120px; object-fit: contain;" loading="lazy" />
    </a>
    <h4 style="font-size: 0.9rem; margin: 0.5rem 0;">
        <a href="${p.affiliateUrl}" target="_blank" rel="nofollow sponsored" style="color: inherit; text-decoration: none;">
            ${p.title.slice(0, 40)}...
        </a>
    </h4>
    <div style="font-size: 1.25rem; font-weight: bold; color: #B12704;">${p.price}</div>
    <a href="${p.affiliateUrl}" target="_blank" rel="nofollow sponsored" 
       style="display: inline-block; margin-top: 0.5rem; padding: 0.5rem 1rem; background: #111; color: white; border-radius: 4px; text-decoration: none; font-size: 0.875rem;">
        View Deal
    </a>
</div>
`;
    }).join('');

    return `
<section style="margin: 2rem 0;">
    <h2>${title}</h2>
    <div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;">
        ${cards}
    </div>
</section>
`.trim();
}

// ============================================================================
// Full Article Generation
// ============================================================================

/**
 * Generate complete buying guide
 */
export function generateBuyingGuide(
    products: UnifiedProduct[],
    topic: string,
    options: {
        includeComparison?: boolean;
        includeTopPicks?: boolean;
        includeIndividualReviews?: boolean;
        disclosureType?: 'amazon' | 'ebay' | 'general';
    } = {}
): string {
    const sections: string[] = [];

    // Disclosure
    sections.push(generateDisclosure(options.disclosureType || 'general'));

    // Top Picks
    if (options.includeTopPicks !== false && products.length > 0) {
        sections.push(generateTopPicks(products.slice(0, 5)));
    }

    // Comparison Table
    if (options.includeComparison !== false && products.length > 1) {
        sections.push(generateComparisonTable(products, `${topic} Comparison`));
    }

    // Individual Reviews
    if (options.includeIndividualReviews && products.length > 0) {
        sections.push('<h2>Detailed Reviews</h2>');
        products.forEach(p => {
            sections.push(generateProductReviewBlock(p));
        });
    }

    // Bottom Disclosure
    sections.push(generateDisclosure(options.disclosureType || 'general'));

    return sections.join('\n\n');
}

/**
 * Create AI prompt for affiliate article
 */
export function createAffiliateArticlePrompt(
    products: UnifiedProduct[],
    topic: string,
    options: {
        style?: 'review' | 'comparison' | 'guide' | 'roundup';
        wordCount?: number;
    } = {}
): string {
    const style = options.style || 'guide';
    const wordCount = options.wordCount || 2000;

    const productList = products.map(p =>
        `- ${p.title} (${p.price}) from ${p.source}`
    ).join('\n');

    const styleGuides: Record<string, string> = {
        review: 'Write detailed product reviews with pros, cons, and recommendations.',
        comparison: 'Compare these products side-by-side, highlighting differences and best use cases.',
        guide: 'Create a buying guide that helps readers choose the right product for their needs.',
        roundup: 'Create a product roundup article featuring the best options available.',
    };

    return `
Write an SEO-optimized affiliate article about: "${topic}"

Products to feature:
${productList}

Style: ${styleGuides[style]}

Requirements:
- Write approximately ${wordCount} words
- Include an engaging introduction
- Add proper H2 and H3 headings
- Discuss key features, pros, and cons
- Include a buying guide section
- Add a FAQ section
- Write a conclusion with recommendations
- Use natural product mentions (not overly promotional)
- Optimize for SEO with the keyword: "${topic}"

IMPORTANT: 
- I will add product cards and comparison tables separately
- Focus on the written content around the products
- Leave placeholders like [PRODUCT_CARD_1], [COMPARISON_TABLE] where visual elements should go

Write in HTML format using semantic tags.
`.trim();
}
