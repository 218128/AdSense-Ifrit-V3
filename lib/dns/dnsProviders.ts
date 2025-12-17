/**
 * DNS Provider Interface
 * 
 * Extensible interface for DNS configuration across different registrars.
 * Currently supports Namecheap, designed for easy extension to others.
 */

// Supported DNS providers
export type DNSProvider = 'namecheap' | 'cloudflare' | 'godaddy' | 'route53';

// DNS record types
export interface DNSRecord {
    type: 'A' | 'CNAME' | 'MX' | 'TXT' | 'AAAA' | 'NS';
    host: string;
    value: string;
    ttl?: number;
    priority?: number; // For MX records
}

// Provider credentials interface
export interface DNSProviderCredentials {
    provider: DNSProvider;
    // Namecheap
    namecheapApiUser?: string;
    namecheapApiKey?: string;
    namecheapUsername?: string;
    namecheapClientIp?: string;
    // Cloudflare (future)
    cloudflareApiToken?: string;
    cloudflareZoneId?: string;
    // GoDaddy (future)
    godaddyKey?: string;
    godaddySecret?: string;
}

// Provider info for UI
export interface DNSProviderInfo {
    id: DNSProvider;
    name: string;
    description: string;
    icon: string;
    setupUrl: string;
    requiredFields: string[];
    implemented: boolean;
}

// Provider configuration
export const DNS_PROVIDERS: DNSProviderInfo[] = [
    {
        id: 'namecheap',
        name: 'Namecheap',
        description: 'Popular registrar with API access',
        icon: '🛒',
        setupUrl: 'https://ap.www.namecheap.com/settings/tools/apiaccess/',
        requiredFields: ['apiUser', 'apiKey', 'username', 'clientIp'],
        implemented: true,
    },
    {
        id: 'cloudflare',
        name: 'Cloudflare',
        description: 'Free DNS with CDN and security',
        icon: '☁️',
        setupUrl: 'https://dash.cloudflare.com/profile/api-tokens',
        requiredFields: ['apiToken', 'zoneId'],
        implemented: false,
    },
    {
        id: 'godaddy',
        name: 'GoDaddy',
        description: 'Large registrar with API',
        icon: '🌐',
        setupUrl: 'https://developer.godaddy.com/keys',
        requiredFields: ['key', 'secret'],
        implemented: false,
    },
    {
        id: 'route53',
        name: 'AWS Route53',
        description: 'AWS DNS service',
        icon: '📦',
        setupUrl: 'https://console.aws.amazon.com/route53',
        requiredFields: ['accessKey', 'secretKey', 'hostedZoneId'],
        implemented: false,
    },
];

// Vercel DNS records (standard for all providers)
export const VERCEL_DNS_RECORDS: DNSRecord[] = [
    { type: 'A', host: '@', value: '76.76.21.21', ttl: 1800 },
    { type: 'CNAME', host: 'www', value: 'cname.vercel-dns.com', ttl: 1800 },
];

// Get credentials from localStorage
export function getDNSCredentials(provider: DNSProvider): DNSProviderCredentials | null {
    if (typeof window === 'undefined') return null;

    const credentials: DNSProviderCredentials = { provider };

    switch (provider) {
        case 'namecheap':
            const apiUser = localStorage.getItem('ifrit_namecheap_user');
            const apiKey = localStorage.getItem('ifrit_namecheap_key');
            const username = localStorage.getItem('ifrit_namecheap_username');
            const clientIp = localStorage.getItem('ifrit_namecheap_client_ip');

            if (!apiUser || !apiKey) return null;

            credentials.namecheapApiUser = apiUser;
            credentials.namecheapApiKey = apiKey;
            credentials.namecheapUsername = username || apiUser;
            credentials.namecheapClientIp = clientIp || '';
            break;

        case 'cloudflare':
            const cfToken = localStorage.getItem('ifrit_cloudflare_token');
            if (!cfToken) return null;
            credentials.cloudflareApiToken = cfToken;
            break;

        // Add other providers as needed
        default:
            return null;
    }

    return credentials;
}

// Save credentials to localStorage
export function saveDNSCredentials(credentials: DNSProviderCredentials): void {
    if (typeof window === 'undefined') return;

    switch (credentials.provider) {
        case 'namecheap':
            if (credentials.namecheapApiUser) {
                localStorage.setItem('ifrit_namecheap_user', credentials.namecheapApiUser);
            }
            if (credentials.namecheapApiKey) {
                localStorage.setItem('ifrit_namecheap_key', credentials.namecheapApiKey);
            }
            if (credentials.namecheapUsername) {
                localStorage.setItem('ifrit_namecheap_username', credentials.namecheapUsername);
            }
            if (credentials.namecheapClientIp) {
                localStorage.setItem('ifrit_namecheap_client_ip', credentials.namecheapClientIp);
            }
            break;

        case 'cloudflare':
            if (credentials.cloudflareApiToken) {
                localStorage.setItem('ifrit_cloudflare_token', credentials.cloudflareApiToken);
            }
            break;
    }
}

// Check if provider is configured
export function isDNSProviderConfigured(provider: DNSProvider): boolean {
    return getDNSCredentials(provider) !== null;
}

// Get the first configured provider
export function getConfiguredDNSProvider(): DNSProvider | null {
    for (const provider of DNS_PROVIDERS) {
        if (provider.implemented && isDNSProviderConfigured(provider.id)) {
            return provider.id;
        }
    }
    return null;
}
