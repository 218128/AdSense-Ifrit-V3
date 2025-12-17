/**
 * Namecheap API Client
 * 
 * Integrates with Namecheap API for domain discovery and management.
 * Docs: https://www.namecheap.com/support/api/methods/
 */

export interface NamecheapConfig {
    apiUser: string;
    apiKey: string;
    username: string;
    clientIp: string;
    sandbox?: boolean;
}

export interface Domain {
    id: string;
    name: string;
    registrar: string;
    createdDate: string;
    expiresDate: string;
    isExpired: boolean;
    isLocked: boolean;
    autoRenew: boolean;
    isPremium: boolean;
    status: string;
    daysUntilExpiry: number;
}

export interface DomainAvailability {
    domain: string;
    available: boolean;
    premium: boolean;
    price?: string;
    icannFee?: string;
}

export interface NamecheapError {
    code: string;
    message: string;
}

const PRODUCTION_URL = 'https://api.namecheap.com/xml.response';
const SANDBOX_URL = 'https://api.sandbox.namecheap.com/xml.response';

/**
 * Namecheap API Client
 */
export class NamecheapClient {
    private config: NamecheapConfig;
    private baseUrl: string;

    constructor(config: NamecheapConfig) {
        this.config = config;
        this.baseUrl = config.sandbox ? SANDBOX_URL : PRODUCTION_URL;
    }

