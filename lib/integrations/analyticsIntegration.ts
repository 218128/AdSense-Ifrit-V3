/**
 * Google Analytics 4 Integration
 * FSD: lib/integrations/analyticsIntegration.ts
 * 
 * Track post performance via GA4 Measurement Protocol.
 * This allows server-side event tracking without client-side JS.
 */

// ============================================================================
// Types
// ============================================================================

export interface GA4Config {
    measurementId: string;     // G-XXXXXXXXXX
    apiSecret: string;         // From GA4 Admin → Data Streams → Measurement Protocol API secrets
}

export interface PostPublishEvent {
    postUrl: string;
    postTitle: string;
    postId: number;
    siteId: string;
    siteName: string;
    author: string;
    category?: string;
    wordCount?: number;
    hasImages?: boolean;
    campaignId?: string;
}

export interface PostMetrics {
    pageViews: number;
    avgTimeOnPage: number;
    bounceRate: number;
    engagements: number;
    uniqueUsers: number;
}

// ============================================================================
// GA4 Measurement Protocol
// ============================================================================

const GA4_ENDPOINT = 'https://www.google-analytics.com/mp/collect';

/**
 * Send a custom event to GA4 via Measurement Protocol.
 * Use this for server-side tracking of post publications.
 * 
 * @see https://developers.google.com/analytics/devguides/collection/protocol/ga4
 */
export async function sendGA4Event(
    config: GA4Config,
    eventName: string,
    params: Record<string, string | number | boolean>
): Promise<{ success: boolean; error?: string }> {
    if (!config.measurementId || !config.apiSecret) {
        return {
            success: false,
            error: 'GA4 config incomplete. Set measurementId and apiSecret in Settings.'
        };
    }

    try {
        // Generate a unique client ID for server-side events
        const clientId = generateClientId();

        const payload = {
            client_id: clientId,
            events: [{
                name: eventName,
                params: {
                    ...params,
                    engagement_time_msec: 100,
                    session_id: Date.now().toString(),
                },
            }],
        };

        const url = `${GA4_ENDPOINT}?measurement_id=${config.measurementId}&api_secret=${config.apiSecret}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        // GA4 Measurement Protocol returns 204 on success
        if (response.status === 204 || response.ok) {
            console.log(`[GA4] Event '${eventName}' sent successfully`);
            return { success: true };
        }

        const errorText = await response.text();
        console.error(`[GA4] Event failed: ${response.status} - ${errorText}`);
        return { success: false, error: `GA4 error: ${response.status}` };

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[GA4] Event error:`, message);
        return { success: false, error: message };
    }
}

// ============================================================================
// Post Tracking Events
// ============================================================================

/**
 * Track a new post publication.
 * Sends a custom 'post_published' event to GA4.
 */
export async function recordPostPublished(
    config: GA4Config,
    postData: PostPublishEvent
): Promise<{ success: boolean; error?: string }> {
    return sendGA4Event(config, 'post_published', {
        post_url: postData.postUrl,
        post_title: postData.postTitle.slice(0, 100), // GA4 limits param length
        post_id: postData.postId,
        site_id: postData.siteId,
        site_name: postData.siteName,
        author: postData.author,
        category: postData.category || 'uncategorized',
        word_count: postData.wordCount || 0,
        has_images: postData.hasImages || false,
        campaign_id: postData.campaignId || 'unknown',
        published_at: new Date().toISOString(),
    });
}

/**
 * Track an A/B test impression.
 */
export async function recordABTestImpression(
    config: GA4Config,
    testId: string,
    variantId: string,
    variantType: 'title' | 'cover' | 'content'
): Promise<{ success: boolean; error?: string }> {
    return sendGA4Event(config, 'ab_test_impression', {
        test_id: testId,
        variant_id: variantId,
        variant_type: variantType,
    });
}

/**
 * Track an A/B test click (for CTR).
 */
export async function recordABTestClick(
    config: GA4Config,
    testId: string,
    variantId: string
): Promise<{ success: boolean; error?: string }> {
    return sendGA4Event(config, 'ab_test_click', {
        test_id: testId,
        variant_id: variantId,
    });
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Generate a unique client ID for server-side events.
 * Format: timestamp.random (similar to GA client ID format)
 */
function generateClientId(): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const random = Math.floor(Math.random() * 1000000000);
    return `${timestamp}.${random}`;
}

/**
 * Validate GA4 configuration.
 */
export function validateGA4Config(config: Partial<GA4Config>): string[] {
    const errors: string[] = [];

    if (!config.measurementId) {
        errors.push('Missing Measurement ID (format: G-XXXXXXXXXX)');
    } else if (!config.measurementId.startsWith('G-')) {
        errors.push('Invalid Measurement ID format (should start with G-)');
    }

    if (!config.apiSecret) {
        errors.push('Missing API Secret');
    }

    return errors;
}

/**
 * Test the GA4 connection with a debug event.
 */
export async function testGA4Connection(
    config: GA4Config
): Promise<{ success: boolean; error?: string }> {
    return sendGA4Event(config, 'debug_ping', {
        test: true,
        source: 'ifrit_app',
        timestamp: Date.now(),
    });
}
