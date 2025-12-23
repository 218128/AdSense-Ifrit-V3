/**
 * TrendScanner Utilities
 * 
 * Helper functions for the Live Trend Scanner.
 * Extracted from TrendScanner.tsx.
 */

import React from 'react';
import {
    TrendingUp,
    Globe,
    Newspaper,
    Code,
    Flame,
} from 'lucide-react';

/**
 * Get the icon for a trend source
 */
export function getSourceIcon(source: string): React.ReactNode {
    switch (source.toLowerCase()) {
        case 'hacker news': return React.createElement(Code, { className: 'w-3 h-3' });
        case 'google news': return React.createElement(Newspaper, { className: 'w-3 h-3' });
        case 'brave search': return React.createElement(Globe, { className: 'w-3 h-3' });
        case 'product hunt': return React.createElement(Flame, { className: 'w-3 h-3' });
        case 'reddit': return React.createElement(TrendingUp, { className: 'w-3 h-3' });
        default: return React.createElement(TrendingUp, { className: 'w-3 h-3' });
    }
}

/**
 * Get the color scheme for a trend source
 */
export function getSourceColor(source: string): string {
    switch (source.toLowerCase()) {
        case 'hacker news': return 'bg-orange-100 text-orange-700 border-orange-200';
        case 'google news': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'brave search': return 'bg-purple-100 text-purple-700 border-purple-200';
        case 'product hunt': return 'bg-amber-100 text-amber-700 border-amber-200';
        case 'reddit': return 'bg-red-100 text-red-700 border-red-200';
        default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
}

/**
 * Format time since a date as a readable string
 */
export function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
}

/**
 * CPC score thresholds
 */
export const CPC_THRESHOLD_HIGH = 50;
export const CPC_THRESHOLD_MEDIUM = 30;
