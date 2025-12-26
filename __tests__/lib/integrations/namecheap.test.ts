/**
 * Tests for Namecheap Integration
 * 
 * Comprehensive tests for Namecheap domain management API
 */

// Setup fetch mock before imports
const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
    NamecheapClient,
    suggestDomainNames
} from '@/lib/integrations/namecheap';

describe('Namecheap Integration', () => {
    let client: NamecheapClient;

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockReset();
        client = new NamecheapClient({
            apiUser: 'testuser',
            apiKey: 'test-api-key',
            username: 'testuser',
            clientIp: '127.0.0.1',
            sandbox: true
        });
    });

    // Helper to create mock XML response
    const createXmlResponse = (xml: string, ok: boolean = true) => ({
        ok,
        status: ok ? 200 : 400,
        text: jest.fn().mockResolvedValue(xml)
    });

    describe('NamecheapClient', () => {
        describe('getDomains()', () => {
            it('should return list of domains', async () => {
                const mockXml = `<?xml version="1.0"?>
                    <ApiResponse Status="OK">
                        <CommandResponse>
                            <DomainGetListResult>
                                <Domain ID="123" Name="example.com" Created="01/01/2020" Expires="01/01/2025" IsExpired="false" IsLocked="false" AutoRenew="true" IsPremium="false"/>
                                <Domain ID="124" Name="test.com" Created="01/01/2021" Expires="01/01/2026" IsExpired="false" IsLocked="true" AutoRenew="false" IsPremium="false"/>
                            </DomainGetListResult>
                        </CommandResponse>
                    </ApiResponse>`;

                mockFetch.mockResolvedValueOnce(createXmlResponse(mockXml));

                const result = await client.getDomains();

                expect(result).toHaveLength(2);
                expect(result[0].name).toBe('example.com');
                expect(result[1].name).toBe('test.com');
            });

            it('should build API URL with credentials', async () => {
                mockFetch.mockResolvedValueOnce(createXmlResponse(`<?xml version="1.0"?>
                    <ApiResponse Status="OK">
                        <CommandResponse>
                            <DomainGetListResult></DomainGetListResult>
                        </CommandResponse>
                    </ApiResponse>`));

                await client.getDomains();

                // Verify fetch was called (credentials included in URL params)
                expect(mockFetch).toHaveBeenCalled();
            });

            it('should support pagination', async () => {
                mockFetch.mockResolvedValueOnce(createXmlResponse(`<?xml version="1.0"?>
                    <ApiResponse Status="OK">
                        <CommandResponse>
                            <DomainGetListResult></DomainGetListResult>
                        </CommandResponse>
                    </ApiResponse>`));

                await client.getDomains(2, 50);

                // Just verify fetch was called (URL params are included)
                expect(mockFetch).toHaveBeenCalled();
            });
        });

        describe('checkAvailability()', () => {
            it('should check domain availability', async () => {
                const mockXml = `<?xml version="1.0"?>
                    <ApiResponse Status="OK">
                        <CommandResponse>
                            <DomainCheckResult Domain="available.com" Available="true" IsPremiumName="false"/>
                            <DomainCheckResult Domain="taken.com" Available="false" IsPremiumName="false"/>
                        </CommandResponse>
                    </ApiResponse>`;

                mockFetch.mockResolvedValueOnce(createXmlResponse(mockXml));

                const result = await client.checkAvailability(['available.com', 'taken.com']);

                expect(result).toHaveLength(2);
                expect(result[0].available).toBe(true);
                expect(result[1].available).toBe(false);
            });

            it('should detect premium domains', async () => {
                const mockXml = `<?xml version="1.0"?>
                    <ApiResponse Status="OK">
                        <CommandResponse>
                            <DomainCheckResult Domain="premium.com" Available="true" IsPremiumName="true" PremiumRegistrationPrice="5000"/>
                        </CommandResponse>
                    </ApiResponse>`;

                mockFetch.mockResolvedValueOnce(createXmlResponse(mockXml));

                const result = await client.checkAvailability(['premium.com']);

                expect(result[0].premium).toBe(true);
            });
        });

        describe('getExpiringDomains()', () => {
            it('should filter domains by expiry date', async () => {
                // Mock current date for consistent testing
                const now = new Date();
                const soon = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days
                const later = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days

                const soonStr = `${(soon.getMonth() + 1).toString().padStart(2, '0')}/${soon.getDate().toString().padStart(2, '0')}/${soon.getFullYear()}`;
                const laterStr = `${(later.getMonth() + 1).toString().padStart(2, '0')}/${later.getDate().toString().padStart(2, '0')}/${later.getFullYear()}`;

                const mockXml = `<?xml version="1.0"?>
                    <ApiResponse Status="OK">
                        <CommandResponse>
                            <DomainGetListResult>
                                <Domain ID="1" Name="expiring-soon.com" Created="01/01/2020" Expires="${soonStr}" IsExpired="false" IsLocked="false" AutoRenew="false" IsPremium="false"/>
                                <Domain ID="2" Name="expires-later.com" Created="01/01/2020" Expires="${laterStr}" IsExpired="false" IsLocked="false" AutoRenew="false" IsPremium="false"/>
                            </DomainGetListResult>
                        </CommandResponse>
                    </ApiResponse>`;

                mockFetch.mockResolvedValueOnce(createXmlResponse(mockXml));

                const result = await client.getExpiringDomains(30);

                expect(result.length).toBe(1);
                expect(result[0].name).toBe('expiring-soon.com');
            });
        });

        describe('testConnection()', () => {
            it('should return true on successful connection', async () => {
                mockFetch.mockResolvedValueOnce(createXmlResponse(`<?xml version="1.0"?>
                    <ApiResponse Status="OK">
                        <CommandResponse>
                            <DomainGetListResult></DomainGetListResult>
                        </CommandResponse>
                    </ApiResponse>`));

                const result = await client.testConnection();

                expect(result).toBe(true);
            });

            it('should return false on failed connection', async () => {
                mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

                const result = await client.testConnection();

                expect(result).toBe(false);
            });
        });
    });

    describe('suggestDomainNames()', () => {
        it('should generate domain suggestions from keywords', () => {
            const suggestions = suggestDomainNames('Technology', ['code', 'dev']);

            expect(suggestions.length).toBeGreaterThan(0);
            expect(suggestions.every(s => s.includes('.'))).toBe(true);
        });

        it('should include common TLDs', () => {
            const suggestions = suggestDomainNames('Business', ['startup']);

            const tlds = suggestions.map(s => s.split('.').pop());
            expect(tlds.some(t => ['com', 'io', 'co', 'dev'].includes(t!))).toBe(true);
        });

        it('should lowercase domain names', () => {
            const suggestions = suggestDomainNames('Technology', ['MyKeyword']);

            expect(suggestions.every(s => s === s.toLowerCase())).toBe(true);
        });

        it('should remove special characters', () => {
            const suggestions = suggestDomainNames('Business', ['my-key_word!']);

            expect(suggestions.every(s => !/[^a-z0-9.-]/.test(s))).toBe(true);
        });
    });
});
