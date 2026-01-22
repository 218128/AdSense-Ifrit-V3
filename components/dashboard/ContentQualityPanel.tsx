'use client';

/**
 * Content Quality Panel
 * FSD: components/dashboard/ContentQualityPanel.tsx
 *
 * Dashboard panel for content quality monitoring.
 * Shows E-E-A-T scores, fact-check status, and quality trends.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Shield,
    CheckCircle,
    AlertTriangle,
    XCircle,
    FileCheck,
    Award,
    BookOpen,
    Brain,
    Users,
    RefreshCw,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    Minus
} from 'lucide-react';

// Types from contentQuality modules
interface EEATScore {
    experience: number;
    expertise: number;
    authoritativeness: number;
    trustworthiness: number;
    overall: number;
}

interface QualityMetrics {
    averageEEAT: EEATScore;
    totalPosts: number;
    postsPassingGate: number;
    factChecksPassed: number;
    factChecksFailed: number;
    citationsValid: number;
    citationsInvalid: number;
    lastUpdated: number;
}

interface RecentPost {
    id: string;
    title: string;
    eeat: EEATScore;
    factCheckStatus: 'passed' | 'failed' | 'pending';
    citationStatus: 'valid' | 'invalid' | 'none';
    publishedAt: number;
}

// Mock data
const MOCK_METRICS: QualityMetrics = {
    averageEEAT: { experience: 72, expertise: 78, authoritativeness: 65, trustworthiness: 82, overall: 74 },
    totalPosts: 48,
    postsPassingGate: 42,
    factChecksPassed: 45,
    factChecksFailed: 3,
    citationsValid: 156,
    citationsInvalid: 12,
    lastUpdated: Date.now() - 3600000,
};

const MOCK_RECENT: RecentPost[] = [
    { id: '1', title: 'Complete Guide to AI in Healthcare', eeat: { experience: 85, expertise: 90, authoritativeness: 78, trustworthiness: 88, overall: 85 }, factCheckStatus: 'passed', citationStatus: 'valid', publishedAt: Date.now() - 86400000 },
    { id: '2', title: 'Web3 Security Best Practices', eeat: { experience: 68, expertise: 72, authoritativeness: 60, trustworthiness: 75, overall: 69 }, factCheckStatus: 'passed', citationStatus: 'valid', publishedAt: Date.now() - 172800000 },
    { id: '3', title: 'Machine Learning for Beginners', eeat: { experience: 55, expertise: 65, authoritativeness: 50, trustworthiness: 70, overall: 60 }, factCheckStatus: 'pending', citationStatus: 'none', publishedAt: Date.now() - 259200000 },
];

export function ContentQualityPanel() {
    const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
    const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // TODO: Wire to actual quality tracking store
            await new Promise(r => setTimeout(r, 500));
            setMetrics(MOCK_METRICS);
            setRecentPosts(MOCK_RECENT);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-amber-600';
        return 'text-red-600';
    };

    const getScoreBg = (score: number) => {
        if (score >= 80) return 'bg-green-500';
        if (score >= 60) return 'bg-amber-500';
        return 'bg-red-500';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-48">
                <RefreshCw className="w-6 h-6 text-neutral-400 animate-spin" />
            </div>
        );
    }

    // Empty state
    if (!metrics || metrics.totalPosts === 0) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-semibold text-neutral-800">Content Quality</h3>
                </div>

                <div className="text-center py-8 bg-neutral-50 rounded-xl border border-neutral-200">
                    <Shield className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                    <h4 className="font-medium text-neutral-700 mb-2">No Quality Data Yet</h4>
                    <p className="text-sm text-neutral-500 max-w-sm mx-auto">
                        Publish content with E-E-A-T signals enabled to start tracking quality metrics.
                    </p>
                </div>
            </div>
        );
    }

    const passRate = Math.round((metrics.postsPassingGate / metrics.totalPosts) * 100);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-semibold text-neutral-800">Content Quality</h3>
                </div>
                <button
                    onClick={loadData}
                    className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* E-E-A-T Score Overview */}
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-emerald-800">Average E-E-A-T Score</span>
                    <span className={`text-2xl font-bold ${getScoreColor(metrics.averageEEAT.overall)}`}>
                        {metrics.averageEEAT.overall}
                    </span>
                </div>

                {/* Score Breakdown */}
                <div className="grid grid-cols-4 gap-2">
                    <ScoreBox label="Experience" score={metrics.averageEEAT.experience} icon={<Users className="w-3 h-3" />} />
                    <ScoreBox label="Expertise" score={metrics.averageEEAT.expertise} icon={<Brain className="w-3 h-3" />} />
                    <ScoreBox label="Authority" score={metrics.averageEEAT.authoritativeness} icon={<Award className="w-3 h-3" />} />
                    <ScoreBox label="Trust" score={metrics.averageEEAT.trustworthiness} icon={<Shield className="w-3 h-3" />} />
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                        <FileCheck className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-neutral-500">Quality Gate</span>
                    </div>
                    <div className="text-lg font-bold text-green-600">{passRate}%</div>
                    <div className="text-xs text-neutral-400">
                        {metrics.postsPassingGate}/{metrics.totalPosts} passed
                    </div>
                </div>

                <div className="p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-blue-500" />
                        <span className="text-xs text-neutral-500">Fact Checks</span>
                    </div>
                    <div className="text-lg font-bold text-blue-600">{metrics.factChecksPassed}</div>
                    <div className="text-xs text-neutral-400">
                        {metrics.factChecksFailed} failed
                    </div>
                </div>

                <div className="p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="w-4 h-4 text-purple-500" />
                        <span className="text-xs text-neutral-500">Citations</span>
                    </div>
                    <div className="text-lg font-bold text-purple-600">{metrics.citationsValid}</div>
                    <div className="text-xs text-neutral-400">
                        {metrics.citationsInvalid} invalid
                    </div>
                </div>
            </div>

            {/* Recent Posts Quality */}
            <div className="space-y-2">
                <div className="text-xs font-medium text-neutral-500 uppercase">Recent Content</div>
                {recentPosts.slice(0, 3).map(post => (
                    <div key={post.id} className="p-2 bg-white rounded-lg border flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-neutral-800 truncate">
                                {post.title}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-neutral-500">
                                <span className={getScoreColor(post.eeat.overall)}>
                                    E-E-A-T: {post.eeat.overall}
                                </span>
                                <span>•</span>
                                <span className={post.factCheckStatus === 'passed' ? 'text-green-600' : post.factCheckStatus === 'failed' ? 'text-red-600' : 'text-amber-600'}>
                                    {post.factCheckStatus === 'passed' ? '✓ Facts' : post.factCheckStatus === 'failed' ? '✗ Facts' : '⏳ Pending'}
                                </span>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-300" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function ScoreBox({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
    const getScoreColor = (s: number) => {
        if (s >= 80) return 'text-green-700 bg-green-100';
        if (s >= 60) return 'text-amber-700 bg-amber-100';
        return 'text-red-700 bg-red-100';
    };

    return (
        <div className="text-center">
            <div className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(score)}`}>
                {icon}
                {score}
            </div>
            <div className="text-[10px] text-neutral-500 mt-1">{label}</div>
        </div>
    );
}

export default ContentQualityPanel;
