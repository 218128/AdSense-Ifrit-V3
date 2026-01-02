'use client';

/**
 * Campaign Editor Steps - Step Components
 * FSD: features/campaigns/ui/EditorSteps.tsx
 */

import { Globe } from 'lucide-react';
import type { WPSite } from '@/features/wordpress';
import type { AIConfig } from '../model/types';

// ============================================================================
// Types
// ============================================================================

export interface EditorFormState {
    name: string;
    description: string;
    targetSiteId: string;
    targetCategoryId?: number;
    postStatus: 'publish' | 'draft' | 'pending';
    sourceType: 'keywords' | 'rss' | 'trends' | 'manual';
    keywords: string;
    rssFeedUrls: string;  // RSS: one URL per line
    rssAiRewrite: boolean; // RSS: AI rewrite content
    trendsRegion: string;  // Trends: region code
    trendsCategory: string; // Trends: category filter
    provider: AIConfig['provider'];
    articleType: AIConfig['articleType'];
    tone: AIConfig['tone'];
    targetLength: number;
    useResearch: boolean;
    includeImages: boolean;
    includeFAQ: boolean;
    includeSchema: boolean; // Schema markup
    optimizeForSEO: boolean; // Internal linking
    // Multi-site publishing
    enableMultiSite: boolean;
    additionalSiteIds: string[]; // Additional sites to publish to
    multiSiteStaggerMinutes: number;
    // Content spinner
    enableSpinner: boolean;
    spinnerMode: 'light' | 'moderate' | 'heavy';
    // Schedule
    scheduleType: 'manual' | 'interval' | 'cron';
    intervalHours: number;
    maxPostsPerRun: number;
}

type FormUpdater = <K extends keyof EditorFormState>(
    field: K,
    value: EditorFormState[K]
) => void;

// ============================================================================
// Step 1: Basics
// ============================================================================

interface BasicsStepProps {
    form: EditorFormState;
    updateField: FormUpdater;
    sites: WPSite[];
    selectedSite?: WPSite;
}

