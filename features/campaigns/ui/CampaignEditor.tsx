'use client';

/**
 * Campaign Editor - Step-by-Step Wizard
 * FSD: features/campaigns/ui/CampaignEditor.tsx
 */

import { useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Check, Zap, FileText, Sparkles, Clock } from 'lucide-react';
import type { Campaign, KeywordSourceConfig, RSSSourceConfig, TrendsSourceConfig, TranslationSourceConfig, AIConfig, ScheduleConfig } from '../model/types';
import { useCampaignStore } from '../model/campaignStore';
import { useWPSitesLegacy } from '@/features/wordpress/model/wpSiteStore';
import { BasicsStep, SourceStep, AIStep, type EditorFormState } from './EditorSteps';
import { ScheduleStep, ReviewStep } from './EditorSteps2';

interface CampaignEditorProps {
    campaign?: Campaign | null;
    onClose: () => void;
}

type Step = 'basics' | 'source' | 'ai' | 'schedule' | 'review';

const STEPS: { id: Step; label: string; icon: React.ReactNode }[] = [
    { id: 'basics', label: 'Basics', icon: <Zap className="w-4 h-4" /> },
    { id: 'source', label: 'Source', icon: <FileText className="w-4 h-4" /> },
    { id: 'ai', label: 'AI Config', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'schedule', label: 'Schedule', icon: <Clock className="w-4 h-4" /> },
    { id: 'review', label: 'Review', icon: <Check className="w-4 h-4" /> },
];

