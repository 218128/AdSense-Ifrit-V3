'use client';

import { ReactNode } from 'react';

export interface SettingsCardProps {
    title: string;
    icon?: ReactNode;
    description?: string;
    variant?: 'default' | 'gradient';
    color?: 'neutral' | 'indigo' | 'emerald' | 'amber' | 'teal' | 'violet' | 'orange' | 'green' | 'blue';
    children: ReactNode;
    className?: string;
}

const colorClasses = {
    neutral: 'bg-neutral-800 border-neutral-700',
    indigo: 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200',
    emerald: 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200',
    amber: 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200',
    teal: 'bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200',
    violet: 'bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200',
    orange: 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200',
    green: 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200',
    blue: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200',
};

const textColorClasses = {
    neutral: 'text-white',
    indigo: 'text-indigo-900',
    emerald: 'text-emerald-900',
    amber: 'text-amber-900',
    teal: 'text-teal-900',
    violet: 'text-violet-900',
    orange: 'text-orange-900',
    green: 'text-green-900',
    blue: 'text-blue-900',
};

const descColorClasses = {
    neutral: 'text-neutral-400',
    indigo: 'text-indigo-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    teal: 'text-teal-600',
    violet: 'text-violet-600',
    orange: 'text-orange-600',
    green: 'text-green-600',
    blue: 'text-blue-600',
};

export function SettingsCard({
    title,
    icon,
    description,
    color = 'neutral',
    children,
    className = '',
}: SettingsCardProps) {
    return (
        <div className={`p-4 rounded-xl border ${colorClasses[color]} ${className}`}>
            <h4 className={`font-semibold mb-3 flex items-center gap-2 ${textColorClasses[color]}`}>
                {icon}
                {title}
            </h4>
            {description && (
                <p className={`text-xs mb-3 ${descColorClasses[color]}`}>
                    {description}
                </p>
            )}
            {children}
        </div>
    );
}

export default SettingsCard;
