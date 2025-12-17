'use client';

import { useState, useEffect } from 'react';
import {
    Search,
    TrendingUp,
    User,
    FileText,
    PenTool,
    Save,
    CheckCircle,
    Loader2,
    AlertCircle,
    Sparkles,
    DollarSign,
    Target,
    Zap,
    ChevronDown,
    ChevronUp,
    Brain,
    HelpCircle
} from 'lucide-react';

export interface DecisionReasoning {
    factor: string;
    value: string;
    score?: number;
}

export interface WorkflowStep {
    id: number;
    name: string;
    description: string;
    status: 'pending' | 'active' | 'done' | 'error';
    icon: 'search' | 'trending' | 'user' | 'template' | 'pen' | 'save';
    metadata?: {
        label: string;
        value: string;
        highlight?: boolean;
        tooltip?: string;
    }[];
    reasoning?: DecisionReasoning[];
}

interface WorkflowVisualizationProps {
    steps: WorkflowStep[];
    isComplete: boolean;
    error?: string;
}

const ICONS = {
    search: Search,
    trending: TrendingUp,
    user: User,
    template: FileText,
    pen: PenTool,
    save: Save
};

const TOOLTIPS: Record<string, string> = {
    'Words': 'Total word count in the generated article. Longer articles (1500+) tend to rank better for SEO.',
    'Quality': 'Human-like means the content passes AI detection tests and reads naturally.',
    'CPC': 'Cost Per Click estimate. Higher scores mean advertisers pay more, increasing your AdSense revenue.',
    'Intent': 'Commercial intent indicates users are ready to buy, leading to higher ad engagement.',
    'Niche': 'The content category that determines which ads are shown and their CPC rates.'
};

export function createWorkflowSteps(): WorkflowStep[] {
    return [
        {
            id: 1,
            name: 'Topic Discovery',
            description: 'Identifying high-revenue topic',
            status: 'pending',
            icon: 'search'
        },
        {
            id: 2,
            name: 'CPC Analysis',
            description: 'Calculating monetization potential',
            status: 'pending',
            icon: 'trending'
        },
        {
            id: 3,
            name: 'Persona Selection',
            description: 'Matching expert voice to topic',
            status: 'pending',
            icon: 'user'
        },
        {
            id: 4,
            name: 'Template Optimization',
            description: 'Selecting best article structure',
            status: 'pending',
            icon: 'template'
        },
        {
            id: 5,
            name: 'Content Generation',
            description: 'Gemini AI writing (may take 30-60 seconds)',
            status: 'pending',
            icon: 'pen'
        },
        {
            id: 6,
            name: 'Publishing',
            description: 'Saving to content library',
            status: 'pending',
            icon: 'save'
        }
    ];
}

export function updateWorkflowStep(
    steps: WorkflowStep[],
    stepId: number,
    updates: Partial<WorkflowStep>
): WorkflowStep[] {
    return steps.map(step =>
        step.id === stepId ? { ...step, ...updates } : step
    );
}

