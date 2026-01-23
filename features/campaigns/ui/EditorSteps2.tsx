'use client';

/**
 * Campaign Editor Steps - Schedule and Review
 * FSD: features/campaigns/ui/EditorSteps2.tsx
 */

import type { EditorFormState } from './EditorSteps';
import type { WPSite } from '@/features/wordpress';
import { ROIPredictionCard } from '../components/ROIPredictionCard';

type FormUpdater = <K extends keyof EditorFormState>(
    field: K,
    value: EditorFormState[K]
) => void;

// ============================================================================
// Step 4: Schedule
// ============================================================================

interface ScheduleStepProps {
    form: EditorFormState;
    updateField: FormUpdater;
}

export function ScheduleStep({ form, updateField }: ScheduleStepProps) {
    const scheduleOptions = [
        { id: 'manual', label: 'Manual', desc: 'Run manually' },
        { id: 'interval', label: 'Interval', desc: 'Run every X hours' },
        { id: 'cron', label: 'Cron', desc: 'Coming soon' },
    ] as const;

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Schedule Type</label>
                <div className="grid grid-cols-3 gap-2">
                    {scheduleOptions.map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => updateField('scheduleType', opt.id)}
                            disabled={opt.id === 'cron'}
                            className={`px-4 py-3 rounded-lg border text-left transition-colors ${form.scheduleType === opt.id
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                : 'border-neutral-200 hover:border-neutral-300'
                                } ${opt.id === 'cron' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <div className="font-medium">{opt.label}</div>
                            <div className="text-xs text-neutral-500">{opt.desc}</div>
                        </button>
                    ))}
                </div>
            </div>
            {form.scheduleType === 'interval' && (
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Run Every (hours)</label>
                    <input
                        type="number"
                        value={form.intervalHours}
                        onChange={(e) => updateField('intervalHours', Number(e.target.value))}
                        min={1}
                        max={168}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            )}
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Max Posts Per Run</label>
                <input
                    type="number"
                    value={form.maxPostsPerRun}
                    onChange={(e) => updateField('maxPostsPerRun', Number(e.target.value))}
                    min={1}
                    max={10}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <p className="mt-1 text-xs text-neutral-500">Limit posts per run to manage costs</p>
            </div>
        </div>
    );
}

// ============================================================================
// Step 5: Review
// ============================================================================

interface ReviewStepProps {
    form: EditorFormState;
    selectedSite?: WPSite;
}

export function ReviewStep({ form, selectedSite }: ReviewStepProps) {
    const keywordCount = form.keywords.split('\n').filter(k => k.trim()).length;
    const scheduleLabel = form.scheduleType === 'manual' ? 'Manual' : `Every ${form.intervalHours}h`;

    // Build ROI prediction attributes from form
    const roiAttributes = {
        topic: form.keywords?.split('\n')[0] || 'general',
        niche: selectedSite?.profileData?.niche || 'lifestyle',
        wordCount: form.targetLength,
        hasImages: form.includeImages,
        hasFAQ: form.includeFAQ,
        hasSchema: form.includeSchema,
        includesAffiliateLinks: false, // Could add to form later
        template: form.articleType,
    };

    return (
        <div className="space-y-4">
            {/* Campaign Summary */}
            <div className="bg-neutral-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-neutral-900">Campaign Summary</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <Row label="Name" value={form.name || '—'} />
                    <Row label="Target Site" value={selectedSite?.name || '—'} />
                    <Row label="Post Status" value={form.postStatus} capitalize />
                    <Row label="Source" value={form.sourceType} capitalize />
                    <Row label="Keywords" value={String(keywordCount)} />
                    <Row label="Article Type" value={form.articleType} capitalize />
                    <Row label="Target Length" value={`${form.targetLength} words`} />
                    <Row label="Schedule" value={scheduleLabel} />
                    <Row label="Max Posts/Run" value={String(form.maxPostsPerRun)} />
                </div>
            </div>

            {/* ROI Prediction */}
            <ROIPredictionCard attributes={roiAttributes} />
        </div>
    );
}

function Row({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
    return (
        <>
            <div className="text-neutral-500">{label}:</div>
            <div className={`font-medium ${capitalize ? 'capitalize' : ''}`}>{value}</div>
        </>
    );
}

