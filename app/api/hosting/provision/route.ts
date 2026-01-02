import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Allow up to 2 minutes for full provisioning

interface ProvisionRequest {
    domain: string;
    orderId: string;  // Required - ID of the hosting order/plan to use
    niche?: string;
    keywords?: string[];
    datacenter?: string;
    skipDns?: boolean;
    plugins?: string[];
    apiKey?: string;
}

interface ProvisionStep {
    step: string;
    status: 'success' | 'failed' | 'skipped';
    message?: string;
}

interface ProvisionResponse {
    success: boolean;
    steps: ProvisionStep[];
    website?: {
        id: string;
        domain: string;
        status: string;
        type: string;
    };
    error?: string;
}

/**
 * POST - Provision a new WordPress site on Hostinger
 * 
 * This is a server-side orchestration endpoint that:
 * 1. Creates WordPress hosting
 * 2. Configures DNS
 * 3. Installs plugins
 */
export async function POST(request: NextRequest): Promise<NextResponse<ProvisionResponse>> {
    const steps: ProvisionStep[] = [];

    try {
        const body: ProvisionRequest = await request.json();
        const { domain, orderId, niche, datacenter, skipDns, plugins = [], apiKey } = body;

        if (!domain) {
            return NextResponse.json({
                success: false,
                steps: [{ step: 'Validation', status: 'failed', message: 'Domain is required' }],
                error: 'Domain is required'
            }, { status: 400 });
        }

        if (!orderId) {
            return NextResponse.json({
                success: false,
                steps: [{ step: 'Validation', status: 'failed', message: 'Hosting order ID is required. Select a hosting plan first.' }],
                error: 'Hosting order ID is required. Fetch available orders from /api/hosting/orders first.'
            }, { status: 400 });
        }

        // Get API key from request or environment
        const hostingerApiKey = apiKey || process.env.HOSTINGER_API_TOKEN;
        if (!hostingerApiKey) {
            return NextResponse.json({
                success: false,
                steps: [{ step: 'Authentication', status: 'failed', message: 'Hostinger API key not configured' }],
                error: 'Hostinger API key not configured. Add HOSTINGER_API_TOKEN to environment or pass apiKey.'
            }, { status: 401 });
        }

        console.log(`[Provision] Starting provisioning for ${domain}`);
        steps.push({ step: 'Initialize', status: 'success', message: 'Starting provisioning workflow' });

        // Helper to call MCP tools and check for errors in result
        const callTool = async (toolName: string, args: Record<string, unknown>): Promise<{
            success: boolean;
            result?: unknown;
            error?: string;
        }> => {
            const response = await fetch(`${request.nextUrl.origin}/api/mcp/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serverId: 'hostinger',
                    toolName,
                    arguments: args,
                    apiKey: hostingerApiKey
                })
            });
            const data = await response.json();

            // Log the raw response for debugging
            console.log(`[Provision] callTool ${toolName} response:`, JSON.stringify(data).substring(0, 500));

            // Check if MCP call itself failed
            if (!data.success) {
                return { success: false, error: data.error || 'MCP call failed' };
            }

            // Check if the result contains an error from Hostinger API
            const resultContent = data.result;
            if (Array.isArray(resultContent)) {
                // Check for error in result array (MCP returns array of content parts)
                for (const item of resultContent) {
                    // Check for isError flag (some MCP servers use this)
                    if (item.isError) {
                        return { success: false, error: item.text || 'API returned error' };
                    }

                    if (item.type === 'text' && item.text) {
                        try {
                            const parsed = JSON.parse(item.text);
                            console.log(`[Provision] Parsed result for ${toolName}:`, JSON.stringify(parsed).substring(0, 300));

                            // Check for HTTP error status codes (4xx, 5xx)
                            const status = parsed.status || parsed.statusCode || parsed.code;
                            if (status && status >= 400) {
                                console.log(`[Provision] Detected HTTP error ${status} in ${toolName}`);
                                return {
                                    success: false,
                                    error: parsed.message || parsed.error || `HTTP ${status} error`
                                };
                            }

                            // Check for error fields (various formats from different APIs)
                            // Hostinger uses correlation_id (snake_case) for error responses
                            if (parsed.error || parsed.errors ||
                                parsed.correlation_id || parsed.correlationId ||
                                (parsed.message && typeof parsed.message === 'string' &&
                                    (parsed.message.includes('[') || parsed.message.toLowerCase().includes('error')))) {
                                console.log(`[Provision] Detected error fields in ${toolName}:`, parsed.error || parsed.message);
                                return {
                                    success: false,
                                    error: parsed.error || parsed.message || JSON.stringify(parsed.errors) || 'API returned error'
                                };
                            }

                            // Return successful parsed result
                            return { success: true, result: parsed };
                        } catch {
                            // Not JSON - check for error keywords in text
                            const lowerText = item.text.toLowerCase();
                            if (lowerText.includes('error') || lowerText.includes('401') ||
                                lowerText.includes('422') || lowerText.includes('404') ||
                                lowerText.includes('unauthorized') || lowerText.includes('not found') ||
                                lowerText.includes('unprocessable') || lowerText.includes('failed')) {
                                console.log(`[Provision] Detected error text in ${toolName}:`, item.text.substring(0, 100));
                                return { success: false, error: item.text };
                            }
                        }
                    }
                }
            }

            return { success: true, result: resultContent };
        };

        // Step 1: Check if website already exists
        console.log(`[Provision] Checking existing websites...`);
        const listResult = await callTool('hosting_listWebsitesV1', {});

        // If list fails (e.g., auth error), abort early
        if (!listResult.success) {
            steps.push({
                step: 'List websites',
                status: 'failed',
                message: listResult.error || 'Failed to list websites - check API key'
            });
            return NextResponse.json({
                success: false,
                steps,
                error: listResult.error || 'Failed to authenticate with Hostinger API'
            }, { status: 401 });
        }

        let websiteId: string | undefined;
        let existingWebsite = null;

        if (listResult.result) {
            const websites = Array.isArray(listResult.result) ? listResult.result :
                (listResult.result as { websites?: unknown[] })?.websites || [];
            existingWebsite = websites.find((w: { domain?: string }) => w.domain === domain);

            if (existingWebsite) {
                websiteId = (existingWebsite as { id?: string }).id;
                steps.push({
                    step: 'Check existing',
                    status: 'success',
                    message: `Website already exists (ID: ${websiteId})`
                });
            }
        }

        // Step 2: Create WordPress site if it doesn't exist
        if (!existingWebsite) {
            console.log(`[Provision] Creating WordPress site for ${domain} on order ${orderId}...`);

            // First check if domain ownership is verified (required for external domains)
            const verifyResult = await callTool('hosting_verifyDomainOwnershipV1', {
                domain
            });

            if (verifyResult.success) {
                const verifyData = verifyResult.result as { is_accessible?: boolean; txt_record?: string };
                if (verifyData && !verifyData.is_accessible) {
                    steps.push({
                        step: 'Verify domain',
                        status: 'failed',
                        message: `Domain not verified. Add TXT record: ${verifyData.txt_record || 'Check Hostinger dashboard'}`
                    });
                    return NextResponse.json({
                        success: false,
                        steps,
                        error: `Domain ownership not verified. Add the TXT record to your DNS and try again.`
                    }, { status: 422 });
                }
                steps.push({
                    step: 'Verify domain',
                    status: 'success',
                    message: 'Domain ownership verified'
                });
            }

            // For first website on a plan, we need a datacenter code
            // Fetch available datacenters if not provided
            let datacenterCode = datacenter;
            if (!datacenterCode) {
                console.log(`[Provision] Fetching available datacenters for order ${orderId}...`);
                const dcResult = await callTool('hosting_listAvailableDatacentersV1', {
                    order_id: orderId
                });

                if (dcResult.success && dcResult.result) {
                    // Get first recommended datacenter
                    const datacenters = Array.isArray(dcResult.result) ? dcResult.result :
                        (dcResult.result as { data?: { code: string }[] })?.data || [];
                    if (datacenters.length > 0) {
                        datacenterCode = datacenters[0].code || datacenters[0];
                        console.log(`[Provision] Using datacenter: ${datacenterCode}`);
                        steps.push({
                            step: 'Select datacenter',
                            status: 'success',
                            message: `Selected datacenter: ${datacenterCode}`
                        });
                    }
                }

                if (!datacenterCode) {
                    steps.push({
                        step: 'Select datacenter',
                        status: 'failed',
                        message: 'No datacenters available for this order'
                    });
                    return NextResponse.json({
                        success: false,
                        steps,
                        error: 'No datacenters available. Please check your hosting plan.'
                    }, { status: 400 });
                }
            }

            // Create website with required order_id and datacenter
            const createResult = await callTool('hosting_createWebsiteV1', {
                domain,
                order_id: orderId,
                datacenter_code: datacenterCode
            });

            if (!createResult.success) {
                steps.push({
                    step: 'Create WordPress',
                    status: 'failed',
                    message: createResult.error || 'Failed to create website'
                });
                return NextResponse.json({
                    success: false,
                    steps,
                    error: createResult.error || 'Failed to create website'
                }, { status: 500 });
            }

            websiteId = (createResult.result as { websiteId?: string; id?: string })?.websiteId || (createResult.result as { id?: string })?.id;
            steps.push({
                step: 'Create WordPress',
                status: 'success',
                message: `Created WordPress site (ID: ${websiteId})`
            });
        }

        // Step 3: Configure DNS (optional)
        if (!skipDns) {
            console.log(`[Provision] Configuring DNS for ${domain}...`);

            const dnsResult = await callTool('DNS_resetDNSRecordsV1', { domain });

            steps.push({
                step: 'Configure DNS',
                status: dnsResult.success ? 'success' : 'failed',
                message: dnsResult.success
                    ? 'DNS configured to Hostinger servers'
                    : (dnsResult.error || 'DNS configuration skipped')
            });
        } else {
            steps.push({
                step: 'Configure DNS',
                status: 'skipped',
                message: 'Skipped per request'
            });
        }

        // Step 4: Install plugins
        if (plugins.length > 0 && websiteId) {
            console.log(`[Provision] Installing ${plugins.length} plugins...`);

            let successCount = 0;
            for (const plugin of plugins) {
                const pluginResult = await callTool('hosting_deployWordpressPlugin', {
                    websiteId,
                    plugin
                });
                if (pluginResult.success) successCount++;
            }

            steps.push({
                step: 'Install plugins',
                status: successCount === plugins.length ? 'success' : 'failed',
                message: `Installed ${successCount}/${plugins.length} plugins`
            });
        } else {
            steps.push({
                step: 'Install plugins',
                status: 'skipped',
                message: plugins.length === 0 ? 'No plugins specified' : 'No website ID'
            });
        }

        // Step 5: Log niche context
        if (niche) {
            steps.push({
                step: 'Configure niche',
                status: 'success',
                message: `Niche: ${niche} (ready for content)`
            });
        }

        console.log(`[Provision] Completed provisioning for ${domain}`);

        return NextResponse.json({
            success: true,
            steps,
            website: {
                id: websiteId || 'unknown',
                domain,
                status: 'active',
                type: 'wordpress'
            }
        });

    } catch (error) {
        console.error('[Provision] Error:', error);

        steps.push({
            step: 'Unexpected error',
            status: 'failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });

        return NextResponse.json({
            success: false,
            steps,
            error: error instanceof Error ? error.message : 'Provisioning failed'
        }, { status: 500 });
    }
}
