/**
 * Tests for MCP Client
 * 
 * Tests MCP tool execution and Brave search functionality
 */

// Mock localStorage before imports
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

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
    isMCPServerEnabled,
    getMCPApiKey,
    executeMCPTool,
    braveWebSearch,
    isBraveSearchAvailable
} from '@/lib/mcp/client';

describe('MCP Client', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLocalStorage.clear();
        mockFetch.mockReset();
    });

    describe('isMCPServerEnabled()', () => {
        it('should return false when no servers enabled', () => {
            expect(isMCPServerEnabled('brave-search')).toBe(false);
        });

        it('should return true when server is in enabled list', () => {
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(['brave-search', 'file-server']));

            expect(isMCPServerEnabled('brave-search')).toBe(true);
        });

        it('should return false when server is not in enabled list', () => {
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(['file-server']));

            expect(isMCPServerEnabled('brave-search')).toBe(false);
        });

        it('should handle invalid JSON gracefully', () => {
            mockLocalStorage.getItem.mockReturnValue('invalid json');

            expect(isMCPServerEnabled('brave-search')).toBe(false);
        });
    });

    describe('getMCPApiKey()', () => {
        it('should return undefined when no keys stored', () => {
            expect(getMCPApiKey('brave-search')).toBeUndefined();
        });

        it('should return API key for server', () => {
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
                'brave-search': 'test-api-key-123'
            }));

            expect(getMCPApiKey('brave-search')).toBe('test-api-key-123');
        });

        it('should return undefined for unknown server', () => {
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
                'brave-search': 'test-key'
            }));

            expect(getMCPApiKey('unknown-server')).toBeUndefined();
        });
    });

    describe('executeMCPTool()', () => {
        it('should return error when Brave has no API key', async () => {
            mockLocalStorage.getItem.mockReturnValue(null);

            const result = await executeMCPTool('brave-search', 'brave_web_search', { query: 'test' });

            expect(result.success).toBe(false);
            expect(result.error).toContain('API key not configured');
        });

        it('should call API with correct parameters', async () => {
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
                'brave-search': 'test-key'
            }));
            mockFetch.mockResolvedValue({
                json: () => Promise.resolve({ success: true, result: {} })
            });

            await executeMCPTool('brave-search', 'brave_web_search', { query: 'test' });

            expect(mockFetch).toHaveBeenCalledWith('/api/mcp/execute', expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }));
        });

        it('should return API response', async () => {
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
                'brave-search': 'test-key'
            }));
            mockFetch.mockResolvedValue({
                json: () => Promise.resolve({
                    success: true,
                    result: [{ type: 'text', text: 'Results here' }]
                })
            });

            const result = await executeMCPTool('brave-search', 'brave_web_search', { query: 'test' });

            expect(result.success).toBe(true);
        });

        it('should handle fetch errors', async () => {
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
                'test-server': 'test-key'
            }));
            mockFetch.mockRejectedValue(new Error('Network error'));

            const result = await executeMCPTool('test-server', 'some_tool', {});

            expect(result.success).toBe(false);
            expect(result.error).toBe('Network error');
        });
    });

    describe('braveWebSearch()', () => {
        it('should return error when no API key', async () => {
            mockLocalStorage.getItem.mockReturnValue(null);

            const result = await braveWebSearch('test query');

            expect(result.success).toBe(false);
            expect(result.error).toContain('API key not configured');
        });

        it('should parse search results correctly', async () => {
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
                'brave-search': 'test-key'
            }));
            mockFetch.mockResolvedValue({
                json: () => Promise.resolve({
                    success: true,
                    result: [{
                        type: 'text',
                        text: JSON.stringify({
                            web: {
                                results: [
                                    { title: 'Result 1', url: 'https://example.com/1', description: 'Desc 1' },
                                    { title: 'Result 2', url: 'https://example.com/2', description: 'Desc 2' }
                                ]
                            }
                        })
                    }]
                })
            });

            const result = await braveWebSearch('test query', 10);

            expect(result.success).toBe(true);
            expect(result.results).toHaveLength(2);
            expect(result.results![0].title).toBe('Result 1');
        });

        it('should handle single result format', async () => {
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
                'brave-search': 'test-key'
            }));
            mockFetch.mockResolvedValue({
                json: () => Promise.resolve({
                    success: true,
                    result: [{
                        type: 'text',
                        text: JSON.stringify({
                            title: 'Single Result',
                            url: 'https://single.com',
                            description: 'Single desc'
                        })
                    }]
                })
            });

            const result = await braveWebSearch('test');

            expect(result.success).toBe(true);
            expect(result.results).toHaveLength(1);
        });
    });

    describe('isBraveSearchAvailable()', () => {
        it('should return false when no API key', () => {
            mockLocalStorage.getItem.mockReturnValue(null);

            expect(isBraveSearchAvailable()).toBe(false);
        });

        it('should return true when API key exists', () => {
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
                'brave-search': 'test-key'
            }));

            expect(isBraveSearchAvailable()).toBe(true);
        });
    });
});