    /**
     * Build API request URL with parameters
     */
    private buildUrl(command: string, params: Record<string, string> = {}): string {
        const url = new URL(this.baseUrl);

        const allParams = {
            ApiUser: this.config.apiUser,
            ApiKey: this.config.apiKey,
            UserName: this.config.username,
            ClientIp: this.config.clientIp,
            Command: command,
            ...params
        };

        Object.entries(allParams).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });

        return url.toString();
    }

    /**
     * Make API request and parse XML response
     */
    private async request<T>(command: string, params: Record<string, string> = {}): Promise<T> {
        const url = this.buildUrl(command, params);

        try {
            const response = await fetch(url);
            const text = await response.text();

            // Parse XML response
            const result = this.parseXml<T>(text, command);
            return result;
        } catch (error) {
            console.error(`Namecheap API error:`, error);
            throw error;
        }
    }

    /**
     * Simple XML parser for Namecheap responses
     */
    private parseXml<T>(xml: string, command: string): T {
        // Check for errors
        const errorMatch = xml.match(/<Error Number="(\d+)">(.*?)<\/Error>/);
        if (errorMatch) {
            throw new Error(`Namecheap Error ${errorMatch[1]}: ${errorMatch[2]}`);
        }

        // Parse based on command type
        if (command === 'namecheap.domains.getList') {
            return this.parseDomainList(xml) as T;
        } else if (command === 'namecheap.domains.check') {
            return this.parseAvailability(xml) as T;
        }

        return {} as T;
    }

    /**
     * Parse domain list XML
     */
    private parseDomainList(xml: string): Domain[] {
        const domains: Domain[] = [];
        const domainRegex = /<Domain\s+([^>]+)\/>/g;

        let match;
        while ((match = domainRegex.exec(xml)) !== null) {
            const attrs = match[1];

            const getAttr = (name: string): string => {
                const attrMatch = attrs.match(new RegExp(`${name}="([^"]+)"`));
                return attrMatch ? attrMatch[1] : '';
            };

            const expiresDate = getAttr('Expires');
            const daysUntilExpiry = this.calculateDaysUntilExpiry(expiresDate);

            domains.push({
                id: getAttr('ID'),
                name: getAttr('Name'),
                registrar: 'Namecheap',
                createdDate: getAttr('Created'),
                expiresDate: expiresDate,
                isExpired: getAttr('IsExpired') === 'true',
                isLocked: getAttr('IsLocked') === 'true',
                autoRenew: getAttr('AutoRenew') === 'true',
                isPremium: getAttr('IsPremiumDomain') === 'true',
                status: 'active',
                daysUntilExpiry
            });
        }

        return domains;
    }

    /**
     * Parse domain availability XML
     */
    private parseAvailability(xml: string): DomainAvailability[] {
        const results: DomainAvailability[] = [];
        const domainRegex = /<DomainCheckResult\s+([^>]+)\/>/g;

        let match;
        while ((match = domainRegex.exec(xml)) !== null) {
            const attrs = match[1];

            const getAttr = (name: string): string => {
                const attrMatch = attrs.match(new RegExp(`${name}="([^"]+)"`));
                return attrMatch ? attrMatch[1] : '';
            };

            results.push({
                domain: getAttr('Domain'),
                available: getAttr('Available') === 'true',
                premium: getAttr('IsPremiumName') === 'true',
                price: getAttr('PremiumRegistrationPrice') || undefined,
                icannFee: getAttr('IcannFee') || undefined
            });
        }

        return results;
    }

    /**
     * Calculate days until domain expiry
     */
    private calculateDaysUntilExpiry(expiresDate: string): number {
        if (!expiresDate) return 0;

        const expires = new Date(expiresDate);
        const now = new Date();
        const diffTime = expires.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return Math.max(0, diffDays);
    }

    /**
     * Get list of registered domains
     */
    async getDomains(page: number = 1, pageSize: number = 100): Promise<Domain[]> {
        return this.request<Domain[]>('namecheap.domains.getList', {
            Page: String(page),
            PageSize: String(pageSize)
        });
    }

    /**
     * Check domain availability
     */
    async checkAvailability(domains: string[]): Promise<DomainAvailability[]> {
        return this.request<DomainAvailability[]>('namecheap.domains.check', {
            DomainList: domains.join(',')
        });
    }

    /**
     * Get domains expiring soon
     */
    async getExpiringDomains(withinDays: number = 30): Promise<Domain[]> {
        const domains = await this.getDomains();
        return domains.filter(d => d.daysUntilExpiry <= withinDays && !d.isExpired);
    }

    /**
     * Test API connection
     */
    async testConnection(): Promise<boolean> {
        try {
            await this.getDomains(1, 1);
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * Create Namecheap client from localStorage settings
 */
export function createNamecheapClientFromSettings(): NamecheapClient | null {
    if (typeof window === 'undefined') return null;

    try {
        const apiUser = localStorage.getItem('namecheap_api_user');
        const apiKey = localStorage.getItem('namecheap_api_key');
        const username = localStorage.getItem('namecheap_username');
        const clientIp = localStorage.getItem('namecheap_client_ip');
        const sandbox = localStorage.getItem('namecheap_sandbox') === 'true';

        if (!apiUser || !apiKey || !username || !clientIp) {
            return null;
        }

        return new NamecheapClient({
            apiUser,
            apiKey,
            username,
            clientIp,
            sandbox
        });
    } catch {
        return null;
    }
}

/**
 * Generate domain name suggestions for a niche
 */
export function suggestDomainNames(niche: string, keywords: string[]): string[] {
    const suggestions: string[] = [];
    const tlds = ['.com', '.io', '.co', '.net', '.blog'];

    // Base patterns
    const patterns = [
        (kw: string) => kw,
        (kw: string) => `the${kw}`,
        (kw: string) => `${kw}hub`,
        (kw: string) => `${kw}guide`,
        (kw: string) => `${kw}insider`,
        (kw: string) => `${kw}daily`,
        (kw: string) => `get${kw}`,
        (kw: string) => `my${kw}`,
        (kw: string) => `best${kw}`,
    ];

    // Clean and combine keywords
    const cleanKeywords = keywords.map(kw =>
        kw.toLowerCase().replace(/[^a-z0-9]/g, '')
    ).filter(kw => kw.length > 0);

    // Generate combinations
    for (const keyword of cleanKeywords.slice(0, 3)) {
        for (const pattern of patterns) {
            for (const tld of tlds) {
                const domain = pattern(keyword) + tld;
                if (domain.length <= 30) {
                    suggestions.push(domain);
                }
            }
        }
    }

    return suggestions.slice(0, 20);
}
