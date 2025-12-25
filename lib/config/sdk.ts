/**
 * Configuration SDK - AI-Agent Friendly API
 * 
 * Provides a typed, self-documenting interface for AI agents
 * to query and understand application configuration.
 * 
 * Part of the Enterprise Configuration Hub.
 */

import { useSettingsStore } from '@/stores/settingsStore';
import type { ProviderId, StoredKey, IntegrationConfig, AdsenseConfig } from '@/stores/settingsStore';
import {
    checkProviderHealth,
    checkGitHubHealth,
    checkVercelHealth,
    calculateOverallHealth,
    type ServiceHealth,
    type HealthStatus
} from './healthMonitor';

// ============ SDK INTERFACE ============

export interface ConfigSDK {
    // Introspection
    getAvailableProviders: () => ProviderId[];
    getConfiguredProviders: () => ProviderId[];
    getConfiguredIntegrations: () => (keyof IntegrationConfig)[];

    // Status
    isProviderConfigured: (providerId: ProviderId) => boolean;
    isIntegrationConfigured: (key: keyof IntegrationConfig) => boolean;
    getMissingConfig: () => string[];

    // Health
    checkProviderHealth: (providerId: ProviderId) => Promise<ServiceHealth>;
    checkAllHealth: () => Promise<Record<string, ServiceHealth>>;
    getOverallHealth: () => HealthStatus;

    // AI-friendly descriptions
    describeConfig: () => ConfigDescription;
}

export interface ConfigDescription {
    providers: {
        id: ProviderId;
        configured: boolean;
        keyCount: number;
        enabled: boolean;
        selectedModel?: string;
    }[];
    integrations: {
        key: keyof IntegrationConfig;
        configured: boolean;
    }[];
    adsense: {
        configured: boolean;
        publisherId?: string;
    };
    mcp: {
        enabledServers: string[];
        configuredServers: string[];
    };
}

// ============ SDK IMPLEMENTATION ============

/**
 * Get list of all supported AI providers
 */
export function getAvailableProviders(): ProviderId[] {
    return ['gemini', 'deepseek', 'openrouter', 'vercel', 'perplexity'];
}

/**
 * Get list of providers that have at least one API key configured
 */
export function getConfiguredProviders(): ProviderId[] {
    const state = useSettingsStore.getState();
    return getAvailableProviders().filter(
        (provider) => (state.providerKeys[provider]?.length || 0) > 0
    );
}

/**
 * Get list of integrations that are configured
 */
export function getConfiguredIntegrations(): (keyof IntegrationConfig)[] {
    const { integrations } = useSettingsStore.getState();
    return (Object.keys(integrations) as (keyof IntegrationConfig)[]).filter(
        (key) => !!integrations[key]
    );
}

/**
 * Check if a specific provider is configured
 */
export function isProviderConfigured(providerId: ProviderId): boolean {
    const state = useSettingsStore.getState();
    return (state.providerKeys[providerId]?.length || 0) > 0;
}

/**
 * Check if a specific integration is configured
 */
export function isIntegrationConfigured(key: keyof IntegrationConfig): boolean {
    const { integrations } = useSettingsStore.getState();
    return !!integrations[key];
}

/**
 * Get list of missing required configuration
 */
export function getMissingConfig(): string[] {
    const missing: string[] = [];
    const state = useSettingsStore.getState();

    // Check for at least one AI provider
    if (getConfiguredProviders().length === 0) {
        missing.push('ai-provider-key');
    }

    // Check critical integrations
    if (!state.integrations.githubToken) {
        missing.push('github-token');
    }

    return missing;
}

/**
 * Check health of a specific provider
 */
export async function checkProviderHealthSDK(providerId: ProviderId): Promise<ServiceHealth> {
    const state = useSettingsStore.getState();
    const keys = state.providerKeys[providerId] || [];
    const firstKey = keys[0]?.key || '';

    const health = await checkProviderHealth(providerId, firstKey);
    state.setHealthStatus(`provider:${providerId}`, health);

    return health;
}

/**
 * Check health of all configured services
 */
export async function checkAllHealth(): Promise<Record<string, ServiceHealth>> {
    const state = useSettingsStore.getState();
    const results: Record<string, ServiceHealth> = {};

    // Check configured providers
    for (const providerId of getConfiguredProviders()) {
        const keys = state.providerKeys[providerId] || [];
        const firstKey = keys[0]?.key || '';
        results[`provider:${providerId}`] = await checkProviderHealth(providerId, firstKey);
    }

    // Check integrations
    if (state.integrations.githubToken) {
        results['integration:github'] = await checkGitHubHealth(state.integrations.githubToken);
    }
    if (state.integrations.vercelToken) {
        results['integration:vercel'] = await checkVercelHealth(state.integrations.vercelToken);
    }

    // Update store
    for (const [serviceId, health] of Object.entries(results)) {
        state.setHealthStatus(serviceId, health);
    }

    return results;
}

/**
 * Get overall health status from cached results
 */
export function getOverallHealth(): HealthStatus {
    const { healthStatus } = useSettingsStore.getState();
    return calculateOverallHealth(healthStatus);
}

/**
 * Get a full description of current configuration (AI-friendly)
 */
export function describeConfig(): ConfigDescription {
    const state = useSettingsStore.getState();

    return {
        providers: getAvailableProviders().map((id) => ({
            id,
            configured: (state.providerKeys[id]?.length || 0) > 0,
            keyCount: state.providerKeys[id]?.length || 0,
            enabled: state.enabledProviders.includes(id),
            selectedModel: state.selectedModels[id],
        })),
        integrations: (Object.keys(state.integrations) as (keyof IntegrationConfig)[]).map((key) => ({
            key,
            configured: !!state.integrations[key],
        })),
        adsense: {
            configured: !!state.adsenseConfig.publisherId,
            publisherId: state.adsenseConfig.publisherId || undefined,
        },
        mcp: {
            enabledServers: state.mcpServers.enabled,
            configuredServers: Object.keys(state.mcpServers.apiKeys),
        },
    };
}

// ============ EXPORTED SDK OBJECT ============

export const configSDK: ConfigSDK = {
    getAvailableProviders,
    getConfiguredProviders,
    getConfiguredIntegrations,
    isProviderConfigured,
    isIntegrationConfigured,
    getMissingConfig,
    checkProviderHealth: checkProviderHealthSDK,
    checkAllHealth,
    getOverallHealth,
    describeConfig,
};

export default configSDK;
