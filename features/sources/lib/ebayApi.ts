/**
 * eBay API Client
 * FSD: features/sources/lib/ebayApi.ts
 * 
 * eBay Browse API integration for product search and affiliate links.
 * Uses OAuth2 client credentials flow.
 */

// ============================================================================
// Types
// ============================================================================

export interface EbayProduct {
    itemId: string;
    title: string;
    url: string;
    affiliateUrl: string;
    price: {
        value: number;
        currency: string;
        formatted: string;
    };
    originalPrice?: {
        value: number;
        currency: string;
        formatted: string;
    };
    condition: string;
    conditionId: string;
    imageUrl: string;
    additionalImages?: string[];
    seller: {
        username: string;
        feedbackScore: number;
        feedbackPercentage: number;
    };
    shipping?: {
        cost: number;
        type: string;
        isFreeShipping: boolean;
    };
    location: string;
    categoryPath: string;
    itemEndDate?: string;
    buyingOptions: ('FIXED_PRICE' | 'AUCTION' | 'BEST_OFFER')[];
    bids?: number;
}

export interface EbaySearchResult {
    products: EbayProduct[];
    totalProducts: number;
    nextOffset?: number;
}

export interface EbayCredentials {
    appId: string;
    certId: string;
    campaignId?: string;
    sandbox?: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

let ebayCredentials: EbayCredentials | null = null;
let accessToken: string | null = null;
let tokenExpiry: number = 0;

export function setEbayCredentials(creds: EbayCredentials): void {
    ebayCredentials = creds;
}

export function getEbayCredentials(): EbayCredentials | null {
    if (ebayCredentials) return ebayCredentials;
    if (typeof window !== 'undefined') {
        const appId = localStorage.getItem('ifrit_ebay_app_id');
        const certId = localStorage.getItem('ifrit_ebay_cert_id');
        const campaignId = localStorage.getItem('ifrit_ebay_campaign_id');
        if (appId && certId) {
            return { appId, certId, campaignId: campaignId || undefined };
        }
    }
    return null;
}

export function isEbayConfigured(): boolean {
    return !!getEbayCredentials();
}

const EBAY_API_BASE = 'https://api.ebay.com';
const EBAY_SANDBOX_BASE = 'https://api.sandbox.ebay.com';

// ============================================================================
// Auth
// ============================================================================

async function getAccessToken(): Promise<string> {
    const creds = getEbayCredentials();
    if (!creds) {
        throw new Error('eBay credentials not configured');
    }

    // Check if token is still valid
    if (accessToken && Date.now() < tokenExpiry) {
        return accessToken;
    }

    const base = creds.sandbox ? EBAY_SANDBOX_BASE : EBAY_API_BASE;
    const response = await fetch(`${base}/identity/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${creds.appId}:${creds.certId}`)}`,
        },
        body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error_description || 'eBay OAuth failed');
    }

    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 min buffer

    return accessToken!;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Search eBay products
 */
export async function searchEbayProducts(
    query: string,
    options: {
        category?: string;
        limit?: number;
        offset?: number;
        sortBy?: 'price' | '-price' | 'newlyListed' | 'endingSoonest';
        minPrice?: number;
        maxPrice?: number;
        condition?: 'NEW' | 'USED' | 'REFURBISHED';
        buyingOption?: 'FIXED_PRICE' | 'AUCTION';
    } = {}
): Promise<EbaySearchResult> {
    const token = await getAccessToken();
    const creds = getEbayCredentials();
    const base = creds?.sandbox ? EBAY_SANDBOX_BASE : EBAY_API_BASE;

    const params = new URLSearchParams({
        q: query,
        limit: String(options.limit || 20),
    });

    if (options.offset) params.set('offset', String(options.offset));
    if (options.sortBy) params.set('sort', options.sortBy);
    if (options.category) params.set('category_ids', options.category);

    // Build filter string
    const filters: string[] = [];
    if (options.minPrice) filters.push(`price:[${options.minPrice}]`);
    if (options.maxPrice) filters.push(`price:[..${options.maxPrice}]`);
    if (options.condition) filters.push(`conditions:{${options.condition}}`);
    if (options.buyingOption) filters.push(`buyingOptions:{${options.buyingOption}}`);
    if (filters.length > 0) params.set('filter', filters.join(','));

    const response = await fetch(`${base}/buy/browse/v1/item_summary/search?${params}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
            'X-EBAY-C-ENDUSERCTX': 'affiliateCampaignId=' + (creds?.campaignId || ''),
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.errors?.[0]?.message || 'eBay search failed');
    }

    const data = await response.json();

    return {
        products: (data.itemSummaries || []).map((item: Record<string, unknown>) =>
            parseEbayProduct(item, creds?.campaignId)
        ),
        totalProducts: data.total || 0,
        nextOffset: data.next ? options.offset! + (options.limit || 20) : undefined,
    };
}

