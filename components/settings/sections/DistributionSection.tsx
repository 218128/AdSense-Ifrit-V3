'use client';

/**
 * Distribution Section
 * FSD: components/settings/sections/DistributionSection.tsx
 * 
 * Configuration for distribution channels:
 * - Newsletter providers (ConvertKit, Mailchimp, Buttondown)
 * - Syndication platforms (Medium, Dev.to, Hashnode)
 * - AdSense OAuth (for live revenue data)
 */

import { useState, useCallback } from 'react';
import {
    ChevronDown, ChevronRight, Mail, Share2, DollarSign,
    Check, AlertCircle, Eye, EyeOff, Loader2, ExternalLink
} from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import type { NewsletterProvider, SyndicationPlatform } from '@/stores/settingsStore';

// ============================================================================
// Types
// ============================================================================

interface ProviderConfig {
    id: NewsletterProvider;
    name: string;
    description: string;
    docsUrl: string;
    fields: { key: string; label: string; placeholder: string; required?: boolean }[];
}

interface PlatformConfig {
    id: SyndicationPlatform;
    name: string;
    description: string;
    docsUrl: string;
    fields: { key: 'apiKey' | 'publicationId' | 'username'; label: string; placeholder: string; required?: boolean }[];
}

// ============================================================================
// Configuration
// ============================================================================

const NEWSLETTER_PROVIDERS: ProviderConfig[] = [
    {
        id: 'convertkit',
        name: 'ConvertKit',
        description: 'Creator-focused email marketing',
        docsUrl: 'https://developers.convertkit.com/',
        fields: [
            { key: 'apiKey', label: 'API Secret', placeholder: 'ck_...', required: true },
            { key: 'listId', label: 'Form ID', placeholder: '123456' },
        ],
    },
    {
        id: 'mailchimp',
        name: 'Mailchimp',
        description: 'All-in-one marketing platform',
        docsUrl: 'https://mailchimp.com/developer/',
        fields: [
            { key: 'apiKey', label: 'API Key', placeholder: 'xxxxxxxx-us1', required: true },
            { key: 'listId', label: 'Audience ID', placeholder: 'abc123' },
        ],
    },
    {
        id: 'buttondown',
        name: 'Buttondown',
        description: 'Simple newsletter tool',
        docsUrl: 'https://api.buttondown.email/v1/docs',
        fields: [
            { key: 'apiKey', label: 'API Key', placeholder: 'pk_...', required: true },
        ],
    },
];

const SYNDICATION_PLATFORMS: PlatformConfig[] = [
    {
        id: 'medium',
        name: 'Medium',
        description: 'Publishing platform',
        docsUrl: 'https://github.com/Medium/medium-api-docs',
        fields: [
            { key: 'apiKey', label: 'Integration Token', placeholder: 'Token from Settings → Security', required: true },
            { key: 'publicationId', label: 'Publication ID (optional)', placeholder: 'Leave blank for personal' },
        ],
    },
    {
        id: 'devto',
        name: 'DEV Community',
        description: 'Developer community platform',
        docsUrl: 'https://developers.forem.com/api',
        fields: [
            { key: 'apiKey', label: 'API Key', placeholder: 'From Settings → Extensions → API Keys', required: true },
        ],
    },
    {
        id: 'hashnode',
        name: 'Hashnode',
        description: 'Developer blogging platform',
        docsUrl: 'https://api.hashnode.com/',
        fields: [
            { key: 'apiKey', label: 'Personal Access Token', placeholder: 'Token from Account Settings', required: true },
            { key: 'publicationId', label: 'Publication ID', placeholder: 'Your blog ID' },
            { key: 'username', label: 'Username', placeholder: 'yourname' },
        ],
    },
];

// ============================================================================
// Field Input Component
// ============================================================================

interface FieldInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    type?: 'text' | 'password';
}

