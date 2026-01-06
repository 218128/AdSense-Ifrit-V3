/**
 * ExternalDomainImport Component
 * 
 * Allows users to import domains they already own (externally purchased).
 * Just adds to the domain list - profile generation happens later in Step 2.
 */

'use client';

import { useState } from 'react';
import {
    Package,
    Upload,
    CheckCircle,
    X
} from 'lucide-react';

// ============ PROPS ============

export interface ExternalDomainImportProps {
    /** Callback to add domains to the list */
    onAddDomains: (domains: string[]) => void;
    /** Number of imported domains */
    importedCount?: number;
}

// ============ COMPONENT ============

export function ExternalDomainImport({ onAddDomains, importedCount = 0 }: ExternalDomainImportProps) {
    const [inputValue, setInputValue] = useState('');
    const [justImported, setJustImported] = useState<string[]>([]);

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

    const handleImport = () => {
        const domains = parseDomains(inputValue);
        if (domains.length === 0) return;

        // Add to list via callback (no API call)
        onAddDomains(domains);

        // Show success feedback
        setJustImported(domains);
        setInputValue('');

        // Clear success message after 3 seconds
        setTimeout(() => setJustImported([]), 3000);
    };

    const clearResults = () => {
        setJustImported([]);
    };

    const detectedCount = inputValue.trim() ? parseDomains(inputValue).length : 0;

    return (
        <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-sm text-emerald-800">
                    📦 Import Owned Domains
                </span>
                {importedCount > 0 && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full ml-auto">
                        {importedCount} imported
                    </span>
                )}
            </div>

            {/* Info */}
            <p className="text-xs text-emerald-600 mb-3">
                Add domains you already own. They'll appear in the list for analysis in Step 2.
            </p>

            {/* Input */}
            <div className="space-y-3">
                <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={`Enter domains you already own, one per line...\n\nmysite.com\nanother-domain.net`}
                    className="w-full h-24 px-3 py-2 text-sm border border-emerald-200 rounded-lg resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />

                {/* Domain count preview */}
                {detectedCount > 0 && (
                    <div className="text-xs text-emerald-600">
                        📊 {detectedCount} domain(s) detected
                    </div>
                )}

                {/* Import button */}
                <button
                    onClick={handleImport}
                    disabled={detectedCount === 0}
                    className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    <Upload className="w-4 h-4" />
                    Add to List
                </button>

                {/* Success feedback */}
                {justImported.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-green-700 text-xs">
                                <CheckCircle className="w-3 h-3" />
                                Added {justImported.length} domain(s) to list
                            </div>
                            <button
                                onClick={clearResults}
                                className="text-green-500 hover:text-green-700"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="mt-1 text-xs text-green-600">
                            Select in list → Send to Step 2 for analysis
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
