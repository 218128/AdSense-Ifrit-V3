/**
 * Email Deliverability Configuration
 * 
 * Generates DNS records for email deliverability (SPF, DKIM, DMARC).
 * Helps fresh domains build email lists for monetization while waiting out sandbox.
 */

export interface EmailDNSConfig {
    domain: string;
    records: DNSRecord[];
    score: number;          // Deliverability score 0-100
    status: EmailStatus;
    recommendations: string[];
}

export interface DNSRecord {
    type: 'TXT' | 'CNAME' | 'MX' | 'A';
    name: string;           // Record name (@ for root, or subdomain)
    value: string;          // Record value
    priority?: number;      // For MX records
    purpose: 'spf' | 'dkim' | 'dmarc' | 'mx' | 'verification';
    required: boolean;
}

export type EmailStatus = 'not-configured' | 'partial' | 'configured' | 'verified';

// Common email providers and their required records
export interface EmailProvider {
    id: string;
    name: string;
    description: string;
    tier: 'free' | 'paid';
    monthlyLimit?: number;  // Emails per month
    features: string[];
    records: (domain: string) => DNSRecord[];
}

export const EMAIL_PROVIDERS: EmailProvider[] = [
    {
        id: 'improvmx',
        name: 'ImprovMX',
        description: 'Free email forwarding - receive emails at your domain',
        tier: 'free',
        monthlyLimit: undefined,  // Unlimited forwarding
        features: ['Email forwarding', 'Multiple aliases', 'Catch-all', 'No inbox'],
        records: (_domain: string) => [
            {
                type: 'MX',
                name: '@',
                value: 'mx1.improvmx.com',
                priority: 10,
                purpose: 'mx',
                required: true,
            },
            {
                type: 'MX',
                name: '@',
                value: 'mx2.improvmx.com',
                priority: 20,
                purpose: 'mx',
                required: true,
            },
            {
                type: 'TXT',
                name: '@',
                value: 'v=spf1 include:spf.improvmx.com ~all',
                purpose: 'spf',
                required: true,
            },
        ],
    },
    {
        id: 'sendgrid',
        name: 'SendGrid',
        description: 'Transactional email with 100 emails/day free',
        tier: 'free',
        monthlyLimit: 3000,
        features: ['Transactional email', 'Templates', 'Analytics', 'API'],
        records: (_domain: string) => [
            {
                type: 'CNAME',
                name: 'em1234',  // Actual value from SendGrid
                value: 'u1234567.wl.sendgrid.net',
                purpose: 'verification',
                required: true,
            },
            {
                type: 'CNAME',
                name: 's1._domainkey',
                value: 's1.domainkey.u1234567.wl.sendgrid.net',
                purpose: 'dkim',
                required: true,
            },
            {
                type: 'CNAME',
                name: 's2._domainkey',
                value: 's2.domainkey.u1234567.wl.sendgrid.net',
                purpose: 'dkim',
                required: true,
            },
            {
                type: 'TXT',
                name: '@',
                value: 'v=spf1 include:sendgrid.net ~all',
                purpose: 'spf',
                required: true,
            },
        ],
    },
    {
        id: 'resend',
        name: 'Resend',
        description: 'Modern email API - 100 emails/day free',
        tier: 'free',
        monthlyLimit: 3000,
        features: ['Modern API', 'React templates', 'Analytics', 'Webhooks'],
        records: (_domain: string) => [
            {
                type: 'TXT',
                name: '@',
                value: 'v=spf1 include:amazonses.com ~all',
                purpose: 'spf',
                required: true,
            },
            {
                type: 'CNAME',
                name: 'resend._domainkey',
                value: 'resend._domainkey.resend.dev',
                purpose: 'dkim',
                required: true,
            },
        ],
    },
    {
        id: 'mailgun',
        name: 'Mailgun',
        description: 'Powerful email API - 100 emails/day free',
        tier: 'free',
        monthlyLimit: 3000,
        features: ['Email API', 'Validation', 'Logs', 'Webhooks'],
        records: (_domain: string) => [
            {
                type: 'TXT',
                name: '@',
                value: 'v=spf1 include:mailgun.org ~all',
                purpose: 'spf',
                required: true,
            },
            {
                type: 'TXT',
                name: 'smtp._domainkey',
                value: 'k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4...', // Placeholder
                purpose: 'dkim',
                required: true,
            },
            {
                type: 'MX',
                name: '@',
                value: 'mxa.mailgun.org',
                priority: 10,
                purpose: 'mx',
                required: false,
            },
        ],
    },
    {
        id: 'buttondown',
        name: 'Buttondown',
        description: 'Simple newsletter platform - 100 subscribers free',
        tier: 'free',
        monthlyLimit: undefined,
        features: ['Newsletter', 'Markdown', 'Archives', 'Analytics'],
        records: (_domain: string) => [
            {
                type: 'TXT',
                name: '@',
                value: 'v=spf1 include:buttondown.email ~all',
                purpose: 'spf',
                required: true,
            },
        ],
    },
];

