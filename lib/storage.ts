/**
 * Type-safe localStorage wrapper with validation
 * Provides auto-persist functionality for Zustand stores
 */

// Storage keys
export const STORAGE_KEYS = {
    HUNT_ANALYZE_QUEUE: 'ifrit_analyze_queue',
    HUNT_PURCHASE_QUEUE: 'ifrit_purchase_queue',
    HUNT_WATCHLIST: 'ifrit_domain_watchlist',
    HUNT_SELECTED: 'ifrit_selected_domains',
    KEYWORD_HISTORY: 'ifrit_keyword_analysis_history',
    FLIP_PROJECTS: 'ifrit_flip_projects',
} as const;

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

/**
 * Get item from localStorage with type safety
 */
export function getStorageItem<T>(key: StorageKey, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;

    try {
        const item = localStorage.getItem(key);
        if (!item) return defaultValue;

        const parsed = JSON.parse(item);

        // Basic validation - ensure it's the same type as default
        if (Array.isArray(defaultValue) && !Array.isArray(parsed)) {
            console.warn(`Storage "${key}" expected array, got ${typeof parsed}`);
            return defaultValue;
        }

        return parsed as T;
    } catch (error) {
        console.error(`Error reading "${key}" from storage:`, error);
        return defaultValue;
    }
}

/**
 * Set item in localStorage with error handling
 */
export function setStorageItem<T>(key: StorageKey, value: T): boolean {
    if (typeof window === 'undefined') return false;

    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`Error writing "${key}" to storage:`, error);
        return false;
    }
}

/**
 * Remove item from localStorage
 */
export function removeStorageItem(key: StorageKey): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
}

/**
 * Zustand middleware for auto-persistence
 * Usage: create(persist((set) => ({...}), { name: 'key' }))
 */
export function createPersistConfig<T>(key: StorageKey) {
    return {
        name: key,
        getStorage: () => localStorage,
        serialize: (state: T) => JSON.stringify(state),
        deserialize: (str: string) => JSON.parse(str) as T,
    };
}
