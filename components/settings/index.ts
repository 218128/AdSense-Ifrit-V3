// Settings components barrel file
export { default as SettingsView } from './SettingsView';
export { AIKeyManager } from './AIKeyManager';

// Re-export types and functions from SettingsView for backwards compatibility
export {
    getUserSettings,
    getAIProviderKeys,
    getEnabledProviderKeys,
    getEnabledProviders,
    type UserSettings,
} from './SettingsView';
