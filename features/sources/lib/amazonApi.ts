/**
 * Amazon Product Advertising API Client
 * FSD: features/sources/lib/amazonApi.ts
 * 
 * Amazon PA-API v5 integration for product search and affiliate links.
 * Requires Amazon Associates account.
 */

import crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface AmazonProduct {
    asin: string;
    title: string;
    url: string;
    affiliateUrl: string;
    price?: {
        amount: number;
        currency: string;
        formatted: string;
    };
    listPrice?: {
        amount: number;
        currency: string;
        formatted: string;
    };
    savings?: {
        amount: number;
        percentage: number;
    };
    rating?: number;
    reviewCount?: number;
    images: {
        small?: string;
        medium?: string;
        large?: string;
    };
    features?: string[];
    description?: string;
    brand?: string;
    category?: string;
    availability?: string;
    isPrime?: boolean;
}

export interface AmazonSearchResult {
    products: AmazonProduct[];
    totalResults: number;
    searchUrl: string;
}

export interface AmazonCredentials {
    accessKey: string;
    secretKey: string;
    partnerTag: string;
    marketplace?: string;
}

// Internal API response types
interface AmazonApiResponse {
    SearchResult?: {
        Items?: Record<string, unknown>[];
        TotalResultCount?: number;
        SearchURL?: string;
    };
    ItemsResult?: {
        Items?: Record<string, unknown>[];
    };
    Errors?: { Message: string }[];
}

// ============================================================================
// Configuration
// ============================================================================

let amazonCredentials: AmazonCredentials | null = null;

export function setAmazonCredentials(creds: AmazonCredentials): void {
    amazonCredentials = creds;
}

export function getAmazonCredentials(): AmazonCredentials | null {
    if (amazonCredentials) return amazonCredentials;
    if (typeof window !== 'undefined') {
        const accessKey = localStorage.getItem('ifrit_amazon_access_key');
        const secretKey = localStorage.getItem('ifrit_amazon_secret_key');
        const partnerTag = localStorage.getItem('ifrit_amazon_partner_tag');
        if (accessKey && secretKey && partnerTag) {
            return { accessKey, secretKey, partnerTag };
        }
    }
    return null;
}

export function isAmazonConfigured(): boolean {
    return !!getAmazonCredentials();
}

const AMAZON_MARKETPLACES: Record<string, { host: string; region: string }> = {
    'US': { host: 'webservices.amazon.com', region: 'us-east-1' },
    'UK': { host: 'webservices.amazon.co.uk', region: 'eu-west-1' },
    'DE': { host: 'webservices.amazon.de', region: 'eu-west-1' },
    'FR': { host: 'webservices.amazon.fr', region: 'eu-west-1' },
    'JP': { host: 'webservices.amazon.co.jp', region: 'us-west-2' },
    'CA': { host: 'webservices.amazon.ca', region: 'us-east-1' },
};

// ============================================================================
// API Functions
// ============================================================================

/**
 * Search Amazon products by keyword
 */
export async function searchAmazonProducts(
    keywords: string,
    options: {
        category?: string;
        maxResults?: number;
        sortBy?: 'Relevance' | 'Price:LowToHigh' | 'Price:HighToLow' | 'AvgCustomerReviews';
        minPrice?: number;
        maxPrice?: number;
    } = {}
): Promise<AmazonSearchResult> {
    const creds = getAmazonCredentials();
    if (!creds) {
        throw new Error('Amazon credentials not configured');
    }

    const marketplace = AMAZON_MARKETPLACES[creds.marketplace || 'US'];
    const maxResults = Math.min(options.maxResults || 10, 10);

    const payload = {
        Keywords: keywords,
        Resources: [
            'Images.Primary.Large',
            'Images.Primary.Medium',
            'Images.Primary.Small',
            'ItemInfo.Title',
            'ItemInfo.Features',
            'ItemInfo.ProductInfo',
            'ItemInfo.ByLineInfo',
            'Offers.Listings.Price',
            'Offers.Listings.SavingBasis',
            'Offers.Listings.Availability.Type',
            'Offers.Listings.DeliveryInfo.IsPrimeEligible',
        ],
        PartnerTag: creds.partnerTag,
        PartnerType: 'Associates',
        ItemCount: maxResults,
        ...(options.category && { SearchIndex: options.category }),
        ...(options.sortBy && { SortBy: options.sortBy }),
        ...(options.minPrice && { MinPrice: options.minPrice * 100 }),
        ...(options.maxPrice && { MaxPrice: options.maxPrice * 100 }),
    };

    const response = await signedRequest(
        creds,
        marketplace,
        '/paapi5/searchitems',
        payload
    );

    return {
        products: (response.SearchResult?.Items || []).map(parseProduct),
        totalResults: response.SearchResult?.TotalResultCount || 0,
        searchUrl: response.SearchResult?.SearchURL || '',
    };
}

/**
 * Get product details by ASIN
 */
export async function getAmazonProductByAsin(
    asin: string | string[]
): Promise<AmazonProduct[]> {
    const creds = getAmazonCredentials();
    if (!creds) {
        throw new Error('Amazon credentials not configured');
    }

    const asins = Array.isArray(asin) ? asin : [asin];
    const marketplace = AMAZON_MARKETPLACES[creds.marketplace || 'US'];

    const payload = {
        ItemIds: asins,
        Resources: [
            'Images.Primary.Large',
            'Images.Primary.Medium',
            'Images.Primary.Small',
            'ItemInfo.Title',
            'ItemInfo.Features',
            'ItemInfo.ProductInfo',
            'ItemInfo.ByLineInfo',
            'Offers.Listings.Price',
            'Offers.Listings.SavingBasis',
            'Offers.Listings.Availability.Type',
            'Offers.Listings.DeliveryInfo.IsPrimeEligible',
        ],
        PartnerTag: creds.partnerTag,
        PartnerType: 'Associates',
    };

    const response = await signedRequest(
        creds,
        marketplace,
        '/paapi5/getitems',
        payload
    );

    return (response.ItemsResult?.Items || []).map(parseProduct);
}

