'use client';

/**
 * Generate Article Modal
 * 
 * Modal for generating new article content with smart parameters:
 * - Keyword/topic input
 * - Article type selection
 * - Content options (length, tone, etc.)
 * - AI provider selection
 */

import { useState } from 'react';
import { Loader2, Sparkles, X, Zap, BookOpen, FileText, Lightbulb, Image as ImageIcon, Play, Search } from 'lucide-react';
import { addToGenerationHistory } from './GenerationHistory';
import StockPhotoSelector, { StockPhoto } from '../shared/StockPhotoSelector';
import StreamingArticlePreview from '../shared/StreamingArticlePreview';
import RefineArticleModal from './RefineArticleModal';
import { useSettingsStore } from '@/stores/settingsStore';

interface GenerateArticleModalProps {
    domain: string;
    niche: string;
    onClose: () => void;
    onGenerated: () => void;
}

type ArticleType = 'pillar' | 'cluster' | 'listicle' | 'how-to' | 'review';

interface GenerationConfig {
    keyword: string;
    articleType: ArticleType;
    tone: 'professional' | 'conversational' | 'authoritative';
    targetLength: 'short' | 'medium' | 'long';
    includeEeat: boolean;
    optimizeForAiOverview: boolean;
}

const ARTICLE_TYPES: { id: ArticleType; label: string; icon: React.ReactNode; description: string }[] = [
    { id: 'pillar', label: 'Pillar Article', icon: <BookOpen className="w-4 h-4" />, description: 'Comprehensive guide (2000+ words)' },
    { id: 'cluster', label: 'Cluster Article', icon: <FileText className="w-4 h-4" />, description: 'Supporting topic (1000-1500 words)' },
    { id: 'listicle', label: 'Listicle', icon: <Zap className="w-4 h-4" />, description: 'Top X / Best X list' },
    { id: 'how-to', label: 'How-To Guide', icon: <Lightbulb className="w-4 h-4" />, description: 'Step-by-step tutorial' },
    { id: 'review', label: 'Review', icon: <Sparkles className="w-4 h-4" />, description: 'Product/service review' },
];

