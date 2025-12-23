'use client';

/**
 * Domain Sources Component
 * 
 * 3-column grid for importing domains:
 * 1. Manual Import (CSV/paste)
 * 2. Free Scraping (expiredomains.io)
 * 3. Premium Analysis (Spamzilla)
 * 
 * Extracted from ExpiredDomainFinder for maintainability.
 */

import { useRef } from 'react';
import {
    Search,
    Loader2,
    Zap,
    AlertTriangle,
    ExternalLink,
    Upload,
    FileText,
    Globe,
    Sparkles,
    X
} from 'lucide-react';

interface ActionRequired {
    type: 'captcha' | 'rate_limit' | 'blocked' | 'network';
    message: string;
    action: string;
    url?: string;
}

interface DomainItem {
    domain: string;
    enriched?: boolean;
}

interface DomainSourcesProps {
    // Manual Import
    manualInput: string;
    setManualInput: (value: string) => void;
    handleCSVUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    parseManualDomains: () => void;
    clearManual: () => void;
    manualDomains: DomainItem[];
    isParsingManual: boolean;

    // Free Scraping
    fetchFreeDomains: () => void;
    freeLoading: boolean;
    freeDomains: DomainItem[];
    freeError: string | null;
    freeActionRequired: ActionRequired | null;

    // Premium/Spamzilla
    spamzillaConfigured: boolean;
    enrichAllDomains: () => void;
    enriching: boolean;
    allDomains: DomainItem[];
}

export default function DomainSources({
    manualInput,
    setManualInput,
    handleCSVUpload,
    parseManualDomains,
    clearManual,
    manualDomains,
    isParsingManual,
    fetchFreeDomains,
    freeLoading,
    freeDomains,
    freeError,
    freeActionRequired,
    spamzillaConfigured,
    enrichAllDomains,
    enriching,
    allDomains
}: DomainSourcesProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Column 1: Discovery Import */}
            <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Upload className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-sm text-purple-800">🔍 Discovery Import</span>
                    <span className="text-xs text-purple-500 ml-auto">ExpiredDomains.net</span>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleCSVUpload}
                    className="hidden"
                />

                <div className="space-y-3">
                    <textarea
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        placeholder="Paste domains here, one per line...&#10;&#10;example.com&#10;another-domain.net&#10;test.org"
                        className="w-full h-24 px-3 py-2 text-sm border border-purple-200 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 px-3 py-2 text-sm bg-white border border-purple-300 rounded-lg hover:bg-purple-50 flex items-center justify-center gap-1"
                        >
                            <FileText className="w-4 h-4" />
                            Upload CSV
                        </button>
                        <button
                            onClick={parseManualDomains}
                            disabled={!manualInput.trim() || isParsingManual}
                            className="flex-1 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                            {isParsingManual ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                            Parse
                        </button>
                    </div>
                    {manualDomains.length > 0 && (
                        <div className="flex items-center justify-between text-xs text-purple-600">
                            <span>✅ {manualDomains.length} domains imported</span>
                            <button onClick={clearManual} className="hover:text-purple-800">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Column 2: Free Scraping */}
            <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Globe className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-sm text-blue-800">Free Scraping</span>
                    <span className="text-xs text-blue-500 ml-auto">🆓 Public Sources</span>
                </div>

                <div className="space-y-3">
                    <p className="text-xs text-blue-600">
                        Scrapes expiredomains.io for expired domain listings. May be rate-limited or blocked.
                    </p>

                    <button
                        onClick={fetchFreeDomains}
                        disabled={freeLoading}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {freeLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Scraping...
                            </>
                        ) : (
                            <>
                                <Search className="w-4 h-4" />
                                Search Free Sources
                            </>
                        )}
                    </button>

                    {freeLoading && (
                        <div className="text-xs text-blue-500">⏳ Connecting to expiredomains.io...</div>
                    )}
                    {freeDomains.length > 0 && !freeLoading && (
                        <div className="text-xs text-green-600">✅ {freeDomains.length} domains found</div>
                    )}

                    {freeError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <div className="text-xs">
                                    <p className="text-red-700 font-medium">{freeError}</p>
                                    {freeActionRequired && (
                                        <div className="mt-2 text-red-600">
                                            <p className="font-medium">{freeActionRequired.message}</p>
                                            <p className="mt-1">{freeActionRequired.action}</p>
                                            {freeActionRequired.url && (
                                                <a
                                                    href={freeActionRequired.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:underline"
                                                >
                                                    Open Site <ExternalLink className="w-3 h-3" />
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Column 3: SpamZilla CSV Import */}
            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                    <span className="font-semibold text-sm text-amber-800">🔥 SpamZilla Import</span>
                    <span className="text-xs text-amber-500 ml-auto">CSV Export</span>
                </div>

                <div className="space-y-3">
                    <p className="text-xs text-amber-700">
                        Import CSV exports from SpamZilla with full metrics: TF, CF, DA, SZ Score, Age, and more.
                    </p>

                    {/* Preset badges */}
                    <div className="flex flex-wrap gap-1.5">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">🥇 Gold</span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 border border-blue-300">🛡️ Safe</span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 border border-purple-300">📊 Volume</span>
                    </div>

                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleCSVUpload}
                        className="hidden"
                        id="spamzilla-csv-input"
                    />

                    <label
                        htmlFor="spamzilla-csv-input"
                        className="block w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 cursor-pointer text-center font-medium text-sm shadow-sm"
                    >
                        <Upload className="w-4 h-4 inline mr-2" />
                        Import SpamZilla CSV
                    </label>

                    <a
                        href="https://spamzilla.io"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center text-xs text-amber-600 hover:text-amber-800"
                    >
                        Open SpamZilla →
                    </a>
                </div>
            </div>
        </div>
    );
}