/**
 * Generate affiliate link for a product
 */
export function generateAffiliateLink(
    asin: string,
    partnerTag?: string
): string {
    const creds = getAmazonCredentials();
    const tag = partnerTag || creds?.partnerTag || '';
    return `https://www.amazon.com/dp/${asin}?tag=${tag}`;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse API response to AmazonProduct
 */
function parseProduct(item: Record<string, unknown>): AmazonProduct {
    const itemInfo = item.ItemInfo as Record<string, unknown> || {};
    const offers = item.Offers as Record<string, unknown> || {};
    const images = item.Images as Record<string, unknown> || {};
    const listing = (Array.isArray((offers as { Listings?: unknown[] }).Listings)
        ? (offers as { Listings: Record<string, unknown>[] }).Listings[0]
        : {}) as Record<string, unknown>;

    const price = listing.Price as Record<string, unknown> | undefined;
    const savingBasis = listing.SavingBasis as Record<string, unknown> | undefined;
    const primaryImage = (images as { Primary?: Record<string, unknown> }).Primary || {};

    const creds = getAmazonCredentials();

    return {
        asin: item.ASIN as string,
        title: ((itemInfo as { Title?: { DisplayValue?: string } }).Title?.DisplayValue) || '',
        url: item.DetailPageURL as string || '',
        affiliateUrl: generateAffiliateLink(item.ASIN as string, creds?.partnerTag),
        price: price ? {
            amount: (price.Amount as number) || 0,
            currency: (price.Currency as string) || 'USD',
            formatted: (price.DisplayAmount as string) || '',
        } : undefined,
        listPrice: savingBasis ? {
            amount: (savingBasis.Amount as number) || 0,
            currency: (savingBasis.Currency as string) || 'USD',
            formatted: (savingBasis.DisplayAmount as string) || '',
        } : undefined,
        savings: savingBasis && price ? {
            amount: (savingBasis.Amount as number) - (price.Amount as number),
            percentage: Math.round(((savingBasis.Amount as number) - (price.Amount as number)) / (savingBasis.Amount as number) * 100),
        } : undefined,
        images: {
            small: ((primaryImage as { Small?: { URL?: string } }).Small?.URL),
            medium: ((primaryImage as { Medium?: { URL?: string } }).Medium?.URL),
            large: ((primaryImage as { Large?: { URL?: string } }).Large?.URL),
        },
        features: ((itemInfo as { Features?: { DisplayValues?: string[] } }).Features?.DisplayValues) || [],
        brand: ((itemInfo as { ByLineInfo?: { Brand?: { DisplayValue?: string } } }).ByLineInfo?.Brand?.DisplayValue),
        availability: (listing.Availability as { Type?: string })?.Type,
        isPrime: !!(listing.DeliveryInfo as { IsPrimeEligible?: boolean })?.IsPrimeEligible,
    };
}

/**
 * Create AWS v4 signed request for PA-API
 */
async function signedRequest(
    creds: AmazonCredentials,
    marketplace: { host: string; region: string },
    path: string,
    payload: Record<string, unknown>
): Promise<AmazonApiResponse> {
    const body = JSON.stringify(payload);
    const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = date.substring(0, 8);

    // Create canonical request
    const method = 'POST';
    const service = 'ProductAdvertisingAPI';
    const headers = {
        'content-type': 'application/json; charset=utf-8',
        'content-encoding': 'amz-1.0',
        'host': marketplace.host,
        'x-amz-date': date,
        'x-amz-target': `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${path.split('/').pop()}`,
    };

    const signedHeaders = Object.keys(headers).sort().join(';');
    const canonicalHeaders = Object.entries(headers)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v}`)
        .join('\n') + '\n';

    const payloadHash = crypto.createHash('sha256').update(body).digest('hex');
    const canonicalRequest = [
        method,
        path,
        '',
        canonicalHeaders,
        signedHeaders,
        payloadHash,
    ].join('\n');

    // Create string to sign
    const credentialScope = `${dateStamp}/${marketplace.region}/${service}/aws4_request`;
    const stringToSign = [
        'AWS4-HMAC-SHA256',
        date,
        credentialScope,
        crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    // Calculate signature
    const getSignatureKey = (key: string, dateStamp: string, region: string, service: string) => {
        const kDate = crypto.createHmac('sha256', `AWS4${key}`).update(dateStamp).digest();
        const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
        const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
        return crypto.createHmac('sha256', kService).update('aws4_request').digest();
    };

    const signingKey = getSignatureKey(creds.secretKey, dateStamp, marketplace.region, service);
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    // Create authorization header
    const authorization = `AWS4-HMAC-SHA256 Credential=${creds.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // Make request
    const response = await fetch(`https://${marketplace.host}${path}`, {
        method: 'POST',
        headers: {
            ...headers,
            'Authorization': authorization,
        },
        body,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.Errors?.[0]?.Message || 'Amazon API request failed');
    }

    return response.json();
}

/**
 * Get best image URL from product
 */
export function getBestProductImage(product: AmazonProduct): string {
    return product.images.large || product.images.medium || product.images.small || '';
}

/**
 * Format price for display
 */
export function formatPrice(product: AmazonProduct): string {
    if (product.price?.formatted) return product.price.formatted;
    if (product.price?.amount) return `$${product.price.amount.toFixed(2)}`;
    return 'Check Price';
}
