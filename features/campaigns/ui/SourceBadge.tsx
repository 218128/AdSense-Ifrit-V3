'use client';

/**
 * Source Badge Component
 * FSD: features/campaigns/ui/SourceBadge.tsx
 * 
 * Visual indicator for data source transparency.
 * Shows where campaign data originated from.
 */

import type { DataSource } from '../model/campaignContext';
import { getSourceBadgeConfig } from '../lib/contextBuilder';

// ============================================================================
// Types
// ============================================================================

interface SourceBadgeProps {
    /** Data source to display */
    source: DataSource;
    /** Size variant */
    size?: 'sm' | 'md';
    /** Show icon only */
    iconOnly?: boolean;
    /** Additional class names */
    className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Badge showing data source origin
 * 
 * @example
 * <SourceBadge source="hunt" />           // 🎯 Hunt
 * <SourceBadge source="profile" />        // 📋 Profile
 * <SourceBadge source="campaign-enrichment" /> // 🔄 AI Enriched
 * <SourceBadge source="built-in" />       // 📦 Default
 */
export function SourceBadge({
    source,
    size = 'sm',
    iconOnly = false,
    className = ''
}: SourceBadgeProps) {
    const config = getSourceBadgeConfig(source);

    const sizeClasses = {
        sm: 'px-1.5 py-0.5 text-xs',
        md: 'px-2 py-1 text-sm',
    };

    return (
        <span
            className={`
                inline-flex items-center gap-1 rounded-full font-medium
                ${config.bgClass} ${config.textClass}
                ${sizeClasses[size]}
                ${className}
            `}
            title={`Data from: ${config.label}`}
        >
            <span>{config.icon}</span>
            {!iconOnly && <span>{config.label}</span>}
        </span>
    );
}

// ============================================================================
// Source Legend Component
// ============================================================================

interface SourceLegendProps {
    /** Sources to display in legend */
    sources?: DataSource[];
    /** Size variant */
    size?: 'sm' | 'md';
    /** Additional class names */
    className?: string;
}

/**
 * Legend showing all data sources
 */
export function SourceLegend({
    sources = ['hunt', 'profile', 'campaign-enrichment', 'built-in'],
    size = 'sm',
    className = ''
}: SourceLegendProps) {
    return (
        <div className={`flex flex-wrap items-center gap-2 ${className}`}>
            <span className="text-xs text-neutral-500">Data sources:</span>
            {sources.map(source => (
                <SourceBadge key={source} source={source} size={size} />
            ))}
        </div>
    );
}

// ============================================================================
// Keyword with Source Component
// ============================================================================

interface KeywordWithSourceProps {
    /** Keyword text */
    keyword: string;
    /** Data source */
    source: DataSource;
    /** Additional metadata */
    cpc?: string;
    intent?: string;
    /** Click handler */
    onClick?: () => void;
    /** Additional class names */
    className?: string;
}

/**
 * Keyword display with source badge and metadata
 */
export function KeywordWithSource({
    keyword,
    source,
    cpc,
    intent,
    onClick,
    className = ''
}: KeywordWithSourceProps) {
    return (
        <div
            className={`
                flex items-center gap-2 p-2 rounded-lg bg-neutral-50 
                ${onClick ? 'cursor-pointer hover:bg-neutral-100' : ''}
                ${className}
            `}
            onClick={onClick}
        >
            <span className="font-medium text-neutral-800">{keyword}</span>
            <SourceBadge source={source} iconOnly />
            {cpc && (
                <span className="text-xs text-green-600 font-medium">${cpc}</span>
            )}
            {intent && (
                <span className="text-xs text-blue-600 px-1.5 py-0.5 bg-blue-50 rounded">
                    {intent}
                </span>
            )}
        </div>
    );
}

// ============================================================================
// Context Summary Component
// ============================================================================

interface ContextSummaryProps {
    /** Contributing sources */
    sources: DataSource[];
    /** When context was last updated */
    lastUpdated?: number;
    /** Additional class names */
    className?: string;
}

/**
 * Summary of context data sources
 */
export function ContextSummary({
    sources,
    lastUpdated,
    className = ''
}: ContextSummaryProps) {
    const uniqueSources = [...new Set(sources)];

    return (
        <div className={`p-3 bg-neutral-50 rounded-lg ${className}`}>
            <div className="text-xs text-neutral-500 mb-2">Data Sources</div>
            <div className="flex flex-wrap gap-1.5">
                {uniqueSources.map(source => (
                    <SourceBadge key={source} source={source} size="md" />
                ))}
            </div>
            {lastUpdated && (
                <div className="text-xs text-neutral-400 mt-2">
                    Updated {new Date(lastUpdated).toLocaleTimeString()}
                </div>
            )}
        </div>
    );
}

export default SourceBadge;
