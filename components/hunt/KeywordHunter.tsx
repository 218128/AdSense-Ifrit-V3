'use client';

import { useState, useEffect, useRef } from 'react';
import {
    TrendingUp,
    DollarSign,
    Loader2,
    RefreshCw,
    Crown,
    CheckCircle,
    Upload,
    Trash2,
    Zap,
    TreePine,
    X,
    Plus,
    Info,
    History,
    Clock,
    ArrowRight,
    Globe,
    Sparkles  // AI Discovery icon
} from 'lucide-react';
import { analyzeCPC, CPCAnalysis } from '@/lib/modules/cpcIntelligence';
import { discoverKeywords, discoverKeywordsWithSearch, KeywordDiscoveryResult } from '@/lib/ai/keywordDiscovery';
import { isBraveSearchAvailable } from '@/lib/mcp/client';

// ============ TYPES ============

interface KeywordItem {
    keyword: string;
    source: 'csv' | 'live' | 'evergreen' | 'ai';  // Added 'ai' source
    niche?: string;
    context?: string;
    difficulty?: string;  // From AI discovery
    searchVolume?: string; // From AI discovery
}

interface AnalyzedKeyword extends KeywordItem {
    analysis: CPCAnalysis;
}

interface AnalysisHistoryItem {
    id: string;
    timestamp: number;
    keywords: AnalyzedKeyword[];
}

interface KeywordHunterProps {
    onSelect?: (topic: { topic: string; context: string; source: 'live' | 'fallback' | 'csv_import' }) => void;
    onNavigateToDomains?: (keywords: string[]) => void;
    disabled?: boolean;
}

// LiveTrendsState removed - using TrendScanner component instead

// ============ HIGH-CPC EVERGREEN KEYWORDS ============

const EVERGREEN_KEYWORDS: KeywordItem[] = [
    { keyword: 'Best VPN Services 2025', source: 'evergreen', niche: 'Cybersecurity', context: 'Review and comparison of top VPN providers' },
    { keyword: 'Credit Card Comparison 2025', source: 'evergreen', niche: 'Finance', context: 'Compare rewards, cashback, and travel credit cards' },
    { keyword: 'Life Insurance Quotes Online', source: 'evergreen', niche: 'Insurance', context: 'How to get the best life insurance rates' },
    { keyword: 'Small Business Loans Guide', source: 'evergreen', niche: 'Finance', context: 'Best financing options for startups' },
    { keyword: 'Cloud Hosting Comparison', source: 'evergreen', niche: 'Technology', context: 'AWS vs Azure vs Google Cloud' },
    { keyword: 'Mortgage Refinance Calculator', source: 'evergreen', niche: 'Finance', context: 'When and how to refinance your mortgage' },
    { keyword: 'Best CRM Software 2025', source: 'evergreen', niche: 'SaaS', context: 'Top CRM tools for sales teams' },
    { keyword: 'Personal Injury Lawyer Cost', source: 'evergreen', niche: 'Legal', context: 'Legal services pricing guide' },
];

const HISTORY_STORAGE_KEY = 'ifrit_keyword_analysis_history';
const MAX_HISTORY_ITEMS = 10;

// ============ MAIN COMPONENT ============

