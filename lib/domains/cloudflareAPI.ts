/**
 * Cloudflare Registrar API Integration
 * 
 * Manage domains at-cost through Cloudflare Registrar.
 * Includes domain listing, renewal, transfer initiation, and DNS management.
 * 
 * API Documentation: https://developers.cloudflare.com/api/operations/registrar-domains-list-domains
 */

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

export interface CloudflareConfig {
    apiToken: string;
    accountId?: string;
}

export interface CloudflareDomain {
    id: string;
    name: string;
    status: 'active' | 'pending' | 'expired' | 'transferring' | 'locked';
    createdAt: string;
    expiresAt: string;
    autoRenew: boolean;
    locked: boolean;
    registrant: {
        email: string;
        organization?: string;
        country: string;
    };
    pricing?: {
        renewal: number;
        currency: string;
    };
    daysUntilExpiry?: number;
}

export interface CloudflareDNSRecord {
    id: string;
    type: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'NS' | 'SRV';
    name: string;
    content: string;
    ttl: number;
    priority?: number;
    proxied?: boolean;
    createdOn: string;
    modifiedOn: string;
}

export interface CloudflareZone {
    id: string;
    name: string;
    status: 'active' | 'pending' | 'initializing' | 'moved' | 'deleted';
    nameServers: string[];
    plan: {
        id: string;
        name: string;
    };
}

export interface CloudflareAPIError {
    code: number;
    message: string;
}

export interface CloudflareAPIResponse<T> {
    success: boolean;
    errors: CloudflareAPIError[];
    messages: string[];
    result: T;
    result_info?: {
        page: number;
        per_page: number;
        total_count: number;
        total_pages: number;
    };
}

/**
 * Make authenticated request to Cloudflare API
 */
async function cfRequest<T>(
    config: CloudflareConfig,
    endpoint: string,
    options?: RequestInit
): Promise<CloudflareAPIResponse<T>> {
    const url = `${CF_API_BASE}${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${config.apiToken}`,
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });

    const data = await response.json();
    return data as CloudflareAPIResponse<T>;
}

/**
 * Get Cloudflare account ID (needed for registrar operations)
 */
export async function getAccountId(config: CloudflareConfig): Promise<string | null> {
    try {
        const response = await cfRequest<{ id: string }[]>(config, '/accounts');

        if (response.success && response.result.length > 0) {
            return response.result[0].id;
        }

        return null;
    } catch (error) {
        console.error('Failed to get account ID:', error);
        return null;
    }
}

/**
 * List all domains in Cloudflare Registrar
 */
