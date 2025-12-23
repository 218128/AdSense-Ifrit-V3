'use client';

/**
 * Scorer ScoreCard Component
 * 
 * Extracted from DomainScorer.tsx - displays a single score metric with bar.
 */

export interface ScorerScoreCardProps {
    icon: React.ReactNode;
    label: string;
    score: number;
}

export function ScorerScoreCard({
    icon,
    label,
    score,
}: ScorerScoreCardProps) {
    const getColor = (s: number) => {
        if (s >= 70) return 'text-green-600';
        if (s >= 50) return 'text-yellow-600';
        if (s >= 30) return 'text-orange-600';
        return 'text-red-600';
    };

    const getBg = (s: number) => {
        if (s >= 70) return 'bg-green-100';
        if (s >= 50) return 'bg-yellow-100';
        if (s >= 30) return 'bg-orange-100';
        return 'bg-red-100';
    };

    return (
        <div className="p-3 border rounded-lg">
            <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                {icon}
                {label}
            </div>
            <div className="flex items-center gap-2">
                <div
                    className={`text-xl font-bold ${getColor(score)}`}
                >
                    {score}
                </div>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${getBg(score)} transition-all`}
                        style={{ width: `${score}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
