/**
 * ManualImport Component
 * 
 * Text area for pasting domain names and CSV upload.
 * Pure presentational component - receives handlers from parent.
 */

'use client';

import { useRef } from 'react';
import {
    Upload,
    FileText,
    Zap,
    Loader2,
    X
} from 'lucide-react';

// ============ PROPS ============

export interface ManualImportProps {
    /** Text in the input area */
    value: string;
    /** Update text value */
    onChange: (value: string) => void;
    /** Trigger parse action */
    onParse: () => void;
    /** Handle file upload */
    onFileUpload: (file: File) => void;
    /** Clear all imported domains */
    onClear: () => void;
    /** Number of domains currently imported */
    importedCount: number;
    /** Loading state during parse */
    isParsing: boolean;
}

// ============ COMPONENT ============

export function ManualImport({
    value,
    onChange,
    onParse,
    onFileUpload,
    onClear,
    importedCount,
    isParsing,
}: ManualImportProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onFileUpload(file);
        }
        // Reset input so same file can be uploaded again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <Upload className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-sm text-purple-800">
                    🔍 Discovery Import
                </span>
                <span className="text-xs text-purple-500 ml-auto">
                    ExpiredDomains.net
                </span>
            </div>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="hidden"
            />

            {/* Content */}
            <div className="space-y-3">
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={`Paste domains here, one per line...\n\nexample.com\nanother-domain.net\ntest.org`}
                    className="w-full h-24 px-3 py-2 text-sm border border-purple-200 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />

                {/* Action buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 px-3 py-2 text-sm bg-white border border-purple-300 rounded-lg hover:bg-purple-50 flex items-center justify-center gap-1"
                    >
                        <FileText className="w-4 h-4" />
                        Upload CSV
                    </button>
                    <button
                        onClick={onParse}
                        disabled={!value.trim() || isParsing}
                        className="flex-1 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                        {isParsing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Zap className="w-4 h-4" />
                        )}
                        Parse
                    </button>
                </div>

                {/* Import count */}
                {importedCount > 0 && (
                    <div className="flex items-center justify-between text-xs text-purple-600">
                        <span>✅ {importedCount} domains imported</span>
                        <button
                            onClick={onClear}
                            className="hover:text-purple-800"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
