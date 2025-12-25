/**
 * RepublishPanel - Content Syndication Settings
 * 
 * Manage API keys and settings for republishing content to:
 * - Dev.to (blog syndication)
 * - LinkedIn (professional network)
 * - Twitter/X (social media)
 * - Future: Medium, Hashnode, etc.
 * 
 * Part of the Unified Settings Architecture (Phase 6)
 */
'use client';

import React, { useState } from 'react';
import {
    Share2,
    ExternalLink,
    Check,
    AlertCircle,
    Eye,
    EyeOff,
    Save,
    Info,
    Sparkles,
} from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';

// Platform configurations
const PLATFORMS = [
    {
        id: 'devto',
        name: 'Dev.to',
        description: 'Developer community blog platform',
        icon: '📝',
        settingsUrl: 'https://dev.to/settings/extensions',
        docsUrl: 'https://docs.dev.to/api/',
        keyField: 'devtoKey' as const,
        placeholder: 'Enter your Dev.to API key',
        tips: [
            'Get your API key from Dev.to Settings → Extensions',
            'Articles are created as drafts by default',
            'Canonical URLs are set automatically to your blog',
        ],
    },
    {
        id: 'linkedin',
        name: 'LinkedIn',
        description: 'Professional network for articles',
        icon: '💼',
        settingsUrl: 'https://www.linkedin.com/developers/',
        docsUrl: 'https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares',
        keyField: null, // OAuth-based, future implementation
        placeholder: 'OAuth integration coming soon',
        tips: [
            'LinkedIn requires OAuth 2.0 authentication',
            'Best for professional/business content',
            'Share as posts or articles',
        ],
        comingSoon: true,
    },
    {
        id: 'twitter',
        name: 'Twitter/X',
        description: 'Social media for content promotion',
        icon: '🐦',
        settingsUrl: 'https://developer.twitter.com/',
        docsUrl: 'https://developer.twitter.com/en/docs/twitter-api',
        keyField: null, // OAuth-based, future implementation
        placeholder: 'OAuth integration coming soon',
        tips: [
            'Best for sharing links and snippets',
            'Thread format for longer content',
            'Schedule posts for optimal engagement',
        ],
        comingSoon: true,
    },
];

