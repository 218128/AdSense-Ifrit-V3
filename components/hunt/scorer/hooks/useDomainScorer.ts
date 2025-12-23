/**
 * useDomainScorer Hook
 * 
 * Manages domain analysis state and API calls.
 */

import { useState, useCallback } from 'react';
import { analyzeDomain as fetchAnalysis } from '@/lib/domains/api';
import type { AnalysisResult } from '@/lib/domains/types';

// ============ TYPES ============

export interface UseDomainScorerReturn {
    // State
    result: AnalysisResult | null;
    isAnalyzing: boolean;
    error: string | null;

    // Actions
    analyzeDomain: (domain: string, targetNiche?: string) => Promise<void>;
    clearResult: () => void;
}

// ============ HOOK ============

export function useDomainScorer(): UseDomainScorerReturn {
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const analyzeDomain = useCallback(async (domain: string, targetNiche?: string) => {
        if (!domain.trim()) return;

        setIsAnalyzing(true);
        setError(null);
        setResult(null);

        try {
            const data = await fetchAnalysis(domain.trim(), targetNiche);

            if (data.success) {
                setResult(data);
            } else {
                setError(data.error || 'Analysis failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error');
        } finally {
            setIsAnalyzing(false);
        }
    }, []);

    const clearResult = useCallback(() => {
        setResult(null);
        setError(null);
    }, []);

    return {
        result,
        isAnalyzing,
        error,
        analyzeDomain,
        clearResult,
    };
}
