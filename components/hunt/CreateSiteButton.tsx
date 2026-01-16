'use client';

/**
 * Create Site Button
 * 
 * Triggers WordPress site provisioning via Hostinger MCP.
 * Shows progress and status of the provisioning workflow.
 * 
 * Flow:
 * 1. Fetch available hosting orders from Hostinger
 * 2. User selects which hosting plan to use
 * 3. Provision website on selected plan
 */

import { useState, useEffect } from 'react';
import { Globe, Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp, Sparkles, AlertCircle, Server, ExternalLink } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useWPSitesLegacy } from '@/features/wordpress/model/wpSiteStore';
import { useCampaignStore } from '@/features/campaigns/model/campaignStore';
import type { EnrichedKeyword, HuntCampaignContext } from '@/features/campaigns/model/campaignContext';
import { captureHuntDataForDomain, useHuntDataRegistry } from '@/features/hunt/model/huntDataRegistry';

interface HostingOrder {
    id: string;
    order_id?: string;
    status: string;
    plan?: string | { name?: string };
    domain?: string;
    websites_count?: number;
}

// Helper to get plan name safely
const getPlanName = (plan: string | { name?: string } | undefined): string => {
    if (!plan) return 'Hosting Plan';
    if (typeof plan === 'string') return plan;
    return plan.name || 'Hosting Plan';
};

interface ProvisionStep {
    step: string;
    status: 'success' | 'failed' | 'skipped' | 'pending';
    message?: string;
}

interface ProvisionResult {
    success: boolean;
    steps: ProvisionStep[];
    website?: {
        id: string;
        domain: string;
    };
    error?: string;
}

interface CreateSiteButtonProps {
    domain: string;
    niche?: string;
    keywords?: string[];
    /** Full enriched keywords from Hunt analysis */
    enrichedKeywords?: EnrichedKeyword[];
    /** Selected trends from Hunt */
    trends?: { topic: string; source: string; niche?: string }[];
    onSuccess?: (result: ProvisionResult) => void;
    onError?: (error: string) => void;
    className?: string;
    disabled?: boolean;
}