export function CampaignEditor({ campaign, onClose }: CampaignEditorProps) {
    const { createCampaign, updateCampaign } = useCampaignStore();
    const { sites } = useWPSitesLegacy();
    const connectedSites = sites.filter(s => s.status === 'connected');

    const [step, setStep] = useState<Step>('basics');
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState<EditorFormState>({
        name: campaign?.name || '',
        description: campaign?.description || '',
        targetSiteId: campaign?.targetSiteId || connectedSites[0]?.id || '',
        targetCategoryId: campaign?.targetCategoryId,
        postStatus: campaign?.postStatus || 'draft',
        sourceType: campaign?.source.type || 'keywords',
        keywords: (campaign?.source.config as KeywordSourceConfig)?.keywords?.join('\n') || '',
        rssFeedUrls: (campaign?.source.config as RSSSourceConfig)?.feedUrls?.join('\n') || '',
        rssAiRewrite: (campaign?.source.config as RSSSourceConfig)?.aiRewrite ?? true,
        trendsRegion: (campaign?.source.config as TrendsSourceConfig)?.region || 'US',
        trendsCategory: (campaign?.source.config as TrendsSourceConfig)?.category || '',
        provider: campaign?.aiConfig.provider || 'gemini',
        articleType: campaign?.aiConfig.articleType || 'cluster',
        tone: campaign?.aiConfig.tone || 'professional',
        targetLength: campaign?.aiConfig.targetLength || 1500,
        useResearch: campaign?.aiConfig.useResearch ?? true,
        includeImages: campaign?.aiConfig.includeImages ?? true,
        // Image generation options (new)
        mediaSourcePreference: campaign?.aiConfig.mediaSourcePreference || 'both',
        inlineImageCount: campaign?.aiConfig.inlineImageCount ?? 2,
        imagePlacementCover: campaign?.aiConfig.imagePlacements?.includes('cover') ?? true,
        imagePlacementInline: campaign?.aiConfig.imagePlacements?.includes('inline') ?? false,
        includeFAQ: campaign?.aiConfig.includeFAQ ?? true,
        includeSchema: campaign?.aiConfig.includeSchema ?? true,
        optimizeForSEO: campaign?.aiConfig.optimizeForSEO ?? true,
        // Multi-site defaults
        enableMultiSite: false,
        additionalSiteIds: [],
        multiSiteStaggerMinutes: 30,
        // Content spinner defaults
        enableSpinner: false,
        spinnerMode: 'moderate',
        // A/B Testing defaults
        enableABTesting: false,
        abTestTitles: true,
        abTestCovers: false,
        abTestRespins: false,
        // Analytics defaults
        analyticsEnabled: false,
        // Phase 2: Quality & Author defaults
        authorId: campaign?.authorId || '',
        injectEEATSignals: campaign?.aiConfig.injectEEATSignals ?? false,
        qualityGateEnabled: campaign?.aiConfig.qualityGateEnabled ?? false,
        humanize: campaign?.aiConfig.humanize ?? false,
        optimizeReadability: campaign?.aiConfig.optimizeReadability ?? false,
        // Schedule
        scheduleType: campaign?.schedule.type || 'manual',
        intervalHours: campaign?.schedule.intervalHours || 24,
        maxPostsPerRun: campaign?.schedule.maxPostsPerRun || 1,
        // Translation source defaults
        translationSourceSiteId: (campaign?.source.config as TranslationSourceConfig)?.sourceSiteId || '',
        translationTargetLanguages: (campaign?.source.config as TranslationSourceConfig)?.targetLanguages || [],
        translationHumanize: (campaign?.source.config as TranslationSourceConfig)?.postProcessing?.humanize ?? false,
        translationOptimizeReadability: (campaign?.source.config as TranslationSourceConfig)?.postProcessing?.optimizeReadability ?? false,
    });

    const updateField = useCallback(<K extends keyof EditorFormState>(field: K, value: EditorFormState[K]) => {
        setForm(f => ({ ...f, [field]: value }));
    }, []);

    const stepIndex = STEPS.findIndex(s => s.id === step);
    const isFirst = stepIndex === 0;
    const isLast = stepIndex === STEPS.length - 1;
    const selectedSite = connectedSites.find(s => s.id === form.targetSiteId);

    const goNext = () => { if (!isLast) setStep(STEPS[stepIndex + 1].id); };
    const goBack = () => { if (!isFirst) setStep(STEPS[stepIndex - 1].id); };

    const handleSave = async () => {
        setSaving(true);
        try {
            const campaignData = buildCampaignData(form);
            if (campaign) {
                updateCampaign(campaign.id, campaignData);
            } else {
                createCampaign(campaignData);
            }
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Zap className="w-6 h-6" />
                        <h2 className="text-lg font-semibold">{campaign ? 'Edit Campaign' : 'New Campaign'}</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg"><X className="w-5 h-5" /></button>
                </div>

                {/* Step Indicator */}
                <StepIndicator steps={STEPS} current={step} onSelect={setStep} currentIndex={stepIndex} />

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 'basics' && <BasicsStep form={form} updateField={updateField} sites={connectedSites} selectedSite={selectedSite} />}
                    {step === 'source' && <SourceStep form={form} updateField={updateField} sites={connectedSites} />}
                    {step === 'ai' && <AIStep form={form} updateField={updateField} sites={connectedSites} />}
                    {step === 'schedule' && <ScheduleStep form={form} updateField={updateField} />}
                    {step === 'review' && <ReviewStep form={form} selectedSite={selectedSite} />}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
                    <button onClick={goBack} disabled={isFirst} className="px-4 py-2 text-neutral-600 hover:text-neutral-800 disabled:opacity-50 flex items-center gap-1">
                        <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-neutral-600 hover:text-neutral-800">Cancel</button>
                        {isLast ? (
                            <button onClick={handleSave} disabled={saving || !form.name || !form.targetSiteId} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
                                {saving ? 'Saving...' : campaign ? 'Update Campaign' : 'Create Campaign'}
                            </button>
                        ) : (
                            <button onClick={goNext} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-1">
                                Next <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// Helpers
// ============================================================================

function StepIndicator({ steps, current, onSelect, currentIndex }: { steps: typeof STEPS; current: Step; onSelect: (s: Step) => void; currentIndex: number }) {
    return (
        <div className="px-6 py-3 bg-neutral-50 border-b border-neutral-200">
            <div className="flex items-center justify-between">
                {steps.map((s, i) => (
                    <div key={s.id} className="flex items-center">
                        <button onClick={() => onSelect(s.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${current === s.id ? 'bg-indigo-100 text-indigo-700 font-medium' : i < currentIndex ? 'text-green-600' : 'text-neutral-400'}`}>
                            {i < currentIndex ? <Check className="w-4 h-4" /> : s.icon}
                            <span className="hidden sm:inline">{s.label}</span>
                        </button>
                        {i < steps.length - 1 && <div className={`w-8 h-0.5 mx-1 ${i < currentIndex ? 'bg-green-400' : 'bg-neutral-200'}`} />}
                    </div>
                ))}
            </div>
        </div>
    );
}

function buildCampaignData(form: EditorFormState) {
    // Build source config based on type
    let sourceConfig;

    if (form.sourceType === 'rss') {
        sourceConfig = {
            type: 'rss' as const,
            feedUrls: form.rssFeedUrls.split('\n').filter(u => u.trim()),
            extractFullContent: false,
            aiRewrite: form.rssAiRewrite,
        } as RSSSourceConfig;
    } else if (form.sourceType === 'trends') {
        sourceConfig = {
            type: 'trends' as const,
            region: form.trendsRegion,
            category: form.trendsCategory || undefined,
        } as TrendsSourceConfig;
    } else if (form.sourceType === 'translation') {
        sourceConfig = {
            type: 'translation' as const,
            sourceSiteId: form.translationSourceSiteId,
            targetLanguages: form.translationTargetLanguages,
            postProcessing: {
                humanize: form.translationHumanize,
                optimizeReadability: form.translationOptimizeReadability,
            },
        } as TranslationSourceConfig;
    } else {
        sourceConfig = {
            type: 'keywords' as const,
            keywords: form.keywords.split('\n').filter(k => k.trim()),
            rotateMode: 'sequential' as const,
            currentIndex: 0,
            skipUsed: true,
        } as KeywordSourceConfig;
    }

    return {
        name: form.name,
        description: form.description,
        status: 'draft' as const,
        targetSiteId: form.targetSiteId,
        targetCategoryId: form.targetCategoryId,
        postStatus: form.postStatus,
        // FIX: Include authorId from form (was missing - causing author not to save!)
        authorId: form.authorId || undefined,
        source: { type: form.sourceType, config: sourceConfig } as Campaign['source'],
        aiConfig: {
            provider: form.provider,
            articleType: form.articleType,
            tone: form.tone,
            targetLength: form.targetLength,
            useResearch: form.useResearch,
            includeImages: form.includeImages,
            // Image generation options (new)
            mediaSourcePreference: form.mediaSourcePreference,
            imagePlacements: [
                ...(form.imagePlacementCover ? ['cover'] : []),
                ...(form.imagePlacementInline ? ['inline'] : []),
            ],
            inlineImageCount: form.inlineImageCount,
            imageProvider: 'gemini' as const,
            optimizeForSEO: form.optimizeForSEO,
            includeSchema: form.includeSchema,
            includeFAQ: form.includeFAQ,
            // Content spinner
            enableSpinner: form.enableSpinner,
            spinnerMode: form.spinnerMode,
            // Multi-Site
            enableMultiSite: form.enableMultiSite,
            additionalSiteIds: form.additionalSiteIds,
            multiSiteStaggerMinutes: form.multiSiteStaggerMinutes,
            // A/B Testing
            enableABTesting: form.enableABTesting,
            abTestTitles: form.abTestTitles,
            abTestCovers: form.abTestCovers,
            abTestRespins: form.abTestRespins,
            // Analytics
            analyticsEnabled: form.analyticsEnabled,
            // Phase 2: Quality & E-E-A-T
            injectEEATSignals: form.injectEEATSignals,
            qualityGateEnabled: form.qualityGateEnabled,
            humanize: form.humanize,
            optimizeReadability: form.optimizeReadability,
        } as AIConfig,
        schedule: { type: form.scheduleType, intervalHours: form.intervalHours, maxPostsPerRun: form.maxPostsPerRun, pauseOnError: true } as ScheduleConfig,
        // Multi-site config (stored in campaign for future use)
        multiSite: form.enableMultiSite ? {
            additionalSiteIds: form.additionalSiteIds,
            staggerMinutes: form.multiSiteStaggerMinutes,
        } : undefined,
    };
}
