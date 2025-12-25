/**
 * Configuration Module - Public API
 * 
 * Enterprise Configuration Hub providing:
 * - Validation (Zod schemas)
 * - Health Monitoring
 * - AI-Agent SDK
 */

// Validation
export {
    validate,
    validateStoredKey,
    isValidApiKeyFormat,
    isValidAdsensePublisherId,
    isValidGitHubToken,
    isValidVercelToken,
    StoredKeySchema,
    AdsenseConfigSchema,
    IntegrationsSchema,
    MCPServerConfigSchema,
    ProviderIdSchema,
    type ValidationResult,
    type ValidationError,
} from './schemas';

// Health Monitoring
export {
    checkProviderHealth,
    checkGitHubHealth,
    checkVercelHealth,
    checkMCPHealth,
    calculateOverallHealth,
    getHealthColor,
    getHealthIcon,
    type ServiceHealth,
    type HealthStatus,
    type HealthCheckResult,
} from './healthMonitor';

// SDK
export {
    configSDK,
    getAvailableProviders,
    getConfiguredProviders,
    getConfiguredIntegrations,
    isProviderConfigured,
    isIntegrationConfigured,
    getMissingConfig,
    checkAllHealth,
    getOverallHealth,
    describeConfig,
    type ConfigSDK,
    type ConfigDescription,
} from './sdk';
