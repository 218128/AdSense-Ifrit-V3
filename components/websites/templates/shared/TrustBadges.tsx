/**
 * TrustBadges Component
 * 
 * Display trust indicators for E-E-A-T compliance.
 * Shows badges like "Expert Reviewed", "Fact Checked", etc.
 */

import React from 'react';

export type BadgeType =
    | 'expert-reviewed'
    | 'fact-checked'
    | 'updated'
    | 'verified'
    | 'sourced'
    | 'editorial';

interface Badge {
    type: BadgeType;
    label?: string;
    date?: string;
}

interface TrustBadgesProps {
    badges: Badge[];
    variant?: 'banner' | 'inline' | 'footer';
    className?: string;
}

const BADGE_CONFIG: Record<BadgeType, { icon: string; defaultLabel: string; color: string }> = {
    'expert-reviewed': { icon: '👨‍⚕️', defaultLabel: 'Expert Reviewed', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    'fact-checked': { icon: '✓', defaultLabel: 'Fact Checked', color: 'bg-green-50 text-green-700 border-green-200' },
    'updated': { icon: '🔄', defaultLabel: 'Recently Updated', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    'verified': { icon: '✅', defaultLabel: 'Verified Information', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    'sourced': { icon: '📚', defaultLabel: 'Sources Cited', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    'editorial': { icon: '📝', defaultLabel: 'Editorial Guidelines', color: 'bg-gray-50 text-gray-700 border-gray-200' }
};

export default function TrustBadges({
    badges,
    variant = 'inline',
    className = ''
}: TrustBadgesProps) {
    if (badges.length === 0) return null;

    // Banner variant - full-width trust bar
    if (variant === 'banner') {
        return (
            <div className={`bg-gradient-to-r from-green-50 to-blue-50 border-y border-green-100 py-3 ${className}`}>
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
                        {badges.map((badge, idx) => {
                            const config = BADGE_CONFIG[badge.type];
                            return (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                    <span className="text-lg">{config.icon}</span>
                                    <span className="font-medium text-gray-700">
                                        {badge.label || config.defaultLabel}
                                    </span>
                                    {badge.date && (
                                        <span className="text-gray-500">({badge.date})</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // Footer variant - compact badges for article footer
    if (variant === 'footer') {
        return (
            <div className={`border-t border-gray-100 pt-4 mt-6 ${className}`}>
                <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-medium">
                    Content Quality
                </div>
                <div className="flex flex-wrap gap-2">
                    {badges.map((badge, idx) => {
                        const config = BADGE_CONFIG[badge.type];
                        return (
                            <span
                                key={idx}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${config.color}`}
                            >
                                <span>{config.icon}</span>
                                <span>{badge.label || config.defaultLabel}</span>
                            </span>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Inline variant - small badges for article headers
    return (
        <div className={`flex flex-wrap gap-2 ${className}`}>
            {badges.map((badge, idx) => {
                const config = BADGE_CONFIG[badge.type];
                return (
                    <span
                        key={idx}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border ${config.color}`}
                    >
                        <span>{config.icon}</span>
                        <span className="font-medium">{badge.label || config.defaultLabel}</span>
                        {badge.date && (
                            <span className="opacity-75">• {badge.date}</span>
                        )}
                    </span>
                );
            })}
        </div>
    );
}

// Quick presets for common badge combinations
export const TrustBadgePresets = {
    standard: [
        { type: 'fact-checked' as BadgeType },
        { type: 'sourced' as BadgeType }
    ],
    expert: [
        { type: 'expert-reviewed' as BadgeType },
        { type: 'fact-checked' as BadgeType },
        { type: 'sourced' as BadgeType }
    ],
    updated: (date: string) => [
        { type: 'updated' as BadgeType, date },
        { type: 'fact-checked' as BadgeType }
    ]
};
