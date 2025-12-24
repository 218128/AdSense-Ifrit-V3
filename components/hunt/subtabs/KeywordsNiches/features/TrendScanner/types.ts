/**
 * TrendScanner Types
 * 
 * Types for the Live Trend Scanner feature.
 * Extracted from TrendScanner.tsx for better code organization.
 */

export interface TrendItem {
    topic: string;
    context: string;
    source: string;
    sourceType: 'live' | 'rss' | 'search' | 'fallback';
    cpcScore?: number;
    niche?: string;
    url?: string;
}

export interface SourceStatus {
    success: boolean;
    count: number;
    error?: string;
}

export interface TrendScannerProps {
    onSelectKeywords?: (keywords: string[]) => void;
}
