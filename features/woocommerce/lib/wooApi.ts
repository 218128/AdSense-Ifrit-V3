/**
 * WooCommerce API Client
 * FSD: features/woocommerce/lib/wooApi.ts
 * 
 * WooCommerce REST API integration for product management.
 */

import crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface WooCredentials {
    siteUrl: string;
    consumerKey: string;
    consumerSecret: string;
}

export interface WooProduct {
    id?: number;
    name: string;
    slug?: string;
    type: 'simple' | 'variable' | 'grouped' | 'external';
    status: 'draft' | 'pending' | 'private' | 'publish';
    featured?: boolean;
    catalog_visibility?: 'visible' | 'catalog' | 'search' | 'hidden';
    description: string;
    short_description?: string;
    sku?: string;
    price?: string;
    regular_price: string;
    sale_price?: string;
    on_sale?: boolean;
    purchasable?: boolean;
    total_sales?: number;
    virtual?: boolean;
    downloadable?: boolean;
    external_url?: string;
    button_text?: string;
    tax_status?: 'taxable' | 'shipping' | 'none';
    tax_class?: string;
    manage_stock?: boolean;
    stock_quantity?: number;
    stock_status?: 'instock' | 'outofstock' | 'onbackorder';
    weight?: string;
    dimensions?: {
        length: string;
        width: string;
        height: string;
    };
    shipping_class?: string;
    reviews_allowed?: boolean;
    average_rating?: string;
    rating_count?: number;
    parent_id?: number;
    categories?: { id: number; name?: string; slug?: string }[];
    tags?: { id: number; name?: string; slug?: string }[];
    images?: { id?: number; src: string; name?: string; alt?: string }[];
    attributes?: WooAttribute[];
    meta_data?: { key: string; value: string }[];
}

export interface WooAttribute {
    id?: number;
    name: string;
    position?: number;
    visible?: boolean;
    variation?: boolean;
    options: string[];
}

export interface WooCategory {
    id: number;
    name: string;
    slug: string;
    parent: number;
    description: string;
    count: number;
    image?: { id: number; src: string; alt: string };
}

export interface WooApiResponse<T> {
    data: T;
    status: number;
    headers: Record<string, string>;
}

// ============================================================================
// Configuration
// ============================================================================

let wooCredentials: WooCredentials | null = null;

export function setWooCredentials(creds: WooCredentials): void {
    wooCredentials = creds;
}

export function getWooCredentials(): WooCredentials | null {
    if (wooCredentials) return wooCredentials;
    if (typeof window !== 'undefined') {
        const siteUrl = localStorage.getItem('ifrit_woo_site_url');
        const consumerKey = localStorage.getItem('ifrit_woo_consumer_key');
        const consumerSecret = localStorage.getItem('ifrit_woo_consumer_secret');
        if (siteUrl && consumerKey && consumerSecret) {
            return { siteUrl, consumerKey, consumerSecret };
        }
    }
    return null;
}

export function isWooConfigured(): boolean {
    return !!getWooCredentials();
}

// ============================================================================
// API Methods
// ============================================================================

/**
 * Create a new WooCommerce product
 */
export async function createProduct(product: Omit<WooProduct, 'id'>): Promise<WooProduct> {
    const creds = getWooCredentials();
    if (!creds) throw new Error('WooCommerce credentials not configured');

    const response = await wooRequest<WooProduct>(creds, 'POST', 'products', product);
    return response.data;
}

/**
 * Update an existing product
 */
export async function updateProduct(productId: number, updates: Partial<WooProduct>): Promise<WooProduct> {
    const creds = getWooCredentials();
    if (!creds) throw new Error('WooCommerce credentials not configured');

    const response = await wooRequest<WooProduct>(creds, 'PUT', `products/${productId}`, updates);
    return response.data;
}

/**
 * Get a product by ID
 */
export async function getProduct(productId: number): Promise<WooProduct> {
    const creds = getWooCredentials();
    if (!creds) throw new Error('WooCommerce credentials not configured');

    const response = await wooRequest<WooProduct>(creds, 'GET', `products/${productId}`);
    return response.data;
}

/**
 * List products with filters
 */
export async function listProducts(params: {
    page?: number;
    per_page?: number;
    search?: string;
    category?: number;
    status?: 'draft' | 'pending' | 'private' | 'publish' | 'any';
    sku?: string;
} = {}): Promise<WooProduct[]> {
    const creds = getWooCredentials();
    if (!creds) throw new Error('WooCommerce credentials not configured');

    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.per_page) query.set('per_page', String(params.per_page));
    if (params.search) query.set('search', params.search);
    if (params.category) query.set('category', String(params.category));
    if (params.status) query.set('status', params.status);
    if (params.sku) query.set('sku', params.sku);

    const response = await wooRequest<WooProduct[]>(creds, 'GET', `products?${query}`);
    return response.data;
}

/**
 * Delete a product
 */
