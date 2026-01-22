'use client';

/**
 * A/B Testing Panel
 * FSD: components/dashboard/ABTestingPanel.tsx
 *
 * Dashboard panel for viewing and managing A/B tests.
 * Shows active tests, variant performance, and winner declaration.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    FlaskConical,
    TrendingUp,
    CheckCircle,
    Clock,
    Pause,
    Play,
    Trophy,
    RefreshCw,
    MoreVertical,
    BarChart2,
    Eye,
    MousePointer,
    Target
} from 'lucide-react';

// Types from abTesting.ts
interface ABVariant {
    id: string;
    type: 'title' | 'excerpt' | 'cta' | 'cover_image' | 'content';
    content: string;
    imageUrl?: string;
    impressions: number;
    clicks: number;
    conversions: number;
}

interface ABTest {
    id: string;
    name: string;
    postId: number;
    siteId: string;
    variants: ABVariant[];
    status: 'running' | 'completed' | 'paused';
    startedAt: number;
    completedAt?: number;
    winnerId?: string;
}

// Mock data for now - in production, this would come from a store
const MOCK_TESTS: ABTest[] = [
    {
        id: 'ab-001',
        name: 'Best AI Tools 2026 - Title Test',
        postId: 123,
        siteId: 'site-1',
        status: 'running',
        startedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
        variants: [
            { id: 'v1', type: 'title', content: '10 Best AI Tools for Developers in 2026', impressions: 1250, clicks: 187, conversions: 24 },
            { id: 'v2', type: 'title', content: 'Top AI Tools Every Developer Needs (2026 Guide)', impressions: 1180, clicks: 201, conversions: 31 },
        ],
    },
    {
        id: 'ab-002',
        name: 'React Tutorial - Cover Image Test',
        postId: 456,
        siteId: 'site-1',
        status: 'completed',
        startedAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
        completedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
        winnerId: 'v2',
        variants: [
            { id: 'v1', type: 'cover_image', content: 'Abstract code pattern', impressions: 2400, clicks: 312, conversions: 45 },
            { id: 'v2', type: 'cover_image', content: 'Developer at laptop', impressions: 2350, clicks: 398, conversions: 67 },
        ],
    },
];

export function ABTestingPanel() {
    const [tests, setTests] = useState<ABTest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTest, setSelectedTest] = useState<string | null>(null);

    const loadTests = useCallback(async () => {
        setLoading(true);
        try {
            // TODO: Implement actual store for A/B tests
            // For now use mock data
            await new Promise(r => setTimeout(r, 500));
            setTests(MOCK_TESTS);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTests();
    }, [loadTests]);

    const calculateCTR = (variant: ABVariant) => {
        if (variant.impressions === 0) return 0;
        return (variant.clicks / variant.impressions * 100);
    };

    const calculateConversionRate = (variant: ABVariant) => {
        if (variant.clicks === 0) return 0;
        return (variant.conversions / variant.clicks * 100);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'running': return 'text-green-600 bg-green-100';
            case 'completed': return 'text-blue-600 bg-blue-100';
            case 'paused': return 'text-amber-600 bg-amber-100';
            default: return 'text-neutral-600 bg-neutral-100';
        }
    };

    const activeTests = tests.filter(t => t.status === 'running');
    const completedTests = tests.filter(t => t.status === 'completed');

    if (loading) {
        return (
            <div className="flex items-center justify-center h-48">
                <RefreshCw className="w-6 h-6 text-neutral-400 animate-spin" />
            </div>
        );
    }

    // Empty state
    if (tests.length === 0) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <FlaskConical className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-neutral-800">A/B Testing</h3>
                </div>

                <div className="text-center py-8 bg-neutral-50 rounded-xl border border-neutral-200">
                    <FlaskConical className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                    <h4 className="font-medium text-neutral-700 mb-2">No Active Tests</h4>
                    <p className="text-sm text-neutral-500 max-w-sm mx-auto">
                        Enable A/B testing in your campaign settings to automatically test title,
                        cover image, and content variations.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FlaskConical className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-neutral-800">A/B Testing</h3>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        {activeTests.length} active
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        {completedTests.length} completed
                    </span>
                </div>
            </div>

            {/* Active Tests */}
            {activeTests.length > 0 && (
                <div className="space-y-3">
                    <div className="text-xs font-medium text-neutral-500 uppercase">Active Tests</div>
                    {activeTests.map(test => (
                        <TestCard
                            key={test.id}
                            test={test}
                            calculateCTR={calculateCTR}
                            calculateConversionRate={calculateConversionRate}
                            getStatusColor={getStatusColor}
                            isExpanded={selectedTest === test.id}
                            onToggle={() => setSelectedTest(selectedTest === test.id ? null : test.id)}
                        />
                    ))}
                </div>
            )}

            {/* Completed Tests */}
            {completedTests.length > 0 && (
                <div className="space-y-3">
                    <div className="text-xs font-medium text-neutral-500 uppercase">Completed</div>
                    {completedTests.slice(0, 3).map(test => (
                        <TestCard
                            key={test.id}
                            test={test}
                            calculateCTR={calculateCTR}
                            calculateConversionRate={calculateConversionRate}
                            getStatusColor={getStatusColor}
                            isExpanded={selectedTest === test.id}
                            onToggle={() => setSelectedTest(selectedTest === test.id ? null : test.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface TestCardProps {
    test: ABTest;
    calculateCTR: (v: ABVariant) => number;
    calculateConversionRate: (v: ABVariant) => number;
    getStatusColor: (s: string) => string;
    isExpanded: boolean;
    onToggle: () => void;
}

function TestCard({ test, calculateCTR, calculateConversionRate, getStatusColor, isExpanded, onToggle }: TestCardProps) {
    const bestVariant = [...test.variants].sort((a, b) => calculateCTR(b) - calculateCTR(a))[0];
    const isWinner = test.winnerId === bestVariant?.id;

    return (
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
            {/* Header Row */}
            <button
                onClick={onToggle}
                className="w-full p-3 flex items-center justify-between hover:bg-neutral-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${test.status === 'completed' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                        {test.status === 'completed' ? (
                            <Trophy className="w-4 h-4 text-blue-600" />
                        ) : (
                            <FlaskConical className="w-4 h-4 text-purple-600" />
                        )}
                    </div>
                    <div className="text-left">
                        <div className="font-medium text-sm text-neutral-800 truncate max-w-[200px]">
                            {test.name}
                        </div>
                        <div className="text-xs text-neutral-500">
                            {test.variants.length} variants • Post #{test.postId}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(test.status)}`}>
                        {test.status}
                    </span>
                </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-t border-neutral-100 p-3 bg-neutral-50 space-y-3">
                    {/* Variant Comparison */}
                    {test.variants.map((variant, i) => {
                        const ctr = calculateCTR(variant);
                        const cvr = calculateConversionRate(variant);
                        const isLeading = variant.id === bestVariant?.id;

                        return (
                            <div
                                key={variant.id}
                                className={`p-3 rounded-lg ${isLeading ? 'bg-green-50 border border-green-200' : 'bg-white border'}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-neutral-500">
                                            Variant {String.fromCharCode(65 + i)}
                                        </span>
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-100 capitalize">
                                            {variant.type.replace('_', ' ')}
                                        </span>
                                        {isLeading && test.status === 'running' && (
                                            <span className="text-xs px-1.5 py-0.5 rounded bg-green-500 text-white">
                                                Leading
                                            </span>
                                        )}
                                        {test.winnerId === variant.id && (
                                            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500 text-white flex items-center gap-1">
                                                <Trophy className="w-3 h-3" /> Winner
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-sm text-neutral-700 mb-2 truncate">
                                    {variant.content}
                                </div>
                                <div className="grid grid-cols-4 gap-2 text-xs">
                                    <div className="flex items-center gap-1 text-neutral-600">
                                        <Eye className="w-3 h-3" />
                                        {variant.impressions.toLocaleString()}
                                    </div>
                                    <div className="flex items-center gap-1 text-neutral-600">
                                        <MousePointer className="w-3 h-3" />
                                        {variant.clicks.toLocaleString()}
                                    </div>
                                    <div className="flex items-center gap-1 text-green-600 font-medium">
                                        <BarChart2 className="w-3 h-3" />
                                        {ctr.toFixed(1)}% CTR
                                    </div>
                                    <div className="flex items-center gap-1 text-purple-600 font-medium">
                                        <Target className="w-3 h-3" />
                                        {cvr.toFixed(1)}% CVR
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Action Buttons */}
                    {test.status === 'running' && (
                        <div className="flex justify-end gap-2">
                            <button className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-200 rounded-lg flex items-center gap-1">
                                <Pause className="w-3 h-3" /> Pause
                            </button>
                            <button className="px-3 py-1.5 text-xs bg-green-600 text-white hover:bg-green-700 rounded-lg flex items-center gap-1">
                                <Trophy className="w-3 h-3" /> Declare Winner
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default ABTestingPanel;
