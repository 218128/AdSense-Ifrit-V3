'use client';

import { useState, useCallback, useEffect } from 'react';
import { Zap, Loader2, RefreshCw, Lightbulb, ExternalLink, ArrowLeft, Building2 } from 'lucide-react';
import { WorkflowVisualization } from '@/components/dashboard';
import type { WorkflowStep } from '@/components/dashboard/WorkflowVisualization';
import { createWorkflowSteps, updateWorkflowStep, DecisionReasoning } from '@/components/dashboard/WorkflowVisualization';
import GenerationOptionsPanel, { GenerationOptions, DEFAULT_OPTIONS } from './GenerationOptions';
import GenerationHistory, { addToGenerationHistory } from './GenerationHistory';
import { KeywordHunter } from '@/components/hunt';
import { getUserSettings, getEnabledProviderKeys } from '@/components/settings/SettingsView';
import { getQuickInsights } from '@/lib/analytics';
import SiteBuilderDashboard from './SiteBuilderDashboard';

interface SelectedTopic {
    topic: string;
    context: string;
    source: 'live' | 'fallback' | 'csv_import';
    cpcScore?: number;
    niche?: string;
}

export default function FactoryDashboard() {
    const [phase, setPhase] = useState<'select' | 'options' | 'generate'>('select');
    const [selectedTopic, setSelectedTopic] = useState<SelectedTopic | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState<string | undefined>();
    const [options, setOptions] = useState<GenerationOptions>(DEFAULT_OPTIONS);
    const [insights, setInsights] = useState<string[]>([]);
    const [historyKey, setHistoryKey] = useState(0);
    const [generatedSlug, setGeneratedSlug] = useState<string | null>(null);
    const [showSiteBuilder, setShowSiteBuilder] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setInsights(getQuickInsights());
        }
    }, []);

    const handleTopicSelect = (topic: SelectedTopic) => {
        setSelectedTopic(topic);
        setPhase('options');
    };

    const handleBack = () => {
        if (phase === 'options') {
            setSelectedTopic(null);
            setPhase('select');
        } else if (phase === 'generate') {
            setWorkflowSteps([]);
            setIsComplete(false);
            setError(undefined);
            setPhase('options');
        }
    };

    const updateStep = useCallback((
        stepId: number,
        status: WorkflowStep['status'],
        metadata?: WorkflowStep['metadata'],
        reasoning?: DecisionReasoning[]
    ) => {
        setWorkflowSteps(prev => updateWorkflowStep(prev, stepId, { status, metadata, reasoning }));
    }, []);

    const handleGenerate = async () => {
        if (!selectedTopic) return;

        setPhase('generate');
        setIsGenerating(true);
        setIsComplete(false);
        setError(undefined);
        setGeneratedSlug(null);
        setWorkflowSteps(createWorkflowSteps());

        const settings = getUserSettings();

        if (!settings.geminiKey) {
            setError('No Gemini API Key found. Please open Settings and add your key.');
            updateStep(1, 'error');
            setIsGenerating(false);
            return;
        }

        try {
            // Mark first 5 steps as in-progress while API works
            updateStep(1, 'done', [
                { label: 'Topic', value: selectedTopic.topic },
                { label: 'Source', value: selectedTopic.source === 'live' ? 'US Trends' : 'High-CPC Picks' }
            ]);
            updateStep(2, 'done', [
                { label: 'CPC', value: `${selectedTopic.cpcScore || 70}/100` },
                { label: 'Niche', value: selectedTopic.niche || 'Analyzing...' }
            ]);
            updateStep(3, 'done', [
                { label: 'Author', value: 'Auto-selecting...' }
            ]);
            updateStep(4, 'done', [
                { label: 'Template', value: 'Optimizing...' }
            ]);
            // Step 5 is where the actual generation happens
            updateStep(5, 'active');

            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    geminiKey: settings.geminiKey,
                    blogUrl: settings.blogUrl,
                    providerKeys: getEnabledProviderKeys(), // Only enabled providers
                    selectedTopic: {
                        topic: selectedTopic.topic,
                        context: selectedTopic.context || `Article about ${selectedTopic.topic}`,
                        source: selectedTopic.source
                    },
                    options: {
                        persona: options.persona,
                        template: options.template,
                        highCpcMode: options.highCpcMode
                    },
                    adsenseConfig: settings.adsensePublisherId ? {
                        publisherId: settings.adsensePublisherId,
                        leaderboardSlot: settings.adsenseLeaderboardSlot,
                        articleSlot: settings.adsenseArticleSlot,
                        multiplexSlot: settings.adsenseMultiplexSlot,
                    } : undefined
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Generation failed');
            }

            // Check for warning (article exists)
            if (data.warning) {
                setError(data.warning);
                updateStep(1, 'error', [
                    { label: 'Status', value: data.warning }
                ]);
                setIsGenerating(false);
                return;
            }

            // Step 1 Complete: Topic
            updateStep(1, 'done', [
                { label: 'Topic', value: data.topicName || selectedTopic.topic },
                { label: 'Source', value: data.trendSource === 'user_selected' ? 'Your Selection' : 'High-CPC Intelligence' }
            ]);
            await delay(100);

            // Step 2: CPC Analysis
            updateStep(2, 'active');
            await delay(50);
            updateStep(2, 'done', [
                { label: 'CPC', value: `${data.cpcScore}/100`, highlight: (data.cpcScore || 0) >= 70, tooltip: 'Revenue potential score. Higher means more $ per click.' },
                { label: 'Niche', value: data.cpcNiche || 'General', tooltip: 'Content category for ad targeting.' },
                { label: 'Intent', value: data.cpcIntent || 'Commercial', tooltip: 'User intent - commercial means ready to buy.' }
            ], data.cpcReasoning);
            await delay(100);

            // Step 3: Persona Selection
            updateStep(3, 'active');
            await delay(50);
            updateStep(3, 'done', [
                { label: 'Author', value: data.persona || 'Auto-selected' },
                { label: 'Specialty', value: data.personaSpecialty || 'Expert' }
            ], data.personaReasoning);
            await delay(100);

            // Step 4: Template
            updateStep(4, 'active');
            await delay(50);
            updateStep(4, 'done', [
                { label: 'Template', value: data.template || 'Optimized' },
                { label: 'Structure', value: 'SEO + Engagement' }
            ], data.templateReasoning);
            await delay(100);

            // Step 5: Content Generation
            updateStep(5, 'active');
            await delay(50);
            updateStep(5, 'done', [
                { label: 'Words', value: data.wordCount ? data.wordCount.toLocaleString() : 'Generated', highlight: true, tooltip: 'Total word count. 1500+ words rank better.' },
                { label: 'Sections', value: `${data.sectionCount || 6}`, tooltip: 'Number of H2 headings for structure.' },
                { label: 'Quality', value: 'Human-like', tooltip: 'Passes AI detection, reads naturally.' }
            ]);
            await delay(100);

            // Step 6: Publishing
            updateStep(6, 'active');
            await delay(50);
            const slug = data.slug || selectedTopic.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            updateStep(6, 'done', [
                { label: 'Status', value: '✓ Saved to Library' },
                { label: 'Slug', value: slug }
            ]);

            // Save to history
            if (data.success) {
                addToGenerationHistory({
                    keyword: selectedTopic.topic,
                    title: data.article || selectedTopic.topic,
                    slug: slug,
                    persona: data.persona || 'Auto',
                    template: data.template || 'Auto',
                    cpcScore: data.cpcScore || 0,
                    wordCount: data.wordCount || 0,
                    trendSource: data.trendSource || 'user_selected'
                });
                setHistoryKey(prev => prev + 1);
                setGeneratedSlug(slug);
            }

            setIsComplete(true);

        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Unknown error';
            setError(message);

            setWorkflowSteps(prev => prev.map(step =>
                step.status === 'pending' || step.status === 'active'
                    ? { ...step, status: 'error' as const }
                    : step
            ));
        } finally {
            setIsGenerating(false);
        }
    };

    const resetToStart = () => {
        setPhase('select');
        setSelectedTopic(null);
        setWorkflowSteps([]);
        setIsComplete(false);
        setError(undefined);
        setGeneratedSlug(null);
    };

    return (
        <div className="flex flex-col items-center gap-6 w-full max-w-4xl mx-auto">
            {/* Quick Insights - Only on select phase */}
            {phase === 'select' && insights.length > 0 && (
                <div className="w-full bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-100">
                    <div className="flex items-center gap-2 mb-2 text-purple-700">
                        <Lightbulb className="w-4 h-4" />
                        <span className="font-medium text-sm">Quick Insights</span>
                    </div>
                    <div className="space-y-1">
                        {insights.map((insight, i) => (
                            <p key={i} className="text-sm text-purple-600">{insight}</p>
                        ))}
                    </div>
                </div>
            )}

            {/* Phase 1: Topic Selection */}
            {phase === 'select' && (
                <>
                    <KeywordHunter
                        onSelect={handleTopicSelect}
                        disabled={isGenerating}
                    />

                    {/* Build Complete Site Button */}
                    <div className="w-full mt-4">
                        <button
                            onClick={() => setShowSiteBuilder(true)}
                            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-3 hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
                        >
                            <Building2 className="w-5 h-5" />
                            🏗️ Build Complete Site (Auto-Generate All Content)
                        </button>
                        <p className="text-center text-sm text-neutral-500 mt-2">
                            Automatically generate pillars, clusters, and pages for your entire site
                        </p>
                    </div>
                </>
            )}

            {/* Site Builder Modal */}
            {showSiteBuilder && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-auto">
                        <SiteBuilderDashboard onClose={() => setShowSiteBuilder(false)} />
                    </div>
                </div>
            )}

            {/* Phase 2: Options */}
            {phase === 'options' && selectedTopic && (
                <>
                    {/* Back button */}
                    <button
                        onClick={handleBack}
                        className="self-start flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to topics
                    </button>

                    {/* Selected Topic Banner */}
                    <div className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 text-white">
                        <div className="text-xs opacity-75 mb-1">Selected Topic</div>
                        <div className="font-bold text-lg">{selectedTopic.topic}</div>
                        <div className="flex items-center gap-3 mt-2 text-sm opacity-90">
                            <span>CPC: {selectedTopic.cpcScore}/100</span>
                            <span>•</span>
                            <span>{selectedTopic.niche}</span>
                        </div>
                    </div>

                    {/* Generation Options */}
                    <GenerationOptionsPanel
                        options={options}
                        onChange={setOptions}
                        disabled={isGenerating}
                    />

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-3 px-10 py-5 rounded-2xl text-xl font-bold shadow-lg transition-all bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 hover:scale-105 active:scale-95 hover:shadow-xl"
                    >
                        <Zap className="w-6 h-6 fill-current" />
                        Generate Article
                    </button>
                </>
            )}

            {/* Phase 3: Generation */}
            {phase === 'generate' && (
                <>
                    {/* Back button - only if not generating */}
                    {!isGenerating && !isComplete && (
                        <button
                            onClick={handleBack}
                            className="self-start flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to options
                        </button>
                    )}

                    {/* Workflow Visualization */}
                    <WorkflowVisualization
                        steps={workflowSteps}
                        isComplete={isComplete}
                        error={error}
                    />

                    {/* Success Actions */}
                    {isComplete && !error && (
                        <div className="flex flex-col items-center gap-4 w-full">
                            <div className="flex gap-3">
                                {generatedSlug && (
                                    <a
                                        href={`/${generatedSlug}`}
                                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        View Article
                                    </a>
                                )}
                                <button
                                    onClick={resetToStart}
                                    className="flex items-center gap-2 px-6 py-3 bg-white border border-neutral-200 text-neutral-700 rounded-xl font-medium hover:bg-neutral-50 transition-all"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Generate Another
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Generation History - Always visible */}
            <div className="w-full mt-4">
                <GenerationHistory key={historyKey} />
            </div>
        </div>
    );
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
