/**
 * Tests for DNS Providers
 * 
 * Tests DNS credential management and configuration
 */

// Mock localStorage
const mockLocalStorage = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: jest.fn((key: string) => { delete store[key]; }),
        clear: jest.fn(() => { store = {}; })
    };
})();

Object.defineProperty(global, 'localStorage', { value: mockLocalStorage });

import {
    DNS_PROVIDERS,
    VERCEL_DNS_RECORDS,
    getDNSCredentials,
    saveDNSCredentials,
    isDNSProviderConfigured,
    getConfiguredDNSProvider,
    type DNSProvider,
    type DNSRecord
} from '@/lib/dns/dnsProviders';

describe('DNS Providers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLocalStorage.clear();
    });

    describe('DNS_PROVIDERS constant', () => {
        it('should include namecheap as implemented', () => {
            const namecheap = DNS_PROVIDERS.find(p => p.id === 'namecheap');

            expect(namecheap).toBeDefined();
            expect(namecheap?.implemented).toBe(true);
        });

        it('should include cloudflare as not implemented', () => {
            const cloudflare = DNS_PROVIDERS.find(p => p.id === 'cloudflare');

            expect(cloudflare).toBeDefined();
            expect(cloudflare?.implemented).toBe(false);
        });

        it('should have required fields for each provider', () => {
            DNS_PROVIDERS.forEach(provider => {
                expect(provider.requiredFields).toBeDefined();
                expect(provider.requiredFields.length).toBeGreaterThan(0);
            });
        });
    });

    describe('VERCEL_DNS_RECORDS constant', () => {
        it('should include A record for root domain', () => {
            const aRecord = VERCEL_DNS_RECORDS.find(r => r.type === 'A');

            expect(aRecord).toBeDefined();
            expect(aRecord?.host).toBe('@');
            expect(aRecord?.value).toBe('76.76.21.21');
        });

        it('should include CNAME for www', () => {
            const cnameRecord = VERCEL_DNS_RECORDS.find(r => r.type === 'CNAME');

            expect(cnameRecord).toBeDefined();
            expect(cnameRecord?.host).toBe('www');
        });
    });

    describe('getDNSCredentials()', () => {
        it('should return null when no credentials stored', () => {
            mockLocalStorage.getItem.mockReturnValue(null);

            const creds = getDNSCredentials('namecheap');

            expect(creds).toBeNull();
        });

        it('should return namecheap credentials when stored', () => {
            mockLocalStorage.getItem.mockImplementation((key: string) => {
                const values: Record<string, string> = {
                    'ifrit_namecheap_user': 'test-user',
                    'ifrit_namecheap_key': 'test-key',
                    'ifrit_namecheap_username': 'test-username',
                    'ifrit_namecheap_client_ip': '192.168.1.1'
                };
                return values[key] || null;
            });

            const creds = getDNSCredentials('namecheap');

            expect(creds).not.toBeNull();
            expect(creds?.namecheapApiUser).toBe('test-user');
            expect(creds?.namecheapApiKey).toBe('test-key');
        });

        it('should return null for unimplemented providers', () => {
            const creds = getDNSCredentials('godaddy');

            expect(creds).toBeNull();
        });
    });

    describe('saveDNSCredentials()', () => {
        it('should save namecheap credentials', () => {
            saveDNSCredentials({
                provider: 'namecheap',
                namecheapApiUser: 'user',
                namecheapApiKey: 'key',
                namecheapUsername: 'username',
                namecheapClientIp: '1.2.3.4'
            });

            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('ifrit_namecheap_user', 'user');
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('ifrit_namecheap_key', 'key');
        });

        it('should save cloudflare token', () => {
            saveDNSCredentials({
                provider: 'cloudflare',
                cloudflareApiToken: 'cf-token'
            });

            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('ifrit_cloudflare_token', 'cf-token');
        });
    });

    describe('isDNSProviderConfigured()', () => {
        it('should return true when credentials exist', () => {
            mockLocalStorage.getItem.mockImplementation((key: string) => {
                if (key === 'ifrit_namecheap_user') return 'user';
                if (key === 'ifrit_namecheap_key') return 'key';
                return null;
            });

            expect(isDNSProviderConfigured('namecheap')).toBe(true);
        });

        it('should return false when no credentials', () => {
            mockLocalStorage.getItem.mockReturnValue(null);

            expect(isDNSProviderConfigured('namecheap')).toBe(false);
        });
    });

    describe('getConfiguredDNSProvider()', () => {
        it('should return first configured implemented provider', () => {
            mockLocalStorage.getItem.mockImplementation((key: string) => {
                if (key === 'ifrit_namecheap_user') return 'user';
                if (key === 'ifrit_namecheap_key') return 'key';
                return null;
            });

            const provider = getConfiguredDNSProvider();

            expect(provider).toBe('namecheap');
        });

        it('should return null when no provider configured', () => {
            mockLocalStorage.getItem.mockReturnValue(null);

            const provider = getConfiguredDNSProvider();

            expect(provider).toBeNull();
        });
    });
});
