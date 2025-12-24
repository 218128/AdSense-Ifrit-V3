/**
 * useDomainAnalysis Hook
 * 
 * Reusable hook for domain analysis operations.
 * Used by QuickAnalyzer and other components that need AI analysis.
 */

import { useState, useCallback } from 'react';

// ========== TYPES ==========

export interface AnalysisResult {
    domain: string;
    score: number;
    niche: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    estimatedValue: number;
    keywords: string[];
    topics: string[];
    targetAudience: string;
    monetizationStrategy: string;
    error?: string;
}

export interface UseDomainAnalysisReturn {
    /** Current analysis result */
    result: AnalysisResult | null;
    /** Whether analysis is in progress */
    isAnalyzing: boolean;
    /** Analyze a domain */
    analyzeDomain: (domain: string) => Promise<AnalysisResult | null>;
    /** Clear the current result */
    clearResult: () => void;
    /** Error message if any */
    error: string | null;
}

// ========== VALIDATION ==========

const validateDomain = (input: string): boolean => {
    const cleaned = input.trim().toLowerCase();
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/.test(cleaned);
};

// ========== HOOK ==========

export function useDomainAnalysis(): UseDomainAnalysisReturn {
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const analyzeDomain = useCallback(async (domain: string): Promise<AnalysisResult | null> => {
        const cleanDomain = domain.trim().toLowerCase();

        if (!validateDomain(cleanDomain)) {
            const errorResult: AnalysisResult = {
                domain: cleanDomain,
                score: 0,
                niche: '',
                riskLevel: 'critical',
                estimatedValue: 0,
                keywords: [],
                topics: [],
                targetAudience: '',
                monetizationStrategy: '',
                error: 'Invalid domain format'
            };
            setResult(errorResult);
            setError('Invalid domain format');
            return errorResult;
        }

        setIsAnalyzing(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/domain-profiles/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    domain: cleanDomain,
                    saveProfile: false,
                }),
            });

            if (!response.ok) {
                throw new Error('Analysis failed');
            }

            const data = await response.json();

            if (data.success && data.profile) {
                const profile = data.profile;
                const analysisResult: AnalysisResult = {
                    domain: cleanDomain,
                    score: profile.deepAnalysis?.score?.overall || profile.trafficPotential || 50,
                    niche: profile.aiNiche?.niche || profile.niche || 'General',
                    riskLevel: profile.deepAnalysis?.riskLevel || 'medium',
                    estimatedValue: profile.deepAnalysis?.estimatedValue || 0,
                    keywords: profile.aiNiche?.primaryKeywords || profile.primaryKeywords || [],
                    topics: profile.aiNiche?.suggestedTopics || profile.suggestedTopics || [],
                    targetAudience: profile.aiNiche?.targetAudience || '',
                    monetizationStrategy: profile.aiNiche?.monetizationStrategy || '',
                };
                setResult(analysisResult);
                return analysisResult;
            } else {
                throw new Error(data.error || 'Analysis failed');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
            const errorResult: AnalysisResult = {
                domain: cleanDomain,
                score: 0,
                niche: '',
                riskLevel: 'critical',
                estimatedValue: 0,
                keywords: [],
                topics: [],
                targetAudience: '',
                monetizationStrategy: '',
                error: errorMessage
            };
            setResult(errorResult);
            setError(errorMessage);
            return errorResult;
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
        analyzeDomain,
        clearResult,
        error,
    };
}
