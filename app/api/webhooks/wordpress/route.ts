/**
 * WordPress Webhook Receiver
 * FSD: app/api/webhooks/wordpress/route.ts
 * 
 * Receives webhook events from ifrit-connector plugin.
 * Events: post.published, post.updated, post.deleted, post.status_changed
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

interface WebhookPayload {
    event: string;
    site: {
        url: string;
        name: string;
    };
    data: Record<string, unknown>;
    timestamp: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        // Get headers
        const event = request.headers.get('X-Ifrit-Event');
        const siteUrl = request.headers.get('X-Ifrit-Site');
        const signature = request.headers.get('X-Ifrit-Signature');

        if (!event || !siteUrl) {
            return NextResponse.json(
                { success: false, error: 'Missing required headers' },
                { status: 400 }
            );
        }

        // Parse body
        const body = await request.text();
        const payload: WebhookPayload = JSON.parse(body);

        // Verify signature if we have the site's token
        // TODO: Look up site token from store and verify
        // const expectedSignature = crypto
        //     .createHmac('sha256', siteToken)
        //     .update(body)
        //     .digest('hex');
        // if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        //     return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
        // }

        console.log(`[WP Webhook] Received ${event} from ${siteUrl}`);

        // Handle event
        switch (event) {
            case 'post.published':
                await handlePostPublished(siteUrl, payload.data);
                break;
            case 'post.updated':
                await handlePostUpdated(siteUrl, payload.data);
                break;
            case 'post.deleted':
                await handlePostDeleted(siteUrl, payload.data);
                break;
            case 'post.status_changed':
                await handleStatusChanged(siteUrl, payload.data);
                break;
            case 'test':
                console.log(`[WP Webhook] Test event from ${payload.site.name}`);
                break;
            default:
                console.log(`[WP Webhook] Unknown event: ${event}`);
        }

        return NextResponse.json({ success: true, received: event });

    } catch (error) {
        console.error('[WP Webhook] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// ============================================================================
// Event Handlers
// ============================================================================

async function handlePostPublished(siteUrl: string, data: Record<string, unknown>) {
    console.log(`[WP Webhook] New post published on ${siteUrl}:`, {
        postId: data.post_id,
        title: data.title,
        url: data.url,
    });

    // TODO: Update campaign run items if this post was from a campaign
    // TODO: Update WP Site stats (post count, last activity)
    // TODO: Trigger analytics refresh
}

async function handlePostUpdated(siteUrl: string, data: Record<string, unknown>) {
    console.log(`[WP Webhook] Post updated on ${siteUrl}:`, {
        postId: data.post_id,
        title: data.title,
    });

    // TODO: Sync updated content if tracking this post
}

async function handlePostDeleted(siteUrl: string, data: Record<string, unknown>) {
    console.log(`[WP Webhook] Post deleted on ${siteUrl}:`, {
        postId: data.post_id,
        title: data.title,
    });

    // TODO: Update campaign run items if this post was from a campaign
    // TODO: Update WP Site stats
}

async function handleStatusChanged(
    siteUrl: string,
    data: Record<string, unknown>
) {
    console.log(`[WP Webhook] Post status changed on ${siteUrl}:`, {
        postId: data.post_id,
        oldStatus: data.old_status,
        newStatus: data.new_status,
    });

    // TODO: Handle draft→publish transitions
    // TODO: Handle publish→trash transitions
}

// GET for health check
export async function GET(): Promise<NextResponse> {
    return NextResponse.json({
        status: 'ok',
        endpoint: 'WordPress Webhook Receiver',
        events: ['post.published', 'post.updated', 'post.deleted', 'post.status_changed', 'test'],
    });
}