/**
 * Get product by item ID
 */
export async function getEbayProductById(itemId: string): Promise<EbayProduct | null> {
    const token = await getAccessToken();
    const creds = getEbayCredentials();
    const base = creds?.sandbox ? EBAY_SANDBOX_BASE : EBAY_API_BASE;

    const response = await fetch(`${base}/buy/browse/v1/item/${itemId}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
            'X-EBAY-C-ENDUSERCTX': 'affiliateCampaignId=' + (creds?.campaignId || ''),
        },
    });

    if (!response.ok) {
        return null;
    }

    const item = await response.json();
    return parseEbayProduct(item, creds?.campaignId);
}

/**
 * Generate affiliate link
 */
export function generateEbayAffiliateLink(
    itemId: string,
    campaignId?: string
): string {
    const creds = getEbayCredentials();
    const campId = campaignId || creds?.campaignId;
    const baseUrl = `https://www.ebay.com/itm/${itemId}`;

    if (campId) {
        return `https://rover.ebay.com/rover/1/711-53200-19255-0/1?mpre=${encodeURIComponent(baseUrl)}&campid=${campId}`;
    }
    return baseUrl;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse API response to EbayProduct
 */
function parseEbayProduct(
    item: Record<string, unknown>,
    campaignId?: string
): EbayProduct {
    const price = item.price as Record<string, unknown> | undefined;
    const originalPrice = (item.marketingPrice as Record<string, unknown>)?.originalPrice as Record<string, unknown> | undefined;
    const seller = item.seller as Record<string, unknown> | undefined;
    const shippingOptions = item.shippingOptions as Record<string, unknown>[] | undefined;
    const shipping = shippingOptions?.[0];
    const shippingCost = (shipping?.shippingCost as Record<string, unknown>)?.value;
    const image = item.image as Record<string, unknown> | undefined;
    const additionalImages = item.additionalImages as Record<string, unknown>[] | undefined;

    return {
        itemId: item.itemId as string,
        title: item.title as string,
        url: item.itemWebUrl as string || `https://www.ebay.com/itm/${item.itemId}`,
        affiliateUrl: generateEbayAffiliateLink(item.itemId as string, campaignId),
        price: {
            value: parseFloat((price?.value as string) || '0'),
            currency: (price?.currency as string) || 'USD',
            formatted: `$${parseFloat((price?.value as string) || '0').toFixed(2)}`,
        },
        originalPrice: originalPrice ? {
            value: parseFloat((originalPrice.value as string) || '0'),
            currency: (originalPrice.currency as string) || 'USD',
            formatted: `$${parseFloat((originalPrice.value as string) || '0').toFixed(2)}`,
        } : undefined,
        condition: (item.condition as string) || 'New',
        conditionId: (item.conditionId as string) || '1000',
        imageUrl: (image?.imageUrl as string) || '',
        additionalImages: additionalImages?.map(img => img.imageUrl as string),
        seller: {
            username: (seller?.username as string) || 'Unknown',
            feedbackScore: (seller?.feedbackScore as number) || 0,
            feedbackPercentage: parseFloat((seller?.feedbackPercentage as string) || '0'),
        },
        shipping: shipping ? {
            cost: typeof shippingCost === 'string' ? parseFloat(shippingCost) : (shippingCost as number) || 0,
            type: (shipping.shippingServiceCode as string) || 'Standard',
            isFreeShipping: shippingCost === '0.00' || shippingCost === 0,
        } : undefined,
        location: ((item.itemLocation as Record<string, unknown> | undefined)?.country as string) || 'US',
        categoryPath: (item.categoryPath as string) || '',
        itemEndDate: item.itemEndDate as string | undefined,
        buyingOptions: (item.buyingOptions as ('FIXED_PRICE' | 'AUCTION' | 'BEST_OFFER')[]) || ['FIXED_PRICE'],
        bids: item.bidCount as number | undefined,
    };
}

/**
 * Get best product image
 */
export function getBestEbayImage(product: EbayProduct): string {
    return product.imageUrl || product.additionalImages?.[0] || '';
}

/**
 * Format eBay price for display
 */
export function formatEbayPrice(product: EbayProduct): string {
    return product.price.formatted;
}

/**
 * Check if product is an auction
 */
export function isAuction(product: EbayProduct): boolean {
    return product.buyingOptions.includes('AUCTION');
}
