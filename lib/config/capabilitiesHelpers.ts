/**
 * Capabilities Helpers
 * Provides convenience functions for working with capabilities from settingsStore
 * 
 * This bridges the gap between the old capabilitiesStore API and settingsStore
 */

import { useSettingsStore, type CapabilitySettings } from '@/stores/settingsStore';

// ============================================================================
// Default Capabilities
// ============================================================================

export const DEFAULT_CAPABILITIES: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
}> = [
        // Core Content Capabilities
        { id: 'research', name: 'Research', description: 'Research topics and gather information', icon: 'search' },
        { id: 'generate', name: 'Generate', description: 'Generate content (articles, text)', icon: 'pen' },
        { id: 'keyword-analyze', name: 'Keyword Analysis', description: 'Analyze keywords for SEO', icon: 'target' },
        { id: 'summarize', name: 'Summarize', description: 'Summarize long content', icon: 'file-text' },
        { id: 'translate', name: 'Translate', description: 'Translate content between languages', icon: 'languages' },
        { id: 'images', name: 'Images', description: 'Generate or find images', icon: 'image' },
        { id: 'reasoning', name: 'Reasoning', description: 'Complex reasoning and analysis', icon: 'brain' },
        { id: 'code', name: 'Code', description: 'Generate or analyze code', icon: 'code' },

        // E-E-A-T & Quality Capabilities
        { id: 'eeat-scoring', name: 'E-E-A-T Scoring', description: 'Score content for Experience, Expertise, Authority, Trust', icon: 'shield-check' },
        { id: 'fact-check', name: 'Fact Check', description: 'Verify claims and citations', icon: 'check-circle' },
        { id: 'quality-review', name: 'Quality Review', description: 'Auto-review content quality', icon: 'star' },

        // SEO Capabilities
        { id: 'seo-optimize', name: 'SEO Optimize', description: 'Optimize content for search engines', icon: 'trending-up' },
        { id: 'schema-generate', name: 'Schema Generate', description: 'Generate structured data/schema markup', icon: 'database' },
        { id: 'internal-link', name: 'Internal Linking', description: 'Suggest and add internal links', icon: 'link' },

        // Publishing Capabilities
        { id: 'wp-publish', name: 'WP Publish', description: 'Publish content to WordPress', icon: 'upload' },
        { id: 'author-match', name: 'Author Match', description: 'Match content to appropriate author', icon: 'user-check' },
        { id: 'campaign-run', name: 'Campaign Run', description: 'Execute content campaigns', icon: 'play' },
    ];

// ============================================================================
// Capabilities Hook (wraps settingsStore)
// ============================================================================

export function useCapabilities() {
    const {
        capabilitiesConfig,
        setCapabilitiesConfig,
        setCapabilitySetting,
    } = useSettingsStore();

    const { capabilitySettings, preferMCP, autoFallback, verbosity, logDiagnostics } = capabilitiesConfig;
    // NOTE: customCapabilities was purged - feature was never used

    // ============ Capability Management ============

    const isCapabilityEnabled = (id: string): boolean => {
        const settings = capabilitySettings[id];
        return settings?.isEnabled !== false; // Default to enabled
    };

    const toggleCapability = (id: string) => {
        const current = capabilitySettings[id] || { isEnabled: true };
        setCapabilitySetting(id, { isEnabled: !current.isEnabled });
    };

    // ============ Handler Assignment ============

    const getDefaultHandler = (capabilityId: string): string | undefined => {
        return capabilitySettings[capabilityId]?.defaultHandlerId;
    };

    const setDefaultHandler = (capabilityId: string, handlerId: string | undefined) => {
        setCapabilitySetting(capabilityId, { defaultHandlerId: handlerId });
    };

    const getFallbackHandlers = (capabilityId: string): string[] => {
        return capabilitySettings[capabilityId]?.fallbackHandlerIds || [];
    };

    // ============ Global Settings ============

    const setPreferMCP = (prefer: boolean) => {
        setCapabilitiesConfig({ preferMCP: prefer });
    };

    const setAutoFallback = (auto: boolean) => {
        setCapabilitiesConfig({ autoFallback: auto });
    };

    const setVerbosity = (level: 'none' | 'basic' | 'standard' | 'verbose') => {
        setCapabilitiesConfig({ verbosity: level });
    };

    const setLogDiagnostics = (log: boolean) => {
        setCapabilitiesConfig({ logDiagnostics: log });
    };

    // ============ Bulk Operations ============

    const getEnabledCapabilities = (): string[] => {
        const defaultIds = DEFAULT_CAPABILITIES.map(c => c.id);
        return defaultIds.filter(id => isCapabilityEnabled(id));
    };

    const getAllCapabilities = (): Array<{ id: string; name: string; description: string; isCustom: boolean; isEnabled: boolean }> => {
        return DEFAULT_CAPABILITIES.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description,
            isCustom: false,
            isEnabled: isCapabilityEnabled(c.id),
        }));
    };

    return {
        // State
        capabilitySettings,
        preferMCP,
        autoFallback,
        verbosity,
        logDiagnostics,

        // Capability Management
        isCapabilityEnabled,
        toggleCapability,

        // Handler Assignment
        getDefaultHandler,
        setDefaultHandler,
        getFallbackHandlers,

        // Global Settings
        setPreferMCP,
        setAutoFallback,
        setVerbosity,
        setLogDiagnostics,

        // Bulk Operations
        getEnabledCapabilities,
        getAllCapabilities,
    };
}
