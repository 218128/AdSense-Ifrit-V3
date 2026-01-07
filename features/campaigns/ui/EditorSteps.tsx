'use client';

/**
 * Campaign Editor Steps - Step Components
 * FSD: features/campaigns/ui/EditorSteps.tsx
 */

import { Globe, Languages } from 'lucide-react';
import type { WPSite } from '@/features/wordpress';
import type { AIConfig, LanguageMapping } from '../model/types';
import { AuthorSelector } from '../components/AuthorSelector';

// ============================================================================
// Types
// ============================================================================

export interface EditorFormState {
    name: string;
    description: string;
    targetSiteId: string;
    targetCategoryId?: number;
    postStatus: 'publish' | 'draft' | 'pending';
    sourceType: 'keywords' | 'rss' | 'trends' | 'manual' | 'translation';
    keywords: string;
    rssFeedUrls: string;  // RSS: one URL per line
    rssAiRewrite: boolean; // RSS: AI rewrite content
    trendsRegion: string;  // Trends: region code
    trendsCategory: string; // Trends: category filter
    // Translation source
    translationSourceSiteId: string;  // Site to fetch posts from
    translationTargetLanguages: LanguageMapping[];  // Target languages with sites
    translationHumanize: boolean;  // Run through humanizer
    translationOptimizeReadability: boolean;  // Optimize readability
    // AI config
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
    // Phase 2: Quality & Author
    authorId: string;           // Selected author profile
    injectEEATSignals: boolean; // Auto-inject E-E-A-T phrases
    qualityGateEnabled: boolean; // Enable quality scoring
    humanize: boolean;          // Run through humanizer
    optimizeReadability: boolean; // Optimize readability
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

export function SourceStep({ form, updateField, sites }: SourceStepProps & { sites?: WPSite[] }) {
    const sourceTypes = ['keywords', 'rss', 'trends', 'translation', 'manual'] as const;
    const descriptions = {
        keywords: 'Generate from keyword list',
        rss: 'Import from RSS feeds',
        trends: 'Auto-generate from Google Trends',
        translation: 'Translate existing posts',
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
                            <div className="font-medium capitalize flex items-center gap-1">
                                {type === 'translation' && <Languages className="w-4 h-4" />}
                                {type === 'rss' ? 'RSS Feed' : type === 'trends' ? 'Google Trends' : type === 'translation' ? 'Translation' : type}
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
            {form.sourceType === 'translation' && sites && (
                <TranslationSourceConfig
                    form={form}
                    updateField={updateField}
                    sites={sites}
                />
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
            {/* Info about AI configuration */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                <strong>Note:</strong> AI providers are configured in Settings → Capabilities.
                The system will use your configured default provider with automatic fallback.
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            {/* Quality & E-E-A-T (Phase 2) */}
            <div className="pt-2 border-t border-neutral-200">
                <h4 className="text-sm font-medium text-neutral-700 mb-2">Quality & E-E-A-T</h4>
                <p className="text-xs text-neutral-500 mb-3">
                    Enhance content quality with author expertise and Google E-E-A-T signals.
                </p>
                <div className="space-y-2">
                    <Checkbox
                        label="Inject E-E-A-T signals (experience phrases, author bio)"
                        checked={form.injectEEATSignals}
                        onChange={(v) => updateField('injectEEATSignals', v)}
                    />
                    <Checkbox
                        label="Enable quality gate (score content before publishing)"
                        checked={form.qualityGateEnabled}
                        onChange={(v) => updateField('qualityGateEnabled', v)}
                    />
                    <Checkbox
                        label="Humanize content (reduce AI detection)"
                        checked={form.humanize}
                        onChange={(v) => updateField('humanize', v)}
                    />
                    <Checkbox
                        label="Optimize readability (Flesch score improvement)"
                        checked={form.optimizeReadability}
                        onChange={(v) => updateField('optimizeReadability', v)}
                    />
                </div>

                {/* Author Selection */}
                {form.injectEEATSignals && (
                    <div className="mt-4">
                        <AuthorSelector
                            selectedAuthorId={form.authorId || undefined}
                            siteId={form.targetSiteId}
                            minHealthScore={40}
                            required={false}
                            onChange={(id) => updateField('authorId', id || '')}
                        />
                        <p className="text-xs text-neutral-400 mt-1">
                            Author expertise will be matched to content topic for E-E-A-T signals
                        </p>
                    </div>
                )}
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

// ============================================================================
// Translation Source Config
// ============================================================================

const SUPPORTED_LANGUAGES = [
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'ar', name: 'Arabic' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'it', name: 'Italian' },
    { code: 'nl', name: 'Dutch' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ko', name: 'Korean' },
    { code: 'tr', name: 'Turkish' },
    { code: 'pl', name: 'Polish' },
    { code: 'hi', name: 'Hindi' },
];

interface TranslationSourceConfigProps {
    form: EditorFormState;
    updateField: <K extends keyof EditorFormState>(field: K, value: EditorFormState[K]) => void;
    sites: WPSite[];
}

function TranslationSourceConfig({ form, updateField, sites }: TranslationSourceConfigProps) {
    const handleAddLanguage = () => {
        const newLang: LanguageMapping = {
            language: 'es',
            languageName: 'Spanish',
            targetSiteId: sites[0]?.id || '',
        };
        updateField('translationTargetLanguages', [...form.translationTargetLanguages, newLang]);
    };

    const handleRemoveLanguage = (index: number) => {
        const updated = form.translationTargetLanguages.filter((_, i) => i !== index);
        updateField('translationTargetLanguages', updated);
    };

    const handleUpdateLanguage = (index: number, updates: Partial<LanguageMapping>) => {
        const updated = form.translationTargetLanguages.map((lang, i) =>
            i === index ? { ...lang, ...updates } : lang
        );
        updateField('translationTargetLanguages', updated);
    };

    return (
        <div className="space-y-4">
            {/* Source Site */}
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                    <Globe className="w-4 h-4 inline mr-1" />
                    Source Site (fetch posts from)
                </label>
                <select
                    value={form.translationSourceSiteId}
                    onChange={(e) => updateField('translationSourceSiteId', e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">— Select source site —</option>
                    {sites.map(site => (
                        <option key={site.id} value={site.id}>{site.name} ({site.url})</option>
                    ))}
                </select>
            </div>

            {/* Target Languages */}
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                    <Languages className="w-4 h-4 inline mr-1" />
                    Target Languages
                </label>

                {form.translationTargetLanguages.length === 0 ? (
                    <div className="p-4 border border-dashed border-neutral-300 rounded-lg text-center text-neutral-500 text-sm">
                        No languages added. Click &quot;Add Language&quot; to start.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {form.translationTargetLanguages.map((lang, index) => (
                            <div key={index} className="flex items-center gap-2 p-3 bg-neutral-50 rounded-lg">
                                <select
                                    value={lang.language}
                                    onChange={(e) => {
                                        const selected = SUPPORTED_LANGUAGES.find(l => l.code === e.target.value);
                                        handleUpdateLanguage(index, {
                                            language: e.target.value,
                                            languageName: selected?.name || e.target.value,
                                        });
                                    }}
                                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                >
                                    {SUPPORTED_LANGUAGES.map(l => (
                                        <option key={l.code} value={l.code}>{l.name} ({l.code})</option>
                                    ))}
                                </select>
                                <span className="text-neutral-400">→</span>
                                <select
                                    value={lang.targetSiteId}
                                    onChange={(e) => handleUpdateLanguage(index, { targetSiteId: e.target.value })}
                                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">— Select target site —</option>
                                    {sites.map(site => (
                                        <option key={site.id} value={site.id}>{site.name}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => handleRemoveLanguage(index)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Remove"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <button
                    onClick={handleAddLanguage}
                    className="mt-2 px-4 py-2 text-sm border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                    + Add Language
                </button>
            </div>

            {/* Post Processing Options */}
            <div className="pt-3 border-t border-neutral-200">
                <h4 className="text-sm font-medium text-neutral-700 mb-2">Post-Processing</h4>
                <div className="space-y-2">
                    <Checkbox
                        label="Humanize content after translation"
                        checked={form.translationHumanize}
                        onChange={(v) => updateField('translationHumanize', v)}
                    />
                    <Checkbox
                        label="Optimize readability"
                        checked={form.translationOptimizeReadability}
                        onChange={(v) => updateField('translationOptimizeReadability', v)}
                    />
                </div>
            </div>

            {/* Info Note */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <strong>How it works:</strong> Posts from the source site will be translated to each
                target language and published to the corresponding target site. Already-translated
                posts are automatically skipped.
            </div>
        </div>
    );
}

