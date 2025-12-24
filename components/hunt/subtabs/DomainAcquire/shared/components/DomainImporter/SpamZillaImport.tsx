/**
 * SpamZillaImport Component
 * 
 * CSV import specifically for SpamZilla exports.
 * Pure presentational component.
 */

'use client';

import { useRef } from 'react';
import {
    Upload,
    Sparkles,
    ExternalLink
} from 'lucide-react';

// ============ PROPS ============

export interface SpamZillaImportProps {
    /** Handle file upload */
    onFileUpload: (file: File) => void;
    /** Number of domains imported */
    importedCount: number;
    /** Import preset detected */
    preset?: string;
}

// ============ COMPONENT ============

export function SpamZillaImport({
    onFileUpload,
    importedCount,
    preset,
}: SpamZillaImportProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onFileUpload(file);
        }
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <span className="font-semibold text-sm text-amber-800">
                    🔥 SpamZilla Import
                </span>
                <span className="text-xs text-amber-500 ml-auto">
                    CSV Export
                </span>
            </div>

            {/* Content */}
            <div className="space-y-3">
                <p className="text-xs text-amber-700">
                    Import CSV exports from SpamZilla with full metrics:
                    TF, CF, DA, SZ Score, Age, and more.
                </p>

                {/* Preset badges */}
                <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
                        🥇 Gold
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                        🛡️ Safe
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                        📊 Volume
                    </span>
                </div>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="spamzilla-csv-input"
                />

                {/* Upload button */}
                <label
                    htmlFor="spamzilla-csv-input"
                    className="block w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 cursor-pointer text-center font-medium text-sm shadow-sm"
                >
                    <Upload className="w-4 h-4 inline mr-2" />
                    Import SpamZilla CSV
                </label>

                {/* Import status */}
                {importedCount > 0 && (
                    <div className="text-xs text-amber-600">
                        ✅ {importedCount} domains imported
                        {preset && <span className="ml-1">({preset} preset)</span>}
                    </div>
                )}

                {/* Link to SpamZilla */}
                <a
                    href="https://spamzilla.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-xs text-amber-600 hover:text-amber-800"
                >
                    Open SpamZilla <ExternalLink className="w-3 h-3 inline" />
                </a>
            </div>
        </div>
    );
}
