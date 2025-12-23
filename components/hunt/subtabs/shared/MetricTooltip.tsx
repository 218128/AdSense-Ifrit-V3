'use client';

import { useState } from 'react';
import { Info, HelpCircle, ExternalLink } from 'lucide-react';

// Comprehensive metric explanations for education
export const METRIC_EXPLANATIONS: Record<string, MetricExplanation> = {
    // Authority Metrics
    DA: {
        name: 'Domain Authority',
        shortName: 'DA',
        description: 'Moz\'s 0-100 score predicting how well a site will rank in search results. Higher = better rankings.',
        goodRange: '30+',
        greatRange: '50+',
        source: 'Moz',
        sourceUrl: 'https://moz.com/domain-authority',
        whyMatters: 'Higher DA means the domain has established authority that transfers to your new content.',
        currentStatus: 'requires_api',
        icon: '📊'
    },
    DR: {
        name: 'Domain Rating',
        shortName: 'DR',
        description: 'Ahrefs\' 0-100 score measuring the strength of a domain\'s backlink profile.',
        goodRange: '20+',
        greatRange: '40+',
        source: 'Ahrefs',
        sourceUrl: 'https://ahrefs.com/blog/domain-rating/',
        whyMatters: 'Strong backlink profile = faster ranking for new content. Critical for skip-sandbox strategy.',
        currentStatus: 'requires_api',
        icon: '🔗'
    },
    PA: {
        name: 'Page Authority',
        shortName: 'PA',
        description: 'Moz\'s score predicting how well a specific page will rank (we measure homepage).',
        goodRange: '25+',
        greatRange: '40+',
        source: 'Moz',
        sourceUrl: 'https://moz.com/page-authority',
        whyMatters: 'Indicates the homepage\'s individual ranking power.',
        currentStatus: 'requires_api',
        icon: '📄'
    },

    // Trust Metrics
    TF: {
        name: 'Trust Flow',
        shortName: 'TF',
        description: 'Majestic\'s quality score (0-100) measuring how trustworthy a site is based on quality of linking sites.',
        goodRange: '15+',
        greatRange: '30+',
        source: 'Majestic',
        sourceUrl: 'https://majestic.com/support/glossary#TrustFlow',
        whyMatters: 'High TF means links from reputable sites. TF/CF ratio > 0.5 indicates clean link profile.',
        currentStatus: 'requires_api',
        icon: '🛡️'
    },
    CF: {
        name: 'Citation Flow',
        shortName: 'CF',
        description: 'Majestic\'s quantity score (0-100) measuring how influential a site is based on link volume.',
        goodRange: '15+',
        greatRange: '30+',
        source: 'Majestic',
        sourceUrl: 'https://majestic.com/support/glossary#CitationFlow',
        whyMatters: 'Combined with TF, helps identify spam. If CF >> TF, domain may have spammy links.',
        currentStatus: 'requires_api',
        icon: '📈'
    },

    // Age & History
    age: {
        name: 'Domain Age',
        shortName: 'Age',
        description: 'Years since the domain was first registered. Verified via WHOIS records.',
        goodRange: '2+ years',
        greatRange: '5+ years',
        source: 'WHOIS',
        sourceUrl: 'https://who.is/',
        whyMatters: 'Older domains bypass Google\'s "sandbox" period for new sites (typically 6-12 months). Critical for immediate monetization.',
        currentStatus: 'available',
        icon: '📅'
    },
    backlinks: {
        name: 'Backlink Count',
        shortName: 'Links',
        description: 'Total number of external links pointing to this domain from other websites.',
        goodRange: '100+',
        greatRange: '1000+',
        source: 'Multiple APIs',
        sourceUrl: 'https://ahrefs.com/backlink-checker',
        whyMatters: 'More quality backlinks = more authority. Quality matters more than quantity.',
        currentStatus: 'requires_api',
        icon: '🔗'
    },
    refDomains: {
        name: 'Referring Domains',
        shortName: 'Ref Domains',
        description: 'Number of unique domains linking to this site. More diverse = better.',
        goodRange: '50+',
        greatRange: '200+',
        source: 'Multiple APIs',
        sourceUrl: 'https://ahrefs.com/',
        whyMatters: 'Diverse link sources indicate natural link profile. One domain with 1000 links < 100 domains with 1 link each.',
        currentStatus: 'requires_api',
        icon: '🌐'
    },

    // Price & Value
    price: {
        name: 'Auction Price',
        shortName: 'Price',
        description: 'Current listed price or auction bid for the expired domain.',
        goodRange: 'Under $50',
        greatRange: 'Under $15',
        source: 'Registrar/Auction',
        sourceUrl: 'https://www.godaddy.com/domain-value-appraisal',
        whyMatters: 'ROI calculation: Can you earn back the cost quickly through AdSense/affiliate revenue?',
        currentStatus: 'requires_api',
        icon: '💰'
    },

    // TLD
    tld: {
        name: 'Top-Level Domain',
        shortName: 'TLD',
        description: 'The extension after the domain name (.com, .net, .org, etc.)',
        goodRange: '.com, .net, .org',
        greatRange: '.com',
        source: 'Domain Name',
        sourceUrl: '',
        whyMatters: '.com is universally trusted and commands highest resale value. .io/.co good for tech. Avoid obscure TLDs for AdSense.',
        currentStatus: 'available',
        icon: '🏷️'
    },

    // Status Indicators
    available: {
        name: 'Availability Status',
        shortName: 'Status',
        description: 'Whether the domain is currently purchasable or already registered.',
        goodRange: 'Available',
        greatRange: 'Available',
        source: 'Registrar API',
        sourceUrl: '',
        whyMatters: 'Only available domains can be purchased. Drop-catching services compete for valuable expiring domains.',
        currentStatus: 'requires_api',
        icon: '✅'
    },

    // Quality Scores
    spamScore: {
        name: 'Spam Score',
        shortName: 'Spam',
        description: 'Moz\'s spam likelihood percentage. Lower is better.',
        goodRange: 'Under 20%',
        greatRange: 'Under 5%',
        source: 'Moz',
        sourceUrl: 'https://moz.com/help/link-explorer/link-building/spam-score',
        whyMatters: 'High spam score = risky for AdSense. Google may penalize sites with spammy backlink history.',
        currentStatus: 'requires_api',
        icon: '⚠️'
    },
    overallScore: {
        name: 'Ifrit Quality Score',
        shortName: 'Score',
        description: 'Our composite 0-100 score weighing all factors for AdSense/monetization potential.',
        goodRange: '60+',
        greatRange: '80+',
        source: 'Ifrit Algorithm',
        sourceUrl: '',
        whyMatters: 'Quick assessment combining authority, trust, age, and risk factors for your use case.',
        currentStatus: 'calculated',
        icon: '⭐'
    }
};

