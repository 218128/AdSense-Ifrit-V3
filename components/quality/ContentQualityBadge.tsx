'use client';

/**
 * Content Quality Badge Component
 * FSD: components/quality/ContentQualityBadge.tsx
 * 
 * Displays content quality score with visual indicators.
 */

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, TrendingUp } from 'lucide-react';

interface ContentQualityBadgeProps {
    score?: number;
    grade?: 'A' | 'B' | 'C' | 'D' | 'F';
    adsenseReady?: boolean;
    showDetails?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const gradeColors = {
    A: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
    B: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    C: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
    D: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
    F: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
};

export function ContentQualityBadge({
    score = 0,
    grade = 'F',
    adsenseReady = false,
    showDetails = false,
    size = 'md',
}: ContentQualityBadgeProps) {
    const colors = gradeColors[grade];

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
        lg: 'text-base px-4 py-2',
    };

    return (
        <div className="flex items-center gap-2">
            {/* Score Badge */}
            <div className={`
                inline-flex items-center gap-1.5 rounded-full border
                ${colors.bg} ${colors.text} ${colors.border}
                ${sizeClasses[size]}
            `}>
                <span className="font-bold">{grade}</span>
                <span className="opacity-75">({score}%)</span>
            </div>

            {/* AdSense Ready Indicator */}
            {showDetails && (
                <div className={`
                    inline-flex items-center gap-1 text-xs
                    ${adsenseReady ? 'text-green-600' : 'text-amber-600'}
                `}>
                    {adsenseReady ? (
                        <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Ready</span>
                        </>
                    ) : (
                        <>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Improve</span>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Content Quality Card - Detailed view with all checks
 */
interface QualityCheck {
    name: string;
    passed: boolean;
    score: number;
    message: string;
    suggestion?: string;
}

interface ContentQualityCardProps {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    adsenseReady: boolean;
    checks: QualityCheck[];
}

export function ContentQualityCard({
    score,
    grade,
    adsenseReady,
    checks,
}: ContentQualityCardProps) {
    const colors = gradeColors[grade];
    const passedChecks = checks.filter(c => c.passed).length;

    return (
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors.bg}`}>
                        <span className={`text-xl font-bold ${colors.text}`}>{grade}</span>
                    </div>
                    <div>
                        <div className="font-semibold text-neutral-900">Quality Score</div>
                        <div className="text-sm text-neutral-500">{score}% • {passedChecks}/{checks.length} checks passed</div>
                    </div>
                </div>
                <div className={`
                    px-3 py-1 rounded-full text-sm font-medium
                    ${adsenseReady ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}
                `}>
                    {adsenseReady ? '✓ AdSense Ready' : '⚠ Needs Work'}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden mb-4">
                <div
                    className={`h-full rounded-full transition-all ${score >= 75 ? 'bg-green-500' :
                            score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                    style={{ width: `${score}%` }}
                />
            </div>

            {/* Checks List */}
            <div className="space-y-2">
                {checks.map((check, i) => (
                    <div
                        key={i}
                        className={`flex items-center justify-between p-2 rounded-lg ${check.passed ? 'bg-green-50' : 'bg-amber-50'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            {check.passed ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                                <AlertCircle className="w-4 h-4 text-amber-500" />
                            )}
                            <span className="text-sm font-medium text-neutral-700">{check.name}</span>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-neutral-600">{check.message}</div>
                            {check.suggestion && (
                                <div className="text-xs text-amber-600">{check.suggestion}</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Aggregate Quality Stats - For campaign/batch view
 */
interface AggregateQualityStatsProps {
    averageScore: number;
    totalPosts: number;
    adsenseReadyPosts: number;
    postsNeedingWork: number;
}

export function AggregateQualityStats({
    averageScore,
    totalPosts,
    adsenseReadyPosts,
    postsNeedingWork,
}: AggregateQualityStatsProps) {
    const readyPercentage = totalPosts > 0 ? Math.round((adsenseReadyPosts / totalPosts) * 100) : 0;

    return (
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-violet-600" />
                <h3 className="font-semibold text-neutral-900">Content Quality Overview</h3>
            </div>

            <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-violet-50 rounded-lg">
                    <div className="text-2xl font-bold text-violet-700">{averageScore}%</div>
                    <div className="text-xs text-violet-600">Avg Score</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700">{totalPosts}</div>
                    <div className="text-xs text-blue-600">Total Posts</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">{adsenseReadyPosts}</div>
                    <div className="text-xs text-green-600">AdSense Ready</div>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <div className="text-2xl font-bold text-amber-700">{postsNeedingWork}</div>
                    <div className="text-xs text-amber-600">Need Work</div>
                </div>
            </div>

            {/* Ready Progress */}
            <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-neutral-600">AdSense Readiness</span>
                    <span className="font-medium">{readyPercentage}%</span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${readyPercentage}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
