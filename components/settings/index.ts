// Settings components barrel file
export { default as SettingsView } from './SettingsView';
export { AIKeyManager } from './AIKeyManager';
export { AIUsagePanel } from './AIUsagePanel';
export { UsageStatsPanel } from './UsageStatsPanel';

// Section components (new 6-tab structure)
export { AIProvidersSection } from './sections/AIProvidersSection';
export { default as CapabilitiesPanel } from './CapabilitiesPanel';
export { MCPSection } from './sections/MCPSection';
export { IntegrationsSection } from './sections/IntegrationsSection';
export { MonetizationSection } from './sections/MonetizationSection';
export { DataSection } from './sections/DataSection';

// Shared components
export { SettingsCard } from './shared/SettingsCard';
export { ApiKeyInput } from './shared/ApiKeyInput';
export { ConnectionGroup } from './shared/ConnectionGroup';

// Re-export types and functions from SettingsView for backwards compatibility
export {
    getUserSettings,
    getAIProviderKeys,
    getEnabledProviderKeys,
    getEnabledProviders,
    getSelectedModel, // V4: Get selected model per provider
    type UserSettings,
} from './SettingsView';
