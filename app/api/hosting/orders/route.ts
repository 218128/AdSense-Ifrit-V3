import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface HostingOrder {
    id: string;
    order_id?: string;
    status: string;
    plan?: string;
    domain?: string;
    websites_count?: number;
    created_at?: string;
}

interface OrdersResponse {
    success: boolean;
    orders?: HostingOrder[];
    error?: string;
}

/**
 * GET - List available Hostinger hosting orders/plans
 * 
 * Required before creating a website - need to pick which hosting plan to use
 */
export async function GET(request: NextRequest): Promise<NextResponse<OrdersResponse>> {
    try {
        // Get API key from header or query
        const apiKey = request.headers.get('x-hostinger-api-key') ||
            request.nextUrl.searchParams.get('apiKey') ||
            process.env.HOSTINGER_API_TOKEN;

        if (!apiKey) {
            return NextResponse.json({
                success: false,
                error: 'Hostinger API key not configured'
            }, { status: 401 });
        }

        // Call MCP to list orders
        const response = await fetch(`${request.nextUrl.origin}/api/mcp/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                serverId: 'hostinger',
                toolName: 'hosting_listOrdersV1',
                arguments: {},
                apiKey
            })
        });

        const data = await response.json();

        if (!data.success) {
            return NextResponse.json({
                success: false,
                error: data.error || 'Failed to fetch orders'
            }, { status: 500 });
        }

        // Parse orders from MCP result
        let orders: HostingOrder[] = [];

        if (Array.isArray(data.result)) {
            for (const item of data.result) {
                if (item.type === 'text' && item.text) {
                    try {
                        const parsed = JSON.parse(item.text);
                        // Handle different response structures
                        if (Array.isArray(parsed)) {
                            orders = parsed;
                        } else if (parsed.data && Array.isArray(parsed.data)) {
                            orders = parsed.data;
                        } else if (parsed.orders && Array.isArray(parsed.orders)) {
                            orders = parsed.orders;
                        }
                    } catch {
                        // Not JSON, skip
                    }
                }
            }
        }

        // Filter to only active/usable orders
        const activeOrders = orders.filter(o =>
            o.status === 'active' || o.status === 'pending_setup'
        );

        console.log(`[Hosting Orders] Found ${activeOrders.length} active orders`);

        return NextResponse.json({
            success: true,
            orders: activeOrders
        });

    } catch (error) {
        console.error('[Hosting Orders] Error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
