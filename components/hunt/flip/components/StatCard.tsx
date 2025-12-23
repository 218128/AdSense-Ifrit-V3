/**
 * StatCard Component
 * 
 * Displays a single metric for flip pipeline stats.
 * Pure presentational component.
 */

'use client';

// ============ PROPS ============

export interface StatCardProps {
    /** Label for the stat */
    label: string;
    /** Value to display */
    value: string | number;
    /** Color theme */
    color?: 'gray' | 'green' | 'blue' | 'purple' | 'orange';
}

// ============ COMPONENT ============

const colorClasses = {
    gray: 'bg-neutral-50 text-neutral-700',
    green: 'bg-green-50 text-green-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
};

export function StatCard({ label, value, color = 'gray' }: StatCardProps) {
    return (
        <div className={`p-4 rounded-xl ${colorClasses[color]}`}>
            <div className="text-sm font-medium opacity-75">{label}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
        </div>
    );
}
