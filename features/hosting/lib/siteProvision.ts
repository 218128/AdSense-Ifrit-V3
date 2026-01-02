/**
 * Site Provisioning Orchestrator
 * 
 * Handles the complete flow of creating a new WordPress site:
 * 1. Create hosting account / use existing
 * 2. Configure DNS (if domain owned)
 * 3. Install WordPress
 * 4. Install essential plugins
 * 5. Register site in Ifrit settings
 */

import {
    createWordPressSite,
    listWebsites,
    updateDnsRecords,
    resetDns,
    verifyDomainOwnership,
    deployPlugin,
    type HostingWebsite,
    type ProvisionResult
} from './hostingerMcp';

// ============ TYPES ============

export interface ProvisionRequest {
    domain: string;
    niche?: string;
    keywords?: string[];
    datacenter?: string;
    skipDns?: boolean;
    plugins?: string[];
}

export interface SiteConfig {
    domain: string;
    wpAdminUrl: string;
    wpRestUrl: string;
    needsAppPassword: boolean;
    niche?: string;
    keywords?: string[];
}

// ============ DEFAULT PLUGINS ============

// User requested to defer plugin selection, so we use minimal defaults
const DEFAULT_PLUGINS: string[] = [
    // Can be expanded later based on user preference
];

// ============ PROVISIONING STEPS ============

/**
 * Step 1: Check if website already exists
 */
async function checkExistingWebsite(domain: string): Promise<HostingWebsite | null> {
    const websites = await listWebsites();
    return websites.find(w => w.domain === domain) || null;
}

/**
 * Step 2: Verify domain ownership (if needed)
 */
async function ensureDomainOwnership(domain: string): Promise<{ owned: boolean; method?: string }> {
    const result = await verifyDomainOwnership(domain);
    return { owned: result.verified, method: result.method };
}

/**
 * Step 3: Create WordPress site
 */
async function createSite(
    domain: string,
    datacenter?: string
): Promise<{ success: boolean; websiteId?: string; error?: string }> {
    const result = await createWordPressSite(domain, { datacenter });
    return {
        success: result.success,
        websiteId: result.websiteId,
        error: result.error
    };
}

/**
 * Step 4: Configure DNS to point to Hostinger
 */
async function configureDNS(domain: string): Promise<{ success: boolean; error?: string }> {
    // Reset DNS to Hostinger defaults - this points domain to Hostinger servers
    return await resetDns(domain);
}

/**
 * Step 5: Install plugins
 */
async function installPlugins(
    websiteId: string,
    plugins: string[]
): Promise<Array<{ plugin: string; success: boolean }>> {
    const results = [];

    for (const plugin of plugins) {
        const result = await deployPlugin(websiteId, plugin);
        results.push({ plugin, success: result.success });
    }

    return results;
}

/**
 * Step 6: Register site in Ifrit settings
 */
function registerInIfrit(config: SiteConfig): void {
    if (typeof window === 'undefined') return;

    try {
        const stored = localStorage.getItem('ifrit_wordpress_sites') || '[]';
        const sites = JSON.parse(stored);

        // Check if already registered
        const existing = sites.findIndex((s: SiteConfig) => s.domain === config.domain);
        if (existing >= 0) {
            sites[existing] = config;
        } else {
            sites.push(config);
        }

        localStorage.setItem('ifrit_wordpress_sites', JSON.stringify(sites));
    } catch (error) {
        console.error('[Provision] Failed to register site in Ifrit:', error);
    }
}

// ============ MAIN ORCHESTRATOR ============

/**
 * Provision a complete WordPress site
 * 
 * Orchestrates the entire flow from domain to ready-to-publish site
 */
export async function provisionSite(request: ProvisionRequest): Promise<ProvisionResult> {
    const { domain, niche, keywords, datacenter, skipDns, plugins = DEFAULT_PLUGINS } = request;

    const steps: ProvisionResult['steps'] = [];
    let website: HostingWebsite | undefined;

    try {
        // Step 1: Check if site already exists
        const existing = await checkExistingWebsite(domain);
        if (existing) {
            steps.push({
                step: 'Check existing',
                status: 'success',
                message: `Website already exists (ID: ${existing.id})`
            });
            website = existing;
        } else {
            steps.push({
                step: 'Check existing',
                status: 'skipped',
                message: 'No existing website found'
            });

            // Step 2: Verify domain ownership
            const ownership = await ensureDomainOwnership(domain);
            steps.push({
                step: 'Verify domain',
                status: ownership.owned ? 'success' : 'skipped',
                message: ownership.owned
                    ? `Domain verified via ${ownership.method}`
                    : 'Domain verification skipped (may need manual setup)'
            });

            // Step 3: Create WordPress site
            const createResult = await createSite(domain, datacenter);
            if (!createResult.success) {
                steps.push({
                    step: 'Create WordPress',
                    status: 'failed',
                    message: createResult.error || 'Failed to create site'
                });
                return { success: false, steps, error: createResult.error };
            }

            steps.push({
                step: 'Create WordPress',
                status: 'success',
                message: `Created WordPress site (ID: ${createResult.websiteId})`
            });

            website = {
                id: createResult.websiteId || '',
                domain,
                status: 'active',
                type: 'wordpress'
            };
        }

        // Step 4: Configure DNS (optional)
        if (!skipDns) {
            const dnsResult = await configureDNS(domain);
            steps.push({
                step: 'Configure DNS',
                status: dnsResult.success ? 'success' : 'failed',
                message: dnsResult.success
                    ? 'DNS configured to Hostinger servers'
                    : dnsResult.error || 'DNS configuration failed'
            });
        } else {
            steps.push({
                step: 'Configure DNS',
                status: 'skipped',
                message: 'Skipped per request'
            });
        }

        // Step 5: Install plugins
        if (plugins.length > 0 && website?.id) {
            const pluginResults = await installPlugins(website.id, plugins);
            const successCount = pluginResults.filter(r => r.success).length;
            steps.push({
                step: 'Install plugins',
                status: successCount === plugins.length ? 'success' : 'failed',
                message: `Installed ${successCount}/${plugins.length} plugins`
            });
        } else {
            steps.push({
                step: 'Install plugins',
                status: 'skipped',
                message: 'No plugins specified'
            });
        }

        // Step 6: Register in Ifrit
        const siteConfig: SiteConfig = {
            domain,
            wpAdminUrl: `https://${domain}/wp-admin`,
            wpRestUrl: `https://${domain}/wp-json/wp/v2`,
            needsAppPassword: true,
            niche,
            keywords
        };

        registerInIfrit(siteConfig);
        steps.push({
            step: 'Register in Ifrit',
            status: 'success',
            message: 'Site registered in Ifrit settings'
        });

        return {
            success: true,
            steps,
            website
        };

    } catch (error) {
        steps.push({
            step: 'Unexpected error',
            status: 'failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });

        return {
            success: false,
            steps,
            error: error instanceof Error ? error.message : 'Provisioning failed'
        };
    }
}

/**
 * Quick check if a domain is ready for provisioning
 */
export async function canProvision(domain: string): Promise<{
    canProvision: boolean;
    reason?: string;
    existingWebsite?: HostingWebsite;
}> {
    try {
        const existing = await checkExistingWebsite(domain);
        if (existing) {
            return {
                canProvision: true,
                reason: 'Website already exists on Hostinger',
                existingWebsite: existing
            };
        }

        return { canProvision: true };
    } catch (error) {
        return {
            canProvision: false,
            reason: error instanceof Error ? error.message : 'Check failed'
        };
    }
}