export async function deleteProduct(productId: number, force = false): Promise<WooProduct> {
    const creds = getWooCredentials();
    if (!creds) throw new Error('WooCommerce credentials not configured');

    const response = await wooRequest<WooProduct>(
        creds,
        'DELETE',
        `products/${productId}?force=${force}`
    );
    return response.data;
}

/**
 * Batch create/update/delete products
 */
export async function batchProducts(operations: {
    create?: Omit<WooProduct, 'id'>[];
    update?: WooProduct[];
    delete?: number[];
}): Promise<{
    create?: WooProduct[];
    update?: WooProduct[];
    delete?: WooProduct[];
}> {
    const creds = getWooCredentials();
    if (!creds) throw new Error('WooCommerce credentials not configured');

    const response = await wooRequest<{
        create?: WooProduct[];
        update?: WooProduct[];
        delete?: WooProduct[];
    }>(creds, 'POST', 'products/batch', operations);
    return response.data;
}

// ============================================================================
// Categories
// ============================================================================

/**
 * List product categories
 */
export async function listCategories(params: {
    page?: number;
    per_page?: number;
    search?: string;
    parent?: number;
} = {}): Promise<WooCategory[]> {
    const creds = getWooCredentials();
    if (!creds) throw new Error('WooCommerce credentials not configured');

    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.per_page) query.set('per_page', String(params.per_page));
    if (params.search) query.set('search', params.search);
    if (params.parent !== undefined) query.set('parent', String(params.parent));

    const response = await wooRequest<WooCategory[]>(creds, 'GET', `products/categories?${query}`);
    return response.data;
}

/**
 * Create a product category
 */
export async function createCategory(category: {
    name: string;
    slug?: string;
    parent?: number;
    description?: string;
    image?: { src: string; alt?: string };
}): Promise<WooCategory> {
    const creds = getWooCredentials();
    if (!creds) throw new Error('WooCommerce credentials not configured');

    const response = await wooRequest<WooCategory>(creds, 'POST', 'products/categories', category);
    return response.data;
}

/**
 * Find or create category by name
 */
export async function findOrCreateCategory(name: string, parentId?: number): Promise<WooCategory> {
    const existing = await listCategories({ search: name });
    const match = existing.find(c => c.name.toLowerCase() === name.toLowerCase());

    if (match) return match;

    return createCategory({ name, parent: parentId });
}

// ============================================================================
// Core Request Handler
// ============================================================================

async function wooRequest<T>(
    creds: WooCredentials,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: unknown
): Promise<WooApiResponse<T>> {
    const baseUrl = creds.siteUrl.replace(/\/$/, '');
    const url = `${baseUrl}/wp-json/wc/v3/${endpoint}`;

    // Generate OAuth 1.0a signature
    const oauthParams = generateOAuthParams(creds, method, url);
    const separator = url.includes('?') ? '&' : '?';
    const signedUrl = `${url}${separator}${oauthParams}`;

    const response = await fetch(signedUrl, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `WooCommerce API error: ${response.status}`);
    }

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
        headers[key] = value;
    });

    return {
        data: await response.json() as T,
        status: response.status,
        headers,
    };
}

function generateOAuthParams(
    creds: WooCredentials,
    method: string,
    url: string
): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomBytes(16).toString('hex');

    const oauthParams: Record<string, string> = {
        oauth_consumer_key: creds.consumerKey,
        oauth_nonce: nonce,
        oauth_signature_method: 'HMAC-SHA256',
        oauth_timestamp: String(timestamp),
        oauth_version: '1.0',
    };

    // Create signature base string
    const parsedUrl = new URL(url);
    const baseUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;

    // Combine URL params with OAuth params
    const allParams = { ...oauthParams };
    parsedUrl.searchParams.forEach((value, key) => {
        allParams[key] = value;
    });

    // Sort and encode params
    const sortedParams = Object.keys(allParams)
        .sort()
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
        .join('&');

    const signatureBase = `${method}&${encodeURIComponent(baseUrl)}&${encodeURIComponent(sortedParams)}`;
    const signingKey = `${encodeURIComponent(creds.consumerSecret)}&`;

    // Generate signature
    const signature = crypto
        .createHmac('sha256', signingKey)
        .update(signatureBase)
        .digest('base64');

    oauthParams['oauth_signature'] = signature;

    // Return as query string
    return Object.keys(oauthParams)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(oauthParams[key])}`)
        .join('&');
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Generate a unique SKU
 */
export function generateSku(prefix: string = 'IFRIT'): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

/**
 * Validate product before submission
 */
export function validateProduct(product: Partial<WooProduct>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!product.name || product.name.trim() === '') {
        errors.push('Product name is required');
    }
    if (!product.regular_price || isNaN(parseFloat(product.regular_price))) {
        errors.push('Valid regular price is required');
    }
    if (!product.type) {
        errors.push('Product type is required');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