export function BasicsStep({ form, updateField, sites, selectedSite }: BasicsStepProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Campaign Name</label>
                <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="My Content Campaign"
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Description (optional)</label>
                <textarea
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="What this campaign is for..."
                    rows={2}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                    <Globe className="w-4 h-4 inline mr-1" />
                    Target WordPress Site
                </label>
                <select
                    value={form.targetSiteId}
                    onChange={(e) => updateField('targetSiteId', e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                    {sites.map(site => (
                        <option key={site.id} value={site.id}>{site.name} ({site.url})</option>
                    ))}
                </select>
            </div>
            {selectedSite?.categories && selectedSite.categories.length > 0 && (
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Category (optional)</label>
                    <select
                        value={form.targetCategoryId || ''}
                        onChange={(e) => updateField('targetCategoryId', e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">— No category —</option>
                        {selectedSite.categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            )}
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Post Status</label>
                <select
                    value={form.postStatus}
                    onChange={(e) => updateField('postStatus', e.target.value as EditorFormState['postStatus'])}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="draft">Draft (review before publishing)</option>
                    <option value="pending">Pending Review</option>
                    <option value="publish">Publish Immediately</option>
                </select>
            </div>
        </div>
    );
}

// ============================================================================
// Step 2: Source
// ============================================================================

interface SourceStepProps {
    form: EditorFormState;
    updateField: FormUpdater;
}

export function SourceStep({ form, updateField }: SourceStepProps) {
    const sourceTypes = ['keywords', 'rss', 'trends', 'manual'] as const;
    const descriptions = {
        keywords: 'Generate from keyword list',
        rss: 'Import from RSS feeds',
        trends: 'Auto-generate from Google Trends',
        manual: 'Coming soon'
    };

    const regions = [
        { code: 'US', name: 'United States' },
        { code: 'GB', name: 'United Kingdom' },
        { code: 'CA', name: 'Canada' },
        { code: 'AU', name: 'Australia' },
        { code: 'IN', name: 'India' },
        { code: 'DE', name: 'Germany' },
        { code: 'FR', name: 'France' },
        { code: 'JP', name: 'Japan' },
        { code: 'BR', name: 'Brazil' },
    ];

    const categories = [
        { id: '', name: 'All Categories' },
        { id: 'business', name: 'Business' },
        { id: 'entertainment', name: 'Entertainment' },
        { id: 'health', name: 'Health' },
        { id: 'science', name: 'Science & Tech' },
        { id: 'sports', name: 'Sports' },
        { id: 'tech', name: 'Technology' },
    ];

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Content Source</label>
                <div className="grid grid-cols-2 gap-2">
                    {sourceTypes.map(type => (
                        <button
                            key={type}
                            onClick={() => updateField('sourceType', type)}
                            disabled={type === 'manual'}
                            className={`px-4 py-3 rounded-lg border text-left transition-colors ${form.sourceType === type
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                : 'border-neutral-200 hover:border-neutral-300'
                                } ${type === 'manual' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <div className="font-medium capitalize">
                                {type === 'rss' ? 'RSS Feed' : type === 'trends' ? 'Google Trends' : type}
                            </div>
                            <div className="text-xs text-neutral-500">{descriptions[type]}</div>
                        </button>
                    ))}
                </div>
            </div>
            {form.sourceType === 'keywords' && (
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Keywords (one per line)</label>
                    <textarea
                        value={form.keywords}
                        onChange={(e) => updateField('keywords', e.target.value)}
                        placeholder="best budget smartphones&#10;affordable wireless earbuds"
                        rows={6}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                    />
                    <p className="mt-1 text-xs text-neutral-500">
                        {form.keywords.split('\n').filter(k => k.trim()).length} keywords
                    </p>
                </div>
            )}
            {form.sourceType === 'rss' && (
                <>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">RSS Feed URLs (one per line)</label>
                        <textarea
                            value={form.rssFeedUrls}
                            onChange={(e) => updateField('rssFeedUrls', e.target.value)}
                            placeholder="https://techcrunch.com/feed/&#10;https://www.theverge.com/rss/index.xml"
                            rows={4}
                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                        />
                        <p className="mt-1 text-xs text-neutral-500">
                            {form.rssFeedUrls.split('\n').filter(u => u.trim()).length} feeds
                        </p>
                    </div>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={form.rssAiRewrite}
                            onChange={(e) => updateField('rssAiRewrite', e.target.checked)}
                            className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-neutral-700">AI rewrite content (recommended to avoid duplicate content)</span>
                    </label>
                </>
            )}
            {form.sourceType === 'trends' && (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Region</label>
                            <select
                                value={form.trendsRegion}
                                onChange={(e) => updateField('trendsRegion', e.target.value)}
                                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                                {regions.map(r => (
                                    <option key={r.code} value={r.code}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
                            <select
                                value={form.trendsCategory}
                                onChange={(e) => updateField('trendsCategory', e.target.value)}
                                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                        <strong>Note:</strong> Uses unofficial Google Trends API (free). For reliable production use,
                        add your SerpAPI key in Settings → API Keys.
                    </div>
                </>
            )}
        </div>
    );
}

// ============================================================================
// Step 3: AI Config
// ============================================================================

interface AIStepProps {
    form: EditorFormState;
    updateField: FormUpdater;
}

export function AIStep({ form, updateField }: AIStepProps) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">AI Provider</label>
                    <select
                        value={form.provider}
                        onChange={(e) => updateField('provider', e.target.value as AIConfig['provider'])}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="gemini">Gemini</option>
                        <option value="deepseek">DeepSeek</option>
                        <option value="openrouter">OpenRouter</option>
                        <option value="perplexity">Perplexity</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Article Type</label>
                    <select
                        value={form.articleType}
                        onChange={(e) => updateField('articleType', e.target.value as AIConfig['articleType'])}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="pillar">Pillar (2000+ words)</option>
                        <option value="cluster">Cluster (1000-1500)</option>
                        <option value="how-to">How-To Guide</option>
                        <option value="review">Review</option>
                        <option value="listicle">Listicle</option>
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Tone</label>
                    <select
                        value={form.tone}
                        onChange={(e) => updateField('tone', e.target.value as AIConfig['tone'])}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="professional">Professional</option>
                        <option value="conversational">Conversational</option>
                        <option value="authoritative">Authoritative</option>
                        <option value="friendly">Friendly</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Target Length</label>
                    <input
                        type="number"
                        value={form.targetLength}
                        onChange={(e) => updateField('targetLength', Number(e.target.value))}
                        min={500}
                        max={5000}
                        step={100}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {/* Content Options */}
            <div className="pt-2 border-t border-neutral-200">
                <h4 className="text-sm font-medium text-neutral-700 mb-2">Content Options</h4>
                <div className="space-y-2">
                    <Checkbox label="Research topic before generating" checked={form.useResearch} onChange={(v) => updateField('useResearch', v)} />
                    <Checkbox label="Generate cover image" checked={form.includeImages} onChange={(v) => updateField('includeImages', v)} />
                    <Checkbox label="Include FAQ section" checked={form.includeFAQ} onChange={(v) => updateField('includeFAQ', v)} />
                </div>
            </div>

            {/* SEO Enhancement */}
            <div className="pt-2 border-t border-neutral-200">
                <h4 className="text-sm font-medium text-neutral-700 mb-2">SEO Enhancement</h4>
                <div className="space-y-2">
                    <Checkbox label="Auto-add internal links (to related posts)" checked={form.optimizeForSEO} onChange={(v) => updateField('optimizeForSEO', v)} />
                    <Checkbox label="Include schema markup (Article, FAQ, HowTo)" checked={form.includeSchema} onChange={(v) => updateField('includeSchema', v)} />
                </div>
            </div>

            {/* Content Spinner */}
            <div className="pt-2 border-t border-neutral-200">
                <h4 className="text-sm font-medium text-neutral-700 mb-2">Content Spinner</h4>
                <div className="space-y-2">
                    <Checkbox label="Spin content for uniqueness" checked={form.enableSpinner} onChange={(v) => updateField('enableSpinner', v)} />
                    {form.enableSpinner && (
                        <div className="ml-6">
                            <label className="block text-xs text-neutral-500 mb-1">Spin Mode</label>
                            <select
                                value={form.spinnerMode}
                                onChange={(e) => updateField('spinnerMode', e.target.value as 'light' | 'moderate' | 'heavy')}
                                className="w-40 px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="light">Light (subtle changes)</option>
                                <option value="moderate">Moderate</option>
                                <option value="heavy">Heavy (maximum rewording)</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="flex items-center gap-2">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-neutral-700">{label}</span>
        </label>
    );
}