export default function RepublishPanel() {
    const { integrations, setIntegration } = useSettingsStore();
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
    const [testingPlatform, setTestingPlatform] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<{ platform: string; success: boolean; message: string } | null>(null);

    const toggleShowKey = (platformId: string) => {
        setShowKeys(prev => ({ ...prev, [platformId]: !prev[platformId] }));
    };

    const handleKeyChange = (keyField: keyof typeof integrations, value: string) => {
        setIntegration(keyField, value);
    };

    const testConnection = async (platform: typeof PLATFORMS[0]) => {
        if (!platform.keyField || platform.comingSoon) return;

        setTestingPlatform(platform.id);
        setTestResult(null);

        try {
            const key = integrations[platform.keyField];
            if (!key) {
                setTestResult({
                    platform: platform.id,
                    success: false,
                    message: 'No API key configured',
                });
                return;
            }

            // Test the connection based on platform
            if (platform.id === 'devto') {
                // Use API proxy to avoid CORS issues
                const response = await fetch('/api/test-devto', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiKey: key }),
                });
                const data = await response.json();

                if (data.success) {
                    setTestResult({
                        platform: platform.id,
                        success: true,
                        message: `Connected as @${data.user.username}`,
                    });
                } else {
                    setTestResult({
                        platform: platform.id,
                        success: false,
                        message: data.error || 'Invalid API key',
                    });
                }
            }
        } catch (error) {
            setTestResult({
                platform: platform.id,
                success: false,
                message: error instanceof Error ? error.message : 'Connection failed',
            });
        } finally {
            setTestingPlatform(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg">
                    <Share2 className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-100">Content Syndication</h2>
                    <p className="text-sm text-gray-400">
                        Republish your content to multiple platforms
                    </p>
                </div>
            </div>

            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <Info className="w-5 h-5 text-green-400 mt-0.5" />
                <div className="text-sm text-green-200">
                    <p className="font-medium mb-1">Maximize Your Content Reach</p>
                    <p className="text-green-300/80">
                        Syndicate articles to developer platforms and social media. Canonical URLs
                        are automatically set to your original blog to maintain SEO value.
                    </p>
                </div>
            </div>

            {/* Tips Section */}
            <div className="p-4 bg-gradient-to-br from-teal-900/30 to-green-900/30 border border-teal-500/20 rounded-lg">
                <h4 className="font-medium text-teal-200 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Syndication Tips (Dec 2025)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                        <p className="font-medium text-gray-200 mb-1">🎯 Best Platforms by Content</p>
                        <p className="text-gray-400">
                            <strong className="text-teal-300">Dev.to</strong> for technical tutorials,{' '}
                            <strong className="text-teal-300">LinkedIn</strong> for business insights,{' '}
                            <strong className="text-teal-300">Twitter</strong> for quick updates.
                        </p>
                    </div>
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                        <p className="font-medium text-gray-200 mb-1">⏰ Timing Matters</p>
                        <p className="text-gray-400">
                            Wait 24-48h after original publish before syndicating.
                            This gives search engines time to index your canonical URL.
                        </p>
                    </div>
                </div>
            </div>

            {/* Platforms List */}
            <div className="space-y-4">
                {PLATFORMS.map((platform) => {
                    const keyValue = platform.keyField ? integrations[platform.keyField] : '';
                    const isConfigured = !!keyValue;
                    const isTestResult = testResult?.platform === platform.id;

                    return (
                        <div
                            key={platform.id}
                            className={`p-4 border rounded-lg transition-colors ${platform.comingSoon
                                ? 'border-gray-700 bg-gray-900/50 opacity-60'
                                : isConfigured
                                    ? 'border-green-700 bg-green-900/20'
                                    : 'border-gray-700 bg-gray-800/50'
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                {/* Icon */}
                                <div className="text-2xl">{platform.icon}</div>

                                {/* Content */}
                                <div className="flex-1 space-y-3">
                                    {/* Header */}
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-gray-100">{platform.name}</h3>
                                        {platform.comingSoon && (
                                            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                                                Coming Soon
                                            </span>
                                        )}
                                        {isConfigured && !platform.comingSoon && (
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                                                <Check className="w-3 h-3" /> Configured
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-400">{platform.description}</p>

                                    {/* API Key Input */}
                                    {platform.keyField && !platform.comingSoon && (
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <input
                                                        type={showKeys[platform.id] ? 'text' : 'password'}
                                                        value={keyValue}
                                                        onChange={(e) => handleKeyChange(platform.keyField!, e.target.value)}
                                                        placeholder={platform.placeholder}
                                                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleShowKey(platform.id)}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300"
                                                    >
                                                        {showKeys[platform.id] ? (
                                                            <EyeOff className="w-4 h-4" />
                                                        ) : (
                                                            <Eye className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => testConnection(platform)}
                                                    disabled={!keyValue || testingPlatform === platform.id}
                                                    className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg text-white text-sm transition-colors"
                                                >
                                                    {testingPlatform === platform.id ? 'Testing...' : 'Test'}
                                                </button>
                                            </div>

                                            {/* Test Result */}
                                            {isTestResult && (
                                                <div className={`flex items-center gap-2 text-sm ${testResult.success ? 'text-green-400' : 'text-red-400'
                                                    }`}>
                                                    {testResult.success ? (
                                                        <Check className="w-4 h-4" />
                                                    ) : (
                                                        <AlertCircle className="w-4 h-4" />
                                                    )}
                                                    {testResult.message}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Coming Soon Message */}
                                    {platform.comingSoon && (
                                        <p className="text-sm text-yellow-400/70 italic">
                                            {platform.placeholder}
                                        </p>
                                    )}

                                    {/* Tips */}
                                    <div className="pt-2 border-t border-gray-700">
                                        <details className="group">
                                            <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                                                Setup tips
                                            </summary>
                                            <ul className="mt-2 space-y-1 text-xs text-gray-500">
                                                {platform.tips.map((tip, i) => (
                                                    <li key={i} className="flex items-start gap-2">
                                                        <span className="text-green-400">•</span> {tip}
                                                    </li>
                                                ))}
                                            </ul>
                                        </details>
                                    </div>

                                    {/* External Links */}
                                    <div className="flex gap-3 text-xs">
                                        <a
                                            href={platform.settingsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-gray-400 hover:text-gray-300"
                                        >
                                            <ExternalLink className="w-3 h-3" /> Get API Key
                                        </a>
                                        <a
                                            href={platform.docsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-gray-400 hover:text-gray-300"
                                        >
                                            <ExternalLink className="w-3 h-3" /> API Docs
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
