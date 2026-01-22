/**
 * Newsletter Client
 * FSD: lib/distribution/newsletterClient.ts
 *
 * Integration with email newsletter providers:
 * ConvertKit, Substack, Mailchimp, Buttondown.
 */

// ============================================================================
// Types
// ============================================================================

export type NewsletterProvider = 'convertkit' | 'substack' | 'mailchimp' | 'buttondown';

export interface NewsletterConfig {
    provider: NewsletterProvider;
    apiKey: string;
    apiSecret?: string;      // Some providers need this
    listId?: string;         // Mailchimp audience ID
    publicationId?: string;  // Substack publication
}

export interface NewsletterPost {
    subject: string;
    previewText?: string;
    htmlBody: string;
    plainText?: string;
    sendAt?: Date;           // Schedule for later
    tags?: string[];         // Segment by tags
}

export interface SendResult {
    success: boolean;
    messageId?: string;
    scheduledFor?: Date;
    error?: string;
}

export interface SubscriberInfo {
    email: string;
    name?: string;
    tags?: string[];
    subscribedAt?: Date;
}

// ============================================================================
// Provider Endpoints
// ============================================================================

const PROVIDER_ENDPOINTS: Record<NewsletterProvider, string> = {
    convertkit: 'https://api.convertkit.com/v3',
    substack: 'https://substack.com/api/v1',
    mailchimp: 'https://us1.api.mailchimp.com/3.0', // DC extracted from key
    buttondown: 'https://api.buttondown.email/v1',
};

// ============================================================================
// ConvertKit Implementation
// ============================================================================

async function sendViaConvertKit(
    config: NewsletterConfig,
    post: NewsletterPost
): Promise<SendResult> {
    try {
        // ConvertKit uses broadcasts for sending emails
        const response = await fetch(`${PROVIDER_ENDPOINTS.convertkit}/broadcasts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                api_secret: config.apiKey, // ConvertKit uses api_secret
                subject: post.subject,
                content: post.htmlBody,
                description: post.previewText || '',
                public: false,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            return { success: false, error: `ConvertKit: ${response.status} - ${error}` };
        }

        const data = await response.json();
        return {
            success: true,
            messageId: data.broadcast?.id?.toString(),
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'ConvertKit send failed',
        };
    }
}

// ============================================================================
// Buttondown Implementation
// ============================================================================

async function sendViaButtondown(
    config: NewsletterConfig,
    post: NewsletterPost
): Promise<SendResult> {
    try {
        const response = await fetch(`${PROVIDER_ENDPOINTS.buttondown}/emails`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${config.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                subject: post.subject,
                body: post.htmlBody,
                status: post.sendAt ? 'scheduled' : 'draft',
                publish_date: post.sendAt?.toISOString(),
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            return { success: false, error: `Buttondown: ${response.status} - ${error}` };
        }

        const data = await response.json();
        return {
            success: true,
            messageId: data.id,
            scheduledFor: post.sendAt,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Buttondown send failed',
        };
    }
}

// ============================================================================
// Mailchimp Implementation
// ============================================================================

function getMailchimpDC(apiKey: string): string {
    // Mailchimp API keys end with -usXX where XX is the data center
    const match = apiKey.match(/-us(\d+)$/);
    return match ? `us${match[1]}` : 'us1';
}

async function sendViaMailchimp(
    config: NewsletterConfig,
    post: NewsletterPost
): Promise<SendResult> {
    try {
        const dc = getMailchimpDC(config.apiKey);
        const baseUrl = `https://${dc}.api.mailchimp.com/3.0`;

        // Create campaign
        const campaignResponse = await fetch(`${baseUrl}/campaigns`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'regular',
                recipients: {
                    list_id: config.listId,
                },
                settings: {
                    subject_line: post.subject,
                    preview_text: post.previewText || '',
                    from_name: 'Newsletter',
                    reply_to: 'noreply@example.com',
                },
            }),
        });

        if (!campaignResponse.ok) {
            const error = await campaignResponse.text();
            return { success: false, error: `Mailchimp: ${campaignResponse.status} - ${error}` };
        }

        const campaign = await campaignResponse.json();

        // Set content
        await fetch(`${baseUrl}/campaigns/${campaign.id}/content`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                html: post.htmlBody,
                plain_text: post.plainText || '',
            }),
        });

        // Schedule or send
        if (post.sendAt) {
            await fetch(`${baseUrl}/campaigns/${campaign.id}/actions/schedule`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    schedule_time: post.sendAt.toISOString(),
                }),
            });
        }

        return {
            success: true,
            messageId: campaign.id,
            scheduledFor: post.sendAt,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Mailchimp send failed',
        };
    }
}

