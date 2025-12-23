/**
 * CSVImporter Component
 * 
 * CSV file upload for keyword import.
 * Pure presentational component.
 */

'use client';

import { useRef } from 'react';
import {
    Upload,
    FileText,
    X
} from 'lucide-react';

// ============ PROPS ============

export interface CSVImporterProps {
    /** Handle file upload */
    onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    /** Clear imported keywords */
    onClear: () => void;
    /** Number of imported keywords */
    importedCount: number;
}

// ============ COMPONENT ============

export function CSVImporter({
    onFileUpload,
    onClear,
    importedCount,
}: CSVImporterProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-sm text-blue-800">CSV Import</span>
            </div>

            <p className="text-xs text-blue-600 mb-3">
                Upload a CSV with columns: keyword, niche, context, difficulty, searchVolume
            </p>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={onFileUpload}
                className="hidden"
            />

            <div className="flex gap-2">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-2"
                >
                    <Upload className="w-4 h-4" />
                    Upload CSV
                </button>

                {importedCount > 0 && (
                    <button
                        onClick={onClear}
                        className="px-3 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {importedCount > 0 && (
                <div className="mt-2 text-xs text-blue-600">
                    ✅ {importedCount} keywords imported
                </div>
            )}
        </div>
    );
}
