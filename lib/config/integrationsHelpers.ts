/**
 * Integrations Helpers
 * Provides convenience functions for working with integrations from settingsStore
 * 
 * This bridges the gap between the old integrationsStore API and settingsStore
 */

import { useSettingsStore, type IntegrationConfig } from '@/stores/settingsStore';
import { INTEGRATIONS, type IntegrationMeta, type IntegrationCategory, type IntegrationField } from './integrationConfigs';

// Re-export types and constants
export { INTEGRATIONS, type IntegrationMeta, type IntegrationCategory, type IntegrationField };

// ============================================================================
// Integrations Hook (wraps settingsStore)
// ============================================================================

export function useIntegrations() {
    const { integrations, setIntegration } = useSettingsStore();

    // ============ Token Management ============

    const getToken = (key: string): string => {
        // Map integration field keys to settingsStore.integrations fields
        return (integrations as Record<string, string>)[key] || '';
    };

    const setToken = (key: string, value: string) => {
        // Only set if it's a valid IntegrationConfig key
        if (key in integrations) {
            setIntegration(key as keyof IntegrationConfig, value);
        }
    };

    const hasToken = (key: string): boolean => {
        const token = getToken(key);
        return !!token && token.length > 0;
    };

    // ============ Integration Helpers ============

    const getIntegrationTokens = (integrationId: string): Record<string, string> => {
        const integration = INTEGRATIONS.find(i => i.id === integrationId);
        if (!integration) return {};

        const tokens: Record<string, string> = {};
        for (const field of integration.fields) {
            tokens[field.key] = getToken(field.key);
        }
        return tokens;
    };

    const isIntegrationConfigured = (integrationId: string): boolean => {
        const integration = INTEGRATIONS.find(i => i.id === integrationId);
        if (!integration) return false;

        const requiredFields = integration.fields.filter(f => f.required);
        return requiredFields.every(f => hasToken(f.key));
    };

    const getConfiguredIntegrations = (): string[] => {
        return INTEGRATIONS
            .filter(i => isIntegrationConfigured(i.id))
            .map(i => i.id);
    };

    const getIntegrationsByCategory = (category: IntegrationCategory): IntegrationMeta[] => {
        return INTEGRATIONS.filter(i => i.category === category);
    };

    return {
        // Raw integrations object (for direct access if needed)
        integrations,

        // Token Management
        getToken,
        setToken,
        hasToken,

        // Integration Helpers
        getIntegrationTokens,
        isIntegrationConfigured,
        getConfiguredIntegrations,
        getIntegrationsByCategory,
    };
}