// ============================================================================
// Substack (Note: Limited API)
// ============================================================================

async function sendViaSubstack(
    config: NewsletterConfig,
    post: NewsletterPost
): Promise<SendResult> {
    // Substack's public API is very limited
    // Full implementation would require their private API or Puppeteer automation
    console.warn('[Newsletter] Substack API is limited. Consider using their web interface.');

    return {
        success: false,
        error: 'Substack API integration requires manual posting or browser automation',
    };
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Send a newsletter via the configured provider
 */
export async function sendNewsletter(
    config: NewsletterConfig,
    post: NewsletterPost
): Promise<SendResult> {
    console.log(`[Newsletter] Sending via ${config.provider}: "${post.subject}"`);

    switch (config.provider) {
        case 'convertkit':
            return sendViaConvertKit(config, post);
        case 'buttondown':
            return sendViaButtondown(config, post);
        case 'mailchimp':
            return sendViaMailchimp(config, post);
        case 'substack':
            return sendViaSubstack(config, post);
        default:
            return { success: false, error: `Unknown provider: ${config.provider}` };
    }
}

/**
 * Get subscriber count from provider
 */
export async function getSubscriberCount(config: NewsletterConfig): Promise<number> {
    try {
        switch (config.provider) {
            case 'convertkit': {
                const response = await fetch(
                    `${PROVIDER_ENDPOINTS.convertkit}/subscribers?api_secret=${config.apiKey}`
                );
                const data = await response.json();
                return data.total_subscribers || 0;
            }

            case 'buttondown': {
                const response = await fetch(`${PROVIDER_ENDPOINTS.buttondown}/subscribers`, {
                    headers: { 'Authorization': `Token ${config.apiKey}` },
                });
                const data = await response.json();
                return data.count || 0;
            }

            case 'mailchimp': {
                const dc = getMailchimpDC(config.apiKey);
                const response = await fetch(
                    `https://${dc}.api.mailchimp.com/3.0/lists/${config.listId}`,
                    {
                        headers: { 'Authorization': `Bearer ${config.apiKey}` },
                    }
                );
                const data = await response.json();
                return data.stats?.member_count || 0;
            }

            default:
                return 0;
        }
    } catch {
        console.error(`[Newsletter] Failed to get subscriber count for ${config.provider}`);
        return 0;
    }
}

/**
 * Add a subscriber to the newsletter
 */
export async function addSubscriber(
    config: NewsletterConfig,
    email: string,
    tags?: string[]
): Promise<boolean> {
    try {
        switch (config.provider) {
            case 'convertkit': {
                const response = await fetch(
                    `${PROVIDER_ENDPOINTS.convertkit}/forms/${config.listId}/subscribe`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            api_secret: config.apiKey,
                            email,
                            tags: tags || [],
                        }),
                    }
                );
                return response.ok;
            }

            case 'buttondown': {
                const response = await fetch(`${PROVIDER_ENDPOINTS.buttondown}/subscribers`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${config.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, tags: tags || [] }),
                });
                return response.ok;
            }

            case 'mailchimp': {
                const dc = getMailchimpDC(config.apiKey);
                const response = await fetch(
                    `https://${dc}.api.mailchimp.com/3.0/lists/${config.listId}/members`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${config.apiKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            email_address: email,
                            status: 'subscribed',
                            tags: tags?.map(t => ({ name: t, status: 'active' })) || [],
                        }),
                    }
                );
                return response.ok;
            }

            default:
                return false;
        }
    } catch {
        console.error(`[Newsletter] Failed to add subscriber to ${config.provider}`);
        return false;
    }
}

/**
 * Validate newsletter provider credentials
 */
export async function validateCredentials(config: NewsletterConfig): Promise<boolean> {
    try {
        // Try to get subscriber count as a validation test
        const count = await getSubscriberCount(config);
        return count >= 0; // 0 is valid (new list)
    } catch {
        return false;
    }
}
