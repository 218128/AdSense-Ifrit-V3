'use client';

/**
 * AdSense Readiness Dashboard
 * FSD: features/wordpress/ui/AdSenseReadinessDashboard.tsx
 * 
 * Visual dashboard showing AdSense approval readiness for a WP site.
 * Uses the adsenseChecker functions for validation.
 */

import { useState, useMemo } from 'react';
import {
    CheckCircle,
    XCircle,
    AlertTriangle,
    FileText,
    Shield,
    Globe,
    Zap,
    Search,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Sparkles,
} from 'lucide-react';
import type { WPSite } from '../model/wpSiteTypes';
import {
    checkAdSenseReadiness,
    getReadinessStatus,
    getApprovalProgress,
    getMissingEssentialPages,
} from '../lib/adsenseChecker';

interface AdSenseReadinessDashboardProps {
    site: WPSite;
    onGeneratePage?: (pageType: string) => void;
    onRefresh?: () => void;
}

export function AdSenseReadinessDashboard({
    site,
    onGeneratePage,
    onRefresh,
}: AdSenseReadinessDashboardProps) {
    const [expanded, setExpanded] = useState(true);
    const [generating, setGenerating] = useState<string | null>(null);

    // Compute readiness report
    const report = useMemo(() => checkAdSenseReadiness(site), [site]);
    const status = useMemo(() => getReadinessStatus(site), [site]);
    const progress = useMemo(() => getApprovalProgress(site), [site]);
    const missingPages = useMemo(() => getMissingEssentialPages(site), [site]);

    const handleGeneratePage = async (pageType: string) => {
        if (!onGeneratePage) return;
        setGenerating(pageType);
        try {
            await onGeneratePage(pageType);
        } finally {
            setGenerating(null);
        }
    };

    // Status colors
    const statusColors = {
        ready: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: CheckCircle },
        almost: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: AlertTriangle },
        'not-ready': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: XCircle },
    };
    const statusStyle = statusColors[status.status];
    const StatusIcon = statusStyle.icon;

    return (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            {/* Header with Score */}
            <div
                className={`px-5 py-4 ${statusStyle.bg} border-b ${statusStyle.border} cursor-pointer`}
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${statusStyle.bg} border-2 ${statusStyle.border}`}>
                            <span className={`text-lg font-bold ${statusStyle.text}`}>{report.score}</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <StatusIcon className={`w-5 h-5 ${statusStyle.text}`} />
                                <h3 className={`font-semibold ${statusStyle.text}`}>{status.label}</h3>
                            </div>
                            <p className="text-sm text-neutral-500">AdSense Readiness Score</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {onRefresh && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onRefresh(); }}
                                className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-white/50"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        )}
                        {expanded ? <ChevronUp className="w-5 h-5 text-neutral-400" /> : <ChevronDown className="w-5 h-5 text-neutral-400" />}
                    </div>
                </div>

                {/* Progress Bars */}
                <div className="mt-4 grid grid-cols-3 gap-4">
                    <ProgressBar label="Articles" value={progress.articlesProgress} icon={FileText} />
                    <ProgressBar label="Pages" value={progress.pagesProgress} icon={Shield} />
                    <ProgressBar label="Technical" value={progress.technicalProgress} icon={Zap} />
                </div>
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="p-5 space-y-6">
                    {/* Checklist Sections */}
                    <ChecklistSection
                        title="Content Requirements"
                        icon={FileText}
                        checks={[
                            { label: 'Minimum 15 articles', passed: report.checks.hasMinimumArticles, critical: true },
                            { label: 'Quality word count (500+)', passed: report.checks.articleWordCountOk, critical: true },
                            { label: 'Original content', passed: report.checks.hasOriginalContent },
                        ]}
                    />

                    <ChecklistSection
                        title="Essential Pages"
                        icon={Shield}
                        checks={[
                            { label: 'About page', passed: report.checks.hasAboutPage, critical: true, action: 'about' },
                            { label: 'Contact page', passed: report.checks.hasContactPage, critical: true, action: 'contact' },
                            { label: 'Privacy Policy', passed: report.checks.hasPrivacyPolicy, critical: true, action: 'privacy' },
                            { label: 'Terms of Service', passed: report.checks.hasTermsOfService, critical: true, action: 'terms' },
                        ]}
                        onAction={onGeneratePage ? handleGeneratePage : undefined}
                        generating={generating}
                    />

                    <ChecklistSection
                        title="Technical Requirements"
                        icon={Zap}
                        checks={[
                            { label: 'SSL/HTTPS enabled', passed: report.checks.sslEnabled, critical: true },
                            { label: 'Mobile responsive', passed: report.checks.mobileResponsive },
                            { label: 'Fast load speed', passed: report.checks.fastLoadSpeed },
                        ]}
                    />

                    <ChecklistSection
                        title="SEO & Optimization"
                        icon={Search}
                        checks={[
                            { label: 'SEO plugin active', passed: report.checks.seoPluginActive },
                            { label: 'XML Sitemap', passed: report.checks.hasXmlSitemap },
                            { label: 'ads.txt ready', passed: report.checks.adsTxtReady },
                        ]}
                    />

                    {/* Recommendations */}
                    {report.recommendations.length > 0 && (
                        <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                            <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Recommendations
                            </h4>
                            <ul className="space-y-1">
                                {report.recommendations.slice(0, 5).map((rec, i) => (
                                    <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                                        <span className="text-amber-400 mt-1">•</span>
                                        {rec}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Quick Actions */}
                    {missingPages.length > 0 && onGeneratePage && (
                        <div className="bg-violet-50 rounded-lg p-4 border border-violet-100">
                            <h4 className="font-medium text-violet-800 mb-3 flex items-center gap-2">
                                <Sparkles className="w-4 h-4" />
                                Quick Actions
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {missingPages.map((page) => (
                                    <button
                                        key={page}
                                        onClick={() => handleGeneratePage(page)}
                                        disabled={generating !== null}
                                        className="px-3 py-1.5 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                                    >
                                        {generating === page ? (
                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <Sparkles className="w-3 h-3" />
                                        )}
                                        Generate {page.charAt(0).toUpperCase() + page.slice(1)} Page
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Apply Link */}
                    {report.ready && (
                        <div className="bg-green-50 rounded-lg p-4 border border-green-100 text-center">
                            <p className="text-green-700 mb-3">Your site is ready for AdSense!</p>
                            <a
                                href="https://www.google.com/adsense/start/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                Apply for AdSense
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Sub-components
// ============================================================================

interface ProgressBarProps {
    label: string;
    value: number;
    icon: React.ElementType;
}

function ProgressBar({ label, value, icon: Icon }: ProgressBarProps) {
    const color = value >= 100 ? 'bg-green-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500';

    return (
        <div>
            <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1 text-neutral-600">
                    <Icon className="w-3 h-3" />
                    {label}
                </span>
                <span className="font-medium text-neutral-700">{value}%</span>
            </div>
            <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} transition-all duration-500`}
                    style={{ width: `${Math.min(100, value)}%` }}
                />
            </div>
        </div>
    );
}

