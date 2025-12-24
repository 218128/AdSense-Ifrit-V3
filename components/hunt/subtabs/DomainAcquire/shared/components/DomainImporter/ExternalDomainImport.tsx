/**
 * ExternalDomainImport Component
 * 
 * Allows users to import domains they already own (externally purchased).
 * Generates unified profiles for these domains.
 */

'use client';

import { useState } from 'react';
import {
    Package,
    Upload,
    Loader2,
    CheckCircle,
    AlertCircle,
    X
} from 'lucide-react';

// ============ PROPS ============

export interface ExternalDomainImportProps {
    /** Callback when domains are imported and profiles generated */
    onImportComplete?: (domains: string[]) => void;
}

// ============ COMPONENT ============

export function ExternalDomainImport({ onImportComplete }: ExternalDomainImportProps) {
    const [inputValue, setInputValue] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [results, setResults] = useState<{ domain: string; success: boolean; error?: string }[]>([]);

    const parseDomains = (text: string): string[] => {
        return text
            .split(/[\n,]/)
            .map(d => d.trim().toLowerCase())
            .filter(d => {
                if (!d) return false;
                // Basic domain validation
                return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/.test(d);
            });
    };

    const handleImport = async () => {
        const domains = parseDomains(inputValue);
        if (domains.length === 0) return;

        setIsImporting(true);
        const importResults: typeof results = [];

        for (const domain of domains) {
            try {
                // Generate profile for each domain (marked as external purchase)
                const response = await fetch('/api/domain-profiles/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        domain,
                        saveProfile: true,
                    }),
                });

                if (response.ok) {
                    importResults.push({ domain, success: true });
                } else {
                    const data = await response.json();
                    importResults.push({ domain, success: false, error: data.error || 'Failed' });
                }
            } catch (error) {
                importResults.push({ domain, success: false, error: 'Network error' });
            }
        }

        setResults(importResults);
        setIsImporting(false);

        const successfulDomains = importResults.filter(r => r.success).map(r => r.domain);
        if (successfulDomains.length > 0 && onImportComplete) {
            onImportComplete(successfulDomains);
        }
    };

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    const clearResults = () => {
        setResults([]);
        setInputValue('');
    };

    return (
        <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-sm text-emerald-800">
                    📦 Import Owned Domains
                </span>
                <span className="text-xs text-emerald-500 ml-auto">
                    Already purchased elsewhere
                </span>
            </div>

            {/* Info */}
            <p className="text-xs text-emerald-600 mb-3">
                Add domains you already own. This will generate AI-powered profiles
                with keyword analysis and content strategy for each domain.
            </p>

            {/* Input */}
            <div className="space-y-3">
                <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={`Enter domains you already own, one per line...\n\nmysite.com\nanother-domain.net`}
                    className="w-full h-24 px-3 py-2 text-sm border border-emerald-200 rounded-lg resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    disabled={isImporting}
                />

                {/* Domain count preview */}
                {inputValue.trim() && (
                    <div className="text-xs text-emerald-600">
                        📊 {parseDomains(inputValue).length} domain(s) detected
                    </div>
                )}

                {/* Import button */}
                <button
                    onClick={handleImport}
                    disabled={!inputValue.trim() || isImporting}
                    className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isImporting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating Profiles...
                        </>
                    ) : (
                        <>
                            <Upload className="w-4 h-4" />
                            Import & Generate Profiles
                        </>
                    )}
                </button>

                {/* Results */}
                {results.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-medium text-emerald-800">
                                Import Results
                            </div>
                            <button
                                onClick={clearResults}
                                className="text-emerald-500 hover:text-emerald-700"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Summary */}
                        <div className="flex gap-3 text-xs">
                            {successCount > 0 && (
                                <span className="flex items-center gap-1 text-green-600">
                                    <CheckCircle className="w-3 h-3" />
                                    {successCount} imported
                                </span>
                            )}
                            {failCount > 0 && (
                                <span className="flex items-center gap-1 text-red-600">
                                    <AlertCircle className="w-3 h-3" />
                                    {failCount} failed
                                </span>
                            )}
                        </div>

                        {/* Failed items */}
                        {failCount > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                                <div className="text-xs text-red-700">
                                    {results.filter(r => !r.success).map(r => (
                                        <div key={r.domain} className="flex justify-between">
                                            <span>{r.domain}</span>
                                            <span className="text-red-500">{r.error}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
