'use client';

/**
 * Integrations Section (Refactored)
 * FSD: components/settings/sections/IntegrationsSection.tsx
 * 
 * Reorganized by category with collapsible groups:
 * - Hosting (Hostinger)
 * - Domain Registrars (Namecheap, GoDaddy, Cloudflare)
 * - Media Services (Unsplash, Pexels)
 * - Analytics (Umami)
 * - Social (Dev.to, YouTube, Twitter)
 * - Legacy (GitHub, Vercel) - collapsed by default with Test Connection
 * 
 * Uses useIntegrations helper that wraps settingsStore
 */

import { useState, useCallback } from 'react';
import {
    ChevronDown, ChevronRight, ExternalLink, Check, AlertCircle,
    Server, Globe, Image, BarChart3, Share2, Archive, Eye, EyeOff, Loader2
} from 'lucide-react';
import {
    useIntegrations,
    INTEGRATIONS,
    type IntegrationCategory,
    type IntegrationMeta,
    type IntegrationField,
} from '@/lib/config/integrationsHelpers';
import { useSettingsStore } from '@/stores/settingsStore';
import { HealthStatusIndicator } from '../HealthStatusIndicator';
import type { ServiceHealth } from '@/lib/config/healthMonitor';


// ============================================================================
// Category Configuration
// ============================================================================

interface CategoryConfig {
    id: IntegrationCategory;
    name: string;
    description: string;
    icon: React.ReactNode;
    defaultExpanded: boolean;
}

const CATEGORIES: CategoryConfig[] = [
    {
        id: 'hosting',
        name: 'Hosting',
        description: 'WordPress hosting and deployment',
        icon: <Server className="w-4 h-4" />,
        defaultExpanded: true,
    },
    {
        id: 'domains',
        name: 'Domain Registrars',
        description: 'Domain registration and DNS management',
        icon: <Globe className="w-4 h-4" />,
        defaultExpanded: true,
    },
    {
        id: 'media',
        name: 'Media Services',
        description: 'Stock photos and videos',
        icon: <Image className="w-4 h-4" />,
        defaultExpanded: true,
    },
    {
        id: 'analytics',
        name: 'Analytics',
        description: 'Website analytics and tracking',
        icon: <BarChart3 className="w-4 h-4" />,
        defaultExpanded: true,
    },
    {
        id: 'social',
        name: 'Social & Content',
        description: 'Social media and content platforms',
        icon: <Share2 className="w-4 h-4" />,
        defaultExpanded: false,
    },
    {
        id: 'legacy',
        name: 'Legacy (Deprecated)',
        description: 'For legacy websites only - not for WP Sites',
        icon: <Archive className="w-4 h-4" />,
        defaultExpanded: false,
    },
];

// ============================================================================
// Integration Field Component
// ============================================================================

interface FieldInputProps {
    field: IntegrationField;
    value: string;
    onChange: (value: string) => void;
}

