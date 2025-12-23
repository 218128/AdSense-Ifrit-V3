'use client';

/**
 * Domain Scorer Component
 * 
 * UI for analyzing domains before acquisition.
 * Shows score breakdown, risks, and recommendations.
 * Now with educational transparency!
 */

import { useState } from 'react';
import {
    Search,
    AlertTriangle,
    CheckCircle,
    XCircle,
    TrendingUp,
    Shield,
    Mail,
    DollarSign,
    Clock,
    ExternalLink,
    Loader2,
    Target,
    History,
    AlertOctagon,
    Info,
    ChevronDown,
    ChevronUp,
    HelpCircle
} from 'lucide-react';
import { DataSourceBanner } from '@/components/hunt/shared';
import { ScorerScoreCard as ScoreCard } from './ScorerScoreCard';

interface DomainScore {
    overall: number;
    authority: number;
    trustworthiness: number;
    relevance: number;
    emailPotential: number;
    flipPotential: number;
    nameQuality: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendation: 'strong-buy' | 'buy' | 'consider' | 'avoid';
    reasons: string[];
    risks: Array<{
        type: string;
        severity: string;
        description: string;
    }>;
    estimatedValue: number;
    estimatedMonthlyRevenue: number;
}

interface AnalysisResult {
    success: boolean;
    domain: string;
    score: DomainScore;
    wayback: {
        hasHistory: boolean;
        firstCaptureDate?: string;
        lastCaptureDate?: string;
        totalCaptures?: number;
        wasAdult?: boolean;
        wasCasino?: boolean;
        hadSpam?: boolean;
        wasPBN?: boolean;
    } | null;
    spam: {
        isSpammy: boolean;
        spamScore: number;
        issues: Array<{ type: string; severity: string; description: string }>;
    };
    trust: {
        trustworthy: boolean;
        score: number;
        positives: string[];
        negatives: string[];
    };
    error?: string;
}

const NICHES = [
    { value: '', label: 'Any Niche' },
    { value: 'finance', label: '💰 Finance' },
    { value: 'technology', label: '💻 Technology' },
    { value: 'health', label: '🏥 Health' },
    { value: 'legal', label: '⚖️ Legal' },
    { value: 'ecommerce', label: '🛒 E-commerce' },
    { value: 'travel', label: '✈️ Travel' },
    { value: 'education', label: '📚 Education' },
    { value: 'gaming', label: '🎮 Gaming' },
];

// Props for integration with HuntDashboard
interface AnalyzeCandidate {
    domain: string;
    tld: string;
    score: number;
    recommendation: string;
    estimatedValue?: number;
    spamzillaData?: {
        wasAdult?: boolean;
        wasCasino?: boolean;
        wasPBN?: boolean;
        hadSpam?: boolean;
        domainAge?: number;
    };
}

interface DomainScorerProps {
    analyzeQueue?: AnalyzeCandidate[];
    onAddToQueue?: (domain: AnalyzeCandidate) => void;
    onDiscard?: (domain: string) => void;
    onGoToFind?: () => void;
    onGoToPurchase?: () => void;
}

