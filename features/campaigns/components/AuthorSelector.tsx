'use client';

/**
 * Author Selector Component
 * FSD: features/campaigns/components/AuthorSelector.tsx
 * 
 * Phase 2 Integration: Select author for campaign with health score display.
 */

import React, { useMemo } from 'react';
import {
    User,
    AlertTriangle,
    CheckCircle,
    ChevronDown,
    Star,
} from 'lucide-react';
import { useAuthorStore, calculateAuthorHealthScore } from '@/features/authors';
import type { AuthorProfile, AuthorHealthScore } from '@/features/authors';

// ============================================================================
// Types
// ============================================================================

interface AuthorSelectorProps {
    selectedAuthorId?: string;
    siteId?: string;
    minHealthScore?: number;
    required?: boolean;
    onChange: (authorId: string | undefined) => void;
}

// ============================================================================
// Helper Components
// ============================================================================

function HealthBadge({ score, size = 'sm' }: { score: number; size?: 'sm' | 'md' }) {
    let color = 'bg-red-100 text-red-700';
    let label = 'Low';

    if (score >= 90) {
        color = 'bg-green-100 text-green-700';
        label = 'Excellent';
    } else if (score >= 75) {
        color = 'bg-blue-100 text-blue-700';
        label = 'Good';
    } else if (score >= 60) {
        color = 'bg-yellow-100 text-yellow-700';
        label = 'Fair';
    } else if (score >= 40) {
        color = 'bg-orange-100 text-orange-700';
        label = 'Minimum';
    }

    const sizeClasses = size === 'md'
        ? 'px-2 py-1 text-xs'
        : 'px-1.5 py-0.5 text-[10px]';

    return (
        <span className={`${color} ${sizeClasses} rounded-full font-medium`}>
            {score}% {label}
        </span>
    );
}

function AuthorOption({
    author,
    healthScore,
    isSelected,
    onClick,
    minHealthScore = 40,
}: {
    author: AuthorProfile;
    healthScore: AuthorHealthScore;
    isSelected: boolean;
    onClick: () => void;
    minHealthScore?: number;
}) {
    const isBelowMin = healthScore.score < minHealthScore;

    return (
        <button
            onClick={onClick}
            className={`
                w-full flex items-center gap-3 p-3 text-left rounded-lg transition-colors
                ${isSelected
                    ? 'bg-blue-50 border-2 border-blue-500'
                    : 'hover:bg-neutral-50 border-2 border-transparent'
                }
                ${isBelowMin ? 'opacity-60' : ''}
            `}
        >
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-neutral-200 overflow-hidden flex-shrink-0">
                {author.avatarUrl ? (
                    <img
                        src={author.avatarUrl}
                        alt={author.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <User className="w-5 h-5 text-neutral-400" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-800 truncate">
                        {author.name}
                    </span>
                    {isSelected && (
                        <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    )}
                </div>
                <div className="text-xs text-neutral-500 truncate">
                    {author.headline || author.primaryNiche}
                </div>
            </div>

            {/* Health Score */}
            <div className="flex flex-col items-end gap-1">
                <HealthBadge score={healthScore.score} />
                {isBelowMin && (
                    <span className="text-[10px] text-red-500 flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" />
                        Below min
                    </span>
                )}
            </div>
        </button>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export function AuthorSelector({
    selectedAuthorId,
    siteId,
    minHealthScore = 40,
    required = false,
    onChange,
}: AuthorSelectorProps) {
    const { authors } = useAuthorStore();
    const [isOpen, setIsOpen] = React.useState(false);

    // Get all authors with health scores
    const authorsWithHealth = useMemo(() => {
        const allAuthors = Object.values(authors);

        // Filter by site if specified
        const filtered = siteId
            ? allAuthors.filter(a =>
                a.assignedSiteIds.length === 0 || a.assignedSiteIds.includes(siteId)
            )
            : allAuthors;

        // Calculate health scores and sort by score
        return filtered
            .map(author => ({
                author,
                healthScore: calculateAuthorHealthScore(author),
            }))
            .sort((a, b) => b.healthScore.score - a.healthScore.score);
    }, [authors, siteId]);

    // Selected author
    const selectedAuthor = useMemo(() => {
        if (!selectedAuthorId) return null;
        return authorsWithHealth.find(a => a.author.id === selectedAuthorId);
    }, [selectedAuthorId, authorsWithHealth]);

    // Count of available healthy authors
    const healthyCount = authorsWithHealth.filter(
        a => a.healthScore.score >= minHealthScore
    ).length;

    return (
        <div className="relative">
            <label className="block text-sm font-medium text-neutral-700 mb-1">
                Author {required && <span className="text-red-500">*</span>}
            </label>

            {/* Selected Display / Trigger */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full flex items-center gap-3 p-3 rounded-lg border transition-colors
                    ${selectedAuthor
                        ? 'border-neutral-300 bg-white'
                        : 'border-dashed border-neutral-300 bg-neutral-50'
                    }
                    hover:border-blue-400
                `}
            >
                {selectedAuthor ? (
                    <>
                        <div className="w-8 h-8 rounded-full bg-neutral-200 overflow-hidden flex-shrink-0">
                            {selectedAuthor.author.avatarUrl ? (
                                <img
                                    src={selectedAuthor.author.avatarUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-neutral-400" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 text-left">
                            <div className="font-medium text-neutral-800">
                                {selectedAuthor.author.name}
                            </div>
                        </div>
                        <HealthBadge score={selectedAuthor.healthScore.score} size="md" />
                    </>
                ) : (
                    <>
                        <User className="w-5 h-5 text-neutral-400" />
                        <span className="flex-1 text-left text-neutral-500">
                            {required ? 'Select an author' : 'No author (optional)'}
                        </span>
                    </>
                )}
                <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Health Warning */}
            {selectedAuthor && selectedAuthor.healthScore.score < minHealthScore && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-700">
                        Author health score ({selectedAuthor.healthScore.score}) is below the minimum ({minHealthScore}).
                        {selectedAuthor.healthScore.recommendations[0] && (
                            <span className="block mt-1 font-medium">
                                Tip: {selectedAuthor.healthScore.recommendations[0].action}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Options */}
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                        {/* Stats header */}
                        <div className="p-2 border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
                            {healthyCount} of {authorsWithHealth.length} authors meet health threshold
                        </div>

                        {/* None option */}
                        {!required && (
                            <button
                                onClick={() => {
                                    onChange(undefined);
                                    setIsOpen(false);
                                }}
                                className={`
                                    w-full flex items-center gap-3 p-3 text-left hover:bg-neutral-50
                                    ${!selectedAuthorId ? 'bg-blue-50' : ''}
                                `}
                            >
                                <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
                                    <User className="w-5 h-5 text-neutral-400" />
                                </div>
                                <span className="text-neutral-600">No author (generic)</span>
                            </button>
                        )}

                        {/* Author options */}
                        {authorsWithHealth.map(({ author, healthScore }) => (
                            <AuthorOption
                                key={author.id}
                                author={author}
                                healthScore={healthScore}
                                isSelected={author.id === selectedAuthorId}
                                minHealthScore={minHealthScore}
                                onClick={() => {
                                    onChange(author.id);
                                    setIsOpen(false);
                                }}
                            />
                        ))}

                        {authorsWithHealth.length === 0 && (
                            <div className="p-4 text-center text-neutral-500 text-sm">
                                No authors available. Create one first.
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
