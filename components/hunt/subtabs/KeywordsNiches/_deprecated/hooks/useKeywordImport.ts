/**
 * useKeywordImport Hook
 * 
 * Manages keyword import from CSV and evergreen sources.
 */

import { useState, useCallback, useRef } from 'react';
import type { KeywordItem } from '@/lib/keywords/types';

// ============ EVERGREEN KEYWORDS ============

const EVERGREEN_KEYWORDS: KeywordItem[] = [
    { keyword: 'best vpn service', source: 'evergreen', niche: 'VPN', context: 'High CPC - $15-40' },
    { keyword: 'cheap car insurance', source: 'evergreen', niche: 'Insurance', context: 'High CPC - $30-50' },
    { keyword: 'best web hosting', source: 'evergreen', niche: 'Tech', context: 'High CPC - $20-35' },
    { keyword: 'credit card comparison', source: 'evergreen', niche: 'Finance', context: 'High CPC - $25-45' },
    { keyword: 'online degree programs', source: 'evergreen', niche: 'Education', context: 'High CPC - $20-40' },
];

// ============ TYPES ============

export interface UseKeywordImportReturn {
    // CSV import
    csvKeywords: KeywordItem[];
    handleCSVImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
    clearCSV: () => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;

    // Evergreen
    evergreenKeywords: KeywordItem[];

    // Combined
    allKeywords: KeywordItem[];
}

// ============ HELPERS ============

function parseCSV(content: string): KeywordItem[] {
    const lines = content.split('\n').filter(line => line.trim());
    const items: KeywordItem[] = [];

    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim().replace(/"/g, ''));
        if (parts[0]) {
            items.push({
                keyword: parts[0],
                source: 'csv',
                niche: parts[1] || undefined,
                context: parts[2] || undefined,
                difficulty: parts[3] || undefined,
                searchVolume: parts[4] || undefined,
            });
        }
    }
    return items;
}

// ============ HOOK ============

export function useKeywordImport(): UseKeywordImportReturn {
    const [csvKeywords, setCsvKeywords] = useState<KeywordItem[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleCSVImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            const parsed = parseCSV(content);
            setCsvKeywords(parsed);
        };
        reader.readAsText(file);

        // Reset input
        if (event.target) {
            event.target.value = '';
        }
    }, []);

    const clearCSV = useCallback(() => {
        setCsvKeywords([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, []);

    // Combine all keywords
    const allKeywords = [...csvKeywords, ...EVERGREEN_KEYWORDS];

    return {
        csvKeywords,
        handleCSVImport,
        clearCSV,
        fileInputRef,
        evergreenKeywords: EVERGREEN_KEYWORDS,
        allKeywords,
    };
}