interface ChecklistSectionProps {
    title: string;
    icon: React.ElementType;
    checks: Array<{
        label: string;
        passed: boolean;
        critical?: boolean;
        action?: string;
    }>;
    onAction?: (action: string) => void;
    generating?: string | null;
}

function ChecklistSection({ title, icon: Icon, checks, onAction, generating }: ChecklistSectionProps) {
    return (
        <div>
            <h4 className="font-medium text-neutral-800 mb-3 flex items-center gap-2">
                <Icon className="w-4 h-4 text-neutral-500" />
                {title}
            </h4>
            <div className="space-y-2">
                {checks.map((check, i) => (
                    <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {check.passed ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : check.critical ? (
                                <XCircle className="w-4 h-4 text-red-500" />
                            ) : (
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                            )}
                            <span className={`text-sm ${check.passed ? 'text-neutral-600' : check.critical ? 'text-red-700' : 'text-amber-700'}`}>
                                {check.label}
                            </span>
                            {check.critical && !check.passed && (
                                <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Required</span>
                            )}
                        </div>
                        {!check.passed && check.action && onAction && (
                            <button
                                onClick={() => onAction(check.action!)}
                                disabled={generating !== null}
                                className="text-xs text-violet-600 hover:text-violet-700 disabled:opacity-50"
                            >
                                {generating === check.action ? 'Generating...' : 'Generate'}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
