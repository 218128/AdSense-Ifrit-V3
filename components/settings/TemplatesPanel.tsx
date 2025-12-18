'use client';

/**
 * TemplatesPanel Component
 * 
 * Displays available website templates in Settings.
 * Shows template details, versions, features, and use cases.
 */

import { useState } from 'react';
import {
    Layout,
    Newspaper,
    BookOpen,
    ChevronDown,
    ChevronUp,
    Check,
    Star,
    Clock,
    Zap,
    Eye
} from 'lucide-react';
import {
    getAllRegistries,
    TemplateRegistry
} from '@/lib/templateVersions';
import TemplatePreviewModal from './TemplatePreviewModal';

// Extended template info with use cases and features
const TEMPLATE_DETAILS: Record<string, {
    icon: React.ReactNode;
    color: string;
    gradient: string;
    useCases: string[];
    features: string[];
    bestFor: string;
}> = {
    'niche-authority': {
        icon: <Layout className="w-6 h-6" />,
        color: 'indigo',
        gradient: 'from-indigo-500 to-purple-500',
        bestFor: 'Long-form authority content',
        useCases: [
            'Single-topic niche blogs',
            'Affiliate marketing sites',
            'AdSense revenue optimization',
            'Evergreen content sites'
        ],
        features: [
            'Clean, professional layout',
            'E-E-A-T signal components',
            'Related articles sidebar',
            'Author bio with credentials',
            'FAQ schema integration',
            'Optimized ad placements'
        ]
    },
    'topical-magazine': {
        icon: <Newspaper className="w-6 h-6" />,
        color: 'rose',
        gradient: 'from-rose-500 to-pink-500',
        bestFor: 'News and editorial content',
        useCases: [
            'News and magazine sites',
            'Multi-category publications',
            'Trending topic coverage',
            'Editorial content hubs'
        ],
        features: [
            'Magazine-style grid layout',
            'Featured article carousel',
            'Category mega-menu',
            'Breaking news banner',
            'Trending section',
            'Social sharing buttons'
        ]
    },
    'expert-hub': {
        icon: <BookOpen className="w-6 h-6" />,
        color: 'emerald',
        gradient: 'from-emerald-500 to-teal-500',
        bestFor: 'Deep knowledge documentation',
        useCases: [
            'Educational content hubs',
            'How-to guide collections',
            'Pillar/cluster SEO strategy',
            'Course-style learning paths'
        ],
        features: [
            'Hub and spoke navigation',
            'Pillar page templates',
            'Cluster article linking',
            'Progress tracking',
            'Expert credentials showcase',
            'Resource library section'
        ]
    }
};

export default function TemplatesPanel() {
    const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
    const [previewTemplate, setPreviewTemplate] = useState<TemplateRegistry | null>(null);
    const registries = getAllRegistries();

    const toggleExpand = (id: string) => {
        setExpandedTemplate(expandedTemplate === id ? null : id);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-neutral-900">Website Templates</h3>
                    <p className="text-sm text-neutral-500">
                        Choose from {registries.length} professionally designed templates
                    </p>
                </div>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full">
                    {registries.length} Available
                </span>
            </div>

            {/* Template Cards */}
            <div className="space-y-4">
                {registries.map((registry: TemplateRegistry) => {
                    const details = TEMPLATE_DETAILS[registry.id];
                    const isExpanded = expandedTemplate === registry.id;
                    const latestVersion = registry.versions[0];

                    return (
                        <div
                            key={registry.id}
                            className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                        >
                            {/* Template Header */}
                            <div
                                className="p-4 cursor-pointer"
                                onClick={() => toggleExpand(registry.id)}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Icon */}
                                    <div className={`p-3 rounded-xl bg-gradient-to-br ${details?.gradient || 'from-gray-500 to-gray-600'} text-white`}>
                                        {details?.icon || <Layout className="w-6 h-6" />}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold text-neutral-900">{registry.name}</h4>
                                            <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs rounded-full">
                                                v{registry.currentVersion}
                                            </span>
                                        </div>
                                        <p className="text-sm text-neutral-600">{registry.description}</p>
                                        {details && (
                                            <div className="flex items-center gap-1 mt-2 text-xs text-neutral-500">
                                                <Star className="w-3 h-3 text-amber-500" />
                                                <span>Best for: {details.bestFor}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Preview Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewTemplate(registry);
                                        }}
                                        className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center gap-1.5 shadow-sm"
                                    >
                                        <Eye className="w-4 h-4" />
                                        Preview
                                    </button>

                                    {/* Expand Toggle */}
                                    <button className="p-2 text-neutral-400 hover:text-neutral-600">
                                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && details && (
                                <div className="px-4 pb-4 border-t border-neutral-100">
                                    <div className="grid md:grid-cols-2 gap-6 pt-4">
                                        {/* Features */}
                                        <div>
                                            <h5 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                                                <Zap className="w-4 h-4 text-amber-500" />
                                                Features
                                            </h5>
                                            <ul className="space-y-2">
                                                {details.features.map((feature, i) => (
                                                    <li key={i} className="flex items-center gap-2 text-sm text-neutral-600">
                                                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                        {feature}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Use Cases */}
                                        <div>
                                            <h5 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                                                <Star className="w-4 h-4 text-purple-500" />
                                                Best Use Cases
                                            </h5>
                                            <ul className="space-y-2">
                                                {details.useCases.map((useCase, i) => (
                                                    <li key={i} className="flex items-center gap-2 text-sm text-neutral-600">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                                                        {useCase}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Version History */}
                                    <div className="mt-6 pt-4 border-t border-neutral-100">
                                        <h5 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-blue-500" />
                                            Latest Changes (v{latestVersion.version})
                                        </h5>
                                        <ul className="grid sm:grid-cols-2 gap-2">
                                            {latestVersion.changelog.map((change, i) => (
                                                <li key={i} className="flex items-center gap-2 text-sm text-neutral-600">
                                                    <div className="w-1 h-1 rounded-full bg-blue-400 flex-shrink-0" />
                                                    {change}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Info Footer */}
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                <p className="text-sm text-indigo-700">
                    <strong>Tip:</strong> Templates are selected during website creation.
                    Existing websites can be upgraded to newer template versions from the website detail page.
                </p>
            </div>

            {/* Preview Modal */}
            {previewTemplate && (
                <TemplatePreviewModal
                    template={previewTemplate}
                    onClose={() => setPreviewTemplate(null)}
                />
            )}
        </div>
    );
}