/**
 * Generate base DMARC record
 */
export function generateDMARC(domain: string, policy: 'none' | 'quarantine' | 'reject' = 'quarantine'): DNSRecord {
    return {
        type: 'TXT',
        name: '_dmarc',
        value: `v=DMARC1; p=${policy}; rua=mailto:dmarc@${domain}; ruf=mailto:dmarc@${domain}; fo=1`,
        purpose: 'dmarc',
        required: true,
    };
}

/**
 * Generate email DNS configuration for a domain
 */
export function generateEmailConfig(
    domain: string,
    providerId: string,
    options?: {
        dmarcPolicy?: 'none' | 'quarantine' | 'reject';
        includeReceiving?: boolean;
    }
): EmailDNSConfig {
    const provider = EMAIL_PROVIDERS.find(p => p.id === providerId);

    if (!provider) {
        return {
            domain,
            records: [],
            score: 0,
            status: 'not-configured',
            recommendations: ['Select a valid email provider'],
        };
    }

    const records: DNSRecord[] = [...provider.records(domain)];

    // Add DMARC if provider supports it
    records.push(generateDMARC(domain, options?.dmarcPolicy || 'quarantine'));

    // Add receiving MX if requested and provider doesn't include it
    if (options?.includeReceiving && !records.some(r => r.purpose === 'mx')) {
        // Default to ImprovMX for receiving
        records.push(
            { type: 'MX', name: '@', value: 'mx1.improvmx.com', priority: 10, purpose: 'mx', required: true },
            { type: 'MX', name: '@', value: 'mx2.improvmx.com', priority: 20, purpose: 'mx', required: true }
        );
    }

    // Calculate score based on what's configured
    const hasSPF = records.some(r => r.purpose === 'spf');
    const hasDKIM = records.some(r => r.purpose === 'dkim');
    const hasDMARC = records.some(r => r.purpose === 'dmarc');
    const hasMX = records.some(r => r.purpose === 'mx');

    let score = 0;
    const recommendations: string[] = [];

    if (hasSPF) score += 30;
    else recommendations.push('Add SPF record to prevent spoofing');

    if (hasDKIM) score += 30;
    else recommendations.push('Add DKIM for email authentication');

    if (hasDMARC) score += 25;
    else recommendations.push('Add DMARC policy for protection');

    if (hasMX) score += 15;
    else recommendations.push('Add MX records to receive email');

    const status: EmailStatus =
        score >= 85 ? 'configured' :
            score >= 50 ? 'partial' :
                'not-configured';

    return {
        domain,
        records,
        score,
        status,
        recommendations,
    };
}

/**
 * Format DNS records for display
 */
export function formatRecordForDisplay(record: DNSRecord): {
    type: string;
    name: string;
    value: string;
    ttl: string;
} {
    return {
        type: record.type,
        name: record.name === '@' ? '@' : record.name,
        value: record.type === 'MX' && record.priority
            ? `${record.priority} ${record.value}`
            : record.value,
        ttl: '3600',  // 1 hour default
    };
}

/**
 * Generate copy-paste DNS instructions
 */