export default function DomainScorer({
    analyzeQueue = [],
    onAddToQueue,
    onDiscard,
    onGoToFind,
    onGoToPurchase
}: DomainScorerProps) {
    const [domain, setDomain] = useState(analyzeQueue[0]?.domain || '');
    const [niche, setNiche] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [currentQueueIndex, setCurrentQueueIndex] = useState(0);

    const analyzeDomain = async () => {
        if (!domain.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/domains/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    domain: domain.trim(),
                    targetNiche: niche || undefined,
                }),
            });

            const data = await response.json();

            if (!data.success) {
                setError(data.error || 'Analysis failed');
                return;
            }

            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error');
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 70) return 'text-green-600';
        if (score >= 50) return 'text-yellow-600';
        if (score >= 30) return 'text-orange-600';
        return 'text-red-600';
    };

    const getScoreBg = (score: number) => {
        if (score >= 70) return 'bg-green-500';
        if (score >= 50) return 'bg-yellow-500';
        if (score >= 30) return 'bg-orange-500';
        return 'bg-red-500';
    };

    const getRecommendationStyle = (rec: string) => {
        switch (rec) {
            case 'strong-buy':
                return 'bg-green-100 text-green-800 border-green-300';
            case 'buy':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'consider':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'avoid':
                return 'bg-red-100 text-red-800 border-red-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(value);
    };

    const [showMethodology, setShowMethodology] = useState(false);

    return (
        <div className="space-y-4">
            {/* Data Source Transparency Banner */}
            <DataSourceBanner type="analyzer" />

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Target className="w-6 h-6" />
                        Domain Analyzer
                    </h2>
                    <p className="text-indigo-100 text-sm mt-1">
                        Analyze domains for acquisition potential
                    </p>
                </div>

                {/* How We Score - Educational Section */}
                <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
                    <button
                        onClick={() => setShowMethodology(!showMethodology)}
                        className="w-full flex items-center justify-between text-blue-800"
                    >
                        <div className="flex items-center gap-2">
                            <HelpCircle className="w-4 h-4" />
                            <span className="font-medium text-sm">📚 How We Calculate Scores</span>
                        </div>
                        {showMethodology ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showMethodology && (
                        <div className="mt-3 space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white rounded-lg p-3">
                                    <div className="font-medium text-blue-900 mb-2">📊 Score Breakdown</div>
                                    <ul className="space-y-1 text-blue-700 text-xs">
                                        <li>• <strong>Authority (30%)</strong> - Domain age, backlinks, DR/DA</li>
                                        <li>• <strong>Trust (20%)</strong> - TF/CF ratio, spam signals</li>
                                        <li>• <strong>Relevance (15%)</strong> - Niche match, keyword presence</li>
                                        <li>• <strong>Name Quality (15%)</strong> - Length, TLD, brandability</li>
                                        <li>• <strong>Email Potential (10%)</strong> - List building readiness</li>
                                        <li>• <strong>Flip Potential (10%)</strong> - Resale value indicators</li>
                                    </ul>
                                </div>
                                <div className="bg-white rounded-lg p-3">
                                    <div className="font-medium text-blue-900 mb-2">🔍 What We Check</div>
                                    <ul className="space-y-1 text-blue-700 text-xs">
                                        <li>• <strong>Wayback Machine</strong> - Historical content</li>
                                        <li>• <strong>Spam Patterns</strong> - Known spam TLDs & keywords</li>
                                        <li>• <strong>Adult/Casino</strong> - Risky content history</li>
                                        <li>• <strong>PBN Detection</strong> - Private blog network signals</li>
                                        <li>• <strong>TLD Analysis</strong> - Extension reputation</li>
                                        <li>• <strong>Name Quality</strong> - Length, hyphens, numbers</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                    <div className="text-amber-800 text-xs">
                                        <strong>Accuracy Note:</strong> SEO metrics (DA, DR, TF) are currently estimated based on domain characteristics.
                                        For production accuracy, integrate APIs from Moz ($99/mo), Ahrefs ($99/mo), or Majestic ($49/mo).
                                        WHOIS and Wayback data are real when available.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Search */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={domain}
                                onChange={(e) => setDomain(e.target.value)}
                                placeholder="Enter domain (e.g., example.com)"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                onKeyDown={(e) => e.key === 'Enter' && analyzeDomain()}
                            />
                        </div>
                        <select
                            value={niche}
                            onChange={(e) => setNiche(e.target.value)}
                            className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                            {NICHES.map((n) => (
                                <option key={n.value} value={n.value}>
                                    {n.label}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={analyzeDomain}
                            disabled={loading || !domain.trim()}
                            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Search className="w-4 h-4" />
                            )}
                            Analyze
                        </button>
                    </div>

                    {error && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                            <AlertOctagon className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                </div>

                {/* Results */}
                {result && (
                    <div className="p-6">
                        {/* Domain & Recommendation */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">
                                    {result.domain}
                                </h3>
                                <a
                                    href={`https://web.archive.org/web/*/${result.domain}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
                                >
                                    View on Wayback Machine
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                            <div
                                className={`px-4 py-2 rounded-lg border font-semibold ${getRecommendationStyle(
                                    result.score.recommendation
                                )}`}
                            >
                                {result.score.recommendation === 'strong-buy' && '🔥 STRONG BUY'}
                                {result.score.recommendation === 'buy' && '✅ BUY'}
                                {result.score.recommendation === 'consider' && '🤔 CONSIDER'}
                                {result.score.recommendation === 'avoid' && '❌ AVOID'}
                            </div>
                        </div>

                        {/* Overall Score */}
                        <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-4">
                                <div
                                    className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold ${getScoreBg(
                                        result.score.overall
                                    )}`}
                                >
                                    {result.score.overall}
                                </div>
                                <div className="flex-1">
                                    <div className="text-lg font-semibold">Overall Score</div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {result.score.reasons.map((reason, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded"
                                            >
                                                ✓ {reason}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-gray-500">Est. Value</div>
                                    <div className="text-xl font-bold text-green-600">
                                        {formatCurrency(result.score.estimatedValue)}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        ~{formatCurrency(result.score.estimatedMonthlyRevenue)}/mo
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Score Breakdown */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <ScoreCard
                                icon={<TrendingUp className="w-4 h-4" />}
                                label="Authority"
                                score={result.score.authority}
                            />
                            <ScoreCard
                                icon={<Shield className="w-4 h-4" />}
                                label="Trust"
                                score={result.score.trustworthiness}
                            />
                            <ScoreCard
                                icon={<Target className="w-4 h-4" />}
                                label="Relevance"
                                score={result.score.relevance}
                            />
                            <ScoreCard
                                icon={<Mail className="w-4 h-4" />}
                                label="Email Potential"
                                score={result.score.emailPotential}
                            />
                            <ScoreCard
                                icon={<DollarSign className="w-4 h-4" />}
                                label="Flip Potential"
                                score={result.score.flipPotential}
                            />
                            <ScoreCard
                                icon={<CheckCircle className="w-4 h-4" />}
                                label="Name Quality"
                                score={result.score.nameQuality}
                            />
                        </div>

                        {/* Wayback History */}
                        {result.wayback && (
                            <div className="mb-6 p-4 border rounded-lg">
                                <h4 className="font-semibold flex items-center gap-2 mb-3">
                                    <History className="w-4 h-4 text-indigo-600" />
                                    Wayback Machine History
                                </h4>
                                {result.wayback.hasHistory ? (
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500">First Capture:</span>{' '}
                                            <span className="font-medium">
                                                {result.wayback.firstCaptureDate}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Last Capture:</span>{' '}
                                            <span className="font-medium">
                                                {result.wayback.lastCaptureDate}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Total Captures:</span>{' '}
                                            <span className="font-medium">
                                                {result.wayback.totalCaptures}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            {result.wayback.wasAdult && (
                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                                                    ⚠️ Adult
                                                </span>
                                            )}
                                            {result.wayback.wasCasino && (
                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                                                    ⚠️ Casino
                                                </span>
                                            )}
                                            {result.wayback.wasPBN && (
                                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                                                    ⚠️ PBN
                                                </span>
                                            )}
                                            {!result.wayback.wasAdult &&
                                                !result.wayback.wasCasino &&
                                                !result.wayback.wasPBN && (
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                                        ✓ Clean History
                                                    </span>
                                                )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-gray-500 text-sm">
                                        No archived snapshots found
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Risks */}
                        {result.score.risks.length > 0 && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <h4 className="font-semibold text-red-800 flex items-center gap-2 mb-3">
                                    <AlertTriangle className="w-4 h-4" />
                                    Risks ({result.score.risks.length})
                                </h4>
                                <div className="space-y-2">
                                    {result.score.risks.map((risk, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-start gap-2 text-sm"
                                        >
                                            <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <span className="font-medium text-red-700">
                                                    {risk.type}:
                                                </span>{' '}
                                                <span className="text-red-600">{risk.description}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Trust Analysis */}
                        <div className="p-4 border rounded-lg">
                            <h4 className="font-semibold flex items-center gap-2 mb-3">
                                <Shield className="w-4 h-4 text-blue-600" />
                                Trust Analysis
                            </h4>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <div className="text-sm text-gray-500 mb-1">Positives</div>
                                    <div className="flex flex-wrap gap-1">
                                        {result.trust.positives.map((p, idx) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded"
                                            >
                                                ✓ {p}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm text-gray-500 mb-1">Negatives</div>
                                    <div className="flex flex-wrap gap-1">
                                        {result.trust.negatives.length > 0 ? (
                                            result.trust.negatives.map((n, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded"
                                                >
                                                    ✗ {n}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-green-600 text-sm">No issues</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!result && !loading && (
                    <div className="p-12 text-center text-gray-500">
                        <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Enter a domain to analyze its acquisition potential</p>
                        <p className="text-sm mt-2">
                            We&apos;ll check Wayback history, spam indicators, and calculate a score
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
