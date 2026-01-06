/**
 * Capabilities Store
 * FSD: stores/capabilitiesStore.ts
 * 
 * Focused store for AI capabilities configuration:
 * - Capability enable/disable
 * - Default handler assignment
 * - Fallback chains
 * - Custom capabilities
 * 
 * Extracted from settingsStore.ts for better SoC
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

export interface CapabilitySettings {
    isEnabled: boolean;
    defaultHandlerId?: string;
    fallbackHandlerIds?: string[];
    priority?: number;
}

export interface CustomCapability {
    id: string;
    name: string;
    description: string;
    icon?: string;
    isDefault: boolean;
    isEnabled: boolean;
    defaultHandlerId?: string;
}

export interface CapabilityHandler {
    id: string;
    name: string;
    provider: string;
    capabilities: string[];
    isMCP?: boolean;
}

// ============================================================================
// Default Capabilities
// ============================================================================

export const DEFAULT_CAPABILITIES: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
}> = [
        { id: 'research', name: 'Research', description: 'Research topics and gather information', icon: 'search' },
        { id: 'generate', name: 'Generate', description: 'Generate content (articles, text)', icon: 'pen' },
        { id: 'keyword-analyze', name: 'Keyword Analysis', description: 'Analyze keywords for SEO', icon: 'target' },
        { id: 'summarize', name: 'Summarize', description: 'Summarize long content', icon: 'file-text' },
        { id: 'translate', name: 'Translate', description: 'Translate content between languages', icon: 'languages' },
        { id: 'images', name: 'Images', description: 'Generate or find images', icon: 'image' },
        { id: 'reasoning', name: 'Reasoning', description: 'Complex reasoning and analysis', icon: 'brain' },
        { id: 'code', name: 'Code', description: 'Generate or analyze code', icon: 'code' },
    ];

// ============================================================================
// Store Interface
// ============================================================================

interface CapabilitiesStore {
    // State
    capabilitySettings: Record<string, CapabilitySettings>;
    customCapabilities: CustomCapability[];
    preferMCP: boolean;
    autoFallback: boolean;
    verbosity: 'none' | 'basic' | 'standard' | 'verbose';
    logDiagnostics: boolean;

    // Capability Management
    toggleCapability: (id: string) => void;
    enableCapability: (id: string) => void;
    disableCapability: (id: string) => void;
    isCapabilityEnabled: (id: string) => boolean;

    // Handler Assignment
    setDefaultHandler: (capabilityId: string, handlerId: string | undefined) => void;
    getDefaultHandler: (capabilityId: string) => string | undefined;
    setFallbackHandlers: (capabilityId: string, handlerIds: string[]) => void;
    getFallbackHandlers: (capabilityId: string) => string[];

    // Custom Capabilities
    addCustomCapability: (capability: Omit<CustomCapability, 'id' | 'isDefault'>) => string;
    removeCustomCapability: (id: string) => void;
    updateCustomCapability: (id: string, updates: Partial<CustomCapability>) => void;

    // Global Settings
    setPreferMCP: (prefer: boolean) => void;
    setAutoFallback: (auto: boolean) => void;
    setVerbosity: (level: 'none' | 'basic' | 'standard' | 'verbose') => void;
    setLogDiagnostics: (log: boolean) => void;

    // Bulk Operations
    resetToDefaults: () => void;
    getEnabledCapabilities: () => string[];
    getAllCapabilities: () => Array<{ id: string; name: string; description: string; isCustom: boolean; isEnabled: boolean }>;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useCapabilitiesStore = create<CapabilitiesStore>()(
    persist(
        (set, get) => ({
            // ============ State ============
            capabilitySettings: {},
            customCapabilities: [],
            preferMCP: true,
            autoFallback: true,
            verbosity: 'standard',
            logDiagnostics: true,

            // ============ Capability Management ============

            toggleCapability: (id) => set(state => {
                const current = state.capabilitySettings[id] || { isEnabled: true };
                return {
                    capabilitySettings: {
                        ...state.capabilitySettings,
                        [id]: { ...current, isEnabled: !current.isEnabled }
                    }
                };
            }),

            enableCapability: (id) => set(state => ({
                capabilitySettings: {
                    ...state.capabilitySettings,
                    [id]: { ...(state.capabilitySettings[id] || {}), isEnabled: true }
                }
            })),

            disableCapability: (id) => set(state => ({
                capabilitySettings: {
                    ...state.capabilitySettings,
                    [id]: { ...(state.capabilitySettings[id] || {}), isEnabled: false }
                }
            })),

            isCapabilityEnabled: (id) => {
                const settings = get().capabilitySettings[id];
                // Default to enabled if not explicitly set
                return settings?.isEnabled !== false;
            },

            // ============ Handler Assignment ============

            setDefaultHandler: (capabilityId, handlerId) => set(state => ({
                capabilitySettings: {
                    ...state.capabilitySettings,
                    [capabilityId]: {
                        ...(state.capabilitySettings[capabilityId] || { isEnabled: true }),
                        defaultHandlerId: handlerId
                    }
                }
            })),

            getDefaultHandler: (capabilityId) => {
                return get().capabilitySettings[capabilityId]?.defaultHandlerId;
            },

            setFallbackHandlers: (capabilityId, handlerIds) => set(state => ({
                capabilitySettings: {
                    ...state.capabilitySettings,
                    [capabilityId]: {
                        ...(state.capabilitySettings[capabilityId] || { isEnabled: true }),
                        fallbackHandlerIds: handlerIds
                    }
                }
            })),

            getFallbackHandlers: (capabilityId) => {
                return get().capabilitySettings[capabilityId]?.fallbackHandlerIds || [];
            },

            // ============ Custom Capabilities ============

            addCustomCapability: (capability) => {
                const id = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                set(state => ({
                    customCapabilities: [
                        ...state.customCapabilities,
                        { ...capability, id, isDefault: false }
                    ]
                }));
                return id;
            },

            removeCustomCapability: (id) => set(state => ({
                customCapabilities: state.customCapabilities.filter(c => c.id !== id),
                capabilitySettings: Object.fromEntries(
                    Object.entries(state.capabilitySettings).filter(([k]) => k !== id)
                )
            })),

            updateCustomCapability: (id, updates) => set(state => ({
                customCapabilities: state.customCapabilities.map(c =>
                    c.id === id ? { ...c, ...updates } : c
                )
            })),

            // ============ Global Settings ============

            setPreferMCP: (prefer) => set({ preferMCP: prefer }),
            setAutoFallback: (auto) => set({ autoFallback: auto }),
            setVerbosity: (level) => set({ verbosity: level }),
            setLogDiagnostics: (log) => set({ logDiagnostics: log }),

            // ============ Bulk Operations ============

            resetToDefaults: () => set({
                capabilitySettings: {},
                customCapabilities: [],
                preferMCP: true,
                autoFallback: true,
                verbosity: 'standard',
                logDiagnostics: true,
            }),

            getEnabledCapabilities: () => {
                const state = get();
                const defaultIds = DEFAULT_CAPABILITIES.map(c => c.id);
                const customIds = state.customCapabilities.filter(c => c.isEnabled).map(c => c.id);

                return [...defaultIds, ...customIds].filter(id => state.isCapabilityEnabled(id));
            },

            getAllCapabilities: () => {
                const state = get();
                const defaults = DEFAULT_CAPABILITIES.map(c => ({
                    id: c.id,
                    name: c.name,
                    description: c.description,
                    isCustom: false,
                    isEnabled: state.isCapabilityEnabled(c.id),
                }));
                const customs = state.customCapabilities.map(c => ({
                    id: c.id,
                    name: c.name,
                    description: c.description,
                    isCustom: true,
                    isEnabled: c.isEnabled && state.isCapabilityEnabled(c.id),
                }));
                return [...defaults, ...customs];
            },
        }),
        {
            name: 'ifrit_capabilities',
            partialize: (state) => ({
                capabilitySettings: state.capabilitySettings,
                customCapabilities: state.customCapabilities,
                preferMCP: state.preferMCP,
                autoFallback: state.autoFallback,
                verbosity: state.verbosity,
                logDiagnostics: state.logDiagnostics,
            }),
        }
    )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectEnabledCapabilities = (state: CapabilitiesStore) =>
    state.getEnabledCapabilities();

export const selectCapabilitySettings = (capabilityId: string) =>
    (state: CapabilitiesStore) => state.capabilitySettings[capabilityId];