function FieldInput({ field, value, onChange }: FieldInputProps) {
    const [visible, setVisible] = useState(false);
    const isPassword = field.type === 'password';

    return (
        <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="relative">
                <input
                    type={isPassword && !visible ? 'password' : 'text'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
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
// Integration Card Component
// ============================================================================

interface IntegrationCardProps {
    integration: IntegrationMeta;
}

function IntegrationCard({ integration }: IntegrationCardProps) {
    const { getToken, setToken, isIntegrationConfigured } = useIntegrations();
    const { setHealthStatus, healthStatus } = useSettingsStore();
    const [testing, setTesting] = useState(false);

    const isConfigured = isIntegrationConfigured(integration.id);
    const serviceId = `integration:${integration.id}`;
    const health = healthStatus[serviceId];

    // Test connection handler
    const handleTestConnection = useCallback(async () => {
        // Build credentials from all fields
        const credentials: Record<string, string> = {};
        for (const field of integration.fields) {
            credentials[field.key] = getToken(field.key);
        }

        setTesting(true);
        try {
            const response = await fetch('/api/integrations/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    integration: integration.id,
                    credentials,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setHealthStatus(serviceId, {
                    status: 'healthy',
                    lastCheck: Date.now(),
                    message: data.message,
                });
            } else {
                setHealthStatus(serviceId, {
                    status: 'error',
                    lastCheck: Date.now(),
                    message: data.message || 'Connection failed',
                });
            }
        } catch (error) {
            setHealthStatus(serviceId, {
                status: 'error',
                lastCheck: Date.now(),
                message: error instanceof Error ? error.message : 'Test failed',
            });
        } finally {
            setTesting(false);
        }
    }, [integration.id, integration.fields, getToken, setHealthStatus, serviceId]);

    if (integration.fields.length === 0) {
        // Hostinger uses MCP, no direct configuration
        return (
            <div className="p-4 bg-white rounded-lg border border-neutral-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="font-medium text-neutral-800">{integration.name}</h4>
                        <p className="text-xs text-neutral-500 mt-0.5">{integration.description}</p>
                    </div>
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                        Via MCP
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className={`
            p-4 bg-white rounded-lg border transition-colors
            ${isConfigured ? 'border-green-200' : 'border-neutral-200'}
        `}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <h4 className="font-medium text-neutral-800">{integration.name}</h4>
                    {integration.deprecated && (
                        <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                            Deprecated
                        </span>
                    )}
                    {isConfigured && (
                        <Check className="w-4 h-4 text-green-500" />
                    )}
                </div>
                {integration.docsUrl && (
                    <a
                        href={integration.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                    >
                        Docs <ExternalLink className="w-3 h-3" />
                    </a>
                )}
            </div>

            <p className="text-xs text-neutral-500 mb-3">{integration.description}</p>

            {/* Fields */}
            <div className="space-y-3">
                {integration.fields.map(field => (
                    <FieldInput
                        key={field.key}
                        field={field}
                        value={getToken(field.key)}
                        onChange={(value) => setToken(field.key, value)}
                    />
                ))}
            </div>

            {/* Test Connection Button */}
            {isConfigured && (
                <div className="mt-4 flex items-center gap-3">
                    <button
                        onClick={handleTestConnection}
                        disabled={testing}
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
                    {health && (
                        <HealthStatusIndicator health={health} />
                    )}
                </div>
            )}
        </div>
    );
}


// ============================================================================
// Legacy Integration Card (GitHub/Vercel with Test Connection)
// ============================================================================

interface LegacyIntegrationCardProps {
    integration: IntegrationMeta;
}

function LegacyIntegrationCard({ integration }: LegacyIntegrationCardProps) {
    const { getToken, setToken, isIntegrationConfigured } = useIntegrations();
    const { integrations, setIntegration, healthStatus, setHealthStatus } = useSettingsStore();
    const [testing, setTesting] = useState(false);

    const isConfigured = isIntegrationConfigured(integration.id);
    const serviceId = `integration:${integration.id}`;
    const health = healthStatus[serviceId];

    const handleTestConnection = async () => {
        const tokenKey = integration.id === 'github' ? 'githubToken' : 'vercelToken';
        const token = integrations[tokenKey];
        if (!token) return;

        setTesting(true);
        try {
            const endpoint = integration.id === 'github' ? '/api/github-setup' : '/api/vercel-setup';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'validate', token })
            });
            const data = await res.json();

            if (data.success) {
                const userKey = integration.id === 'github' ? 'githubUser' : 'vercelUser';
                setIntegration(userKey, data.user?.username || '');
                setHealthStatus(serviceId, {
                    status: 'healthy',
                    lastCheck: Date.now(),
                });
            } else {
                setHealthStatus(serviceId, {
                    status: 'error',
                    lastCheck: Date.now(),
                    message: data.error || 'Connection failed'
                });
            }
        } catch (err) {
            setHealthStatus(serviceId, {
                status: 'error',
                lastCheck: Date.now(),
                message: 'Network error'
            });
        } finally {
            setTesting(false);
        }
    };

    const tokenKey = integration.id === 'github' ? 'githubToken' : 'vercelToken';
    const userKey = integration.id === 'github' ? 'githubUser' : 'vercelUser';
    const hasToken = !!integrations[tokenKey];
    const connectedUser = integrations[userKey];

    return (
        <div className={`
            p-4 bg-white rounded-lg border transition-colors
            ${isConfigured ? 'border-green-200' : 'border-neutral-200'}
        `}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <h4 className="font-medium text-neutral-800">{integration.name}</h4>
                    <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                        Legacy
                    </span>
                    {health && (
                        <HealthStatusIndicator
                            serviceId={serviceId}
                            serviceName={integration.name}
                            health={health}
                            onCheck={handleTestConnection}
                            size="sm"
                        />
                    )}
                </div>
                {integration.docsUrl && (
                    <a
                        href={integration.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                    >
                        Docs <ExternalLink className="w-3 h-3" />
                    </a>
                )}
            </div>

            <p className="text-xs text-neutral-500 mb-3">{integration.description}</p>

            {/* Fields */}
            <div className="space-y-3">
                {integration.fields.map(field => (
                    <FieldInput
                        key={field.key}
                        field={field}
                        value={getToken(field.key)}
                        onChange={(value) => setToken(field.key, value)}
                    />
                ))}
            </div>

            {/* Test Connection Button */}
            <button
                onClick={handleTestConnection}
                disabled={!hasToken || testing}
                className={`
                    w-full mt-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${integration.id === 'github'
                        ? 'bg-neutral-800 text-white hover:bg-neutral-700'
                        : 'bg-black text-white hover:bg-neutral-800'}
                    disabled:opacity-50 disabled:cursor-not-allowed
                `}
            >
                {testing ? (
                    <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Testing...
                    </span>
                ) : connectedUser ? (
                    <span className="flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" />
                        Connected as {connectedUser}
                    </span>
                ) : (
                    'Test Connection'
                )}
            </button>
        </div>
    );
}

// ============================================================================
// Category Group Component
// ============================================================================

interface CategoryGroupProps {
    category: CategoryConfig;
}

function CategoryGroup({ category }: CategoryGroupProps) {
    const [expanded, setExpanded] = useState(category.defaultExpanded);
    const { isIntegrationConfigured } = useIntegrations();

    const integrations = INTEGRATIONS.filter(i => i.category === category.id);
    const configuredCount = integrations.filter(i => isIntegrationConfigured(i.id)).length;

    return (
        <div className="border border-neutral-200 rounded-xl overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className={`
                    w-full flex items-center gap-3 p-4 text-left transition-colors
                    ${expanded ? 'bg-neutral-50' : 'bg-white hover:bg-neutral-50'}
                `}
            >
                <div className={`
                    p-2 rounded-lg
                    ${configuredCount > 0 ? 'bg-green-100 text-green-600' : 'bg-neutral-200 text-neutral-500'}
                `}>
                    {category.icon}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-800">{category.name}</span>
                        {category.id === 'legacy' && (
                            <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                                Not for WP Sites
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-neutral-500">{category.description}</p>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-sm text-neutral-500">
                        {configuredCount}/{integrations.length}
                    </span>
                    {expanded ? (
                        <ChevronDown className="w-5 h-5 text-neutral-400" />
                    ) : (
                        <ChevronRight className="w-5 h-5 text-neutral-400" />
                    )}
                </div>
            </button>

            {/* Content */}
            {expanded && (
                <div className="p-4 bg-neutral-50 border-t border-neutral-200 space-y-3">
                    {integrations.map(integration => (
                        category.id === 'legacy'
                            ? <LegacyIntegrationCard key={integration.id} integration={integration} />
                            : <IntegrationCard key={integration.id} integration={integration} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Main Section
// ============================================================================

export function IntegrationsSection() {
    const { getConfiguredIntegrations } = useIntegrations();

    const configuredIds = getConfiguredIntegrations();
    const activeCount = configuredIds.filter(id =>
        !INTEGRATIONS.find(i => i.id === id)?.deprecated
    ).length;

    return (
        <div className="space-y-6">
            {/* Summary */}
            <div className="flex items-center gap-4 text-sm text-neutral-600">
                <span>
                    <span className="font-semibold text-neutral-800">{activeCount}</span>
                    {' '}active integrations configured
                </span>
            </div>

            {/* Category Groups */}
            <div className="space-y-4">
                {CATEGORIES.map(category => (
                    <CategoryGroup key={category.id} category={category} />
                ))}
            </div>

            {/* Legacy Warning */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                    <strong>Legacy integrations</strong> (GitHub, Vercel) are only for the Legacy Websites
                    system. For WordPress/Hostinger sites, use the Hosting category instead.
                </p>
            </div>
        </div>
    );
}

export default IntegrationsSection;