export interface MetricExplanation {
    name: string;
    shortName: string;
    description: string;
    goodRange: string;
    greatRange: string;
    source: string;
    sourceUrl?: string;
    whyMatters: string;
    currentStatus: 'available' | 'requires_api' | 'calculated';
    icon: string;
}

interface MetricTooltipProps {
    metricKey: keyof typeof METRIC_EXPLANATIONS | string;
    value?: string | number;
    children?: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    showIcon?: boolean;
}

export default function MetricTooltip({
    metricKey,
    value,
    children,
    position = 'top',
    showIcon = true
}: MetricTooltipProps) {
    const [isOpen, setIsOpen] = useState(false);
    const metric = METRIC_EXPLANATIONS[metricKey];

    if (!metric) {
        return <>{children}</>;
    }

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2'
    };

    const statusColors = {
        available: 'bg-green-100 text-green-700',
        requires_api: 'bg-red-100 text-red-700',
        calculated: 'bg-blue-100 text-blue-700'
    };

    const statusLabels = {
        available: '✓ Real Data',
        requires_api: '⚠️ API Required',
        calculated: '🧮 Calculated'
    };

    return (
        <div
            className="relative inline-flex items-center gap-1 group cursor-help"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
            onClick={() => setIsOpen(!isOpen)}
        >
            {children || (
                <span className="font-medium">
                    {metric.icon} {metric.shortName}: {value}
                </span>
            )}

            {showIcon && (
                <HelpCircle className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}

            {/* Tooltip popup */}
            {isOpen && (
                <div
                    className={`absolute z-50 ${positionClasses[position]} w-72 p-4 bg-white rounded-xl shadow-xl border border-neutral-200 text-left`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-neutral-900 flex items-center gap-2">
                            <span className="text-lg">{metric.icon}</span>
                            {metric.name}
                        </h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[metric.currentStatus]}`}>
                            {statusLabels[metric.currentStatus]}
                        </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-neutral-600 mb-3">
                        {metric.description}
                    </p>

                    {/* Ranges */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-green-50 rounded-lg p-2">
                            <div className="text-xs text-green-600 font-medium">Good</div>
                            <div className="text-sm font-bold text-green-700">{metric.goodRange}</div>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-2">
                            <div className="text-xs text-emerald-600 font-medium">Great</div>
                            <div className="text-sm font-bold text-emerald-700">{metric.greatRange}</div>
                        </div>
                    </div>

                    {/* Why it matters */}
                    <div className="bg-blue-50 rounded-lg p-2 mb-2">
                        <div className="text-xs text-blue-600 font-medium mb-1">💡 Why It Matters</div>
                        <p className="text-xs text-blue-700">{metric.whyMatters}</p>
                    </div>

                    {/* Source */}
                    <div className="flex items-center justify-between text-xs text-neutral-400">
                        <span>Source: {metric.source}</span>
                        {metric.sourceUrl && (
                            <a
                                href={metric.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-500 hover:text-blue-600"
                            >
                                Learn more <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </div>

                    {/* Data Status Warning */}
                    {metric.currentStatus === 'requires_api' && (
                        <div className="mt-2 pt-2 border-t border-neutral-100">
                            <p className="text-xs text-amber-600">
                                ⚠️ No API configured. Connect Moz/Ahrefs/Majestic APIs in Settings for real data.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Educational banner component
interface DataSourceBannerProps {
    type: 'expired' | 'analyzer' | 'flip';
}

export function DataSourceBanner({ type }: DataSourceBannerProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const bannerContent = {
        expired: {
            title: '📊 About This Data',
            summary: 'No API configured. Real expired domain data requires Spamzilla or ExpiredDomains.net API.',
            details: [
                { label: 'Domain List', value: 'No API', status: 'warning' },
                { label: 'DA/DR Metrics', value: 'API Required', status: 'warning' },
                { label: 'Availability', value: 'May be outdated', status: 'warning' },
                { label: 'Prices', value: 'Approximate', status: 'demo' }
            ],
            recommendation: 'For accurate data, integrate Spamzilla API ($27/mo) or ExpiredDomains.net',
            learnMoreUrl: 'https://www.spamzilla.io/'
        },
        analyzer: {
            title: '🔬 Analysis Methodology',
            summary: 'Scores are calculated using a weighted algorithm based on public domain metrics.',
            details: [
                { label: 'WHOIS Data', value: 'Real (free)', status: 'real' },
                { label: 'Wayback Check', value: 'Real (free)', status: 'real' },
                { label: 'SEO Metrics', value: 'Estimated', status: 'demo' },
                { label: 'Spam Detection', value: 'Pattern-based', status: 'partial' }
            ],
            recommendation: 'For professional analysis, connect Moz/Ahrefs/Majestic APIs',
            learnMoreUrl: 'https://moz.com/products/api'
        },
        flip: {
            title: '📈 Flip Tracking Guide',
            summary: 'Track your domain investments from acquisition to sale.',
            details: [
                { label: 'Stage: Acquired', value: 'Just purchased, evaluating', status: 'info' },
                { label: 'Stage: Building', value: 'Adding content/traffic', status: 'info' },
                { label: 'Stage: Listed', value: 'On marketplace for sale', status: 'info' },
                { label: 'Stage: Sold', value: 'Transaction complete', status: 'info' }
            ],
            recommendation: 'Import domains from your Watchlist for seamless tracking',
            learnMoreUrl: ''
        }
    };

    const content = bannerContent[type];
    const statusColors: Record<string, string> = {
        real: 'bg-green-100 text-green-700',
        demo: 'bg-amber-100 text-amber-700',
        warning: 'bg-red-100 text-red-700',
        partial: 'bg-blue-100 text-blue-700',
        info: 'bg-neutral-100 text-neutral-700'
    };

    return (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4 mb-6">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between"
            >
                <div className="flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-blue-900">{content.title}</span>
                </div>
                <span className="text-blue-600 text-sm">
                    {isExpanded ? '▲ Less' : '▼ More'}
                </span>
            </button>

            <p className="text-sm text-blue-700 mt-2">{content.summary}</p>

            {isExpanded && (
                <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        {content.details.map((detail, i) => (
                            <div key={i} className="flex items-center justify-between bg-white/50 rounded-lg p-2">
                                <span className="text-xs text-neutral-600">{detail.label}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[detail.status]}`}>
                                    {detail.value}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white/70 rounded-lg p-3">
                        <p className="text-xs text-neutral-600">
                            💡 <strong>Recommendation:</strong> {content.recommendation}
                        </p>
                        {content.learnMoreUrl && (
                            <a
                                href={content.learnMoreUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                            >
                                Learn more <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Filter presets for quick setup
export interface FilterPreset {
    id: string;
    name: string;
    icon: string;
    description: string;
    filters: {
        minDA?: number;
        maxDA?: number;
        minAge?: number;
        tlds?: string[];
        maxPrice?: number;
        minBacklinks?: number;
    };
}

export const FILTER_PRESETS: FilterPreset[] = [
    {
        id: 'adsense-ready',
        name: 'Best for AdSense',
        icon: '💰',
        description: 'Aged domains with authority, ready for immediate monetization',
        filters: {
            minDA: 20,
            minAge: 3,
            tlds: ['.com', '.net', '.org'],
            maxPrice: 50,
            minBacklinks: 100
        }
    },
    {
        id: 'email-lists',
        name: 'Best for Email Lists',
        icon: '📧',
        description: 'Clean domains suitable for email marketing and newsletters',
        filters: {
            minDA: 10,
            minAge: 2,
            tlds: ['.com', '.io', '.co'],
            maxPrice: 30
        }
    },
    {
        id: 'domain-flip',
        name: 'Best for Flipping',
        icon: '🔄',
        description: 'High authority domains with resale potential',
        filters: {
            minDA: 30,
            minAge: 4,
            tlds: ['.com'],
            minBacklinks: 500
        }
    },
    {
        id: 'budget-start',
        name: 'Budget Starter',
        icon: '🌱',
        description: 'Affordable domains to test and learn the process',
        filters: {
            minDA: 5,
            minAge: 1,
            maxPrice: 15
        }
    },
    {
        id: 'skip-sandbox',
        name: 'Skip Sandbox',
        icon: '⚡',
        description: 'Aged domains to bypass Google\'s new site waiting period',
        filters: {
            minAge: 2,
            tlds: ['.com', '.net', '.org', '.info'],
            maxPrice: 40
        }
    }
];
