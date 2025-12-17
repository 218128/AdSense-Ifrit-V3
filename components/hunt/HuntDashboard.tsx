'use client';

/**
 * Hunt Dashboard Component
 * 
 * Power-user mode for:
 * - Keywords/Niches hunting
 * - Domain acquisition (find → analyze → purchase)
 * - Domain flipping pipeline
 * 
 * Uses Zustand store for state management.
 */

import { useState, useCallback } from 'react';
import {
    Search,
    TrendingUp,
    Globe,
    Database,
    Target,
    BarChart3,
    ShoppingCart,
    RefreshCw,
    ArrowRight
} from 'lucide-react';

// State management
import { useHuntStore, AnalyzeCandidate } from '@/stores/huntStore';

// Import keyword hunting tools
import KeywordHunter from './KeywordHunter';

// Import domain tools
import {
    ExpiredDomainFinder,
    DomainScorer,
    CloudflareManager,
    FlipPipeline,
    PurchaseQueue
} from './DomainDomination';

type HuntSubTab = 'keywords' | 'domains' | 'flip';
type DomainStep = 'find' | 'analyze' | 'purchase';

export default function HuntDashboard() {
    const [subTab, setSubTab] = useState<HuntSubTab>('keywords');
    const [domainStep, setDomainStep] = useState<DomainStep>('find');
    const [domainSearchKeywords, setDomainSearchKeywords] = useState<string[]>([]);

    // Use Zustand store instead of local state
    const {
        analyzeQueue,
        purchaseQueue,
        addToAnalyze,
        addToPurchase,
        removeFromAnalyze,
        removeFromPurchase,
        clearPurchaseQueue,
        markAsPurchased
    } = useHuntStore();

    // Handle navigation from KeywordHunter to Domain Acquire tab
    const handleNavigateToDomains = useCallback((keywords: string[]) => {
        setDomainSearchKeywords(keywords);
        setSubTab('domains');
        setDomainStep('find');
    }, []);

    // Handle sending domains to Analyze step (uses Zustand)
    const handleSendToAnalyze = useCallback((domains: AnalyzeCandidate[]) => {
        addToAnalyze(domains);
        setDomainStep('analyze');
    }, [addToAnalyze]);

    // Handle adding domains to purchase queue (uses Zustand)
    const handleAddToPurchaseQueue = useCallback((domain: AnalyzeCandidate) => {
        addToPurchase(domain);
    }, [addToPurchase]);

    // Handle quick-queue (skip analyze, go directly to purchase)
    const handleQuickQueue = useCallback((domains: AnalyzeCandidate[]) => {
        domains.forEach(d => addToPurchase(d));
        setDomainStep('purchase');
    }, [addToPurchase]);

    // Step badges showing queue counts
    const getStepBadge = (step: DomainStep) => {
        switch (step) {
            case 'analyze':
                return analyzeQueue.length > 0 ? (
                    <span className="ml-1 px-1.5 py-0.5 bg-white/20 text-xs rounded-full">
                        {analyzeQueue.length}
                    </span>
                ) : null;
            case 'purchase':
                return purchaseQueue.length > 0 ? (
                    <span className="ml-1 px-1.5 py-0.5 bg-white/20 text-xs rounded-full">
                        {purchaseQueue.length}
                    </span>
                ) : null;
            default:
                return null;
        }
    };

    const DOMAIN_STEPS: { id: DomainStep; label: string; icon: React.ReactNode; description: string }[] = [
        { id: 'find', label: '1. Find', icon: <Search className="w-4 h-4" />, description: 'Discover & filter expired domains' },
        { id: 'analyze', label: '2. Analyze', icon: <BarChart3 className="w-4 h-4" />, description: 'Deep dive with Wayback & blacklist check' },
        { id: 'purchase', label: '3. Purchase', icon: <ShoppingCart className="w-4 h-4" />, description: 'Buy from registrars → workflow complete!' },
    ];

    return (
        <div className="space-y-6">
            {/* Hunt Mode Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                    <Search className="w-8 h-8" />
                    <h2 className="text-2xl font-bold">🔍 Hunt Mode</h2>
                </div>
                <p className="text-amber-100">
                    Power-user discovery. Find HIGH-CPC keywords, acquire valuable domains, track flips.
                </p>
            </div>

            {/* Sub-tab Navigation */}
            <div className="flex gap-2 bg-white rounded-xl p-2 shadow-sm border border-neutral-200">
                <button
                    onClick={() => setSubTab('keywords')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${subTab === 'keywords'
                        ? 'bg-amber-500 text-white shadow-md'
                        : 'text-neutral-600 hover:bg-neutral-100'
                        }`}
                >
                    <TrendingUp className="w-5 h-5" />
                    <span>Keywords/Niches</span>
                </button>
                <button
                    onClick={() => setSubTab('domains')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${subTab === 'domains'
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'text-neutral-600 hover:bg-neutral-100'
                        }`}
                >
                    <Globe className="w-5 h-5" />
                    <span>Domain Acquire</span>
                    {(analyzeQueue.length > 0 || purchaseQueue.length > 0) && (
                        <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">
                            {analyzeQueue.length + purchaseQueue.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setSubTab('flip')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${subTab === 'flip'
                        ? 'bg-pink-500 text-white shadow-md'
                        : 'text-neutral-600 hover:bg-neutral-100'
                        }`}
                >
                    <Database className="w-5 h-5" />
                    <span>Flip Pipeline</span>
                </button>
            </div>

            {/* Sub-tab Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
                {/* Keywords/Niches Tab */}
                {subTab === 'keywords' && (
                    <div className="space-y-6">
                        <div className="p-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                                        <Target className="w-5 h-5" />
                                        Keywords/Niches Hunter
                                    </h3>
                                    <p className="text-sm text-amber-700 mt-1">
                                        Find HIGH-CPC keywords, analyze, then hunt domains.
                                    </p>
                                </div>
                                <div className="text-right text-sm text-amber-600">
                                    <span className="bg-amber-200 px-2 py-1 rounded font-medium">
                                        💰 Revenue Optimized
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <KeywordHunter
                                onNavigateToDomains={handleNavigateToDomains}
                                onSelect={(topic) => {
                                    console.log('Selected keyword:', topic);
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Domain Acquire Tab - Step by Step */}
                {subTab === 'domains' && (
                    <div>
                        {/* Keywords from Hunter Banner */}
                        {domainSearchKeywords.length > 0 && (
                            <div className="px-6 py-3 bg-indigo-50 border-b border-indigo-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Target className="w-4 h-4 text-indigo-600" />
                                        <span className="text-sm font-medium text-indigo-800">
                                            Hunting domains for:
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                            {domainSearchKeywords.slice(0, 3).map((kw, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                                                    {kw.length > 30 ? kw.substring(0, 30) + '...' : kw}
                                                </span>
                                            ))}
                                            {domainSearchKeywords.length > 3 && (
                                                <span className="text-xs text-indigo-600">
                                                    +{domainSearchKeywords.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setDomainSearchKeywords([])}
                                        className="text-xs text-indigo-500 hover:text-indigo-700"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step Navigation with Queue Badges */}
                        <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200">
                            <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2 mb-4">
                                <Globe className="w-5 h-5" />
                                Domain Acquisition Workflow
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {DOMAIN_STEPS.map((step, index) => (
                                    <div key={step.id} className="flex items-center">
                                        <button
                                            onClick={() => setDomainStep(step.id)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${domainStep === step.id
                                                ? 'bg-emerald-600 text-white shadow-md'
                                                : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                                                }`}
                                        >
                                            {step.icon}
                                            <span>{step.label}</span>
                                            {getStepBadge(step.id)}
                                        </button>
                                        {index < DOMAIN_STEPS.length - 1 && (
                                            <ArrowRight className="w-4 h-4 mx-1 text-emerald-300" />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <p className="text-sm text-emerald-600 mt-2">
                                {DOMAIN_STEPS.find(s => s.id === domainStep)?.description}
                            </p>
                        </div>

                        {/* Step Content */}
                        <div className="p-6">
                            {domainStep === 'find' && (
                                <ExpiredDomainFinder
                                    initialKeywords={domainSearchKeywords}
                                    onAnalyze={handleSendToAnalyze}
                                    onQuickQueue={handleQuickQueue}
                                />
                            )}
                            {domainStep === 'analyze' && (
                                <DomainScorer
                                    analyzeQueue={analyzeQueue}
                                    onAddToQueue={handleAddToPurchaseQueue}
                                    onDiscard={(domain) => removeFromAnalyze(domain)}
                                    onGoToFind={() => setDomainStep('find')}
                                    onGoToPurchase={() => setDomainStep('purchase')}
                                />
                            )}
                            {domainStep === 'purchase' && (
                                <PurchaseQueue
                                    queue={purchaseQueue}
                                    onRemove={removeFromPurchase}
                                    onClear={clearPurchaseQueue}
                                    onMarkPurchased={markAsPurchased}
                                />
                            )}
                        </div>

                        {/* Renewal Helper Utility - Separate from main workflow */}
                        <div className="mx-6 mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <RefreshCw className="w-5 h-5 text-amber-600" />
                                    <span className="font-semibold text-amber-800">💰 Renewal Helper</span>
                                    <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Utility Tool</span>
                                </div>
                                <span className="text-xs text-amber-500">Manage renewals at-cost via Cloudflare</span>
                            </div>
                            <CloudflareManager />
                        </div>
                    </div>
                )}

                {/* Flip Pipeline Tab */}
                {subTab === 'flip' && (
                    <div className="p-6">
                        <FlipPipeline />
                    </div>
                )}
            </div>
        </div>
    );
}
