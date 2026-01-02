/**
 * Hostinger MCP Service Wrapper
 * 
 * Provides typed wrappers for Hostinger MCP tools.
 * Handles API calls via the /api/mcp/execute endpoint.
 */

// ============ TYPES ============

export interface HostingWebsite {
    id: string;
    domain: string;
    status: string;
    type: 'wordpress' | 'static' | 'js';
    datacenter?: string;
    createdAt?: string;
}

export interface Domain {
    domain: string;
    status: string;
    registrar?: string;
    expiresAt?: string;
    autoRenew?: boolean;
    privacyProtection?: boolean;
}

export interface DnsRecord {
    type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS';
    name: string;
    value: string;
    ttl?: number;
    priority?: number;
}

export interface CreateWebsiteResult {
    success: boolean;
    websiteId?: string;
    domain?: string;
    error?: string;
}

export interface ProvisionResult {
    success: boolean;
    steps: Array<{
        step: string;
        status: 'success' | 'failed' | 'skipped';
        message?: string;
    }>;
    website?: HostingWebsite;
    error?: string;
}

// ============ MCP EXECUTOR ============

interface MCPCallResult {
    success: boolean;
    result?: unknown;
    error?: string;
}

/**
 * Execute a Hostinger MCP tool
 */
async function callHostingerTool(
    toolName: string,
    args: Record<string, unknown>
): Promise<MCPCallResult> {
    try {
        const response = await fetch('/api/mcp/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                serverId: 'hostinger',
                toolName,
                arguments: args
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: data.error || 'MCP call failed' };
        }

        return { success: true, result: data.result };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// ============ WEBSITE OPERATIONS ============

/**
 * List all websites on Hostinger account
 */
export async function listWebsites(): Promise<HostingWebsite[]> {
    const result = await callHostingerTool('hosting_listWebsitesV1', {});
    if (!result.success || !result.result) return [];

    const data = result.result as { websites?: HostingWebsite[] };
    return data.websites || [];
}

/**
 * Create a new WordPress website
 */
export async function createWordPressSite(
    domain: string,
    options?: {
        datacenter?: string;
        subdomain?: boolean;
    }
): Promise<CreateWebsiteResult> {
    const result = await callHostingerTool('hosting_createWebsiteV1', {
        domain,
        type: 'wordpress',
        datacenter: options?.datacenter || 'auto',
        subdomain: options?.subdomain || false
    });

    if (!result.success) {
        return { success: false, error: result.error };
    }

    const data = result.result as { websiteId?: string; domain?: string };
    return {
        success: true,
        websiteId: data.websiteId,
        domain: data.domain
    };
}

/**
 * Deploy a WordPress plugin
 */
export async function deployPlugin(
    websiteId: string,
    pluginSlug: string
): Promise<{ success: boolean; error?: string }> {
    const result = await callHostingerTool('hosting_deployWordpressPlugin', {
        websiteId,
        plugin: pluginSlug
    });
    return { success: result.success, error: result.error };
}

/**
 * Deploy a WordPress theme
 */
export async function deployTheme(
    websiteId: string,
    themeSlug: string
): Promise<{ success: boolean; error?: string }> {
    const result = await callHostingerTool('hosting_deployWordpressTheme', {
        websiteId,
        theme: themeSlug
    });
    return { success: result.success, error: result.error };
}

// ============ DOMAIN OPERATIONS ============

/**
 * List all domains
 */
export async function listDomains(): Promise<Domain[]> {
    const result = await callHostingerTool('domains_getDomainListV1', {});
    if (!result.success || !result.result) return [];

    const data = result.result as { domains?: Domain[] };
    return data.domains || [];
}

/**
 * Check domain availability
 */
export async function checkDomainAvailability(
    domain: string
): Promise<{ available: boolean; price?: number }> {
    const result = await callHostingerTool('domains_checkDomainAvailabilityV1', {
        domain
    });

    if (!result.success) return { available: false };

    const data = result.result as { available?: boolean; price?: number };
    return {
        available: data.available || false,
        price: data.price
    };
}

/**
 * Purchase a new domain
 */
export async function purchaseDomain(
    domain: string,
    options?: {
        whoisProfileId?: string;
        autoRenew?: boolean;
        privacyProtection?: boolean;
    }
): Promise<{ success: boolean; error?: string }> {
    const result = await callHostingerTool('domains_purchaseNewDomainV1', {
        domain,
        ...options
    });
    return { success: result.success, error: result.error };
}

// ============ DNS OPERATIONS ============

/**
 * Get DNS records for a domain
 */
export async function getDnsRecords(domain: string): Promise<DnsRecord[]> {
    const result = await callHostingerTool('DNS_getDNSRecordsV1', {
        domain
    });

    if (!result.success || !result.result) return [];

    const data = result.result as { records?: DnsRecord[] };
    return data.records || [];
}

/**
 * Update DNS records for a domain
 */
export async function updateDnsRecords(
    domain: string,
    records: DnsRecord[]
): Promise<{ success: boolean; error?: string }> {
    const result = await callHostingerTool('DNS_updateDNSRecordsV1', {
        domain,
        records
    });
    return { success: result.success, error: result.error };
}

/**
 * Reset DNS to Hostinger defaults
 */
export async function resetDns(
    domain: string
): Promise<{ success: boolean; error?: string }> {
    const result = await callHostingerTool('DNS_resetDNSRecordsV1', {
        domain
    });
    return { success: result.success, error: result.error };
}

// ============ DATACENTER OPERATIONS ============

/**
 * List available datacenters
 */
export async function listDatacenters(): Promise<Array<{ id: string; name: string; location: string }>> {
    const result = await callHostingerTool('hosting_listAvailableDatacentersV1', {});
    if (!result.success || !result.result) return [];

    const data = result.result as { datacenters?: Array<{ id: string; name: string; location: string }> };
    return data.datacenters || [];
}

/**
 * Verify domain ownership
 */
export async function verifyDomainOwnership(
    domain: string
): Promise<{ verified: boolean; method?: string }> {
    const result = await callHostingerTool('hosting_verifyDomainOwnershipV1', {
        domain
    });

    if (!result.success) return { verified: false };

    const data = result.result as { verified?: boolean; method?: string };
    return {
        verified: data.verified || false,
        method: data.method
    };
}
