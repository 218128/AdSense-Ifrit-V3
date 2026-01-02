/**
 * WP Automation Settings Panel
 * FSD: components/settings/WPAutomationPanel.tsx
 * 
 * Dedicated settings tab for all WP Automation API keys and configuration.
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Key,
    Youtube,
    Twitter,
    Languages,
    ShoppingCart,
    Globe,
    Eye,
    EyeOff,
    Check,
    AlertCircle,
    ExternalLink,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface APIKeyConfig {
    id: string;
    name: string;
    description: string;
    placeholder: string;
    icon: React.ReactNode;
    docsUrl?: string;
    storageKey: string;
}

// ============================================================================
// API Key Configurations
// ============================================================================

const API_KEYS: APIKeyConfig[] = [
    {
        id: 'youtube',
        name: 'YouTube Data API',
        description: 'Import videos from YouTube channels and search',
        placeholder: 'AIza...',
        icon: <Youtube className="w-5 h-5 text-red-500" />,
        docsUrl: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
        storageKey: 'youtube_api_key',
    },
    {
        id: 'twitter',
        name: 'Twitter/X Bearer Token',
        description: 'Import trending topics and tweets',
        placeholder: 'AAAA...',
        icon: <Twitter className="w-5 h-5 text-sky-500" />,
        docsUrl: 'https://developer.twitter.com/en/portal/dashboard',
        storageKey: 'twitter_bearer_token',
    },
    {
        id: 'deepl',
        name: 'DeepL API Key',
        description: 'High-quality translation (500K chars/mo free)',
        placeholder: '...:fx',
        icon: <Languages className="w-5 h-5 text-blue-600" />,
        docsUrl: 'https://www.deepl.com/pro-api',
        storageKey: 'deepl_api_key',
    },
    {
        id: 'google_translate',
        name: 'Google Translate API Key',
        description: 'Cost-effective translation for volume',
        placeholder: 'AIza...',
        icon: <Languages className="w-5 h-5 text-green-500" />,
        docsUrl: 'https://console.cloud.google.com/apis/library/translate.googleapis.com',
        storageKey: 'google_translate_api_key',
    },
    {
        id: 'serpapi',
        name: 'SerpAPI Key',
        description: 'Google Trends and search data (paid)',
        placeholder: '...',
        icon: <Globe className="w-5 h-5 text-orange-500" />,
        docsUrl: 'https://serpapi.com/dashboard',
        storageKey: 'serpapi_api_key',
    },
    {
        id: 'rapidapi',
        name: 'RapidAPI Key',
        description: 'Instagram and other social APIs',
        placeholder: '...',
        icon: <Globe className="w-5 h-5 text-purple-500" />,
        docsUrl: 'https://rapidapi.com/developer/dashboard',
        storageKey: 'rapidapi_key',
    },
    {
        id: 'amazon',
        name: 'Amazon Associates Tag',
        description: 'Affiliate product imports',
        placeholder: 'yoursite-20',
        icon: <ShoppingCart className="w-5 h-5 text-amber-600" />,
        docsUrl: 'https://affiliate-program.amazon.com/',
        storageKey: 'amazon_associate_tag',
    },
];

// ============================================================================
// Component
// ============================================================================

export default function WPAutomationPanel() {
    const [keys, setKeys] = useState<Record<string, string>>({});
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
    const [saved, setSaved] = useState(false);

    // Load keys from localStorage
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const loadedKeys: Record<string, string> = {};
        for (const config of API_KEYS) {
            loadedKeys[config.id] = localStorage.getItem(config.storageKey) || '';
        }
        setKeys(loadedKeys);
    }, []);

    // Save all keys
    const handleSave = useCallback(() => {
        for (const config of API_KEYS) {
            const value = keys[config.id] || '';
            if (value) {
                localStorage.setItem(config.storageKey, value);
            } else {
                localStorage.removeItem(config.storageKey);
            }
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }, [keys]);

    // Update single key
    const updateKey = useCallback((id: string, value: string) => {
        setKeys(prev => ({ ...prev, [id]: value }));
    }, []);

    // Toggle visibility
    const toggleShow = useCallback((id: string) => {
        setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
    }, []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-neutral-800 flex items-center gap-2">
                        <Key className="w-5 h-5 text-indigo-600" />
                        WP Automation API Keys
                    </h3>
                    <p className="text-sm text-neutral-500 mt-1">
                        Configure API keys for content sources and translation
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${saved
                            ? 'bg-green-500 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                >
                    {saved ? <Check className="w-4 h-4" /> : null}
                    {saved ? 'Saved!' : 'Save All'}
                </button>
            </div>

            {/* API Key Cards */}
            <div className="grid gap-4">
                {API_KEYS.map(config => (
                    <div
                        key={config.id}
                        className="p-4 bg-white border border-neutral-200 rounded-lg"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                {config.icon}
                                <div>
                                    <h4 className="font-medium text-neutral-800">
                                        {config.name}
                                    </h4>
                                    <p className="text-xs text-neutral-500">
                                        {config.description}
                                    </p>
                                </div>
                            </div>
                            {config.docsUrl && (
                                <a
                                    href={config.docsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                >
                                    Get Key <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </div>
                        <div className="relative">
                            <input
                                type={showKeys[config.id] ? 'text' : 'password'}
                                value={keys[config.id] || ''}
                                onChange={e => updateKey(config.id, e.target.value)}
                                placeholder={config.placeholder}
                                className="w-full px-3 py-2 pr-10 border border-neutral-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            <button
                                type="button"
                                onClick={() => toggleShow(config.id)}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                            >
                                {showKeys[config.id] ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                        {keys[config.id] && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                                <Check className="w-3 h-3" />
                                Configured
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Info Box */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                        <p className="font-medium">API Key Security</p>
                        <p className="mt-1">
                            Keys are stored locally in your browser. They are never sent to external servers
                            except when making API calls to their respective services.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
