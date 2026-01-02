/**
 * E-Commerce Feature
 * FSD: features/ecommerce/index.ts
 * 
 * Unified e-commerce API for affiliate content generation.
 */

// Amazon exports
export {
    amazonHandler,
    searchProducts,
    getProductDetails,
    setAmazonCredentials,
    isAmazonConfigured,
    type AmazonProduct,
    type AmazonSearchResult,
    type AmazonCredentials,
} from '@/lib/ai/handlers/amazonHandler';

// ============================================================================
// Types
// ============================================================================

export interface ProductComparison {
    title: string;
    products: ComparisonProduct[];
    summary: string;
}

export interface ComparisonProduct {
    name: string;
    price: string;
    rating: number;
    pros: string[];
    cons: string[];
    verdict: string;
    affiliateUrl: string;
}

// ============================================================================
// Content Generation
// ============================================================================

/**
 * Generate product comparison table HTML
 */
export function generateComparisonTable(
    products: ComparisonProduct[],
    associateTag: string
): string {
    const rows = products.map(p => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.price}</td>
      <td>★${p.rating.toFixed(1)}</td>
      <td>
        <ul class="pros">
          ${p.pros.map(pro => `<li>✓ ${pro}</li>`).join('')}
        </ul>
      </td>
      <td>
        <ul class="cons">
          ${p.cons.map(con => `<li>✗ ${con}</li>`).join('')}
        </ul>
      </td>
      <td>
        <a href="${p.affiliateUrl}?tag=${associateTag}" 
           target="_blank" 
           rel="nofollow sponsored">
          Check Price
        </a>
      </td>
    </tr>`).join('');

    return `
<table class="product-comparison">
  <thead>
    <tr>
      <th>Product</th>
      <th>Price</th>
      <th>Rating</th>
      <th>Pros</th>
      <th>Cons</th>
      <th>Buy</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>`;
}

/**
 * Generate product card HTML
 */
export function generateProductCard(
    product: ComparisonProduct,
    associateTag: string
): string {
    return `
<div class="product-card">
  <h3>${product.name}</h3>
  <div class="product-meta">
    <span class="price">${product.price}</span>
    <span class="rating">★${product.rating.toFixed(1)}</span>
  </div>
  <div class="product-pros">
    <h4>What We Like</h4>
    <ul>
      ${product.pros.map(p => `<li>${p}</li>`).join('')}
    </ul>
  </div>
  <div class="product-cons">
    <h4>What Could Be Better</h4>
    <ul>
      ${product.cons.map(c => `<li>${c}</li>`).join('')}
    </ul>
  </div>
  <p class="verdict"><strong>Our Verdict:</strong> ${product.verdict}</p>
  <a href="${product.affiliateUrl}?tag=${associateTag}" 
     class="buy-button"
     target="_blank" 
     rel="nofollow sponsored">
    View on Amazon →
  </a>
</div>`;
}

/**
 * Generate affiliate disclosure HTML
 */
export function generateAffiliateDisclosure(): string {
    return `
<div class="affiliate-disclosure">
  <p><em>Disclosure: This article contains affiliate links. If you make a purchase 
  through these links, we may earn a small commission at no extra cost to you. 
  This helps support our work and allows us to continue providing helpful content.</em></p>
</div>`;
}

// ============================================================================
// Amazon Categories
// ============================================================================

export const AMAZON_CATEGORIES = [
    { id: 'Electronics', name: 'Electronics' },
    { id: 'Computers', name: 'Computers' },
    { id: 'HomeGarden', name: 'Home & Garden' },
    { id: 'Kitchen', name: 'Kitchen' },
    { id: 'Beauty', name: 'Beauty' },
    { id: 'Fashion', name: 'Fashion' },
    { id: 'Sports', name: 'Sports & Outdoors' },
    { id: 'Toys', name: 'Toys & Games' },
    { id: 'Books', name: 'Books' },
    { id: 'HealthPersonalCare', name: 'Health' },
] as const;
