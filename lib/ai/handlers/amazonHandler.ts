/**
 * Amazon Product Advertising API Handler
 * FSD: lib/ai/handlers/amazonHandler.ts
 * 
 * Integration with Amazon PA-API for product research.
 * Enables affiliate content generation with product data.
 */

import type { CapabilityHandler, ExecuteOptions, ExecuteResult } from '../services/types';

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY_ACCESS = 'ifrit_amazon_access_key';
const STORAGE_KEY_SECRET = 'ifrit_amazon_secret_key';
const STORAGE_KEY_TAG = 'ifrit_amazon_associate_tag';

// Amazon API endpoints by region
const AMAZON_ENDPOINTS: Record<string, string> = {
    'US': 'webservices.amazon.com',
    'UK': 'webservices.amazon.co.uk',
    'DE': 'webservices.amazon.de',
    'FR': 'webservices.amazon.fr',
    'JP': 'webservices.amazon.co.jp',
    'CA': 'webservices.amazon.ca',
    'AU': 'webservices.amazon.com.au',
};

// ============================================================================
// Types
// ============================================================================

export interface AmazonProduct {
    asin: string;
    title: string;
    description?: string;
    features?: string[];
    price?: {
        amount: number;
        currency: string;
        formatted: string;
    };
    rating?: number;
    reviewCount?: number;
    imageUrl?: string;
    detailUrl: string;
    category?: string;
    brand?: string;
    isPrime?: boolean;
}

export interface AmazonSearchResult {
    products: AmazonProduct[];
    totalResults: number;
}

export interface AmazonCredentials {
    accessKey: string;
    secretKey: string;
    associateTag: string;
    region?: string;
}

// ============================================================================
// Handler Definition
// ============================================================================

export const amazonHandler: CapabilityHandler = {
    id: 'amazon-products',
    name: 'Amazon Product Research',
    source: 'integration',
    capabilities: ['research'],
    priority: 55,
    isAvailable: typeof window !== 'undefined' && !!getCredentials(),
    requiresApiKey: true,

    execute: async (options: ExecuteOptions): Promise<ExecuteResult> => {
        const { prompt, context } = options;
        const startTime = Date.now();

        const credentials = getCredentials();
        if (!credentials) {
            return {
                success: false,
                error: 'Amazon API not configured. Add Access Key, Secret Key, and Associate Tag in Settings > Automation.',
                handlerUsed: 'amazon-products',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }

        try {
            const query = context?.query as string || prompt;
            const category = context?.category as string;
            const maxResults = context?.maxResults as number || 10;

            const result = await searchProducts(credentials, query, category, maxResults);
            const formattedText = formatProductsAsText(result.products, credentials.associateTag);

            return {
                success: true,
                text: formattedText,
                handlerUsed: 'amazon-products',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Amazon search failed',
                handlerUsed: 'amazon-products',
                source: 'integration',
                latencyMs: Date.now() - startTime,
            };
        }
    },
};

// ============================================================================
// API Functions (Simulated - PA-API requires server-side signing)
// ============================================================================

/**
 * Search Amazon products
 * Note: Real PA-API requires AWS v4 signing on server-side
 */
export async function searchProducts(
    credentials: AmazonCredentials,
    query: string,
    category?: string,
    maxResults = 10
): Promise<AmazonSearchResult> {
    // PA-API v5 requires server-side AWS Signature v4
    // This is a placeholder that should call a backend API endpoint

    const endpoint = `/api/amazon/search`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                category,
                maxResults,
                region: credentials.region || 'US',
            }),
        });

        if (!response.ok) {
            // If backend not configured, return mock data for development
            return getMockProducts(query, maxResults);
        }

        const data = await response.json();
        return data as AmazonSearchResult;

    } catch {
        // Fallback to mock data
        return getMockProducts(query, maxResults);
    }
}

/**
 * Get product details by ASIN
 */
export async function getProductDetails(
    credentials: AmazonCredentials,
    asin: string
): Promise<AmazonProduct | null> {
    const endpoint = `/api/amazon/product/${asin}`;

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) return null;
        return await response.json();

    } catch {
        return null;
    }
}

// ============================================================================
// Mock Data for Development
// ============================================================================

function getMockProducts(query: string, count: number): AmazonSearchResult {
    const products: AmazonProduct[] = [];

    for (let i = 0; i < count; i++) {
        products.push({
            asin: `B${String(i).padStart(9, '0')}`,
            title: `${query} - Product ${i + 1} (Premium Quality)`,
            description: `High-quality ${query.toLowerCase()} with excellent features and great customer reviews.`,
            features: [
                'Premium build quality',
                'Easy to use',
                'Great value for money',
                'Fast shipping with Prime',
            ],
            price: {
                amount: 29.99 + (i * 10),
                currency: 'USD',
                formatted: `$${(29.99 + (i * 10)).toFixed(2)}`,
            },
            rating: 4.0 + (Math.random() * 0.9),
            reviewCount: 100 + Math.floor(Math.random() * 900),
            imageUrl: `https://via.placeholder.com/300x300?text=${encodeURIComponent(query)}`,
            detailUrl: `https://www.amazon.com/dp/B${String(i).padStart(9, '0')}`,
            brand: ['BrandA', 'BrandB', 'BrandC'][i % 3],
            isPrime: i % 2 === 0,
        });
    }

    return { products, totalResults: products.length };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getCredentials(): AmazonCredentials | null {
    if (typeof window === 'undefined') return null;

    const accessKey = localStorage.getItem(STORAGE_KEY_ACCESS);
    const secretKey = localStorage.getItem(STORAGE_KEY_SECRET);
    const associateTag = localStorage.getItem(STORAGE_KEY_TAG);

    if (!accessKey || !secretKey || !associateTag) return null;

    return { accessKey, secretKey, associateTag };
}

function formatProductsAsText(products: AmazonProduct[], tag: string): string {
    if (products.length === 0) return 'No products found.';

    const lines = products.map((p, i) => {
        const rating = p.rating ? `★${p.rating.toFixed(1)}` : '';
        const reviews = p.reviewCount ? `(${p.reviewCount} reviews)` : '';
        const prime = p.isPrime ? '🚀 Prime' : '';
        const price = p.price?.formatted || 'Price unavailable';

        return `${i + 1}. **${p.title}**
   ${price} ${rating} ${reviews} ${prime}
   ${p.features?.slice(0, 2).join(' • ') || p.description?.slice(0, 100)}
   [View on Amazon](${p.detailUrl}?tag=${tag})`;
    });

    return `Found ${products.length} products:\n\n${lines.join('\n\n')}`;
}

/**
 * Set Amazon credentials
 */
export function setAmazonCredentials(credentials: Partial<AmazonCredentials>): void {
    if (typeof window === 'undefined') return;
    if (credentials.accessKey) localStorage.setItem(STORAGE_KEY_ACCESS, credentials.accessKey);
    if (credentials.secretKey) localStorage.setItem(STORAGE_KEY_SECRET, credentials.secretKey);
    if (credentials.associateTag) localStorage.setItem(STORAGE_KEY_TAG, credentials.associateTag);
}

/**
 * Check if Amazon is configured
 */
export function isAmazonConfigured(): boolean {
    return !!getCredentials();
}

export default amazonHandler;
