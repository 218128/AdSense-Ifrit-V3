/**
 * Tests for MCP Tool Mapper
 * 
 * Tests capability inference and tool mapping
 */

// Mock localStorage
const mockLocalStorage = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
        clear: jest.fn(() => { store = {}; })
    };
})();

Object.defineProperty(global, 'localStorage', { value: mockLocalStorage });

import {
    inferCapabilities,
    getCustomMappings,
    setCustomMapping,
    getCapabilitiesForTool
} from '@/lib/mcp/toolMapper';

describe('MCP Tool Mapper', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLocalStorage.clear();
    });

    describe('inferCapabilities()', () => {
        it('should map brave_web_search to research capability', () => {
            const caps = inferCapabilities('brave_web_search', 'Search the web');

            expect(caps).toContain('research');
        });

        it('should map read_file to analyze capability', () => {
            const caps = inferCapabilities('read_file', 'Read file contents');

            expect(caps).toContain('analyze');
        });

        it('should map write_file to code capability', () => {
            const caps = inferCapabilities('write_file', 'Write to file');

            expect(caps).toContain('code');
        });

        it('should infer search from description', () => {
            const caps = inferCapabilities('custom_tool', 'Search for information on the web');

            expect(caps).toContain('research');
        });

        it('should infer generate from tool name containing code', () => {
            const caps = inferCapabilities('code_runner', 'Execute script');

            expect(caps).toContain('generate');
        });

        it('should infer research from description containing search', () => {
            const caps = inferCapabilities('optimizer', 'Search for optimization opportunities');

            expect(caps).toContain('research');
        });

        it('should return generate capability for unknown tools', () => {
            const caps = inferCapabilities('unknown_tool', 'Does something');

            expect(caps).toContain('generate');
        });
    });

    describe('getCustomMappings()', () => {
        it('should return empty object when no mappings stored', () => {
            const mappings = getCustomMappings();

            expect(mappings).toEqual({});
        });

        it('should return stored mappings', () => {
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
                'my_tool': ['research', 'analyze']
            }));

            const mappings = getCustomMappings();

            expect(mappings['my_tool']).toEqual(['research', 'analyze']);
        });
    });

    describe('setCustomMapping()', () => {
        it('should save custom mapping', () => {
            mockLocalStorage.getItem.mockReturnValue(null);

            setCustomMapping('my_tool', ['research', 'seo']);

            expect(mockLocalStorage.setItem).toHaveBeenCalled();
            const savedValue = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
            expect(savedValue['my_tool']).toEqual(['research', 'seo']);
        });

        it('should merge with existing mappings', () => {
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
                'existing_tool': ['code']
            }));

            setCustomMapping('new_tool', ['analyze']);

            // Check that both mappings are preserved
            const savedValue = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
            expect(savedValue['existing_tool']).toEqual(['code']);
            expect(savedValue['new_tool']).toEqual(['analyze']);
        });
    });

    describe('getCapabilitiesForTool()', () => {
        it('should prefer custom mapping over inferred', () => {
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
                'brave_web_search': ['custom_capability']
            }));

            const caps = getCapabilitiesForTool('brave_web_search', 'Search the web');

            expect(caps).toEqual(['custom_capability']);
        });

        it('should fall back to inferred capabilities', () => {
            mockLocalStorage.getItem.mockReturnValue(null);

            const caps = getCapabilitiesForTool('brave_web_search', 'Search the web');

            expect(caps).toContain('research');
        });
    });
});
