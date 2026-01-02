'use client';

/**
 * SaveResearchButton Component
 * 
 * Collects research data from Hunt tab and saves as a DomainProfile
 * for use when creating websites.
 */

import { useState } from 'react';
import { Save, X, CheckCircle, Loader2 } from 'lucide-react';

interface SaveResearchButtonProps {
    domain?: string;
    niche?: string;
    keywords?: string[];
    competitorUrls?: string[];
    suggestedTopics?: string[];
    onSaved?: () => void;
}

export default function SaveResearchButton({
    domain = '',
    niche = '',
    keywords = [],
    competitorUrls = [],
    suggestedTopics = [],
    onSaved
}: SaveResearchButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Form state
    const [formDomain, setFormDomain] = useState(domain);
    const [formNiche, setFormNiche] = useState(niche);
    const [primaryKeywords, setPrimaryKeywords] = useState(keywords.slice(0, 5).join('\n'));
    const [secondaryKeywords, setSecondaryKeywords] = useState(keywords.slice(5, 15).join('\n'));
    const [questionKeywords, setQuestionKeywords] = useState('');
    const [notes, setNotes] = useState('');

    const handleSave = async () => {
        if (!formDomain.trim()) {
            alert('Domain name is required');
            return;
        }

        setSaving(true);
        try {
            const response = await fetch('/api/domain-profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    domain: formDomain.trim().toLowerCase(),
                    niche: formNiche.trim() || 'general',
                    primaryKeywords: primaryKeywords.split('\n').map(k => k.trim()).filter(Boolean),
                    secondaryKeywords: secondaryKeywords.split('\n').map(k => k.trim()).filter(Boolean),
                    questionKeywords: questionKeywords.split('\n').map(k => k.trim()).filter(Boolean),
                    competitorUrls,
                    suggestedTopics,
                    contentGaps: [],
                    suggestedCategories: [],
                    trafficPotential: 50,
                    difficultyScore: 50,
                    notes: notes.trim()
                })
            });

            if (!response.ok) throw new Error('Failed to save');

            setSaved(true);
            setTimeout(() => {
                setIsOpen(false);
                setSaved(false);
                onSaved?.();
            }, 1500);
        } catch (error) {
            console.error('Save failed:', error);
            alert('Failed to save research. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-lg font-medium shadow-md transition-all"
            >
                <Save className="w-4 h-4" />
                Save Research
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-t-2xl flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-lg">💾 Save Research Profile</h3>
                        <p className="text-purple-100 text-sm">This data will be used when creating your website</p>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-4">
                    {/* Domain */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Domain Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formDomain}
                            onChange={(e) => setFormDomain(e.target.value)}
                            placeholder="example.com"
                            className="w-full p-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>

                    {/* Niche */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Niche/Industry
                        </label>
                        <input
                            type="text"
                            value={formNiche}
                            onChange={(e) => setFormNiche(e.target.value)}
                            placeholder="e.g., fitness, technology, cooking"
                            className="w-full p-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>

                    {/* Primary Keywords */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Primary Keywords (one per line)
                        </label>
                        <textarea
                            value={primaryKeywords}
                            onChange={(e) => setPrimaryKeywords(e.target.value)}
                            placeholder="weight loss tips&#10;home workout&#10;healthy recipes"
                            rows={4}
                            className="w-full p-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                        />
                        <p className="text-xs text-neutral-500 mt-1">Main keywords to target. AI will focus articles on these.</p>
                    </div>

                    {/* Secondary Keywords */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Secondary Keywords (one per line)
                        </label>
                        <textarea
                            value={secondaryKeywords}
                            onChange={(e) => setSecondaryKeywords(e.target.value)}
                            placeholder="meal prep ideas&#10;protein shake recipes"
                            rows={3}
                            className="w-full p-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                        />
                        <p className="text-xs text-neutral-500 mt-1">Long-tail variations and supporting keywords.</p>
                    </div>

                    {/* Question Keywords */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Question Keywords (one per line)
                        </label>
                        <textarea
                            value={questionKeywords}
                            onChange={(e) => setQuestionKeywords(e.target.value)}
                            placeholder="how to lose weight fast&#10;what is intermittent fasting&#10;why do diets fail"
                            rows={3}
                            className="w-full p-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                        />
                        <p className="text-xs text-neutral-500 mt-1">&ldquo;How to&rdquo;, &ldquo;What is&rdquo;, &ldquo;Why&rdquo; queries for FAQ content.</p>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Notes
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Any additional notes about this domain or strategy..."
                            rows={2}
                            className="w-full p-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-neutral-50 rounded-b-2xl flex justify-end gap-3">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="px-4 py-2 text-neutral-600 hover:bg-neutral-200 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || saved}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${saved
                            ? 'bg-green-500 text-white'
                            : 'bg-purple-500 hover:bg-purple-600 text-white'
                            }`}
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : saved ? (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                Saved!
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Profile
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
