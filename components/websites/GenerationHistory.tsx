'use client';

import { useState } from 'react';
import { History, Clock, User, FileText, TrendingUp, ExternalLink, Trash2 } from 'lucide-react';

export interface GenerationRecord {
    id: string;
    keyword: string;
    title: string;
    slug: string;
    persona: string;
    template: string;
    cpcScore: number;
    wordCount: number;
    trendSource: string;
    timestamp: string;
}

const HISTORY_KEY = 'ifrit_generation_history';

export function getGenerationHistory(): GenerationRecord[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(HISTORY_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

export function addToGenerationHistory(record: Omit<GenerationRecord, 'id' | 'timestamp'>): void {
    if (typeof window === 'undefined') return;

    const history = getGenerationHistory();
    const newRecord: GenerationRecord = {
        ...record,
        id: `gen_${Date.now()}`,
        timestamp: new Date().toISOString()
    };

    history.unshift(newRecord);
    // Keep last 50 records
    const trimmed = history.slice(0, 50);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

export function clearGenerationHistory(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(HISTORY_KEY);
}

interface GenerationHistoryProps {
    onRefresh?: () => void;
}

export default function GenerationHistory({ onRefresh }: GenerationHistoryProps) {
    // Use lazy initializer to avoid setState in useEffect
    const [history, setHistory] = useState<GenerationRecord[]>(() => getGenerationHistory());
    const [isExpanded, setIsExpanded] = useState(true);

    const handleClear = () => {
        if (confirm('Clear all generation history?')) {
            clearGenerationHistory();
            setHistory([]);
        }
    };

    const formatDate = (isoDate: string) => {
        const date = new Date(isoDate);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    if (history.length === 0) {
        return (
            <div className="bg-neutral-50 rounded-xl p-4 text-center text-neutral-500 text-sm">
                <History className="w-5 h-5 mx-auto mb-2 opacity-50" />
                No generation history yet
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            {/* Header - using div with buttons inside, not nested buttons */}
            <div className="flex items-center justify-between px-4 py-3 bg-neutral-50">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 text-neutral-700 hover:text-neutral-900"
                >
                    <History className="w-4 h-4 text-indigo-500" />
                    <span className="font-medium text-sm">Generation History</span>
                    <span className="text-xs text-neutral-400">({history.length})</span>
                    <span className="text-neutral-400 text-sm ml-2">{isExpanded ? '▼' : '▶'}</span>
                </button>
                <button
                    onClick={handleClear}
                    className="text-neutral-400 hover:text-red-500 p-1"
                    title="Clear history"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>

            {isExpanded && (
                <div className="divide-y divide-neutral-100 max-h-64 overflow-y-auto">
                    {history.map((record) => (
                        <div key={record.id} className="p-3 hover:bg-neutral-50">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <a
                                        href={`/${record.slug}`}
                                        className="font-medium text-sm text-neutral-800 hover:text-blue-600 line-clamp-1"
                                    >
                                        {record.title}
                                    </a>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                                            <User className="w-3 h-3" />
                                            {record.persona}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                                            <FileText className="w-3 h-3" />
                                            {record.template}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                            <TrendingUp className="w-3 h-3" />
                                            CPC: {record.cpcScore}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-xs text-neutral-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDate(record.timestamp)}
                                    </span>
                                    <a
                                        href={`/${record.slug}`}
                                        className="text-blue-500 hover:text-blue-600"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
