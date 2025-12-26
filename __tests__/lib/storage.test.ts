/**
 * Tests for Storage Utilities
 * 
 * Tests type-safe localStorage wrapper
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
    STORAGE_KEYS,
    getStorageItem,
    setStorageItem,
    removeStorageItem,
    createPersistConfig
} from '@/lib/storage';

describe('Storage Utilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLocalStorage.clear();
    });

    describe('STORAGE_KEYS', () => {
        it('should define hunt analyze queue key', () => {
            expect(STORAGE_KEYS.HUNT_ANALYZE_QUEUE).toBe('ifrit_analyze_queue');
        });

        it('should define all required keys', () => {
            expect(STORAGE_KEYS.HUNT_PURCHASE_QUEUE).toBeDefined();
            expect(STORAGE_KEYS.HUNT_WATCHLIST).toBeDefined();
            expect(STORAGE_KEYS.HUNT_SELECTED).toBeDefined();
            expect(STORAGE_KEYS.KEYWORD_HISTORY).toBeDefined();
            expect(STORAGE_KEYS.FLIP_PROJECTS).toBeDefined();
        });
    });

    describe('getStorageItem()', () => {
        it('should return default value when key not found', () => {
            mockLocalStorage.getItem.mockReturnValue(null);

            const result = getStorageItem(STORAGE_KEYS.HUNT_ANALYZE_QUEUE, []);

            expect(result).toEqual([]);
        });

        it('should parse and return stored JSON', () => {
            const storedData = [{ id: 1, name: 'test' }];
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData));

            const result = getStorageItem(STORAGE_KEYS.HUNT_WATCHLIST, []);

            expect(result).toEqual(storedData);
        });

        it('should return default when type mismatch (expected array, got object)', () => {
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ not: 'array' }));

            const result = getStorageItem(STORAGE_KEYS.HUNT_ANALYZE_QUEUE, []);

            expect(result).toEqual([]);
        });

        it('should return default on JSON parse error', () => {
            mockLocalStorage.getItem.mockReturnValue('invalid json {{{');

            const result = getStorageItem(STORAGE_KEYS.HUNT_WATCHLIST, []);

            expect(result).toEqual([]);
        });
    });

    describe('setStorageItem()', () => {
        it('should store JSON-serialized value', () => {
            const data = [{ id: 1 }, { id: 2 }];

            const success = setStorageItem(STORAGE_KEYS.HUNT_WATCHLIST, data);

            expect(success).toBe(true);
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                STORAGE_KEYS.HUNT_WATCHLIST,
                JSON.stringify(data)
            );
        });

        it('should handle storage errors gracefully', () => {
            mockLocalStorage.setItem.mockImplementation(() => {
                throw new Error('Storage full');
            });

            const success = setStorageItem(STORAGE_KEYS.HUNT_ANALYZE_QUEUE, []);

            expect(success).toBe(false);
        });
    });

    describe('removeStorageItem()', () => {
        it('should call localStorage.removeItem', () => {
            removeStorageItem(STORAGE_KEYS.HUNT_SELECTED);

            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.HUNT_SELECTED);
        });
    });

    describe('createPersistConfig()', () => {
        it('should create config with correct name', () => {
            const config = createPersistConfig(STORAGE_KEYS.FLIP_PROJECTS);

            expect(config.name).toBe(STORAGE_KEYS.FLIP_PROJECTS);
        });

        it('should serialize object to JSON', () => {
            const config = createPersistConfig(STORAGE_KEYS.KEYWORD_HISTORY);
            const data = { items: [1, 2, 3] };

            const serialized = config.serialize(data);

            expect(serialized).toBe(JSON.stringify(data));
        });

        it('should deserialize JSON to object', () => {
            const config = createPersistConfig(STORAGE_KEYS.HUNT_WATCHLIST);
            const json = '{"items":[1,2,3]}';

            const deserialized = config.deserialize(json);

            expect(deserialized).toEqual({ items: [1, 2, 3] });
        });
    });
});
