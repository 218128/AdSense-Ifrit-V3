/**
 * QuickDomainAnalyzer Component
 * 
 * One-click domain analysis tool that combines:
 * - Deep Analysis (Wayback, trust, risks)
 * - AI Niche/Keywords generation
 * - Keyword Analysis
 * 
 * Generates a unified profile preview without saving.
 */

'use client';

import { useState } from 'react';
import {
    Zap,
    Globe,
    Loader2,
    CheckCircle,
    AlertTriangle,
    TrendingUp,
    Tag,
    Target,
    DollarSign,
    Save,
    X
} from 'lucide-react';

interface AnalysisResult {
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

export function QuickDomainAnalyzer() {
    const [domain, setDomain] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const validateDomain = (input: string): boolean => {
        const cleaned = input.trim().toLowerCase();
        return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/.test(cleaned);
    };

    const handleAnalyze = async () => {
        const cleanDomain = domain.trim().toLowerCase();
        if (!validateDomain(cleanDomain)) {
            setResult({
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
            });
            return;
        }

        setIsAnalyzing(true);
        setResult(null);
        setSaved(false);

        try {
            // Call profile generation API (without saving)
            const response = await fetch('/api/domain-profiles/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    domain: cleanDomain,
                    saveProfile: false, // Don't save yet
                }),
            });

            if (!response.ok) {
                throw new Error('Analysis failed');
            }

            const data = await response.json();

            if (data.success && data.profile) {
                const profile = data.profile;
                setResult({
                    domain: cleanDomain,
                    score: profile.deepAnalysis?.score?.overall || profile.trafficPotential || 50,
                    niche: profile.aiNiche?.niche || profile.niche || 'General',
                    riskLevel: profile.deepAnalysis?.riskLevel || 'medium',
                    estimatedValue: profile.deepAnalysis?.estimatedValue || 0,
                    keywords: profile.aiNiche?.primaryKeywords || profile.primaryKeywords || [],
                    topics: profile.aiNiche?.suggestedTopics || profile.suggestedTopics || [],
                    targetAudience: profile.aiNiche?.targetAudience || '',
                    monetizationStrategy: profile.aiNiche?.monetizationStrategy || '',
                });
            } else {
                throw new Error(data.error || 'Analysis failed');
            }
        } catch (error) {
            setResult({
                domain: cleanDomain,
                score: 0,
                niche: '',
                riskLevel: 'critical',
                estimatedValue: 0,
                keywords: [],
                topics: [],
                targetAudience: '',
                monetizationStrategy: '',
                error: error instanceof Error ? error.message : 'Analysis failed'
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSave = async () => {
        if (!result || result.error) return;

        setIsSaving(true);
        try {
            const response = await fetch('/api/domain-profiles/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    domain: result.domain,
                    saveProfile: true,
                }),
            });

            if (response.ok) {
                setSaved(true);
            }
        } catch {
            // Silently fail
        } finally {
            setIsSaving(false);
        }
    };

    const clearResult = () => {
        setResult(null);
        setDomain('');
        setSaved(false);
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'low': return 'text-green-600 bg-green-50';
            case 'medium': return 'text-yellow-600 bg-yellow-50';
            case 'high': return 'text-orange-600 bg-orange-50';
            case 'critical': return 'text-red-600 bg-red-50';
            default: return 'text-neutral-600 bg-neutral-50';
        }
    };

    return (
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-5">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-violet-600" />
                <span className="font-bold text-violet-800">
                    ⚡ Quick Domain Analyzer
                </span>
                <span className="text-xs text-violet-500 ml-auto">
                    AI-powered analysis
                </span>
            </div>

            {/* Input */}
            <div className="flex gap-2 mb-4">
                <div className="flex-1 relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400" />
                    <input
                        type="text"
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                        placeholder="Enter domain to analyze..."
                        className="w-full pl-10 pr-4 py-2.5 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        disabled={isAnalyzing}
                    />
                </div>
                <button
                    onClick={handleAnalyze}
                    disabled={!domain.trim() || isAnalyzing}
                    className="px-5 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
                >
                    {isAnalyzing ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <Zap className="w-4 h-4" />
                            Analyze
                        </>
                    )}
                </button>
            </div>

            {/* Results */}
            {result && (
                <div className="space-y-4">
                    {/* Error state */}
                    {result.error ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            <div>
                                <div className="font-medium text-red-800">{result.domain}</div>
                                <div className="text-sm text-red-600">{result.error}</div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Summary Card */}
                            <div className="bg-white border border-violet-100 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                                            <Globe className="w-6 h-6 text-violet-600" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-lg text-neutral-900">{result.domain}</div>
                                            <div className="text-sm text-violet-600">{result.niche}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={clearResult}
                                        className="p-1 text-neutral-400 hover:text-neutral-600"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Metrics Row */}
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div className="text-center p-3 bg-violet-50 rounded-lg">
                                        <div className="text-2xl font-bold text-violet-700">{result.score}</div>
                                        <div className="text-xs text-violet-500">Score</div>
                                    </div>
                                    <div className={`text-center p-3 rounded-lg ${getRiskColor(result.riskLevel)}`}>
                                        <div className="text-lg font-bold capitalize">{result.riskLevel}</div>
                                        <div className="text-xs">Risk Level</div>
                                    </div>
                                    <div className="text-center p-3 bg-emerald-50 rounded-lg">
                                        <div className="text-lg font-bold text-emerald-700 flex items-center justify-center gap-1">
                                            <DollarSign className="w-4 h-4" />
                                            {result.estimatedValue || 'N/A'}
                                        </div>
                                        <div className="text-xs text-emerald-500">Est. Value</div>
                                    </div>
                                </div>

                                {/* Keywords */}
                                {result.keywords.length > 0 && (
                                    <div className="mb-4">
                                        <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-2">
                                            <Tag className="w-4 h-4" />
                                            Keywords
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {result.keywords.slice(0, 5).map((kw, i) => (
                                                <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Topics */}
                                {result.topics.length > 0 && (
                                    <div className="mb-4">
                                        <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-2">
                                            <TrendingUp className="w-4 h-4" />
                                            Suggested Topics
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {result.topics.slice(0, 3).map((topic, i) => (
                                                <span key={i} className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full">
                                                    {topic}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Target Audience */}
                                {result.targetAudience && (
                                    <div className="mb-4">
                                        <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-1">
                                            <Target className="w-4 h-4" />
                                            Target Audience
                                        </div>
                                        <p className="text-sm text-neutral-600">{result.targetAudience}</p>
                                    </div>
                                )}

                                {/* Save Button */}
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving || saved}
                                    className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium ${saved
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-violet-600 text-white hover:bg-violet-700'
                                        } disabled:opacity-50`}
                                >
                                    {saved ? (
                                        <>
                                            <CheckCircle className="w-4 h-4" />
                                            Profile Saved
                                        </>
                                    ) : isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Save Profile
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Empty state hint */}
            {!result && !isAnalyzing && (
                <p className="text-xs text-violet-500 text-center">
                    Enter any domain to get instant AI analysis with niche, keywords, and monetization insights
                </p>
            )}
        </div>
    );
}