export default function GenerateArticleModal({
    domain,
    niche,
    onClose,
    onGenerated
}: GenerateArticleModalProps) {
    const [config, setConfig] = useState<GenerationConfig>({
        keyword: '',
        articleType: 'cluster',
        tone: 'professional',
        targetLength: 'medium',
        includeEeat: true,
        optimizeForAiOverview: true,
    });

    const [generating, setGenerating] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showPhotoSelector, setShowPhotoSelector] = useState(false);
    const [selectedCover, setSelectedCover] = useState<StockPhoto | null>(null);
    // V4: Streaming preview mode
    const [streamingMode, setStreamingMode] = useState(false);
    const [showStreamingPreview, setShowStreamingPreview] = useState(false);
    const [streamedContent, setStreamedContent] = useState<string | null>(null);
    const [showRefineModal, setShowRefineModal] = useState(false);

    // V5: Research before generation
    const [researchEnabled, setResearchEnabled] = useState(false);
    const [researching, setResearching] = useState(false);
    const [researchResults, setResearchResults] = useState<{
        keyFindings: string[];
        suggestedContext: string;
    } | null>(null);

    // Get tokens and provider keys from store
    const integrations = useSettingsStore(state => state.integrations);
    const storeProviderKeys = useSettingsStore(state => state.providerKeys);
    const enabledProviders = useSettingsStore(state => state.enabledProviders);
    const mcpApiKeys = useSettingsStore(state => state.mcpServers.apiKeys);

    // V5: Research topic before generating
    const handleResearch = async () => {
        if (!config.keyword.trim()) {
            setError('Please enter a keyword or topic first');
            return;
        }

        setResearching(true);
        setError(null);

        try {
            // Get Perplexity API key from MCP settings
            const perplexityKey = mcpApiKeys?.perplexity || storeProviderKeys?.perplexity?.[0]?.key;

            if (!perplexityKey) {
                setError('Perplexity API key not configured. Go to Settings → MCP Tools.');
                setResearching(false);
                return;
            }

            const response = await fetch('/api/research', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `${config.keyword} ${niche} - latest trends, statistics, and expert insights`,
                    type: 'quick',
                    tool: 'perplexity',
                    apiKey: perplexityKey
                })
            });

            const data = await response.json();

            if (data.success) {
                setResearchResults({
                    keyFindings: data.keyFindings || [],
                    suggestedContext: data.suggestedContext || ''
                });
            } else {
                setError(data.error || 'Research failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Research failed');
        } finally {
            setResearching(false);
        }
    };

    const handleGenerate = async () => {
        if (!config.keyword.trim()) {
            setError('Please enter a keyword or topic');
            return;
        }

        setGenerating(true);
        setError(null);
        setStatus('Starting generation...');

        // V4: If streaming mode is enabled, show the streaming preview
        if (streamingMode) {
            setShowStreamingPreview(true);
            return; // The StreamingArticlePreview handles the generation
        }

        try {
            // Get tokens from store
            const { githubToken, githubUser } = integrations;

            if (!githubToken) {
                throw new Error('GitHub token required. Configure in Settings.');
            }

            // Get AI provider keys from store
            const getProviderKeys = () => {
                const result: Record<string, string[]> = {};
                const providers = ['gemini', 'deepseek', 'openrouter', 'vercel', 'perplexity'] as const;

                for (const provider of providers) {
                    const isEnabled = enabledProviders.includes(provider);
                    const keys = storeProviderKeys[provider] || [];

                    if (isEnabled && keys.length > 0) {
                        result[provider] = keys.map(k => k.key);
                    } else {
                        result[provider] = [];
                    }
                }
                return result;
            };

            const providerKeys = getProviderKeys();
            const hasAnyKeys = Object.values(providerKeys).some(keys => keys.length > 0);

            if (!hasAnyKeys) {
                throw new Error('No AI provider keys configured. Add keys in Settings.');
            }

            setStatus('Generating article...');

            // Call the generate API (single article mode)
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: config.keyword,
                    niche,
                    articleType: config.articleType,
                    options: {
                        tone: config.tone,
                        targetLength: config.targetLength === 'short' ? 800 :
                            config.targetLength === 'medium' ? 1500 : 2500,
                        includeEeat: config.includeEeat,
                        optimizeForAiOverview: config.optimizeForAiOverview,
                    },
                    // These options tell the API to save and optionally publish
                    saveToWebsite: domain,
                    githubConfig: {
                        token: githubToken,
                        owner: githubUser || '218128',
                        repo: domain.replace(/\./g, '-'),
                        branch: 'main'
                    }
                })
            });

            const data = await response.json();

            if (data.success) {
                // Add to generation history
                addToGenerationHistory({
                    keyword: config.keyword,
                    title: data.article?.title || config.keyword,
                    slug: data.article?.slug || config.keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                    persona: 'Auto',
                    template: config.articleType,
                    cpcScore: 70,
                    wordCount: data.article?.wordCount || (config.targetLength === 'short' ? 800 : config.targetLength === 'medium' ? 1500 : 2500),
                    trendSource: 'user_selected'
                });

                setStatus('Article generated! ✅');
                setTimeout(() => {
                    onGenerated();
                    onClose();
                }, 1500);
            } else {
                throw new Error(data.error || 'Generation failed');
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Generation failed');
            setStatus(null);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-auto">
                {/* Header */}
                <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-bold text-neutral-900">Generate Article</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-neutral-100 rounded"
                    >
                        <X className="w-5 h-5 text-neutral-500" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Keyword Input */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Keyword / Topic *
                        </label>
                        <input
                            type="text"
                            value={config.keyword}
                            onChange={e => setConfig({ ...config, keyword: e.target.value })}
                            placeholder={`e.g., "best ${niche} tips 2024"`}
                            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            autoFocus
                        />
                    </div>

                    {/* V5: Research Before Writing Toggle */}
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Search className="w-5 h-5 text-purple-600" />
                                <span className="font-medium text-purple-900">Research Before Writing</span>
                            </div>
                            <button
                                onClick={() => setResearchEnabled(!researchEnabled)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${researchEnabled ? 'bg-purple-600' : 'bg-neutral-300'
                                    }`}
                            >
                                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${researchEnabled ? 'translate-x-7' : 'translate-x-1'
                                    }`} />
                            </button>
                        </div>

                        {researchEnabled && (
                            <div className="space-y-3">
                                <p className="text-xs text-purple-700">
                                    Use Perplexity AI to research your topic before generating the article.
                                </p>

                                {!researchResults ? (
                                    <button
                                        onClick={handleResearch}
                                        disabled={researching || !config.keyword.trim()}
                                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
                                    >
                                        {researching ? (
                                            <>
                                                <span className="animate-spin">⏳</span>
                                                Researching...
                                            </>
                                        ) : (
                                            <>
                                                <Search className="w-4 h-4" />
                                                Research Topic
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-green-700 flex items-center gap-1">
                                                ✓ Research Complete
                                                <span className="text-xs text-green-600">({researchResults.keyFindings.length} insights)</span>
                                            </span>
                                            <button
                                                onClick={() => setResearchResults(null)}
                                                className="text-xs text-purple-600 hover:underline"
                                            >
                                                Re-research
                                            </button>
                                        </div>
                                        {researchResults.keyFindings.length > 0 && (
                                            <div className="p-3 bg-white rounded-lg border border-green-200 max-h-40 overflow-y-auto">
                                                <p className="text-xs font-semibold text-neutral-800 mb-2 flex items-center gap-1">
                                                    🔍 Key Findings (will enhance your article):
                                                </p>
                                                <ul className="text-sm text-neutral-700 space-y-2">
                                                    {researchResults.keyFindings.map((finding, i) => (
                                                        <li key={i} className="flex items-start gap-2">
                                                            <span className="text-green-500 mt-0.5">•</span>
                                                            <span>{finding}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {researchResults.suggestedContext && (
                                            <div className="p-2 bg-blue-50 rounded border border-blue-100 text-xs text-blue-700">
                                                <strong>Context:</strong> {researchResults.suggestedContext}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Article Type */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Article Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {ARTICLE_TYPES.map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setConfig({ ...config, articleType: type.id })}
                                    className={`p-3 border-2 rounded-lg text-left transition-all ${config.articleType === type.id
                                        ? 'border-indigo-500 bg-indigo-50'
                                        : 'border-neutral-200 hover:border-neutral-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        {type.icon}
                                        <span className="font-medium text-sm">{type.label}</span>
                                    </div>
                                    <p className="text-xs text-neutral-500">{type.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Options Row */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Tone */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Tone
                            </label>
                            <select
                                value={config.tone}
                                onChange={e => setConfig({ ...config, tone: e.target.value as typeof config.tone })}
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                            >
                                <option value="professional">Professional</option>
                                <option value="conversational">Conversational</option>
                                <option value="authoritative">Authoritative</option>
                            </select>
                        </div>

                        {/* Length */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Target Length
                            </label>
                            <select
                                value={config.targetLength}
                                onChange={e => setConfig({ ...config, targetLength: e.target.value as typeof config.targetLength })}
                                className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                            >
                                <option value="short">Short (~800 words)</option>
                                <option value="medium">Medium (~1500 words)</option>
                                <option value="long">Long (~2500 words)</option>
                            </select>
                        </div>
                    </div>

                    {/* Cover Image */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Cover Image (Optional)
                        </label>
                        {selectedCover ? (
                            <div className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={selectedCover.thumbUrl}
                                    alt={selectedCover.alt}
                                    className="w-full h-32 object-cover rounded-lg border"
                                />
                                <div className="absolute top-2 right-2 flex gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowPhotoSelector(true)}
                                        className="px-2 py-1 bg-white/90 rounded text-xs hover:bg-white"
                                    >
                                        Change
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedCover(null)}
                                        className="px-2 py-1 bg-white/90 rounded text-xs hover:bg-white text-red-600"
                                    >
                                        Remove
                                    </button>
                                </div>
                                <p className="text-xs text-neutral-500 mt-1">
                                    {selectedCover.attribution}
                                </p>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowPhotoSelector(true)}
                                className="w-full p-4 border-2 border-dashed border-neutral-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors flex items-center justify-center gap-2 text-neutral-500"
                            >
                                <ImageIcon className="w-5 h-5" />
                                <span>Select Cover Image</span>
                            </button>
                        )}
                    </div>

                    {/* Toggles */}
                    <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.includeEeat}
                                onChange={e => setConfig({ ...config, includeEeat: e.target.checked })}
                                className="w-4 h-4 text-indigo-600 rounded"
                            />
                            <span className="text-sm text-neutral-700">Include E-E-A-T signals</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.optimizeForAiOverview}
                                onChange={e => setConfig({ ...config, optimizeForAiOverview: e.target.checked })}
                                className="w-4 h-4 text-indigo-600 rounded"
                            />
                            <span className="text-sm text-neutral-700">Optimize for AI Overview</span>
                        </label>
                        {/* V4: Streaming Mode Toggle */}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={streamingMode}
                                onChange={e => setStreamingMode(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded"
                            />
                            <span className="text-sm text-neutral-700 flex items-center gap-1">
                                <Play className="w-3 h-3" /> Live Preview
                            </span>
                        </label>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Status */}
                    {status && !error && (
                        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 text-sm flex items-center gap-2">
                            {generating && <Loader2 className="w-4 h-4 animate-spin" />}
                            {status}
                        </div>
                    )}

                    {/* V4: Streaming Preview Panel */}
                    {streamingMode && showStreamingPreview && config.keyword.trim() && (
                        <div className="border border-indigo-200 rounded-lg overflow-hidden">
                            <StreamingArticlePreview
                                keyword={config.keyword}
                                context={niche}
                                onComplete={(content) => {
                                    setStreamedContent(content);
                                    setStatus('Article generated! ✅');
                                    setGenerating(false);
                                }}
                                onError={(err) => {
                                    setError(err);
                                    setGenerating(false);
                                    setShowStreamingPreview(false);
                                }}
                                onRefine={(content) => {
                                    setStreamedContent(content);
                                    setShowRefineModal(true);
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-neutral-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg"
                        disabled={generating}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={generating || !config.keyword.trim()}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                Generate Article
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Stock Photo Selector Modal */}
            {showPhotoSelector && (
                <StockPhotoSelector
                    initialQuery={config.keyword}
                    onSelect={(photo) => {
                        setSelectedCover(photo);
                        setShowPhotoSelector(false);
                    }}
                    onClose={() => setShowPhotoSelector(false)}
                />
            )}

            {/* V4: Refine Article Modal */}
            {showRefineModal && streamedContent && (
                <RefineArticleModal
                    articleContent={streamedContent}
                    articleTitle={config.keyword}
                    onClose={() => setShowRefineModal(false)}
                    onSave={(refinedContent) => {
                        setStreamedContent(refinedContent);
                        setShowRefineModal(false);
                    }}
                />
            )}
        </div>
    );
}