function FieldInput({ label, value, onChange, placeholder, required, type = 'password' }: FieldInputProps) {
    const [visible, setVisible] = useState(false);
    const isPassword = type === 'password';

    return (
        <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="relative">
                <input
                    type={isPassword && !visible ? 'password' : 'text'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 pr-10"
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setVisible(!visible)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600"
                    >
                        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// Newsletter Provider Card
// ============================================================================

function NewsletterProviderCard({ provider }: { provider: ProviderConfig }) {
    const { newsletterConfig, setNewsletterConfig } = useSettingsStore();
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const isSelected = newsletterConfig.provider === provider.id;
    const isConfigured = isSelected && !!newsletterConfig.apiKey;

    const handleSelect = () => {
        if (isSelected) {
            setNewsletterConfig({ provider: null, apiKey: '', listId: undefined });
        } else {
            setNewsletterConfig({ provider: provider.id });
        }
        setTestResult(null);
    };

    const handleTestConnection = useCallback(async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const { validateNewsletterCredentials } = await import('@/lib/distribution');
            const success = await validateNewsletterCredentials({
                provider: provider.id,
                apiKey: newsletterConfig.apiKey,
                listId: newsletterConfig.listId,
            });
            setTestResult({ success, message: success ? 'Connected!' : 'Connection failed' });
        } catch (error) {
            setTestResult({ success: false, message: error instanceof Error ? error.message : 'Test failed' });
        } finally {
            setTesting(false);
        }
    }, [provider.id, newsletterConfig.apiKey, newsletterConfig.listId]);

    return (
        <div className={`p-4 bg-white rounded-lg border transition-colors ${isSelected ? 'border-blue-300 ring-1 ring-blue-100' : 'border-neutral-200'
            }`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <h4 className="font-medium text-neutral-800">{provider.name}</h4>
                    {isConfigured && <Check className="w-4 h-4 text-green-500" />}
                </div>
                <button
                    onClick={handleSelect}
                    className={`px-3 py-1 text-xs rounded-full ${isSelected
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                >
                    {isSelected ? 'Selected' : 'Select'}
                </button>
            </div>

            <p className="text-xs text-neutral-500 mb-3">{provider.description}</p>

            {isSelected && (
                <div className="space-y-3 pt-3 border-t">
                    <FieldInput
                        label="API Key"
                        value={newsletterConfig.apiKey}
                        onChange={(value) => setNewsletterConfig({ apiKey: value })}
                        placeholder={provider.fields[0].placeholder}
                        required
                    />
                    {provider.fields.length > 1 && (
                        <FieldInput
                            label={provider.fields[1].label}
                            value={newsletterConfig.listId || ''}
                            onChange={(value) => setNewsletterConfig({ listId: value })}
                            placeholder={provider.fields[1].placeholder}
                            type="text"
                        />
                    )}

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleTestConnection}
                            disabled={!newsletterConfig.apiKey || testing}
                            className="px-3 py-1.5 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {testing ? (
                                <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Testing...
                                </>
                            ) : (
                                'Test Connection'
                            )}
                        </button>
                        {testResult && (
                            <span className={`text-xs ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                {testResult.message}
                            </span>
                        )}
                        <a
                            href={provider.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline flex items-center gap-1 ml-auto"
                        >
                            Docs <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Syndication Platform Card
// ============================================================================

function SyndicationPlatformCard({ platform }: { platform: PlatformConfig }) {
    const { syndicationConfigs, addSyndicationPlatform, updateSyndicationPlatform, removeSyndicationPlatform } = useSettingsStore();
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const config = syndicationConfigs.find(c => c.platform === platform.id);
    const isEnabled = !!config?.enabled;
    const isConfigured = !!config?.apiKey;

    const handleToggle = () => {
        if (config) {
            if (config.enabled) {
                updateSyndicationPlatform(platform.id, { enabled: false });
            } else {
                updateSyndicationPlatform(platform.id, { enabled: true });
            }
        } else {
            addSyndicationPlatform({
                platform: platform.id,
                apiKey: '',
                enabled: true,
            });
        }
        setTestResult(null);
    };

    const handleTestConnection = useCallback(async () => {
        if (!config?.apiKey) return;
        setTesting(true);
        setTestResult(null);
        try {
            const { validateSyndicationCredentials } = await import('@/lib/distribution');
            const success = await validateSyndicationCredentials({
                platform: platform.id,
                apiKey: config.apiKey,
                publicationId: config.publicationId,
                username: config.username,
            });
            setTestResult({ success, message: success ? 'Connected!' : 'Connection failed' });
        } catch (error) {
            setTestResult({ success: false, message: error instanceof Error ? error.message : 'Test failed' });
        } finally {
            setTesting(false);
        }
    }, [platform.id, config]);

    return (
        <div className={`p-4 bg-white rounded-lg border transition-colors ${isEnabled ? 'border-green-200' : 'border-neutral-200'
            }`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <h4 className="font-medium text-neutral-800">{platform.name}</h4>
                    {isConfigured && isEnabled && <Check className="w-4 h-4 text-green-500" />}
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={handleToggle}
                        className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                </label>
            </div>

            <p className="text-xs text-neutral-500 mb-3">{platform.description}</p>

            {isEnabled && (
                <div className="space-y-3 pt-3 border-t">
                    {platform.fields.map((field) => (
                        <FieldInput
                            key={field.key}
                            label={field.label}
                            value={config?.[field.key] || ''}
                            onChange={(value) => updateSyndicationPlatform(platform.id, { [field.key]: value })}
                            placeholder={field.placeholder}
                            required={field.required}
                            type={field.key === 'apiKey' ? 'password' : 'text'}
                        />
                    ))}

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleTestConnection}
                            disabled={!config?.apiKey || testing}
                            className="px-3 py-1.5 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {testing ? (
                                <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Testing...
                                </>
                            ) : (
                                'Test Connection'
                            )}
                        </button>
                        {testResult && (
                            <span className={`text-xs ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                {testResult.message}
                            </span>
                        )}
                        <a
                            href={platform.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline flex items-center gap-1 ml-auto"
                        >
                            Docs <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// AdSense OAuth Section
// ============================================================================

function AdSenseOAuthCard() {
    const { adsenseOAuth, setAdsenseOAuth } = useSettingsStore();
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [expanded, setExpanded] = useState(!!adsenseOAuth.refreshToken);

    const isConfigured = !!adsenseOAuth.clientId && !!adsenseOAuth.clientSecret && !!adsenseOAuth.refreshToken;

    const handleTestConnection = useCallback(async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const response = await fetch('/api/monetization/adsense/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(adsenseOAuth),
            });
            const data = await response.json();
            setTestResult({
                success: data.success,
                message: data.success ? `Connected: ${data.accountName || 'Account'}` : data.error || 'Failed',
            });
        } catch (error) {
            setTestResult({ success: false, message: error instanceof Error ? error.message : 'Test failed' });
        } finally {
            setTesting(false);
        }
    }, [adsenseOAuth]);

    return (
        <div className={`border rounded-xl overflow-hidden ${isConfigured ? 'border-green-200' : 'border-neutral-200'}`}>
            <button
                onClick={() => setExpanded(!expanded)}
                className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${expanded ? 'bg-neutral-50' : 'bg-white hover:bg-neutral-50'
                    }`}
            >
                <div className={`p-2 rounded-lg ${isConfigured ? 'bg-green-100 text-green-600' : 'bg-neutral-100 text-neutral-500'}`}>
                    <DollarSign className="w-4 h-4" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-800">AdSense OAuth</span>
                        {isConfigured && <Check className="w-4 h-4 text-green-500" />}
                    </div>
                    <p className="text-xs text-neutral-500">Connect for live revenue data in Revenue Dashboard</p>
                </div>
                {expanded ? <ChevronDown className="w-5 h-5 text-neutral-400" /> : <ChevronRight className="w-5 h-5 text-neutral-400" />}
            </button>

            {expanded && (
                <div className="p-4 bg-neutral-50 border-t space-y-3">
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-xs text-amber-800">
                            <strong>Setup:</strong> Create OAuth credentials in{' '}
                            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-amber-600 underline">
                                Google Cloud Console
                            </a>{' '}
                            with AdSense Management API enabled. Use OAuth playground to get refresh token.
                        </p>
                    </div>

                    <FieldInput
                        label="Client ID"
                        value={adsenseOAuth.clientId}
                        onChange={(value) => setAdsenseOAuth({ clientId: value })}
                        placeholder="xxxxx.apps.googleusercontent.com"
                        required
                    />
                    <FieldInput
                        label="Client Secret"
                        value={adsenseOAuth.clientSecret}
                        onChange={(value) => setAdsenseOAuth({ clientSecret: value })}
                        placeholder="GOCSPX-xxxxx"
                        required
                    />
                    <FieldInput
                        label="Refresh Token"
                        value={adsenseOAuth.refreshToken}
                        onChange={(value) => setAdsenseOAuth({ refreshToken: value })}
                        placeholder="1//xxxxx"
                        required
                    />

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            onClick={handleTestConnection}
                            disabled={!isConfigured || testing}
                            className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {testing ? (
                                <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Testing...
                                </>
                            ) : (
                                'Test Connection'
                            )}
                        </button>
                        {testResult && (
                            <span className={`text-xs ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                {testResult.message}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Collapsible Section
// ============================================================================

interface CollapsibleSectionProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    configuredCount: number;
    totalCount: number;
    defaultExpanded?: boolean;
    children: React.ReactNode;
}

function CollapsibleSection({ title, description, icon, configuredCount, totalCount, defaultExpanded = true, children }: CollapsibleSectionProps) {
    const [expanded, setExpanded] = useState(defaultExpanded);

    return (
        <div className="border border-neutral-200 rounded-xl overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${expanded ? 'bg-neutral-50' : 'bg-white hover:bg-neutral-50'
                    }`}
            >
                <div className={`p-2 rounded-lg ${configuredCount > 0 ? 'bg-green-100 text-green-600' : 'bg-neutral-200 text-neutral-500'}`}>
                    {icon}
                </div>
                <div className="flex-1">
                    <span className="font-semibold text-neutral-800">{title}</span>
                    <p className="text-xs text-neutral-500">{description}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-neutral-500">{configuredCount}/{totalCount}</span>
                    {expanded ? <ChevronDown className="w-5 h-5 text-neutral-400" /> : <ChevronRight className="w-5 h-5 text-neutral-400" />}
                </div>
            </button>
            {expanded && (
                <div className="p-4 bg-neutral-50 border-t space-y-3">
                    {children}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Main Section
// ============================================================================

export function DistributionSection() {
    const { newsletterConfig, syndicationConfigs } = useSettingsStore();

    const newsletterConfigured = newsletterConfig.provider && newsletterConfig.apiKey ? 1 : 0;
    const syndicationConfigured = syndicationConfigs.filter(c => c.enabled && c.apiKey).length;

    return (
        <div className="space-y-6">
            {/* Summary */}
            <div className="flex items-center gap-4 text-sm text-neutral-600">
                <span>
                    <span className="font-semibold text-neutral-800">{newsletterConfigured + syndicationConfigured}</span>
                    {' '}distribution channels configured
                </span>
            </div>

            {/* AdSense OAuth */}
            <AdSenseOAuthCard />

            {/* Newsletter Providers */}
            <CollapsibleSection
                title="Newsletter"
                description="Email newsletter provider"
                icon={<Mail className="w-4 h-4" />}
                configuredCount={newsletterConfigured}
                totalCount={1}
            >
                <p className="text-xs text-neutral-500 mb-3">
                    Select one newsletter provider for automated distribution:
                </p>
                {NEWSLETTER_PROVIDERS.map(provider => (
                    <NewsletterProviderCard key={provider.id} provider={provider} />
                ))}
            </CollapsibleSection>

            {/* Syndication Platforms */}
            <CollapsibleSection
                title="Syndication"
                description="Third-party publishing platforms"
                icon={<Share2 className="w-4 h-4" />}
                configuredCount={syndicationConfigured}
                totalCount={SYNDICATION_PLATFORMS.length}
            >
                <p className="text-xs text-neutral-500 mb-3">
                    Enable platforms to republish content with canonical URLs:
                </p>
                {SYNDICATION_PLATFORMS.map(platform => (
                    <SyndicationPlatformCard key={platform.id} platform={platform} />
                ))}
            </CollapsibleSection>

            {/* Info Box */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800">
                    <strong>Tip:</strong> Enable distribution features per-campaign in Campaign settings.
                    Articles will be automatically distributed based on your campaign configuration.
                </p>
            </div>
        </div>
    );
}

export default DistributionSection;
