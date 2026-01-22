'use client';

/**
 * ROI Prediction Card
 * FSD: features/campaigns/components/ROIPredictionCard.tsx
 *
 * Shows predicted revenue and engagement for content before publishing.
 * Uses statistical prediction model (no AI API calls).
 */

import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Eye, AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react';
import { predictContentROI, type ContentAttributes, type ROIPrediction } from '@/lib/analytics';

interface ROIPredictionCardProps {
    attributes: Partial<ContentAttributes>;
    className?: string;
}

export function ROIPredictionCard({ attributes, className = '' }: ROIPredictionCardProps) {
    const [prediction, setPrediction] = useState<ROIPrediction | null>(null);

    useEffect(() => {
        // Build complete attributes with defaults
        const fullAttributes: ContentAttributes = {
            topic: attributes.topic || 'general',
            niche: attributes.niche || 'lifestyle',
            wordCount: attributes.wordCount || 0,
            hasImages: attributes.hasImages ?? true,
            hasFAQ: attributes.hasFAQ ?? false,
            hasSchema: attributes.hasSchema ?? false,
            includesAffiliateLinks: attributes.includesAffiliateLinks ?? false,
            template: attributes.template || 'default',
            publishHour: attributes.publishHour ?? new Date().getHours(),
        };

        if (fullAttributes.wordCount > 0 || fullAttributes.niche) {
            const result = predictContentROI(fullAttributes);
            setPrediction(result);
        }
    }, [attributes]);

    if (!prediction) {
        return (
            <div className={`bg-neutral-50 rounded-xl p-4 border border-neutral-200 ${className}`}>
                <div className="text-center text-neutral-400 py-4">
                    <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Configure content to see ROI prediction</p>
                </div>
            </div>
        );
    }

    const getRiskColor = (risk: string) => {
        switch (risk) {
            case 'low': return 'text-green-600 bg-green-100';
            case 'medium': return 'text-amber-600 bg-amber-100';
            case 'high': return 'text-red-600 bg-red-100';
            default: return 'text-neutral-600 bg-neutral-100';
        }
    };

    const formatCurrency = (n: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(n);
    };

    return (
        <div className={`bg-white rounded-xl border border-neutral-200 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span className="font-medium text-neutral-800">ROI Prediction</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getRiskColor(prediction.riskLevel)}`}>
                        {prediction.riskLevel} risk
                    </span>
                    <span className="text-xs text-neutral-500">
                        {prediction.confidenceScore}% confidence
                    </span>
                </div>
            </div>

            {/* Revenue Projections */}
            <div className="p-4 grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-neutral-50 rounded-lg">
                    <div className="text-xs text-neutral-500 mb-1">30 Days</div>
                    <div className="text-lg font-bold text-green-600">
                        {formatCurrency(prediction.expectedRevenue.day30)}
                    </div>
                    <div className="text-xs text-neutral-400">
                        {prediction.expectedPageViews.day30.toLocaleString()} views
                    </div>
                </div>
                <div className="text-center p-3 bg-neutral-50 rounded-lg">
                    <div className="text-xs text-neutral-500 mb-1">90 Days</div>
                    <div className="text-lg font-bold text-green-600">
                        {formatCurrency(prediction.expectedRevenue.day90)}
                    </div>
                    <div className="text-xs text-neutral-400">
                        {prediction.expectedPageViews.day90.toLocaleString()} views
                    </div>
                </div>
                <div className="text-center p-3 bg-indigo-50 rounded-lg">
                    <div className="text-xs text-indigo-600 mb-1">1 Year</div>
                    <div className="text-lg font-bold text-indigo-700">
                        {formatCurrency(prediction.expectedRevenue.day365)}
                    </div>
                    <div className="text-xs text-indigo-400">
                        {prediction.expectedPageViews.day365.toLocaleString()} views
                    </div>
                </div>
            </div>

            {/* Expected RPM */}
            <div className="px-4 pb-3">
                <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                    <span className="text-sm text-green-700">Expected RPM</span>
                    <span className="font-bold text-green-800">${prediction.expectedRPM.toFixed(2)}</span>
                </div>
            </div>

            {/* Key Factors */}
            {prediction.factors.length > 0 && (
                <div className="px-4 pb-3">
                    <div className="text-xs font-medium text-neutral-500 mb-2">Key Factors</div>
                    <div className="flex flex-wrap gap-1.5">
                        {prediction.factors.slice(0, 4).map((factor, i) => (
                            <span
                                key={i}
                                className={`text-xs px-2 py-0.5 rounded-full ${factor.impact === 'positive'
                                        ? 'bg-green-100 text-green-700'
                                        : factor.impact === 'negative'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-neutral-100 text-neutral-600'
                                    }`}
                                title={factor.description}
                            >
                                {factor.impact === 'positive' ? '✓' : factor.impact === 'negative' ? '✗' : '○'} {factor.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Recommendations */}
            {prediction.recommendations.length > 0 && (
                <div className="px-4 pb-4">
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <div className="flex items-center gap-1.5 text-amber-700 text-xs font-medium mb-1.5">
                            <Lightbulb className="w-3.5 h-3.5" />
                            Recommendations
                        </div>
                        <ul className="text-xs text-amber-800 space-y-1">
                            {prediction.recommendations.map((rec, i) => (
                                <li key={i}>• {rec}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ROIPredictionCard;