export function CreateSiteButton({
    domain,
    niche,
    keywords,
    enrichedKeywords,
    trends,
    onSuccess,
    onError,
    className = '',
    disabled = false
}: CreateSiteButtonProps) {
    const [stage, setStage] = useState<'idle' | 'loading-orders' | 'select-order' | 'provisioning'>('idle');
    const [orders, setOrders] = useState<HostingOrder[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<string>('');
    const [result, setResult] = useState<ProvisionResult | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get Hostinger API key from settings store
    const { mcpServers } = useSettingsStore();
    const hostingerApiKey = mcpServers?.apiKeys?.hostinger || '';

    // WordPress store for auto-registration
    const { addSite } = useWPSitesLegacy();

    // Fetch available orders
    const fetchOrders = async () => {
        if (!hostingerApiKey) {
            setError('Hostinger API key not configured. Go to Settings → AI Providers → MCP Tools → Integrations');
            return;
        }

        setStage('loading-orders');
        setError(null);

        try {
            const response = await fetch(`/api/hosting/orders?apiKey=${encodeURIComponent(hostingerApiKey)}`);
            const data = await response.json();

            if (!data.success) {
                setError(data.error || 'Failed to fetch hosting orders');
                setStage('idle');
                return;
            }

            if (!data.orders || data.orders.length === 0) {
                setError('No hosting plans found. Please purchase a hosting plan on Hostinger first.');
                setStage('idle');
                return;
            }

            setOrders(data.orders);
            // Auto-select first order if only one
            if (data.orders.length === 1) {
                setSelectedOrderId(data.orders[0].id || data.orders[0].order_id);
            }
            setStage('select-order');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch orders');
            setStage('idle');
        }
    };

    const handleProvision = async () => {
        if (!selectedOrderId) {
            setError('Please select a hosting plan');
            return;
        }

        setStage('provisioning');
        setError(null);

        try {
            const response = await fetch('/api/hosting/provision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    domain,
                    orderId: selectedOrderId,
                    niche,
                    keywords,
                    skipDns: false,
                    plugins: [],
                    apiKey: hostingerApiKey
                })
            });

            const data: ProvisionResult = await response.json();
            setResult(data);

            if (data.success) {
                // Capture Hunt data in registry for future reference
                const keywordsToCapture = enrichedKeywords ||
                    (keywords?.map(k => ({ keyword: k, niche })) || []);

                // Transform trends to SelectedTrend[] format (add required selectedAt)
                const trendsToCapture = trends?.map(t => ({
                    ...t,
                    selectedAt: Date.now()
                }));

                captureHuntDataForDomain(domain, keywordsToCapture, trendsToCapture, niche);

                // Link WP Site to domain in registry
                const registry = useHuntDataRegistry.getState();

                // Auto-register the site in WordPress store with full metadata
                let wpSiteId = '';
                try {
                    const newSite = addSite({
                        name: domain,
                        url: `https://${domain}`,
                        username: '', // User needs to add from WP admin
                        appPassword: '', // User needs to create from WP admin
                        // NEW: Persist Hunt data for BI tracking
                        niche: niche || '',
                        siteType: 'general', // Default, user can update
                        hostingProvider: 'hostinger',
                        provisionedVia: 'hostinger-mcp',
                    });
                    wpSiteId = newSite.id;

                    // Link WP Site to domain in registry
                    registry.linkWPSite(domain, wpSiteId);

                    console.log(`[CreateSite] Auto-registered ${domain} in WordPress store (ID: ${wpSiteId}, niche: ${niche})`);
                } catch (regError) {
                    console.error('[CreateSite] Failed to auto-register site:', regError);
                }

                // Auto-create draft campaign linked to this site with FULL Hunt context
                const hasKeywords = (enrichedKeywords && enrichedKeywords.length > 0) ||
                    (keywords && keywords.length > 0);

                if (wpSiteId && hasKeywords) {
                    try {
                        const { createCampaign } = useCampaignStore.getState();

                        // Build huntContext from captured data
                        const huntContext: HuntCampaignContext | undefined = registry.buildCampaignContext(domain);

                        // Get keywords for source config
                        const keywordStrings = enrichedKeywords?.map(k => k.keyword) || keywords || [];

                        const newCampaign = createCampaign({
                            name: `${domain} - ${niche || 'Content Campaign'}`,
                            description: `Auto-created campaign for ${domain}`,
                            status: 'draft',
                            targetSiteId: wpSiteId,
                            postStatus: 'draft',
                            source: {
                                type: 'keywords',
                                config: {
                                    type: 'keywords',
                                    keywords: keywordStrings,
                                    rotateMode: 'sequential',
                                    currentIndex: 0,
                                    skipUsed: true
                                }
                            },
                            // NEW: Full Hunt context with enriched data
                            huntContext,
                            aiConfig: {
                                provider: 'gemini',
                                articleType: 'pillar',
                                tone: 'professional',
                                targetLength: 1500,
                                useResearch: true,
                                includeImages: true,
                                optimizeForSEO: true,
                                includeSchema: true,
                                includeFAQ: true
                            },
                            schedule: {
                                type: 'manual',
                                maxPostsPerRun: 1,
                                pauseOnError: true
                            }
                        });

                        // Link campaign to domain in registry
                        if (newCampaign?.id) {
                            registry.linkCampaign(domain, newCampaign.id);
                        }

                        console.log(`[CreateSite] Auto-created campaign for ${domain} with ${keywordStrings.length} keywords (huntContext: ${huntContext ? 'yes' : 'no'})`);
                    } catch (campError) {
                        console.error('[CreateSite] Failed to create campaign:', campError);
                    }
                }

                onSuccess?.(data);
            } else {
                onError?.(data.error || 'Provisioning failed');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setResult({
                success: false,
                steps: [{ step: 'Request', status: 'failed', message: errorMessage }],
                error: errorMessage
            });
            onError?.(errorMessage);
        } finally {
            setStage('idle');
        }
    };

    const getStepIcon = (status: ProvisionStep['status']) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'failed':
                return <XCircle className="w-4 h-4 text-red-500" />;
            case 'skipped':
                return <div className="w-4 h-4 rounded-full bg-gray-300" />;
            case 'pending':
                return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
        }
    };

    // Stage: Idle - Show initial button
    if (stage === 'idle' && !result) {
        return (
            <div className="space-y-2">
                {error && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}
                <button
                    onClick={fetchOrders}
                    disabled={disabled}
                    className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg font-medium
                        transition-all duration-200
                        bg-gradient-to-r from-purple-600 to-blue-600 text-white 
                        hover:from-purple-700 hover:to-blue-700 shadow-md hover:shadow-lg
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        ${className}
                    `}
                >
                    <Sparkles className="w-4 h-4" />
                    Create Website
                </button>
            </div>
        );
    }

    // Stage: Loading orders
    if (stage === 'loading-orders') {
        return (
            <button
                disabled
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium
                    bg-blue-100 text-blue-500 cursor-wait
                    ${className}
                `}
            >
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading hosting plans...
            </button>
        );
    }

    // Stage: Select order
    if (stage === 'select-order') {
        return (
            <div className={`border border-purple-200 rounded-lg p-3 bg-purple-50 space-y-3 ${className}`}>
                <div className="flex items-center gap-2 text-sm font-medium text-purple-800">
                    <Server className="w-4 h-4" />
                    Select Hosting Plan
                </div>

                <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                    <option value="">Choose a plan...</option>
                    {orders.map((order) => (
                        <option key={order.id || order.order_id} value={order.id || order.order_id}>
                            {getPlanName(order.plan)} - {order.domain || 'No domain'} ({order.status})
                        </option>
                    ))}
                </select>

                <div className="flex gap-2">
                    <button
                        onClick={() => { setStage('idle'); setError(null); }}
                        className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleProvision}
                        disabled={!selectedOrderId}
                        className={`
                            flex-1 px-3 py-2 rounded-lg text-sm font-medium
                            ${selectedOrderId
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }
                        `}
                    >
                        Create Website
                    </button>
                </div>
            </div>
        );
    }

    // Stage: Provisioning
    if (stage === 'provisioning') {
        return (
            <button
                disabled
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium
                    bg-blue-100 text-blue-500 cursor-wait
                    ${className}
                `}
            >
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Site...
            </button>
        );
    }

    // Show result card
    if (result) {
        return (
            <div className={`border rounded-lg overflow-hidden ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'} ${className}`}>
                {/* Header */}
                <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {result.success ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                            {result.success ? 'Site Created!' : 'Provisioning Failed'}
                        </span>
                    </div>
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>

                {/* Success message */}
                {result.success && result.website && (
                    <div className="px-3 pb-3 space-y-2">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-green-700 font-medium">✓ Site registered in WP Sites</span>
                            {keywords && keywords.length > 0 && (
                                <span className="text-xs text-green-700 font-medium">
                                    ✓ Campaign created with {keywords.length} keywords
                                </span>
                            )}
                            <span className="text-xs text-gray-600">
                                Next: Add WordPress credentials, then activate campaign
                            </span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <a
                                href={`https://${result.website.domain}/wp-admin`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                            >
                                <ExternalLink className="w-3 h-3" />
                                WP Admin
                            </a>
                            <a
                                href="https://hpanel.hostinger.com/websites"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200"
                            >
                                <ExternalLink className="w-3 h-3" />
                                Hostinger
                            </a>
                        </div>
                    </div>
                )}

                {/* Details */}
                {showDetails && (
                    <div className="border-t bg-white/50 p-3 space-y-2">
                        {result.steps.map((step, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                                {getStepIcon(step.status)}
                                <div>
                                    <span className="font-medium text-gray-700">{step.step}</span>
                                    {step.message && (
                                        <p className="text-gray-500 text-xs">{step.message}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Retry button */}
                {!result.success && (
                    <div className="border-t p-3">
                        <button
                            onClick={() => { setResult(null); fetchOrders(); }}
                            className="w-full px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                        >
                            Retry
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return null;
}

export default CreateSiteButton;