function MetadataTag({ label, value, highlight, tooltip }: {
    label: string;
    value: string;
    highlight?: boolean;
    tooltip?: string;
}) {
    const [showTooltip, setShowTooltip] = useState(false);
    const actualTooltip = tooltip || TOOLTIPS[label];

    return (
        <div
            className="relative"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${highlight
                ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-slate-700/50 text-slate-300'
                }`}>
                {label === 'CPC' && <DollarSign className="w-3 h-3" />}
                {label === 'Intent' && <Target className="w-3 h-3" />}
                {label === 'Words' && <Zap className="w-3 h-3" />}
                <span className="text-slate-400">{label}:</span>
                <span>{value}</span>
                {actualTooltip && <HelpCircle className="w-3 h-3 text-slate-500" />}
            </div>

            {/* Tooltip */}
            {showTooltip && actualTooltip && (
                <div className="absolute bottom-full left-0 mb-2 z-50 w-64 p-3 bg-slate-700 text-slate-200 text-xs rounded-lg shadow-xl border border-slate-600">
                    <div className="flex items-start gap-2">
                        <HelpCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <p>{actualTooltip}</p>
                    </div>
                    <div className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-slate-700 border-r border-b border-slate-600"></div>
                </div>
            )}
        </div>
    );
}

function ReasoningPanel({ reasoning }: { reasoning: DecisionReasoning[] }) {
    const [expanded, setExpanded] = useState(false);

    if (!reasoning || reasoning.length === 0) return null;

    return (
        <div className="mt-3 border-t border-slate-600/50 pt-3">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300"
            >
                <Brain className="w-3 h-3" />
                <span>Decision Reasoning</span>
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {expanded && (
                <div className="mt-2 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                    {reasoning.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                            <span className="text-slate-400">{r.factor}:</span>
                            <span className="text-slate-200">{r.value}</span>
                            {r.score !== undefined && (
                                <span className="ml-auto text-green-400 font-mono">+{r.score}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function WorkflowVisualization({
    steps,
    isComplete,
    error
}: WorkflowVisualizationProps) {
    const activeStep = steps.find(s => s.status === 'active');
    const completedCount = steps.filter(s => s.status === 'done').length;
    const progress = (completedCount / steps.length) * 100;

    return (
        <div className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-700">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg">Ifrit Workflow Engine</h3>
                        <p className="text-slate-400 text-sm">
                            {isComplete ? '✓ Generation Complete' : activeStep ? `${activeStep.name}...` : 'Initializing...'}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-white">{completedCount}/{steps.length}</div>
                    <div className="text-xs text-slate-400">Steps</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-slate-700 rounded-full mb-6 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${error ? 'bg-red-500' : isComplete ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'
                        }`}
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            {/* Steps */}
            <div className="space-y-3">
                {steps.map((step) => {
                    const Icon = ICONS[step.icon];
                    const isActive = step.status === 'active';
                    const isDone = step.status === 'done';
                    const isPending = step.status === 'pending';
                    const isError = step.status === 'error';

                    return (
                        <div
                            key={step.id}
                            className={`relative p-4 rounded-xl border transition-all duration-300 ${isActive
                                ? 'bg-slate-700/50 border-blue-500/50 shadow-lg shadow-blue-500/10'
                                : isDone
                                    ? 'bg-slate-800/50 border-green-500/30'
                                    : isError
                                        ? 'bg-slate-800/50 border-red-500/30'
                                        : 'bg-slate-800/30 border-slate-700/50'
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                {/* Step Icon */}
                                <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${isActive
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : isDone
                                        ? 'bg-green-500/20 text-green-400'
                                        : isError
                                            ? 'bg-red-500/20 text-red-400'
                                            : 'bg-slate-700/50 text-slate-500'
                                    }`}>
                                    {isActive ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : isDone ? (
                                        <CheckCircle className="w-6 h-6" />
                                    ) : isError ? (
                                        <AlertCircle className="w-6 h-6" />
                                    ) : (
                                        <Icon className="w-6 h-6" />
                                    )}
                                </div>

                                {/* Step Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${isActive
                                            ? 'bg-blue-500/20 text-blue-300'
                                            : isDone
                                                ? 'bg-green-500/20 text-green-300'
                                                : isError
                                                    ? 'bg-red-500/20 text-red-300'
                                                    : 'bg-slate-700 text-slate-400'
                                            }`}>
                                            STEP {step.id}
                                        </span>
                                        <h4 className={`font-semibold ${isPending ? 'text-slate-400' : 'text-white'
                                            }`}>
                                            {step.name}
                                        </h4>
                                    </div>
                                    <p className="text-sm text-slate-400 mb-2">{step.description}</p>

                                    {/* Metadata Tags */}
                                    {step.metadata && step.metadata.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {step.metadata.map((meta, i) => (
                                                <MetadataTag
                                                    key={i}
                                                    label={meta.label}
                                                    value={meta.value}
                                                    highlight={meta.highlight}
                                                    tooltip={meta.tooltip}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* Decision Reasoning */}
                                    {isDone && step.reasoning && (
                                        <ReasoningPanel reasoning={step.reasoning} />
                                    )}
                                </div>

                                {/* Status Indicator */}
                                <div className="flex-shrink-0">
                                    {isActive && (
                                        <span className="flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-blue-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Completion Message */}
            {isComplete && !error && (
                <div className="mt-6 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <h4 className="text-green-400 font-semibold">Generation Complete!</h4>
                            <p className="text-green-300/70 text-sm">Your article is ready for review and publishing</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
