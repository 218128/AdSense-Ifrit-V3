'use client';

import { useState } from 'react';
import { User, FileText, TrendingUp, Sparkles } from 'lucide-react';
import { DEFAULT_PERSONAS } from '@/lib/humanization/personas';
import { ALL_TEMPLATES } from '@/templates/shared/articleTemplates';

export interface GenerationOptions {
    persona: string;  // 'auto' or persona id
    template: string; // 'auto' or template id
    highCpcMode: boolean;
}

interface GenerationOptionsPanelProps {
    options: GenerationOptions;
    onChange: (options: GenerationOptions) => void;
    disabled?: boolean;
}

export const DEFAULT_OPTIONS: GenerationOptions = {
    persona: 'auto',
    template: 'auto',
    highCpcMode: true
};

export default function GenerationOptionsPanel({
    options,
    onChange,
    disabled = false
}: GenerationOptionsPanelProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden mb-6 max-w-2xl w-full">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors"
            >
                <div className="flex items-center gap-2 text-neutral-700">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span className="font-medium text-sm">Generation Options</span>
                </div>
                <span className="text-neutral-400 text-sm">{isExpanded ? '▼' : '▶'}</span>
            </button>

            {isExpanded && (
                <div className="p-4 space-y-4">
                    {/* Persona Selection */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-2">
                            <User className="w-4 h-4 text-blue-500" />
                            Author Persona
                        </label>
                        <select
                            value={options.persona}
                            onChange={(e) => onChange({ ...options, persona: e.target.value })}
                            disabled={disabled}
                            className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-neutral-100 disabled:cursor-not-allowed"
                        >
                            <option value="auto">🎲 Auto-select based on topic</option>
                            <optgroup label="Available Personas">
                                {DEFAULT_PERSONAS.map(persona => (
                                    <option key={persona.id} value={persona.id}>
                                        {persona.name} — {persona.profession}
                                    </option>
                                ))}
                            </optgroup>
                        </select>
                        <p className="text-xs text-neutral-400 mt-1">
                            Each persona has unique voice traits and writing style
                        </p>
                    </div>

                    {/* Template Selection */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-2">
                            <FileText className="w-4 h-4 text-green-500" />
                            Article Template
                        </label>
                        <select
                            value={options.template}
                            onChange={(e) => onChange({ ...options, template: e.target.value })}
                            disabled={disabled}
                            className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-neutral-100 disabled:cursor-not-allowed"
                        >
                            <option value="auto">🎲 Auto-select based on topic</option>
                            <optgroup label="Available Templates">
                                {ALL_TEMPLATES.map(template => (
                                    <option key={template.id} value={template.id}>
                                        {template.name} — CPC: {template.cpcPotential}
                                    </option>
                                ))}
                            </optgroup>
                        </select>
                        <p className="text-xs text-neutral-400 mt-1">
                            Templates optimize content structure for SEO and monetization
                        </p>
                    </div>

                    {/* High CPC Mode Toggle */}
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <div>
                                <span className="text-sm font-medium text-green-800">High CPC Mode</span>
                                <p className="text-xs text-green-600">Prioritize high-revenue keywords</p>
                            </div>
                        </div>
                        <button
                            onClick={() => onChange({ ...options, highCpcMode: !options.highCpcMode })}
                            disabled={disabled}
                            className={`relative w-12 h-6 rounded-full transition-colors ${options.highCpcMode ? 'bg-green-500' : 'bg-neutral-300'
                                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${options.highCpcMode ? 'translate-x-7' : 'translate-x-1'
                                }`} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