export function generateDNSInstructions(config: EmailDNSConfig): string {
    const lines: string[] = [
        `DNS Configuration for ${config.domain}`,
        `${'='.repeat(50)}`,
        '',
        'Add the following DNS records to your domain:',
        '',
    ];

    // Group by purpose
    const grouped: Record<string, DNSRecord[]> = {};
    for (const record of config.records) {
        if (!grouped[record.purpose]) grouped[record.purpose] = [];
        grouped[record.purpose].push(record);
    }

    // SPF
    if (grouped.spf) {
        lines.push('📧 SPF (Sender Policy Framework)');
        for (const r of grouped.spf) {
            lines.push(`   Type: ${r.type}`);
            lines.push(`   Name: ${r.name}`);
            lines.push(`   Value: ${r.value}`);
            lines.push('');
        }
    }

    // DKIM
    if (grouped.dkim) {
        lines.push('🔐 DKIM (DomainKeys Identified Mail)');
        for (const r of grouped.dkim) {
            lines.push(`   Type: ${r.type}`);
            lines.push(`   Name: ${r.name}`);
            lines.push(`   Value: ${r.value}`);
            lines.push('');
        }
    }

    // DMARC
    if (grouped.dmarc) {
        lines.push('🛡️ DMARC (Domain-based Message Authentication)');
        for (const r of grouped.dmarc) {
            lines.push(`   Type: ${r.type}`);
            lines.push(`   Name: ${r.name}`);
            lines.push(`   Value: ${r.value}`);
            lines.push('');
        }
    }

    // MX
    if (grouped.mx) {
        lines.push('📬 MX (Mail Exchange)');
        for (const r of grouped.mx) {
            lines.push(`   Type: ${r.type}`);
            lines.push(`   Name: ${r.name}`);
            lines.push(`   Priority: ${r.priority}`);
            lines.push(`   Value: ${r.value}`);
            lines.push('');
        }
    }

    lines.push('');
    lines.push(`Deliverability Score: ${config.score}/100`);

    if (config.recommendations.length > 0) {
        lines.push('');
        lines.push('Recommendations:');
        for (const rec of config.recommendations) {
            lines.push(`  • ${rec}`);
        }
    }

    return lines.join('\n');
}

/**
 * Estimate email deliverability for a domain
 */
export function estimateDeliverability(config: EmailDNSConfig): {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    prediction: string;
    tips: string[];
} {
    const { score } = config;

    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    let prediction: string;
    const tips: string[] = [];

    if (score >= 90) {
        grade = 'A';
        prediction = 'Excellent deliverability - emails should reach inbox';
    } else if (score >= 75) {
        grade = 'B';
        prediction = 'Good deliverability - most emails will reach inbox';
        tips.push('Consider adding BIMI for visual branding');
    } else if (score >= 50) {
        grade = 'C';
        prediction = 'Fair deliverability - some emails may go to spam';
        tips.push('Complete missing authentication records');
        tips.push('Warm up domain before bulk sending');
    } else if (score >= 25) {
        grade = 'D';
        prediction = 'Poor deliverability - many emails will be rejected';
        tips.push('Essential: Add SPF and DKIM records');
        tips.push('Set up proper MX records for replies');
    } else {
        grade = 'F';
        prediction = 'Very poor - emails will likely be rejected';
        tips.push('Configure basic email authentication first');
    }

    // Domain age tips
    tips.push('New domains should send low volume initially');
    tips.push('Build reputation with engaged recipients first');

    return { score, grade, prediction, tips };
}

/**
 * Get provider by ID
 */
export function getProvider(id: string): EmailProvider | undefined {
    return EMAIL_PROVIDERS.find(p => p.id === id);
}

/**
 * Get all free providers
 */
export function getFreeProviders(): EmailProvider[] {
    return EMAIL_PROVIDERS.filter(p => p.tier === 'free');
}

/**
 * Calculate combined SPF record when using multiple services
 */
export function combineSPFRecords(includes: string[]): string {
    const uniqueIncludes = [...new Set(includes)];
    return `v=spf1 ${uniqueIncludes.map(i => `include:${i}`).join(' ')} ~all`;
}

/**
 * Storage keys
 */
const STORAGE_KEY = 'ifrit_email_configs';

/**
 * Save email config for a domain
 */
export function saveEmailConfig(config: EmailDNSConfig): void {
    if (typeof window === 'undefined') return;

    const configs = getSavedConfigs();
    configs[config.domain] = config;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

/**
 * Get saved email configs
 */
export function getSavedConfigs(): Record<string, EmailDNSConfig> {
    if (typeof window === 'undefined') return {};

    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    } catch {
        return {};
    }
}

/**
 * Get config for a specific domain
 */
export function getEmailConfig(domain: string): EmailDNSConfig | null {
    const configs = getSavedConfigs();
    return configs[domain] || null;
}
