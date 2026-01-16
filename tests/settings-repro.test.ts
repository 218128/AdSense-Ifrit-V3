import { useSettingsStore } from '@/stores/settingsStore';

describe('Settings Store Export/Import Logic (v4 - Profile Format)', () => {
    beforeEach(() => {
        // Reset store before each test
        useSettingsStore.setState({
            providerKeys: {
                gemini: [],
                deepseek: [],
                openrouter: [],
                vercel: [],
                perplexity: [],
            },
            enabledProviders: ['gemini'],
            selectedModels: {},
            handlerModels: {},
            integrations: {
                githubToken: '',
                githubUser: '',
                vercelToken: '',
                vercelUser: '',
                spamzillaKey: '',
                namecheapUser: '',
                namecheapKey: '',
                namecheapUsername: '',
                namecheapClientIp: '',
                cloudflareToken: '',
                godaddyKey: '',
                godaddySecret: '',
                unsplashKey: '',
                pexelsKey: '',
                braveApiKey: '',
                umamiId: '',
                umamiApiUrl: '',
                umamiApiKey: '',
                devtoKey: '',
                youtubeApiKey: '',
                twitterBearerToken: '',
                ga4MeasurementId: '',
                ga4ApiSecret: '',
                factCheckApiKey: ''
            },
            adsenseConfig: {
                publisherId: '',
                leaderboardSlot: '',
                articleSlot: '',
                multiplexSlot: '',
            },
            blogUrl: '',
            mcpServers: { enabled: [], apiKeys: {} },
            capabilitiesConfig: {
                customCapabilities: [],
                capabilitySettings: {},
                preferMCP: true,
                autoFallback: true,
                verbosity: 'standard',
                logDiagnostics: true,
            }
        });
    });

    it('should export entire profile as nested object (not flat KV)', () => {
        const store = useSettingsStore.getState();

        // Set various config values
        store.setIntegration('ga4MeasurementId', 'G-TEST-12345');
        store.setIntegration('githubToken', 'ghp_test_token');
        store.setIntegration('factCheckApiKey', 'FC-KEY-123');

        // Export
        const exportData = store.exportSettings();

        // Verify v4 format
        expect(exportData.version).toBe('4.0.0');
        expect(exportData.profile).toBeDefined();
        expect(exportData.settings).toBeUndefined(); // Old format should NOT exist

        // Verify profile contains nested objects (not flat keys)
        expect(exportData.profile?.integrations.ga4MeasurementId).toBe('G-TEST-12345');
        expect(exportData.profile?.integrations.githubToken).toBe('ghp_test_token');
        expect(exportData.profile?.integrations.factCheckApiKey).toBe('FC-KEY-123');
    });

    it('should export ALL fields even if empty', () => {
        const store = useSettingsStore.getState();
        const exportData = store.exportSettings();

        // Even with empty config, ALL fields should be present
        expect(exportData.profile?.integrations).toHaveProperty('ga4MeasurementId');
        expect(exportData.profile?.integrations).toHaveProperty('factCheckApiKey');
        expect(exportData.profile?.integrations).toHaveProperty('unsplashKey');
        expect(exportData.profile?.adsenseConfig).toHaveProperty('publisherId');
        expect(exportData.profile?.mcpServers).toHaveProperty('enabled');
    });

    it('should import v4 profile format correctly', () => {
        const store = useSettingsStore.getState();

        // Create v4 import data
        const importData = {
            version: '4.0.0',
            exportedAt: new Date().toISOString(),
            app: 'AdSense Ifrit V3',
            profile: {
                providerKeys: { gemini: [], deepseek: [], openrouter: [], vercel: [], perplexity: [] },
                enabledProviders: ['gemini', 'deepseek'],
                selectedModels: { gemini: 'gemini-3-flash-preview' },
                handlerModels: {},
                integrations: {
                    githubToken: 'imported-github-token',
                    ga4MeasurementId: 'G-IMPORTED-123',
                    factCheckApiKey: 'FC-IMPORTED-KEY',
                    // ... other fields with defaults
                    githubUser: '', vercelToken: '', vercelUser: '',
                    spamzillaKey: '', namecheapUser: '', namecheapKey: '',
                    namecheapUsername: '', namecheapClientIp: '', cloudflareToken: '',
                    godaddyKey: '', godaddySecret: '', unsplashKey: '', pexelsKey: '',
                    braveApiKey: '', umamiId: '', umamiApiUrl: '', umamiApiKey: '',
                    devtoKey: '', youtubeApiKey: '', twitterBearerToken: '', ga4ApiSecret: '',
                },
                adsenseConfig: { publisherId: 'pub-123', leaderboardSlot: '', articleSlot: '', multiplexSlot: '' },
                blogUrl: 'https://example.com',
                mcpServers: { enabled: ['github-mcp'], apiKeys: { 'github-mcp': 'ghp_key' } },
                capabilitiesConfig: {
                    customCapabilities: [],
                    capabilitySettings: {},
                    preferMCP: false, // Changed
                    autoFallback: true,
                    verbosity: 'verbose',
                    logDiagnostics: true,
                }
            }
        };

        // Import
        // @ts-ignore - simplified profile for test
        const result = store.importSettings(importData);
        expect(result.success).toBe(true);

        // Verify state was restored
        const state = useSettingsStore.getState();
        expect(state.integrations.githubToken).toBe('imported-github-token');
        expect(state.integrations.ga4MeasurementId).toBe('G-IMPORTED-123');
        expect(state.enabledProviders).toContain('deepseek');
        expect(state.blogUrl).toBe('https://example.com');
        expect(state.capabilitiesConfig.preferMCP).toBe(false);
    });

    it('should handle legacy v3 format via legacyImport', () => {
        const store = useSettingsStore.getState();

        // Create legacy flat KV format
        const legacyData = {
            version: '3.1.0',
            exportedAt: new Date().toISOString(),
            app: 'AdSense Ifrit V3',
            settings: {
                'ifrit_github_token': 'legacy-github-token',
                'ifrit_ga4_measurement_id': 'G-LEGACY-123',
                'ifrit_gemini_keys': JSON.stringify([{ key: 'AIza-legacy', label: 'Legacy Key' }]),
                'ifrit_gemini_enabled': 'true',
            }
        };

        // Import legacy
        const result = store.importSettings(legacyData);
        expect(result.success).toBe(true);

        // Verify legacy format was handled
        const state = useSettingsStore.getState();
        expect(state.integrations.githubToken).toBe('legacy-github-token');
        expect(state.integrations.ga4MeasurementId).toBe('G-LEGACY-123');
    });
});
