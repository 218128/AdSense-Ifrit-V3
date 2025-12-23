'use client';

/**
 * StatCard Component
 * 
 * Extracted from FlipPipeline.tsx - displays a single stat metric.
 */

export interface StatCardProps {
    label: string;
    value: string | number;
    color?: string;
}

export function StatCard({ label, value, color = 'gray' }: StatCardProps) {
    const colors: Record<string, string> = {
        gray: 'text-gray-800',
        green: 'text-green-600',
        red: 'text-red-600',
    };

    return (
        <div className="text-center">
            <div className="text-xs text-gray-500 uppercase">{label}</div>
            <div className={`text-xl font-bold ${colors[color]}`}>{value}</div>
        </div>
    );
}
