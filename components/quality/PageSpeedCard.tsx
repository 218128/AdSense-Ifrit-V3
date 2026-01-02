'use client';

/**
 * PageSpeed Card Component
 * FSD: components/quality/PageSpeedCard.tsx
 * 
 * Displays Core Web Vitals from PageSpeed Insights.
 */

import { useState } from 'react';
import { Gauge, RefreshCw, CheckCircle, AlertCircle, XCircle, Smartphone, Monitor } from 'lucide-react';

interface CoreWebVitals {
    lcp: number;
    fid: number;
    cls: number;
    fcp: number;
    ttfb: number;
}

interface PageSpeedCardProps {
    url?: string;
    onTest?: (url: string, strategy: 'mobile' | 'desktop') => void;
}

export function PageSpeedCard({ url, onTest }: PageSpeedCardProps) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{
        score: number;
        vitals: CoreWebVitals;
        passed: { lcp: boolean; fid: boolean; cls: boolean };
        adsenseReady: boolean;
        strategy: string;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [inputUrl, setInputUrl] = useState(url || '');
    const [strategy, setStrategy] = useState<'mobile' | 'desktop'>('mobile');

    const runTest = async () => {
        if (!inputUrl) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/pagespeed?url=${encodeURIComponent(inputUrl)}&strategy=${strategy}`);
            const data = await res.json();

            if (data.success) {
                setResult({
                    score: data.score,
                    vitals: data.vitals,
                    passed: data.passed,
                    adsenseReady: data.adsenseReady,
                    strategy: data.strategy,
                });
            } else {
                setError(data.error || 'Failed to fetch PageSpeed data');
            }

            onTest?.(inputUrl, strategy);
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (ms: number): string => {
        if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
        return `${Math.round(ms)}ms`;
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-600';
        if (score >= 50) return 'text-orange-500';
        return 'text-red-500';
    };

    const getScoreBg = (score: number) => {
        if (score >= 90) return 'bg-green-100';
        if (score >= 50) return 'bg-orange-100';
        return 'bg-red-100';
    };

    return (
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Gauge className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-neutral-900">PageSpeed Insights</h3>
                    <p className="text-sm text-neutral-500">Core Web Vitals</p>
                </div>
            </div>

            {/* URL Input */}
            <div className="mb-4">
                <div className="flex gap-2">
                    <input
                        type="url"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <div className="flex border border-neutral-300 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setStrategy('mobile')}
                            className={`px-3 py-2 ${strategy === 'mobile' ? 'bg-blue-100 text-blue-700' : 'bg-white text-neutral-500'}`}
                            title="Mobile"
                        >
                            <Smartphone className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setStrategy('desktop')}
                            className={`px-3 py-2 ${strategy === 'desktop' ? 'bg-blue-100 text-blue-700' : 'bg-white text-neutral-500'}`}
                            title="Desktop"
                        >
                            <Monitor className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={runTest}
                        disabled={loading || !inputUrl}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Test
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="space-y-4">
                    {/* Overall Score */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getScoreBg(result.score)}`}>
                                <span className={`text-2xl font-bold ${getScoreColor(result.score)}`}>
                                    {result.score}
                                </span>
                            </div>
                            <div>
                                <div className="font-medium text-neutral-900">Performance Score</div>
                                <div className="text-sm text-neutral-500">{result.strategy} test</div>
                            </div>
                        </div>
                        <div className={`
                            px-3 py-1 rounded-full text-sm font-medium
                            ${result.adsenseReady ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}
                        `}>
                            {result.adsenseReady ? '✓ AdSense Ready' : '⚠ Needs Work'}
                        </div>
                    </div>

                    {/* Core Web Vitals */}
                    <div className="grid grid-cols-3 gap-3">
                        <MetricCard
                            label="LCP"
                            sublabel="Largest Contentful Paint"
                            value={formatTime(result.vitals.lcp)}
                            passed={result.passed.lcp}
                            threshold="< 2.5s"
                        />
                        <MetricCard
                            label="FID"
                            sublabel="First Input Delay"
                            value={formatTime(result.vitals.fid)}
                            passed={result.passed.fid}
                            threshold="< 100ms"
                        />
                        <MetricCard
                            label="CLS"
                            sublabel="Cumulative Layout Shift"
                            value={result.vitals.cls.toFixed(3)}
                            passed={result.passed.cls}
                            threshold="< 0.1"
                        />
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!result && !loading && !error && (
                <div className="text-center py-6 text-neutral-400">
                    <Gauge className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Enter a URL and click Test to check Core Web Vitals</p>
                </div>
            )}
        </div>
    );
}

function MetricCard({
    label,
    sublabel,
    value,
    passed,
    threshold
}: {
    label: string;
    sublabel: string;
    value: string;
    passed: boolean;
    threshold: string;
}) {
    return (
        <div className={`p-3 rounded-lg ${passed ? 'bg-green-50' : 'bg-amber-50'}`}>
            <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-semibold ${passed ? 'text-green-700' : 'text-amber-700'}`}>
                    {label}
                </span>
                {passed ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                )}
            </div>
            <div className={`text-lg font-bold ${passed ? 'text-green-700' : 'text-amber-700'}`}>
                {value}
            </div>
            <div className="text-xs text-neutral-500">{sublabel}</div>
            <div className="text-xs text-neutral-400 mt-1">Good: {threshold}</div>
        </div>
    );
}