export async function listDomains(config: CloudflareConfig): Promise<{
    success: boolean;
    domains: CloudflareDomain[];
    error?: string;
}> {
    try {
        const accountId = config.accountId || await getAccountId(config);

        if (!accountId) {
            return { success: false, domains: [], error: 'Could not determine account ID' };
        }

        const response = await cfRequest<CloudflareDomain[]>(
            config,
            `/accounts/${accountId}/registrar/domains`
        );

        if (!response.success) {
            return {
                success: false,
                domains: [],
                error: response.errors[0]?.message || 'Failed to list domains',
            };
        }

        // Add days until expiry
        const domains = response.result.map(domain => ({
            ...domain,
            daysUntilExpiry: Math.ceil(
                (new Date(domain.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            ),
        }));

        return { success: true, domains };
    } catch (error) {
        return {
            success: false,
            domains: [],
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Get single domain details
 */
export async function getDomain(
    config: CloudflareConfig,
    domainName: string
): Promise<CloudflareDomain | null> {
    try {
        const accountId = config.accountId || await getAccountId(config);

        if (!accountId) return null;

        const response = await cfRequest<CloudflareDomain>(
            config,
            `/accounts/${accountId}/registrar/domains/${domainName}`
        );

        if (response.success) {
            return {
                ...response.result,
                daysUntilExpiry: Math.ceil(
                    (new Date(response.result.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                ),
            };
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Update domain settings (auto-renew, lock)
 */
export async function updateDomain(
    config: CloudflareConfig,
    domainName: string,
    settings: {
        autoRenew?: boolean;
        locked?: boolean;
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const accountId = config.accountId || await getAccountId(config);

        if (!accountId) {
            return { success: false, error: 'Could not determine account ID' };
        }

        const response = await cfRequest<CloudflareDomain>(
            config,
            `/accounts/${accountId}/registrar/domains/${domainName}`,
            {
                method: 'PUT',
                body: JSON.stringify(settings),
            }
        );

        if (!response.success) {
            return {
                success: false,
                error: response.errors[0]?.message || 'Update failed',
            };
        }

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * List DNS zones (for DNS management)
 */
export async function listZones(config: CloudflareConfig): Promise<{
    success: boolean;
    zones: CloudflareZone[];
    error?: string;
}> {
    try {
        const response = await cfRequest<CloudflareZone[]>(config, '/zones');

        if (!response.success) {
            return {
                success: false,
                zones: [],
                error: response.errors[0]?.message || 'Failed to list zones',
            };
        }

        return { success: true, zones: response.result };
    } catch (error) {
        return {
            success: false,
            zones: [],
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Get zone by domain name
 */
export async function getZoneByDomain(
    config: CloudflareConfig,
    domainName: string
): Promise<CloudflareZone | null> {
    try {
        const response = await cfRequest<CloudflareZone[]>(
            config,
            `/zones?name=${encodeURIComponent(domainName)}`
        );

        if (response.success && response.result.length > 0) {
            return response.result[0];
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * List DNS records for a zone
 */
export async function listDNSRecords(
    config: CloudflareConfig,
    zoneId: string
): Promise<{
    success: boolean;
    records: CloudflareDNSRecord[];
    error?: string;
}> {
    try {
        const response = await cfRequest<CloudflareDNSRecord[]>(
            config,
            `/zones/${zoneId}/dns_records?per_page=100`
        );

        if (!response.success) {
            return {
                success: false,
                records: [],
                error: response.errors[0]?.message || 'Failed to list DNS records',
            };
        }

        return { success: true, records: response.result };
    } catch (error) {
        return {
            success: false,
            records: [],
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Create DNS record
 */
export async function createDNSRecord(
    config: CloudflareConfig,
    zoneId: string,
    record: {
        type: string;
        name: string;
        content: string;
        ttl?: number;
        priority?: number;
        proxied?: boolean;
    }
): Promise<{ success: boolean; record?: CloudflareDNSRecord; error?: string }> {
    try {
        const response = await cfRequest<CloudflareDNSRecord>(
            config,
            `/zones/${zoneId}/dns_records`,
            {
                method: 'POST',
                body: JSON.stringify({
                    type: record.type,
                    name: record.name,
                    content: record.content,
                    ttl: record.ttl || 3600,
                    priority: record.priority,
                    proxied: record.proxied ?? false,
                }),
            }
        );

        if (!response.success) {
            return {
                success: false,
                error: response.errors[0]?.message || 'Failed to create DNS record',
            };
        }

        return { success: true, record: response.result };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Delete DNS record
 */
export async function deleteDNSRecord(
    config: CloudflareConfig,
    zoneId: string,
    recordId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await cfRequest<{ id: string }>(
            config,
            `/zones/${zoneId}/dns_records/${recordId}`,
            { method: 'DELETE' }
        );

        if (!response.success) {
            return {
                success: false,
                error: response.errors[0]?.message || 'Failed to delete DNS record',
            };
        }

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Check transfer eligibility
 */
export async function checkTransferEligibility(
    config: CloudflareConfig,
    domainName: string
): Promise<{
    eligible: boolean;
    reason?: string;
    tld?: string;
    price?: number;
}> {
    // Note: This is a simplified check - actual API may vary
    try {
        const response = await cfRequest<{
            eligible: boolean;
            reason?: string;
            tld: string;
            price: number;
        }>(config, `/registrar/domains/${domainName}/transfer`);

        if (response.success) {
            return response.result;
        }

        return { eligible: false, reason: response.errors[0]?.message };
    } catch {
        return { eligible: false, reason: 'Check failed' };
    }
}

/**
 * Initiate domain transfer
 */
export async function initiateTransfer(
    config: CloudflareConfig,
    domainName: string,
    authCode: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const accountId = config.accountId || await getAccountId(config);

        if (!accountId) {
            return { success: false, error: 'Could not determine account ID' };
        }

        const response = await cfRequest<CloudflareDomain>(
            config,
            `/accounts/${accountId}/registrar/domains/${domainName}/transfer`,
            {
                method: 'POST',
                body: JSON.stringify({ auth_code: authCode }),
            }
        );

        if (!response.success) {
            return {
                success: false,
                error: response.errors[0]?.message || 'Transfer failed',
            };
        }

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Validate API token
 */
export async function validateToken(config: CloudflareConfig): Promise<{
    valid: boolean;
    error?: string;
}> {
    try {
        const response = await cfRequest<{ id: string; status: string }>(
            config,
            '/user/tokens/verify'
        );

        return {
            valid: response.success,
            error: response.success ? undefined : response.errors[0]?.message,
        };
    } catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : 'Validation failed',
        };
    }
}

/**
 * Storage key for Cloudflare config
 */
const STORAGE_KEY = 'ifrit_cloudflare_config';

/**
 * Save Cloudflare config (token encrypted in localStorage)
 */
export function saveCloudflareConfig(config: CloudflareConfig): void {
    if (typeof window === 'undefined') return;

    // Note: In production, use proper encryption
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/**
 * Get saved Cloudflare config
 */
export function getCloudflareConfig(): CloudflareConfig | null {
    if (typeof window === 'undefined') return null;

    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
}

/**
 * Clear Cloudflare config
 */
export function clearCloudflareConfig(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get renewal pricing for common TLDs
 * Cloudflare charges at-cost, which is significantly cheaper than most registrars
 */
export function getAtCostPricing(): Record<string, { renewal: number; transfer: number }> {
    return {
        'com': { renewal: 9.77, transfer: 9.77 },
        'net': { renewal: 10.77, transfer: 10.77 },
        'org': { renewal: 10.11, transfer: 10.11 },
        'io': { renewal: 44.99, transfer: 44.99 },
        'co': { renewal: 11.99, transfer: 11.99 },
        'dev': { renewal: 12.00, transfer: 12.00 },
        'app': { renewal: 14.00, transfer: 14.00 },
        'ai': { renewal: 25.00, transfer: 25.00 },
        'info': { renewal: 11.99, transfer: 11.99 },
        'biz': { renewal: 11.99, transfer: 11.99 },
    };
}

/**
 * Calculate potential savings vs other registrars
 */
export function calculateSavings(domain: string, otherRegistrarPrice: number): {
    cloudflarePrice: number;
    savings: number;
    savingsPercent: number;
} {
    const tld = domain.split('.').pop() || 'com';
    const pricing = getAtCostPricing();
    const cfPrice = pricing[tld]?.renewal || 15;

    const savings = otherRegistrarPrice - cfPrice;
    const savingsPercent = Math.round((savings / otherRegistrarPrice) * 100);

    return {
        cloudflarePrice: cfPrice,
        savings: Math.max(0, savings),
        savingsPercent: Math.max(0, savingsPercent),
    };
}
