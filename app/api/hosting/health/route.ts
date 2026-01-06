import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface SiteHealth {
    id: string;
    domain: string;
    status: 'active' | 'suspended' | 'pending' | 'unknown';
    type: string;
    datacenter?: string;
    createdAt?: string;
    ssl?: {
        status: 'active' | 'pending' | 'expired' | 'unknown';
        expiresAt?: string;
    };
    storage?: {
        used: number;
        total: number;
        percentage: number;
    };
}

interface HealthResponse {
    success: boolean;
    sites?: SiteHealth[];
    summary?: {
        total: number;
        active: number;
        pending: number;
        sslIssues: number;
    };
    error?: string;
    lastChecked: string;
}

/**
 * POST - Fetch health status for all Hostinger websites
 * 
 * Uses POST to keep API key in request body (not exposed in URL/logs)
 */
export async function POST(request: NextRequest): Promise<NextResponse<HealthResponse>> {
    const lastChecked = new Date().toISOString();

    try {
        // Read API key from request body (secure - not in URL)
        const body = await request.json().catch(() => ({}));
        const apiKey = body.apiKey ||
            request.headers.get('x-hostinger-api-key') ||
            process.env.HOSTINGER_API_TOKEN;

        if (!apiKey) {
            return NextResponse.json({
                success: false,
                error: 'Hostinger API key not configured',
                lastChecked
            }, { status: 401 });
        }

        // Fetch websites list
        const websitesResponse = await fetch(`${request.nextUrl.origin}/api/mcp/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                serverId: 'hostinger',
                toolName: 'hosting_listWebsitesV1',
                arguments: {},
                apiKey
            })
        });

        const websitesData = await websitesResponse.json();

        if (!websitesData.success) {
            return NextResponse.json({
                success: false,
                error: websitesData.error || 'Failed to fetch websites',
                lastChecked
            }, { status: 500 });
        }

        // Parse websites
        let websites: SiteHealth[] = [];
        if (Array.isArray(websitesData.result)) {
            for (const item of websitesData.result) {
                if (item.type === 'text' && item.text) {
                    try {
                        const parsed = JSON.parse(item.text);
                        const data = parsed.data || parsed || [];

                        if (Array.isArray(data)) {
                            websites = data.map((site: {
                                id?: string;
                                domain?: string;
                                status?: string;
                                type?: string;
                                datacenter?: string;
                                created_at?: string;
                            }) => ({
                                id: site.id || '',
                                domain: site.domain || '',
                                status: (site.status as SiteHealth['status']) || 'unknown',
                                type: site.type || 'wordpress',
                                datacenter: site.datacenter,
                                createdAt: site.created_at,
                                ssl: { status: 'unknown' as const },
                                storage: undefined
                            }));
                        }
                    } catch {
                        // Skip parse errors
                    }
                }
            }
        }

        // Calculate summary
        const summary = {
            total: websites.length,
            active: websites.filter(s => s.status === 'active').length,
            pending: websites.filter(s => s.status === 'pending').length,
            sslIssues: 0 // Would need separate SSL check per domain
        };

        return NextResponse.json({
            success: true,
            sites: websites,
            summary,
            lastChecked
        });

    } catch (error) {
        console.error('[Hosting Health] Error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            lastChecked
        }, { status: 500 });
    }
}
