/**
 * ScoreCard Component
 * 
 * Displays a single score metric with progress bar.
 * Pure presentational component.
 */

'use client';

import type { ReactNode } from 'react';

// ============ PROPS ============

export interface ScoreCardProps {
    /** Icon to display */
    icon: ReactNode;
    /** Label for the metric */
    label: string;
    /** Score value (0-100) */
    score: number;
}

// ============ HELPERS ============

function getColor(score: number): string {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    if (score >= 30) return 'text-orange-600';
    return 'text-red-600';
}

function getBg(score: number): string {
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    if (score >= 30) return 'bg-orange-500';
    return 'bg-red-500';
}

// ============ COMPONENT ============

export function ScoreCard({ icon, label, score }: ScoreCardProps) {
    return (
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-neutral-500">{icon}</span>
                <span className="text-sm font-medium text-neutral-700">{label}</span>
            </div>

            <div className="flex items-center gap-3">
                <div className={`text-2xl font-bold ${getColor(score)}`}>
                    {score}
                </div>
                <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${getBg(score)} transition-all duration-500`}
                        style={{ width: `${score}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
