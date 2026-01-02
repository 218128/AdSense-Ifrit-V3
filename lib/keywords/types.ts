/**
 * Keyword Types
 * 
 * Centralized type definitions for keyword hunting features.
 */

// ============ KEYWORD ITEM ============

export type KeywordSource = 'csv' | 'live' | 'evergreen' | 'ai' | 'trend_scan';

export interface KeywordItem {
    keyword: string;
    source: KeywordSource;
    niche?: string;
    context?: string;
    difficulty?: string;
    searchVolume?: string;
    cpc?: string;  // Added for smart CSV parser (SEMrush, Ahrefs formats)
}

// ============ CPC ANALYSIS ============

export interface CPCAnalysis {
    keyword: string;
    niche: string;
    estimatedCPC: string;
    estimatedVolume: string;
    competition: string;
    score: number;
    intent: string;
    reasoning: string;
    relatedKeywords?: string[];
}

export interface AnalyzedKeyword extends KeywordItem {
    analysis: CPCAnalysis;
}

// ============ HISTORY ============

export interface AnalysisHistoryItem {
    id: string;
    timestamp: number;
    keywords: AnalyzedKeyword[];
}

// ============ AI DISCOVERY ============

export interface AIDiscoveryResult {
    success: boolean;
    keywords?: Array<{
        keyword: string;
        niche: string;
        difficulty: string;
        searchVolume: string;
        source: 'ai';
    }>;
    error?: string;
}
