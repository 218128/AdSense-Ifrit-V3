'use client';

/**
 * Quality Score Panel Component
 * FSD: features/campaigns/components/QualityScorePanel.tsx
 * 
 * Phase 2 Integration: Displays E-E-A-T and fact-check scores after generation.
 */

import React from 'react';
import {
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    XCircle,
    BookOpen,
    Award,
    Shield,
    Heart,
    FileCheck,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface QualityScore {
    eeat: number;
    experience: number;
    expertise: number;
    authoritativeness: number;
    trustworthiness: number;
    factCheck?: number;
}

interface QualityScorePanelProps {
    score: QualityScore;
    recommendations?: string[];
    autoApproved?: boolean;
    needsManualReview?: boolean;
    reviewItemId?: string;
}

// ============================================================================
// Helper Components
// ============================================================================

function ScoreBar({
    label,
    score,
    icon: Icon,
    thresholds = { low: 50, medium: 70, high: 85 }
}: {
    label: string;
    score: number;
    icon: React.ElementType;
    thresholds?: { low: number; medium: number; high: number };
}) {
    let color = 'bg-red-500';
    let textColor = 'text-red-600';

    if (score >= thresholds.high) {
        color = 'bg-green-500';
        textColor = 'text-green-600';
    } else if (score >= thresholds.medium) {
        color = 'bg-blue-500';
        textColor = 'text-blue-600';
    } else if (score >= thresholds.low) {
        color = 'bg-yellow-500';
        textColor = 'text-yellow-600';
    }

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-neutral-600">
                    <Icon className="w-4 h-4" />
                    {label}
                </span>
                <span className={`font-medium ${textColor}`}>{score}</span>
            </div>
            <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} transition-all duration-500`}
                    style={{ width: `${score}%` }}
                />
            </div>
        </div>
    );
}

function GradeBadge({ score }: { score: number }) {
    let grade = 'F';
    let color = 'bg-red-100 text-red-700 border-red-200';

    if (score >= 90) {
        grade = 'A';
        color = 'bg-green-100 text-green-700 border-green-200';
    } else if (score >= 75) {
        grade = 'B';
        color = 'bg-blue-100 text-blue-700 border-blue-200';
    } else if (score >= 60) {
        grade = 'C';
        color = 'bg-yellow-100 text-yellow-700 border-yellow-200';
    } else if (score >= 40) {
        grade = 'D';
        color = 'bg-orange-100 text-orange-700 border-orange-200';
    }

    return (
        <div className={`w-16 h-16 rounded-xl ${color} border-2 flex flex-col items-center justify-center`}>
            <span className="text-2xl font-bold">{grade}</span>
            <span className="text-xs">{score}%</span>
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export function QualityScorePanel({
    score,
    recommendations = [],
    autoApproved,
    needsManualReview,
    reviewItemId,
}: QualityScorePanelProps) {
    return (
        <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-neutral-800 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Quality Score
                </h3>
                <GradeBadge score={score.eeat} />
            </div>

            {/* Review Status */}
            <div className={`p-3 rounded-lg flex items-center gap-2 ${autoApproved
                    ? 'bg-green-50 border border-green-200'
                    : needsManualReview
                        ? 'bg-amber-50 border border-amber-200'
                        : 'bg-neutral-50 border border-neutral-200'
                }`}>
                {autoApproved ? (
                    <>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-green-700 font-medium">Auto-Approved</span>
                    </>
                ) : needsManualReview ? (
                    <>
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        <div>
                            <span className="text-amber-700 font-medium block">Manual Review Required</span>
                            {reviewItemId && (
                                <span className="text-xs text-amber-600">Review ID: {reviewItemId}</span>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <XCircle className="w-5 h-5 text-red-500" />
                        <span className="text-red-700 font-medium">Rejected</span>
                    </>
                )}
            </div>

            {/* E-E-A-T Breakdown */}
            <div className="space-y-3">
                <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                    E-E-A-T Breakdown
                </h4>

                <ScoreBar
                    label="Experience"
                    score={score.experience}
                    icon={Heart}
                />
                <ScoreBar
                    label="Expertise"
                    score={score.expertise}
                    icon={Award}
                />
                <ScoreBar
                    label="Authoritativeness"
                    score={score.authoritativeness}
                    icon={BookOpen}
                />
                <ScoreBar
                    label="Trustworthiness"
                    score={score.trustworthiness}
                    icon={Shield}
                />

                {score.factCheck !== undefined && (
                    <div className="pt-2 mt-2 border-t border-neutral-100">
                        <ScoreBar
                            label="Fact Check"
                            score={score.factCheck}
                            icon={FileCheck}
                        />
                    </div>
                )}
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
                <div className="pt-2 border-t border-neutral-100">
                    <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
                        Improvements
                    </h4>
                    <ul className="space-y-1">
                        {recommendations.slice(0, 3).map((rec, i) => (
                            <li key={i} className="text-sm text-neutral-600 flex items-start gap-2">
                                <span className="text-amber-500">•</span>
                                {rec}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