export default function KeywordHunter({ onSelect, onNavigateToDomains, disabled }: KeywordHunterProps) {
    // CSV Import State
    const [csvKeywords, setCsvKeywords] = useState<KeywordItem[]>([]);
    const [csvFileName, setCsvFileName] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Note: Live Trends UI removed - use TrendScanner component instead

    // Selection & Analysis State
    const [selectedKeywords, setSelectedKeywords] = useState<KeywordItem[]>([]);
    const [analyzedKeywords, setAnalyzedKeywords] = useState<AnalyzedKeyword[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // History State
    const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistoryItem[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

    // AI Discovery State (NEW - 4th Column)
    const [aiKeywords, setAiKeywords] = useState<KeywordItem[]>([]);
    const [aiNicheInput, setAiNicheInput] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [aiGeminiKey, setAiGeminiKey] = useState<string | null>(null);
    const [aiService, setAiService] = useState<'auto' | 'gemini' | 'brave'>('auto');
    const [aiStatusLog, setAiStatusLog] = useState<string[]>([]);

    // Load Gemini API key on mount
    useEffect(() => {
        const stored = localStorage.getItem('ifrit_gemini_keys');
        if (stored) {
            try {
                const keys = JSON.parse(stored);
                if (keys.length > 0) {
                    setAiGeminiKey(keys[0].key);
                }
            } catch {
                // Ignore
            }
        }
    }, []);

    // Load history on mount
    useEffect(() => {
        const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (saved) {
            try {
                setAnalysisHistory(JSON.parse(saved));
            } catch {
                // Ignore parse errors
            }
        }
    }, []);

    // Save history whenever it changes
    useEffect(() => {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(analysisHistory));
    }, [analysisHistory]);

    // ============ CSV IMPORT ============

    const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setCsvFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            const parsed = parseCSV(content);
            setCsvKeywords(parsed);
        };
        reader.readAsText(file);
    };

    const parseCSV = (content: string): KeywordItem[] => {
        const lines = content.trim().split('\n');
        const keywords: KeywordItem[] = [];

        const dataLines = lines.filter(line => {
            if (!line.trim()) return false;
            if (/^(Week|Date|Category|Top|Rising)/i.test(line)) return false;
            if (line.includes('Google Trends')) return false;
            return true;
        });

        for (const line of dataLines) {
            const parts = line.split(',');
            if (parts.length >= 1 && parts[0].trim()) {
                const keyword = parts[0].trim().replace(/^"|"$/g, '');
                keywords.push({
                    keyword,
                    source: 'csv',
                    context: 'Imported from Google Trends CSV'
                });
            }
        }

        return keywords.slice(0, 15);
    };

    const clearCSV = () => {
        setCsvKeywords([]);
        setCsvFileName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ============ AI KEYWORD DISCOVERY (NEW) ============

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setAiStatusLog(prev => [...prev, `[${timestamp}] ${message}`]);
    };

    const fetchAIKeywords = async () => {
        // Reset state
        setAiStatusLog([]);
        setAiKeywords([]);
        setAiError(null);

        addLog('🚀 Starting keyword discovery...');

        if (!aiGeminiKey) {
            addLog('❌ No Gemini API key found');
            setAiError('Please configure a Gemini API key in Settings first');
            return;
        }
        addLog('✅ Gemini API key found');

        if (!aiNicheInput.trim()) {
            addLog('❌ No topic entered');
            setAiError('Please enter a niche or topic');
            return;
        }
        addLog(`📌 Topic: "${aiNicheInput}"`);

        setAiLoading(true);

        try {
            // Determine which service to use
            const braveAvailable = isBraveSearchAvailable();
            addLog(`🔍 Brave Search available: ${braveAvailable ? 'Yes' : 'No'}`);

            let useBrave = false;
            if (aiService === 'auto') {
                useBrave = braveAvailable;
                addLog(`⚙️ Auto mode: ${useBrave ? 'Using Brave + AI' : 'Using AI-only (Gemini)'}`);
            } else if (aiService === 'brave') {
                if (!braveAvailable) {
                    addLog('⚠️ Brave selected but not available, falling back to Gemini');
                    useBrave = false;
                } else {
                    useBrave = true;
                    addLog('⚙️ Manual mode: Using Brave + AI');
                }
            } else {
                addLog('⚙️ Manual mode: Using AI-only (Gemini)');
            }

            let result: import('@/lib/ai/keywordDiscovery').KeywordDiscoveryResult;

            if (useBrave) {
                addLog('🌐 Step 1: Calling Brave web search...');
                result = await discoverKeywordsWithSearch(aiGeminiKey, {
                    topic: aiNicheInput,
                    niche: aiNicheInput,
                    maxKeywords: 10
                });

                if (result.source === 'ai') {
                    addLog('⚠️ Brave search failed, fell back to AI-only');
                } else {
                    addLog('✅ Brave search completed successfully');
                }
            } else {
                addLog('🤖 Calling Gemini AI for keyword analysis...');
                result = await discoverKeywords(aiGeminiKey, {
                    topic: aiNicheInput,
                    niche: aiNicheInput,
                    maxKeywords: 10
                });
            }

            if (result.success && result.keywords.length > 0) {
                addLog(`✅ Found ${result.keywords.length} keywords!`);
                addLog(`📊 Source: ${result.source === 'ai+search' ? 'Web + AI enhanced' : 'AI-only'}`);

                const keywords: KeywordItem[] = result.keywords.map(kw => ({
                    keyword: kw.keyword,
                    source: 'ai' as const,
                    niche: aiNicheInput,
                    context: `${result.source === 'ai+search' ? '🔍 Web-enhanced: ' : '🤖 AI-discovered: '}${kw.intent || 'informational'} intent`,
                    difficulty: kw.difficulty,
                    searchVolume: kw.searchVolume
                }));
                setAiKeywords(keywords);
                addLog('🎉 Discovery complete!');
            } else {
                addLog(`❌ Failed: ${result.error || 'No keywords found'}`);
                setAiError(result.error || 'No keywords found');
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            addLog(`💥 Error: ${errorMsg}`);
            setAiError(errorMsg);
        } finally {
            setAiLoading(false);
        }
    };

    const clearAIKeywords = () => {
        setAiKeywords([]);
        setAiNicheInput('');
        setAiError(null);
        setAiStatusLog([]);
    };

    // Note: fetchLiveTrends removed - use TrendScanner component instead

    // ============ SELECTION ============

    const toggleSelect = (item: KeywordItem) => {
        const exists = selectedKeywords.find(k => k.keyword === item.keyword);
        if (exists) {
            setSelectedKeywords(selectedKeywords.filter(k => k.keyword !== item.keyword));
        } else {
            setSelectedKeywords([...selectedKeywords, item]);
        }
    };

    const isSelected = (keyword: string) => selectedKeywords.some(k => k.keyword === keyword);

    const clearSelection = () => {
        setSelectedKeywords([]);
        setAnalyzedKeywords([]);
        setActiveHistoryId(null);
    };

    // ============ ANALYSIS ============

    const runAnalysis = () => {
        if (selectedKeywords.length === 0) return;

        setIsAnalyzing(true);
        setActiveHistoryId(null);

        setTimeout(() => {
            const analyzed = selectedKeywords.map(kw => ({
                ...kw,
                analysis: analyzeCPC(kw.keyword)
            }));

            // Sort by score descending
            analyzed.sort((a, b) => b.analysis.score - a.analysis.score);
            setAnalyzedKeywords(analyzed);
            setIsAnalyzing(false);

            // Save to history
            const historyItem: AnalysisHistoryItem = {
                id: Date.now().toString(),
                timestamp: Date.now(),
                keywords: analyzed
            };

            setAnalysisHistory(prev => {
                const updated = [historyItem, ...prev].slice(0, MAX_HISTORY_ITEMS);
                return updated;
            });
        }, 500);
    };

    const loadHistoryItem = (item: AnalysisHistoryItem) => {
        setAnalyzedKeywords(item.keywords);
        setActiveHistoryId(item.id);
        setShowHistory(false);
    };

    const clearHistory = () => {
        setAnalysisHistory([]);
        localStorage.removeItem(HISTORY_STORAGE_KEY);
    };

    const handleUseKeyword = (kw: AnalyzedKeyword) => {
        // If onNavigateToDomains is provided, navigate to Domain Acquire tab
        if (onNavigateToDomains) {
            onNavigateToDomains([kw.keyword]);
        }

        // Also call onSelect if provided
        if (onSelect) {
            const sourceMap: Record<string, 'live' | 'fallback' | 'csv_import'> = {
                'csv': 'csv_import',
                'live': 'live',
                'evergreen': 'fallback',
                'ai': 'live'  // AI-discovered keywords treated as live
            };

            onSelect({
                topic: kw.keyword,
                context: kw.context || kw.analysis.recommendation,
                source: sourceMap[kw.source]
            });
        }
    };

    const handleBulkHuntDomains = () => {
        if (onNavigateToDomains && analyzedKeywords.length > 0) {
            // Extract keywords and pass to domain finder
            const keywords = analyzedKeywords.map(k => k.keyword);
            onNavigateToDomains(keywords);
        }
    };

    // ============ RENDER HELPERS ============

    const getSourceBadge = (source: string) => {
        switch (source) {
            case 'csv':
                return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">📥 CSV</span>;
            case 'live':
                return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">🔴 Live</span>;
            case 'evergreen':
                return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">🌲 Evergreen</span>;
            case 'ai':
                return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">✨ AI</span>;
        }
    };

    const getIntentBadge = (intent?: string) => {
        switch (intent) {
            case 'transactional':
                return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">🛒 Transactional</span>;
            case 'commercial':
                return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">💰 Commercial</span>;
            case 'navigational':
                return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">🧭 Navigational</span>;
            default:
                return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">📝 Informational</span>;
        }
    };

    const getCompetitionDots = (level?: string) => {
        const levels = { 'low': 1, 'medium': 2, 'high': 3, 'very_high': 4 };
        const lvl = levels[level as keyof typeof levels] || 2;
        return (
            <div className="flex gap-0.5 items-center">
                <div className={`w-2 h-2 rounded-full ${lvl >= 1 ? 'bg-green-500' : 'bg-gray-200'}`} />
                <div className={`w-2 h-2 rounded-full ${lvl >= 2 ? 'bg-yellow-500' : 'bg-gray-200'}`} />
                <div className={`w-2 h-2 rounded-full ${lvl >= 3 ? 'bg-orange-500' : 'bg-gray-200'}`} />
                <div className={`w-2 h-2 rounded-full ${lvl >= 4 ? 'bg-red-500' : 'bg-gray-200'}`} />
            </div>
        );
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-50';
        if (score >= 60) return 'text-yellow-600 bg-yellow-50';
        if (score >= 40) return 'text-orange-600 bg-orange-50';
        return 'text-gray-600 bg-gray-50';
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // ============ RENDER ============

    return (
        <div className="w-full space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-lg text-neutral-800">🎯 Keyword Hunter</h3>
                    <p className="text-sm text-neutral-500">Select keywords from 3 sources, then analyze for revenue potential</p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedKeywords.length > 0 && (
                        <>
                            <span className="text-sm text-neutral-500">{selectedKeywords.length} selected</span>
                            <button onClick={clearSelection} className="text-sm text-red-500 hover:text-red-700">
                                Clear
                            </button>
                        </>
                    )}
                    {analysisHistory.length > 0 && (
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${showHistory ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            <History className="w-4 h-4" />
                            History ({analysisHistory.length})
                        </button>
                    )}
                </div>
            </div>

            {/* History Panel */}
            {showHistory && analysisHistory.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-indigo-900 flex items-center gap-2">
                            <History className="w-4 h-4" />
                            Analysis History
                        </h4>
                        <button onClick={clearHistory} className="text-xs text-red-500 hover:text-red-700">
                            Clear All
                        </button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {analysisHistory.map(item => (
                            <button
                                key={item.id}
                                onClick={() => loadHistoryItem(item)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${activeHistoryId === item.id
                                    ? 'bg-indigo-200 border-2 border-indigo-400'
                                    : 'bg-white border border-indigo-100 hover:border-indigo-300'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-3 h-3 text-indigo-400" />
                                        <span className="text-indigo-700">{formatDate(item.timestamp)}</span>
                                    </div>
                                    <span className="text-indigo-500">{item.keywords.length} keywords</span>
                                </div>
                                <div className="text-xs text-indigo-600 mt-1 truncate">
                                    {item.keywords.slice(0, 3).map(k => k.keyword).join(', ')}
                                    {item.keywords.length > 3 && '...'}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 4-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">

                {/* Column 1: CSV Import */}
                <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Upload className="w-5 h-5 text-purple-600" />
                        <span className="font-semibold text-sm text-purple-800">CSV Import</span>
                        <span className="text-xs text-purple-500 ml-auto">📥 Manual</span>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleCSVImport}
                        className="hidden"
                    />

                    {csvKeywords.length === 0 ? (
                        <div className="text-center py-6">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                            >
                                <Upload className="w-4 h-4 inline mr-2" />
                                Upload CSV
                            </button>
                            <p className="text-xs text-purple-500 mt-2">
                                Export from <a href="https://trends.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Trends</a>
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-purple-600 mb-2">
                                <span>📄 {csvFileName}</span>
                                <button onClick={clearCSV} className="hover:text-purple-800">
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-1">
                                {csvKeywords.map((kw, i) => (
                                    <button
                                        key={i}
                                        onClick={() => toggleSelect(kw)}
                                        disabled={disabled}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isSelected(kw.keyword)
                                            ? 'bg-purple-200 border-2 border-purple-400'
                                            : 'bg-white border border-purple-100 hover:border-purple-300'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {isSelected(kw.keyword) && <CheckCircle className="w-4 h-4 text-purple-600" />}
                                            <span className="line-clamp-1">{kw.keyword}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Column 2: Evergreen Keywords (was Column 3) */}
                <div className="bg-green-50/50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <TreePine className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-sm text-green-800">HIGH-CPC Evergreen</span>
                        <span className="text-xs text-green-500 ml-auto">🌲 Always Available</span>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-1">
                        {EVERGREEN_KEYWORDS.map((kw, i) => (
                            <button
                                key={i}
                                onClick={() => toggleSelect(kw)}
                                disabled={disabled}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isSelected(kw.keyword)
                                    ? 'bg-green-200 border-2 border-green-400'
                                    : 'bg-white border border-green-100 hover:border-green-300'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    {isSelected(kw.keyword) && <CheckCircle className="w-4 h-4 text-green-600" />}
                                    <span className="line-clamp-1">{kw.keyword}</span>
                                </div>
                                <span className="text-xs text-green-500">{kw.niche}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Column 4: AI Discovery (NEW) */}
                <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-sm text-blue-800">AI Discovery</span>
                        <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded ml-auto">MUST</span>
                    </div>

                    {/* Service Selector */}
                    <div className="mb-3">
                        <label className="block text-xs text-blue-600 mb-1">Discovery Service</label>
                        <select
                            value={aiService}
                            onChange={(e) => setAiService(e.target.value as 'auto' | 'gemini' | 'brave')}
                            className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="auto">🤖 Auto (Best Available)</option>
                            <option value="gemini">🧠 Gemini AI Only</option>
                            <option value="brave">🌐 Brave Search + AI</option>
                        </select>
                        <p className="text-xs text-blue-400 mt-1">
                            {aiService === 'auto' && 'Uses Brave if available, otherwise Gemini'}
                            {aiService === 'gemini' && 'Uses Gemini AI for keyword suggestions'}
                            {aiService === 'brave' && 'Searches the web first, then analyzes with AI'}
                        </p>
                    </div>

                    {/* Niche Input */}
                    <div className="mb-3">
                        <input
                            type="text"
                            value={aiNicheInput}
                            onChange={(e) => setAiNicheInput(e.target.value)}
                            placeholder="Enter niche or topic..."
                            className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onKeyDown={(e) => e.key === 'Enter' && fetchAIKeywords()}
                        />
                    </div>

                    {/* Discover Button */}
                    <button
                        onClick={fetchAIKeywords}
                        disabled={aiLoading || !aiGeminiKey}
                        className={`w-full px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors mb-3 ${aiLoading || !aiGeminiKey
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        {aiLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Discovering...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                Discover Keywords
                            </>
                        )}
                    </button>

                    {/* Status Log Panel */}
                    {aiStatusLog.length > 0 && (
                        <div className="mb-3 bg-slate-900 rounded-lg p-2 max-h-32 overflow-y-auto font-mono text-xs">
                            {aiStatusLog.map((log, i) => (
                                <div key={i} className={`${log.includes('❌') || log.includes('💥') ? 'text-red-400' :
                                    log.includes('⚠️') ? 'text-yellow-400' :
                                        log.includes('✅') || log.includes('🎉') ? 'text-green-400' :
                                            'text-slate-300'
                                    }`}>
                                    {log}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* No API Key Warning */}
                    {!aiGeminiKey && (
                        <div className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 mb-2">
                            ⚠️ Configure Gemini API key in Settings
                        </div>
                    )}

                    {/* Error */}
                    {aiError && (
                        <div className="text-xs text-red-600 bg-red-50 rounded-lg p-2 mb-2">
                            {aiError}
                        </div>
                    )}

                    {/* Results */}
                    {aiKeywords.length > 0 ? (
                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-blue-600 mb-2">
                                <span>✨ {aiKeywords.length} AI keywords</span>
                                <button onClick={clearAIKeywords} className="hover:text-blue-800">
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-1">
                                {aiKeywords.map((kw, i) => (
                                    <button
                                        key={i}
                                        onClick={() => toggleSelect(kw)}
                                        disabled={disabled}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${isSelected(kw.keyword)
                                            ? 'bg-blue-200 border-2 border-blue-400'
                                            : 'bg-white border border-blue-100 hover:border-blue-300'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {isSelected(kw.keyword) && <CheckCircle className="w-4 h-4 text-blue-600" />}
                                            <span className="line-clamp-1">{kw.keyword}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            {kw.context && (
                                                <span className="text-xs text-blue-500">
                                                    {kw.context.substring(0, 30)}...
                                                </span>
                                            )}
                                            {kw.difficulty && (
                                                <span className={`text-xs px-1 rounded ${kw.difficulty === 'easy' ? 'bg-green-100 text-green-600' :
                                                    kw.difficulty === 'medium' ? 'bg-amber-100 text-amber-600' :
                                                        'bg-red-100 text-red-600'
                                                    }`}>
                                                    {kw.difficulty}
                                                </span>
                                            )}
                                            {kw.searchVolume && (
                                                <span className="text-xs text-blue-500">
                                                    {kw.searchVolume} vol
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : !aiLoading && (
                        <div className="text-center py-4 text-sm text-blue-400">
                            Enter a niche to discover keywords
                        </div>
                    )}
                </div>
            </div>

            {/* Analyze Button */}
            {selectedKeywords.length > 0 && (
                <div className="flex justify-center">
                    <button
                        onClick={runAnalysis}
                        disabled={isAnalyzing || disabled}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <Zap className="w-5 h-5" />
                                🔬 Analyze {selectedKeywords.length} Keyword{selectedKeywords.length > 1 ? 's' : ''}
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Analysis Results */}
            {analyzedKeywords.length > 0 && (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-lg text-indigo-900 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Analysis Results
                            {activeHistoryId && (
                                <span className="text-xs bg-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full ml-2">
                                    From History
                                </span>
                            )}
                        </h4>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-indigo-500">Sorted by revenue potential</span>
                            {onNavigateToDomains && analyzedKeywords.length > 1 && (
                                <button
                                    onClick={handleBulkHuntDomains}
                                    className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1"
                                >
                                    <Globe className="w-4 h-4" />
                                    Hunt Domains for All →
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        {analyzedKeywords.map((kw, i) => (
                            <div
                                key={i}
                                className="bg-white rounded-xl p-4 shadow-sm border border-indigo-100 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        {/* Header Row */}
                                        <div className="flex items-center gap-2 flex-wrap mb-2">
                                            {getSourceBadge(kw.source)}
                                            <span className="font-semibold text-neutral-800">{kw.keyword}</span>
                                        </div>

                                        {/* Analysis Badges */}
                                        <div className="flex items-center gap-2 flex-wrap mb-2">
                                            {getIntentBadge(kw.analysis.classifications[0]?.intent)}
                                            <span className="text-sm text-neutral-600 flex items-center gap-1">
                                                Competition: {getCompetitionDots(kw.analysis.classifications[0]?.competitionLevel)}
                                            </span>
                                            <span className="text-sm font-medium text-green-600">
                                                CPC: {kw.analysis.classifications[0]?.estimatedCPC || '$1-5'}
                                            </span>
                                        </div>

                                        {/* Niche & Recommendation */}
                                        <div className="text-sm">
                                            <span className="text-neutral-500">Niche: </span>
                                            <span className="text-neutral-700 font-medium">{kw.analysis.primaryNiche}</span>
                                        </div>
                                        <p className="text-sm text-indigo-600 mt-1">
                                            {kw.analysis.recommendation}
                                        </p>
                                    </div>

                                    {/* Score & Action */}
                                    <div className="flex flex-col items-center gap-2">
                                        <div className={`px-4 py-2 rounded-xl font-bold text-2xl ${getScoreColor(kw.analysis.score)}`}>
                                            {kw.analysis.score}
                                        </div>
                                        <span className="text-xs text-neutral-500">/ 100</span>
                                        <button
                                            onClick={() => handleUseKeyword(kw)}
                                            disabled={disabled}
                                            className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                                        >
                                            Hunt Domains <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>

                                {/* Tooltip / Details (expandable) */}
                                <details className="mt-3">
                                    <summary className="text-xs text-indigo-500 cursor-pointer hover:text-indigo-700">
                                        <Info className="w-3 h-3 inline mr-1" />
                                        View full analysis
                                    </summary>
                                    <div className="mt-2 p-3 bg-indigo-50 rounded-lg text-xs">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div><strong>Keyword:</strong> {kw.analysis.keyword}</div>
                                            <div><strong>Primary Niche:</strong> {kw.analysis.primaryNiche}</div>
                                            <div><strong>CPC Level:</strong> {kw.analysis.primaryCPC}</div>
                                            <div><strong>Is High CPC:</strong> {kw.analysis.isHighCPC ? '✅ Yes' : '❌ No'}</div>
                                            <div className="col-span-2">
                                                <strong>Classifications:</strong>
                                                <ul className="mt-1 space-y-1">
                                                    {kw.analysis.classifications.map((c, j) => (
                                                        <li key={j} className="pl-2 border-l-2 border-indigo-200">
                                                            {c.niche} • {c.cpcLevel} • {c.estimatedCPC} • {c.intent}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </details>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State Hint */}
            {selectedKeywords.length === 0 && analyzedKeywords.length === 0 && (
                <p className="text-center text-sm text-neutral-400">
                    👆 Click keywords from any column to select them, then analyze
                </p>
            )}
        </div>
    );
}
